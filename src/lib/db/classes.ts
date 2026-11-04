import { User, ClassRoom } from '../types';
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
  if (role === 'admin') {
    // 系統管理員可檢視與管理全校所有班級（含自己建立的班級）
    return Object.values(state.classes);
  }
  return Object.values(state.classes).filter((c) => c.teacherId === teacherId);
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

export async function deleteClass(classId: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (state.classes[classId]) {
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
    return true;
  }
  return false;
}
