import { User, ClassRoom, ClassCoTeachersData, CoTeacherMember } from '../types';
import { hashPassword } from '../auth';
import {
  ensureLocalDB,
  saveLocalDB,
  syncCloudOnBoot,
  syncToBlob,
  syncClassToFirestore,
  deleteUserFromFirestore,
  syncUserToFirestore,
  batchDeleteFromFirestore,
} from './core';

export async function createClass(
  teacherId: string,
  name: string,
  gradeLevel: number
): Promise<ClassRoom> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const id = 'cls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newClass: ClassRoom = {
    id,
    name,
    gradeLevel,
    teacherId,
    studentCount: 0,
    createdAt: new Date().toISOString(),
  };
  state.classes[id] = newClass;
  saveLocalDB(state);
  await syncClassToFirestore(newClass);
  await syncToBlob(state);
  return newClass;
}

export async function getTeacherClasses(teacherId: string, role?: string): Promise<ClassRoom[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const userMap = new Map<string, User>();
  Object.values(state.users).forEach((u) => userMap.set(u.id, u));

  let classList: ClassRoom[] = [];
  if (role === 'admin') {
    // 系統管理員可檢視與管理全校所有班級（含自己建立的班級）
    classList = Object.values(state.classes);
  } else {
    // 一般教師可存取：自己建立之主責班級 OR 受邀為共同管理之協同班級
    classList = Object.values(state.classes).filter(
      (c) => c.teacherId === teacherId || (c.coTeacherIds && c.coTeacherIds.includes(teacherId))
    );
  }

  // 排序並附加主責與協同教師資訊
  return classList
    .sort((a, b) => a.gradeLevel - b.gradeLevel || a.name.localeCompare(b.name, 'zh-TW'))
    .map((c) => {
      const ownerUser = userMap.get(c.teacherId);
      const coTeacherNames = (c.coTeacherIds || [])
        .map((cid) => userMap.get(cid)?.displayName)
        .filter((name): name is string => Boolean(name));

      return {
        ...c,
        isOwner: c.teacherId === teacherId || role === 'admin',
        isCoTeacher: Boolean(c.coTeacherIds && c.coTeacherIds.includes(teacherId)),
        primaryTeacherName: ownerUser?.displayName || '未知主責導師',
        coTeacherNames,
      };
    });
}

export async function createStudentsBatch(
  teacherId: string,
  classId: string,
  students: Array<{
    username: string;
    plainPassword?: string;
    displayName: string;
    seatNumber: number;
    gradeLevel: number;
  }>
): Promise<User[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const created: User[] = [];
  const targetClass = state.classes[classId];

  for (const s of students) {
    // 預設建立 6 碼亂數數字密碼
    const initialPlain = s.plainPassword?.trim() || Math.floor(100000 + Math.random() * 900000).toString();
    const pwdHash = await hashPassword(initialPlain);
    const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const studentUser: User = {
      id,
      username: s.username,
      passwordHash: pwdHash,
      displayName: s.displayName,
      role: 'student',
      status: 'active',
      teacherId,
      classId,
      className: targetClass ? targetClass.name : undefined,
      seatNumber: s.seatNumber,
      gradeLevel: s.gradeLevel,
      initialPassword: initialPlain,
      createdAt: new Date().toISOString(),
    };
    state.users[id] = studentUser;
    created.push(studentUser);
  }

  if (targetClass) {
    targetClass.studentCount += created.length;
  }

  saveLocalDB(state);
  await syncToBlob(state);
  return created;
}

export async function getClassStudents(classId: string): Promise<User[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  let needSave = false;
  const list = Object.values(state.users)
    .filter((u) => u.classId === classId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  for (const s of list) {
    if (!s.initialPassword) {
      // 學生尚無記錄初始密碼時，自動生成 6 碼亂數數字密碼並同步更新雜湊
      const random6 = Math.floor(100000 + Math.random() * 900000).toString();
      s.initialPassword = random6;
      s.passwordHash = await hashPassword(random6);
      needSave = true;
    }
  }

  if (needSave) {
    saveLocalDB(state);
    await syncToBlob(state);
  }

  return list;
}

export async function batchResetClassPasswords(classId: string): Promise<{ success: boolean; count: number }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const classStudents = Object.values(state.users).filter((u) => u.classId === classId && u.role === 'student');
  if (classStudents.length === 0) {
    return { success: false, count: 0 };
  }

  for (const s of classStudents) {
    const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
    s.initialPassword = random6Digits;
    s.passwordHash = await hashPassword(random6Digits);
  }

  saveLocalDB(state);
  await syncToBlob(state);
  return { success: true, count: classStudents.length };
}

export async function deleteStudent(studentId: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const student = state.users[studentId];
  if (student) {
    const classId = student.classId;
    delete state.users[studentId];
    if (classId && state.classes[classId] && state.classes[classId].studentCount > 0) {
      state.classes[classId].studentCount -= 1;
      await syncClassToFirestore(state.classes[classId]);
    }
    saveLocalDB(state);
    await deleteUserFromFirestore(studentId);
    await syncToBlob(state);
    return true;
  }
  return false;
}

/**
 * 老師編輯學生帳號、姓名、座號與重設密碼
 */
export async function updateStudentInfo(
  studentId: string,
  updates: {
    displayName?: string;
    seatNumber?: number;
    username?: string;
    plainPassword?: string;
  }
): Promise<{ success: boolean; error?: string; student?: User }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const student = state.users[studentId];
  if (!student || student.role !== 'student') {
    return { success: false, error: '找不到該學生帳號' };
  }

  // 若要更換帳號，檢查是否有重複
  if (updates.username && updates.username.trim() !== student.username) {
    const trimmed = updates.username.trim();
    const existing = Object.values(state.users).find((u) => u.username === trimmed && u.id !== studentId);
    if (existing) {
      return { success: false, error: `帳號 [${trimmed}] 已被使用，請更換其他帳號` };
    }
    student.username = trimmed;
  }

  if (updates.displayName && updates.displayName.trim()) {
    student.displayName = updates.displayName.trim();
  }

  if (updates.seatNumber !== undefined && !isNaN(Number(updates.seatNumber))) {
    student.seatNumber = Number(updates.seatNumber);
  }

  if (updates.plainPassword && updates.plainPassword.trim()) {
    const plain = updates.plainPassword.trim();
    student.passwordHash = await hashPassword(plain);
    student.initialPassword = plain;
  }

  saveLocalDB(state);
  await syncUserToFirestore(student);
  await syncToBlob(state);
  return { success: true, student };
}

export interface PublicClassDirectoryTeacher {
  id: string;
  displayName: string;
  school?: string;
  classes: Array<{
    id: string;
    name: string;
    gradeLevel: number;
    students: Array<{
      id: string;
      seatNumber?: number;
      displayName: string;
      username: string;
    }>;
  }>;
}

/**
 * 取得學生班級座號快速登入目錄（老師 -> 班級 -> 學生名冊）
 * 不包含任何密碼資料，安全供登入頁面下拉選單使用
 */
export async function getStudentLoginDirectory(): Promise<PublicClassDirectoryTeacher[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();

  // 篩選正常開通的教師
  const teachers = Object.values(state.users)
    .filter((u) => (u.role === 'teacher' || u.role === 'admin') && u.status === 'active')
    .sort((a, b) => (a.school || '').localeCompare(b.school || '', 'zh-TW') || a.displayName.localeCompare(b.displayName, 'zh-TW'));

  const result: PublicClassDirectoryTeacher[] = [];

  for (const t of teachers) {
    const teacherClasses = Object.values(state.classes)
      .filter((c) => c.teacherId === t.id)
      .sort((a, b) => a.gradeLevel - b.gradeLevel || a.name.localeCompare(b.name, 'zh-TW'));

    if (teacherClasses.length === 0) continue;

    const classItems = [];
    for (const c of teacherClasses) {
      const classStudents = Object.values(state.users)
        .filter((u) => u.classId === c.id && u.role === 'student')
        .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0))
        .map((s) => ({
          id: s.id,
          seatNumber: s.seatNumber,
          displayName: s.displayName,
          username: s.username,
        }));

      if (classStudents.length > 0) {
        classItems.push({
          id: c.id,
          name: c.name,
          gradeLevel: c.gradeLevel,
          students: classStudents,
        });
      }
    }

    if (classItems.length > 0) {
      result.push({
        id: t.id,
        displayName: t.displayName,
        school: t.school,
        classes: classItems,
      });
    }
  }

  return result;
}

export async function deleteClass(
  classId: string,
  operatorId?: string,
  role?: string
): Promise<{ success: boolean; error?: string }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const targetClass = state.classes[classId];
  if (!targetClass) {
    return { success: false, error: '找不到該班級' };
  }

  // 權限檢查：只有主責建立者 (teacherId) 或全站管理員 (admin) 才能刪除該班級
  if (operatorId && role !== 'admin' && targetClass.teacherId !== operatorId) {
    return {
      success: false,
      error: '您是受邀協同教師，無權刪除此班級。如不再共同管理，請選擇「退出共同管理」。',
    };
  }

  delete state.classes[classId];
  const studentIdsToDelete: string[] = [];
  for (const [uid, user] of Object.entries(state.users)) {
    if (user.classId === classId) {
      delete state.users[uid];
      studentIdsToDelete.push(uid);
    }
  }
  saveLocalDB(state);

  const toDelete = [
    { collection: 'classes', id: classId },
    ...studentIdsToDelete.map((id) => ({ collection: 'users', id })),
  ];
  await batchDeleteFromFirestore(toDelete);
  await syncToBlob(state);
  return { success: true };
}

/**
 * 取得特定班級之共同管理成員 (主責導師、協同教師清單，以及全校可邀請之合格教師)
 */
export async function getClassCoTeachers(
  classId: string,
  currentTeacherId: string,
  role?: string
): Promise<ClassCoTeachersData | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const targetClass = state.classes[classId];
  if (!targetClass) return null;

  const isOwner = targetClass.teacherId === currentTeacherId || role === 'admin';
  const isCoTeacher = Boolean(targetClass.coTeacherIds?.includes(currentTeacherId));

  // 若既非建立者、非協同教師、也非管理員，則無權檢視
  if (!isOwner && !isCoTeacher && role !== 'admin') {
    return null;
  }

  const userMap = new Map<string, User>();
  Object.values(state.users).forEach((u) => userMap.set(u.id, u));

  // 1. 主責導師
  const ownerUser = userMap.get(targetClass.teacherId);
  const ownerMember: CoTeacherMember = {
    id: targetClass.teacherId,
    displayName: ownerUser?.displayName || '未知教師',
    username: ownerUser?.username || '',
    school: ownerUser?.school,
    role: ownerUser?.role || 'teacher',
    isOwner: true,
  };

  // 2. 目前已加入之協同教師
  const coTeachers: CoTeacherMember[] = [];
  for (const tid of targetClass.coTeacherIds || []) {
    const u = userMap.get(tid);
    if (u) {
      coTeachers.push({
        id: u.id,
        displayName: u.displayName,
        username: u.username,
        school: u.school,
        role: u.role,
        isOwner: false,
      });
    }
  }

  // 3. 全校其他已審核通過且啟用的教師（排除主責導師與目前協同教師）
  const excludedIds = new Set<string>([targetClass.teacherId, ...(targetClass.coTeacherIds || [])]);
  const availableTeachers: CoTeacherMember[] = Object.values(state.users)
    .filter(
      (u) =>
        (u.role === 'teacher' || u.role === 'admin') &&
        u.status === 'active' &&
        !excludedIds.has(u.id)
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-TW'))
    .map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      school: u.school,
      role: u.role,
      isOwner: false,
    }));

  return {
    classId: targetClass.id,
    className: targetClass.name,
    gradeLevel: targetClass.gradeLevel,
    owner: ownerMember,
    coTeachers,
    availableTeachers,
    isOwner,
    isCoTeacher,
  };
}

/**
 * 邀請 / 新增共同管理教師至班級
 */
export async function addCoTeacherToClass(
  classId: string,
  targetTeacherId: string,
  operatorId: string,
  role?: string
): Promise<{ success: boolean; error?: string; class?: ClassRoom }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const targetClass = state.classes[classId];
  if (!targetClass) {
    return { success: false, error: '找不到該班級' };
  }

  // 只有主責導師或管理員可邀請協同教師
  const isOwner = targetClass.teacherId === operatorId || role === 'admin';
  if (!isOwner) {
    return { success: false, error: '只有班級主責導師或管理員可以邀請其他老師共同管理' };
  }

  // 檢查目標教師是否存在
  const targetTeacher = state.users[targetTeacherId];
  if (!targetTeacher || (targetTeacher.role !== 'teacher' && targetTeacher.role !== 'admin')) {
    return { success: false, error: '找不到該教師帳號或該帳號非合格教師' };
  }

  if (targetTeacherId === targetClass.teacherId) {
    return { success: false, error: '該教師已是此班級的主責導師，無須重複邀請' };
  }

  if (!targetClass.coTeacherIds) {
    targetClass.coTeacherIds = [];
  }

  if (targetClass.coTeacherIds.includes(targetTeacherId)) {
    return { success: false, error: '該教師已經在共同管理名單中' };
  }

  targetClass.coTeacherIds.push(targetTeacherId);
  saveLocalDB(state);
  await syncClassToFirestore(targetClass);
  await syncToBlob(state);

  return { success: true, class: targetClass };
}

/**
 * 移除協同教師 / 協同教師主動退出共同管理
 */
export async function removeCoTeacherFromClass(
  classId: string,
  targetTeacherId: string,
  operatorId: string,
  role?: string
): Promise<{ success: boolean; error?: string; class?: ClassRoom }> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const targetClass = state.classes[classId];
  if (!targetClass) {
    return { success: false, error: '找不到該班級' };
  }

  const isOwner = targetClass.teacherId === operatorId || role === 'admin';
  const isSelfLeaving = operatorId === targetTeacherId;

  // 允許主責導師/管理員移除指定的協同教師，也允許協同教師本人自願退出
  if (!isOwner && !isSelfLeaving) {
    return { success: false, error: '只有主責導師、管理員或協同教師本人可執行此操作' };
  }

  if (!targetClass.coTeacherIds || !targetClass.coTeacherIds.includes(targetTeacherId)) {
    return { success: false, error: '該教師不在共同管理名單中' };
  }

  targetClass.coTeacherIds = targetClass.coTeacherIds.filter((id) => id !== targetTeacherId);
  saveLocalDB(state);
  await syncClassToFirestore(targetClass);
  await syncToBlob(state);

  return { success: true, class: targetClass };
}
