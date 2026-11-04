import { User, UserRole, UserStatus } from '../types';
import { hashPassword } from '../auth';
import {
  DBState,
  ensureLocalDB,
  saveLocalDB,
  syncCloudOnBoot,
  syncToBlob,
  syncUserToFirestore,
  deleteUserFromFirestore,
  syncClassToFirestore,
  syncTestPaperToFirestore,
  batchDeleteFromFirestore,
} from './core';

/**
 * 確保預設管理員帳號存在 (admin / admin123)
 */
export async function seedInitialAdmin(): Promise<User> {
  await syncCloudOnBoot();
  const existing = await getUserByUsername('admin');
  if (existing) return existing;

  const defaultPasswordHash = await hashPassword('admin123');
  const adminUser: User = {
    id: 'admin_root_001',
    username: 'admin',
    passwordHash: defaultPasswordHash,
    displayName: '系統最高管理員',
    role: 'admin',
    status: 'active',
    school: 'PIRLS 國家閱卷中心',
    createdAt: new Date().toISOString(),
  };

  const state = ensureLocalDB();
  state.users[adminUser.id] = adminUser;
  saveLocalDB(state);
  await syncUserToFirestore(adminUser);
  await syncToBlob(state);
  return adminUser;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const lower = username.trim().toLowerCase();
  for (const u of Object.values(state.users)) {
    if (u.username.toLowerCase() === lower) {
      return u;
    }
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return state.users[id] || null;
}

export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newUser: User = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  state.users[id] = newUser;
  saveLocalDB(state);
  await syncUserToFirestore(newUser);
  await syncToBlob(state);
  return newUser;
}

export function countActiveAdmins(state: DBState): number {
  return Object.values(state.users).filter(
    (u) => u.role === 'admin' && u.status === 'active'
  ).length;
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const user = state.users[userId];
  if (!user) return { success: false, error: '找不到該使用者' };

  // 若要將管理員降級，必須確認系統內至少還有另一位活躍管理員
  if (user.role === 'admin' && newRole !== 'admin') {
    const otherActiveAdmins = Object.values(state.users).filter(
      (u) => u.role === 'admin' && u.status === 'active' && u.id !== userId
    );
    if (otherActiveAdmins.length === 0) {
      return {
        success: false,
        error: '系統至少必須保留一位系統管理員，無法解除最後一位管理員權限！',
      };
    }
  }

  user.role = newRole;
  saveLocalDB(state);
  await syncUserToFirestore(user);
  await syncToBlob(state);
  return { success: true };
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const user = state.users[userId];
  if (!user) return false;

  // 若該使用者為管理員且被改為非 active，檢查是否會導致無其他活躍管理員
  if (user.role === 'admin' && status !== 'active') {
    const otherActiveAdmins = Object.values(state.users).filter(
      (u) => u.role === 'admin' && u.status === 'active' && u.id !== userId
    );
    if (otherActiveAdmins.length === 0) {
      return false;
    }
  }

  user.status = status;
  saveLocalDB(state);
  await syncUserToFirestore(user);
  await syncToBlob(state);
  return true;
}

export async function listPendingTeachers(): Promise<User[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.users).filter(
    (u) => u.role === 'teacher' && u.status === 'pending'
  );
}

export async function listApprovedTeachers(): Promise<User[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.users).filter(
    (u) => u.role === 'teacher' && u.status === 'active'
  );
}

export interface TeacherWithStats {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  school: string;
  createdAt: string;
  classCount: number;
  studentCount: number;
  submissionCount: number;
  paperCount: number; // 該教師建立的文章與題本總數 (方案 A 校本資產)
}

export async function getTeachersWithStats() {
  await syncCloudOnBoot();
  const state = ensureLocalDB();

  // 統計班級所屬
  const teacherClassesMap = new Map<string, string[]>();
  for (const c of Object.values(state.classes)) {
    const list = teacherClassesMap.get(c.teacherId) || [];
    list.push(c.id);
    teacherClassesMap.set(c.teacherId, list);
  }

  // 統計學生所屬 (直接依 teacherId 或依 classId)
  const teacherStudentsMap = new Map<string, string[]>();
  for (const u of Object.values(state.users)) {
    if (u.role === 'student') {
      let tId = u.teacherId;
      if (!tId && u.classId && state.classes[u.classId]) {
        tId = state.classes[u.classId].teacherId;
      }
      if (tId) {
        const list = teacherStudentsMap.get(tId) || [];
        list.push(u.id);
        teacherStudentsMap.set(tId, list);
      }
    }
  }

  // 統計學生個人作答數
  const studentSubmissionsMap = new Map<string, number>();
  for (const sub of Object.values(state.submissions)) {
    if (sub.studentId) {
      studentSubmissionsMap.set(sub.studentId, (studentSubmissionsMap.get(sub.studentId) || 0) + 1);
    }
  }

  // 統計教師建立的文章與試卷數量 (校本資產)
  const teacherPapersMap = new Map<string, string[]>();
  for (const t of Object.values(state.testPapers)) {
    if (t.creatorId) {
      const list = teacherPapersMap.get(t.creatorId) || [];
      list.push(t.id);
      teacherPapersMap.set(t.creatorId, list);
    }
  }

  const usersList = Object.values(state.users);

  const getStats = (u: User): TeacherWithStats => {
    const classIds = teacherClassesMap.get(u.id) || [];
    const studentIds = teacherStudentsMap.get(u.id) || [];
    const paperIds = teacherPapersMap.get(u.id) || [];
    let submissionCount = 0;
    for (const sid of studentIds) {
      submissionCount += studentSubmissionsMap.get(sid) || 0;
    }

    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      school: u.school || '未填寫',
      createdAt: u.createdAt,
      classCount: classIds.length,
      studentCount: studentIds.length,
      submissionCount,
      paperCount: paperIds.length,
    };
  };

  const pendingTeachers = usersList
    .filter((u) => u.role === 'teacher' && u.status === 'pending')
    .map(getStats);

  const approvedTeachers = usersList
    .filter((u) => u.role === 'teacher' && (u.status === 'active' || u.status === 'suspended'))
    .map(getStats);

  const admins = usersList
    .filter((u) => u.role === 'admin')
    .map(getStats);

  const availableTransferTargets = usersList
    .filter((u) => (u.role === 'teacher' || u.role === 'admin') && u.status === 'active')
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      school: u.school || '未填寫',
      role: u.role,
    }));

  return {
    pendingTeachers,
    approvedTeachers,
    admins,
    availableTransferTargets,
  };
}

export async function deleteTeacher(
  teacherId: string,
  options: { deleteMode: 'transfer' | 'cascade'; targetTeacherId?: string }
): Promise<{ success: boolean; message: string; error?: string }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const teacher = state.users[teacherId];
  if (!teacher) {
    return { success: false, error: '找不到該教師帳號', message: '' };
  }

  // 若該教師為管理員，檢查是否為最後一位活躍管理員
  if (teacher.role === 'admin') {
    const otherActiveAdmins = Object.values(state.users).filter(
      (u) => u.role === 'admin' && u.status === 'active' && u.id !== teacherId
    );
    if (otherActiveAdmins.length === 0) {
      return {
        success: false,
        error: '該帳號為系統目前最後一位活躍系統管理員，系統至少必須保留一位管理員，無法刪除！',
        message: '',
      };
    }
  }

  // 取得該教師名下的班級與學生
  const teacherClasses = Object.values(state.classes).filter((c) => c.teacherId === teacherId);
  const teacherClassIds = new Set(teacherClasses.map((c) => c.id));

  const teacherStudents = Object.values(state.users).filter(
    (u) => u.teacherId === teacherId || (u.classId && teacherClassIds.has(u.classId))
  );
  const teacherStudentIds = new Set(teacherStudents.map((s) => s.id));

  if (options.deleteMode === 'transfer') {
    if (!options.targetTeacherId) {
      return { success: false, error: '請指定接手該班級與學生的新任教師', message: '' };
    }
    if (options.targetTeacherId === teacherId) {
      return { success: false, error: '接手教師不能是即將被刪除的教師本人', message: '' };
    }

    const targetTeacher = state.users[options.targetTeacherId];
    if (!targetTeacher) {
      return { success: false, error: '指定的接手教師不存在', message: '' };
    }

    // 1. 轉移班級
    for (const c of teacherClasses) {
      c.teacherId = options.targetTeacherId;
      await syncClassToFirestore(c);
    }

    // 2. 轉移學生
    for (const s of teacherStudents) {
      s.teacherId = options.targetTeacherId;
      await syncUserToFirestore(s);
    }

    // 3. 轉移試卷與文章（方案 A：校本資產保護，完整移交新任教師）
    for (const t of Object.values(state.testPapers)) {
      if (t.creatorId === teacherId) {
        t.creatorId = options.targetTeacherId;
        t.creatorName = `${teacher.displayName} (由 ${targetTeacher.displayName} 接手)`;
        await syncTestPaperToFirestore(t);
      }
    }

    // 4. 刪除原教師帳號 (記憶體 + 本地檔 + Firestore 原生集合原子刪除)
    delete state.users[teacherId];

    saveLocalDB(state);
    await deleteUserFromFirestore(teacherId);
    await syncToBlob(state);

    return {
      success: true,
      message: `已成功將【${teacher.displayName}】名下的 ${teacherClasses.length} 個班級、${teacherStudents.length} 位學生及相關試卷與成績移交給【${targetTeacher.displayName}】，並刪除原教師帳號。`,
    };
  } else if (options.deleteMode === 'cascade') {
    // 連帶刪除該教師名下所有班級、學生與作答成績
    let deletedSubmissionsCount = 0;
    const deletedSubmissionIds: string[] = [];
    for (const [subId, sub] of Object.entries(state.submissions)) {
      if (
        (sub.studentId && teacherStudentIds.has(sub.studentId)) ||
        (sub.classId && teacherClassIds.has(sub.classId))
      ) {
        delete state.submissions[subId];
        deletedSubmissionIds.push(subId);
        deletedSubmissionsCount++;
      }
    }

    // 刪除學生
    const deletedStudentIds: string[] = [];
    for (const s of teacherStudents) {
      delete state.users[s.id];
      deletedStudentIds.push(s.id);
    }

    // 刪除班級
    const deletedClassIds: string[] = [];
    for (const c of teacherClasses) {
      delete state.classes[c.id];
      deletedClassIds.push(c.id);
    }

    // 4. 方案 A：校本教學資產保護 — 教師所建立的文章與題本「全數安全保留」，轉為全校公共題庫！
    let preservedPapersCount = 0;
    const updatedPapers: any[] = [];
    for (const [tid, tp] of Object.entries(state.testPapers)) {
      if (tp.creatorId === teacherId) {
        tp.creatorId = 'admin_root_001';
        tp.creatorName = `${teacher.displayName}（已歸檔校本公共題庫）`;
        tp.isPublic = true; // 設為全校公共題庫與開放練習，供全校師生調用
        tp.assignedClassIds = []; // 清空已刪除班級之綁定
        preservedPapersCount++;
        updatedPapers.push(tp);
      }
    }

    // 刪除教師自身
    delete state.users[teacherId];

    saveLocalDB(state);

    // 執行 Firestore 原子批次刪除與更新
    const firestoreDeletions: { collection: string; id: string }[] = [
      { collection: 'users', id: teacherId },
      ...deletedStudentIds.map((id) => ({ collection: 'users', id })),
      ...deletedClassIds.map((id) => ({ collection: 'classes', id })),
      ...deletedSubmissionIds.map((id) => ({ collection: 'submissions', id })),
    ];
    await batchDeleteFromFirestore(firestoreDeletions);

    for (const p of updatedPapers) {
      await syncTestPaperToFirestore(p);
    }

    await syncToBlob(state);

    return {
      success: true,
      message: `已徹底刪除【${teacher.displayName}】及其名下 ${teacherClasses.length} 個班級、${teacherStudents.length} 位學生與 ${deletedSubmissionsCount} 份測驗作答成績；依據校本教材資產管理規範（方案 A），該教師建立的 ${preservedPapersCount} 篇閱讀文章與題本已全數安全保留，並自動歸檔至「全校公共題庫」！`,
    };
  }

  return { success: false, error: '未知的刪除處置模式', message: '' };
}

export async function resetUserPassword(userId: string, newPlainPassword: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (state.users[userId]) {
    state.users[userId].passwordHash = await hashPassword(newPlainPassword);
    saveLocalDB(state);
    await syncUserToFirestore(state.users[userId]);
    await syncToBlob(state);
    return true;
  }
  return false;
}
