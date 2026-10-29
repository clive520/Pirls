import fs from 'fs';
import path from 'path';
import os from 'os';
import { put, list, getDownloadUrl } from '@vercel/blob';
import { User, ClassRoom, UserRole, UserStatus, TestPaper, ExamSubmission, StudentAnswer } from './types';
import { hashPassword } from './auth';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  calculatePercentileRank,
  estimateTheoreticalPR,
} from './pirls-norm';

/**
 * PIRLS 資料庫抽象層 (Serverless Vercel Blob & Local Hybrid Multi-tier Storage)
 * 1. 雲端持久層：透過 Vercel Blob 進行跨 Serverless 實例資料即時同調。
 * 2. 邊緣快取層：記憶體單例快取 (globalThis) 達到 0ms 極速讀取。
 * 3. 容錯備援層：/tmp 檔案鏡像與隨附種子資料庫 (pirls_database.json)。
 */

interface DBState {
  users: Record<string, User>;
  classes: Record<string, ClassRoom>;
  testPapers: Record<string, TestPaper>;
  submissions: Record<string, ExamSubmission>;
}

declare global {
  // eslint-disable-next-line no-var
  var __pirls_db_cache: DBState | undefined;
  // eslint-disable-next-line no-var
  var __pirls_blob_synced: boolean | undefined;
}

const SEED_DB_PATH = path.resolve(process.cwd(), 'data', 'pirls_database.json');
const BLOB_FILE_NAME = 'database/pirls_database.json';

function getActiveDBPath(): string {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NODE_ENV === 'production'
  );

  if (isServerless) {
    return path.join(os.tmpdir(), 'pirls_database.json');
  }
  return SEED_DB_PATH;
}

async function fetchFromBlob(): Promise<DBState | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: BLOB_FILE_NAME, token });
    if (blobs && blobs.length > 0) {
      const downloadUrl = blobs[0].downloadUrl || getDownloadUrl(blobs[0].url);
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as DBState;
        if (!data.users) data.users = {};
        if (!data.classes) data.classes = {};
        if (!data.testPapers) data.testPapers = {};
        if (!data.submissions) data.submissions = {};
        return data;
      }
    }
  } catch (err) {
    console.warn('[DB] Blob fetch note:', err);
  }
  return null;
}

async function syncToBlob(state: DBState): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await put(BLOB_FILE_NAME, JSON.stringify(state, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
  } catch (err) {
    console.warn('[DB] Blob sync warning:', err);
  }
}

async function syncCloudOnBoot(): Promise<void> {
  if (globalThis.__pirls_blob_synced) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    globalThis.__pirls_blob_synced = true;
    return;
  }
  try {
    const cloud = await fetchFromBlob();
    if (cloud) {
      globalThis.__pirls_db_cache = cloud;
      try {
        fs.writeFileSync(getActiveDBPath(), JSON.stringify(cloud, null, 2), 'utf-8');
      } catch {}
    } else {
      const seed = ensureLocalDB();
      syncToBlob(seed).catch(() => {});
    }
  } catch (err) {
    console.warn('[DB] syncCloudOnBoot error:', err);
  } finally {
    globalThis.__pirls_blob_synced = true;
  }
}

function ensureLocalDB(): DBState {
  if (globalThis.__pirls_db_cache) {
    return globalThis.__pirls_db_cache;
  }

  const activePath = getActiveDBPath();
  const dir = path.dirname(activePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn('[DB] Failed to ensure directory:', e);
  }

  if (fs.existsSync(activePath)) {
    try {
      const content = fs.readFileSync(activePath, 'utf-8');
      const parsed = JSON.parse(content) as DBState;
      if (!parsed.users) parsed.users = {};
      if (!parsed.classes) parsed.classes = {};
      if (!parsed.testPapers) parsed.testPapers = {};
      if (!parsed.submissions) parsed.submissions = {};
      globalThis.__pirls_db_cache = parsed;
      return parsed;
    } catch (e) {
      console.warn('[DB] Failed to parse active db file:', e);
    }
  }

  if (fs.existsSync(SEED_DB_PATH)) {
    try {
      const seedContent = fs.readFileSync(SEED_DB_PATH, 'utf-8');
      const seedParsed = JSON.parse(seedContent) as DBState;
      if (!seedParsed.users) seedParsed.users = {};
      if (!seedParsed.classes) seedParsed.classes = {};
      if (!seedParsed.testPapers) seedParsed.testPapers = {};
      if (!seedParsed.submissions) seedParsed.submissions = {};

      globalThis.__pirls_db_cache = seedParsed;

      try {
        fs.writeFileSync(activePath, JSON.stringify(seedParsed, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('[DB] Initial seed sync warning (harmless):', writeErr);
      }

      return seedParsed;
    } catch (e) {
      console.warn('[DB] Failed to read seed db file:', e);
    }
  }

  const initialState: DBState = {
    users: {},
    classes: {},
    testPapers: {},
    submissions: {},
  };
  globalThis.__pirls_db_cache = initialState;
  try {
    fs.writeFileSync(activePath, JSON.stringify(initialState, null, 2), 'utf-8');
  } catch {}
  return initialState;
}

function saveLocalDB(state: DBState) {
  globalThis.__pirls_db_cache = state;

  try {
    const activePath = getActiveDBPath();
    const dir = path.dirname(activePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(activePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] File save warning (memory state retained):', err);
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    syncToBlob(state).catch((e) => console.warn('[DB] Blob sync error:', e));
  }
}

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
    }

    // 2. 轉移學生
    for (const s of teacherStudents) {
      s.teacherId = options.targetTeacherId;
    }

    // 3. 轉移試卷與文章（方案 A：校本資產保護，完整移交新任教師）
    for (const t of Object.values(state.testPapers)) {
      if (t.creatorId === teacherId) {
        t.creatorId = options.targetTeacherId;
        t.creatorName = `${teacher.displayName} (由 ${targetTeacher.displayName} 接手)`;
      }
    }

    // 4. 刪除原教師帳號
    delete state.users[teacherId];

    saveLocalDB(state);
    await syncToBlob(state);

    return {
      success: true,
      message: `已成功將【${teacher.displayName}】名下的 ${teacherClasses.length} 個班級、${teacherStudents.length} 位學生及相關試卷與成績移交給【${targetTeacher.displayName}】，並刪除原教師帳號。`,
    };
  } else if (options.deleteMode === 'cascade') {
    // 連帶刪除該教師名下所有班級、學生與作答成績
    let deletedSubmissionsCount = 0;
    for (const [subId, sub] of Object.entries(state.submissions)) {
      if (
        (sub.studentId && teacherStudentIds.has(sub.studentId)) ||
        (sub.classId && teacherClassIds.has(sub.classId))
      ) {
        delete state.submissions[subId];
        deletedSubmissionsCount++;
      }
    }

    // 刪除學生
    for (const s of teacherStudents) {
      delete state.users[s.id];
    }

    // 刪除班級
    for (const c of teacherClasses) {
      delete state.classes[c.id];
    }

    // 4. 方案 A：校本教學資產保護 — 教師所建立的文章與題本「全數安全保留」，轉為全校公共題庫！
    let preservedPapersCount = 0;
    for (const [tid, tp] of Object.entries(state.testPapers)) {
      if (tp.creatorId === teacherId) {
        tp.creatorId = 'admin_root_001';
        tp.creatorName = `${teacher.displayName}（已歸檔校本公共題庫）`;
        tp.isPublic = true; // 設為全校公共題庫與開放練習，供全校師生調用
        tp.assignedClassIds = []; // 清空已刪除班級之綁定
        preservedPapersCount++;
      }
    }

    // 刪除教師自身
    delete state.users[teacherId];

    saveLocalDB(state);
    await syncToBlob(state);

    return {
      success: true,
      message: `已徹底刪除【${teacher.displayName}】及其名下 ${teacherClasses.length} 個班級、${teacherStudents.length} 位學生與 ${deletedSubmissionsCount} 份測驗作答成績；依據校本教材資產管理規範（方案 A），該教師建立的 ${preservedPapersCount} 篇閱讀文章與題本已全數安全保留，並自動歸檔至「全校公共題庫」！`,
    };
  }

  return { success: false, error: '未知的刪除處置模式', message: '' };
}

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
  await syncToBlob(state);
  return newClass;
}

export async function getTeacherClasses(teacherId: string): Promise<ClassRoom[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.classes).filter((c) => c.teacherId === teacherId);
}

export async function createStudentsBatch(
  teacherId: string,
  classId: string,
  students: Array<{
    username: string;
    plainPassword: string;
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
    const pwdHash = await hashPassword(s.plainPassword);
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
  return Object.values(state.users)
    .filter((u) => u.classId === classId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
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
    }
    saveLocalDB(state);
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
    student.passwordHash = await hashPassword(updates.plainPassword.trim());
  }

  saveLocalDB(state);
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
    for (const [uid, user] of Object.entries(state.users)) {
      if (user.classId === classId) {
        delete state.users[uid];
      }
    }
    saveLocalDB(state);
    await syncToBlob(state);
    return true;
  }
  return false;
}

export async function resetUserPassword(userId: string, newPlainPassword: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (state.users[userId]) {
    state.users[userId].passwordHash = await hashPassword(newPlainPassword);
    saveLocalDB(state);
    await syncToBlob(state);
    return true;
  }
  return false;
}

/* ==========================================================
   試卷 (TestPaper) 資料庫操作
   ========================================================== */

export async function createTestPaper(
  data: Omit<TestPaper, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestPaper> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const id = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const newTest: TestPaper = {
    ...data,
    id,
    assignedClassIds: data.assignedClassIds || [],
    createdAt: now,
    updatedAt: now,
  };
  state.testPapers[id] = newTest;
  saveLocalDB(state);
  await syncToBlob(state);
  return newTest;
}

export async function updateTestPaper(
  id: string,
  updates: Partial<TestPaper>
): Promise<TestPaper | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (!state.testPapers[id]) return null;

  state.testPapers[id] = {
    ...state.testPapers[id],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveLocalDB(state);
  await syncToBlob(state);
  return state.testPapers[id];
}

export async function getTestPaperById(id: string): Promise<TestPaper | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return state.testPapers[id] || null;
}

export async function getTeacherTestPapers(teacherId: string): Promise<TestPaper[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.testPapers)
    .filter((t) => t.creatorId === teacherId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPublicTestPapers(): Promise<TestPaper[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const publics = Object.values(state.testPapers).filter((t) => t.isPublic);
  if (publics.length > 0) {
    return publics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const all = Object.values(state.testPapers);
  if (all.length > 0) {
    all[0].isPublic = true;
    saveLocalDB(state);
    await syncToBlob(state);
    return [all[0]];
  }
  return [];
}

export async function deleteTestPaper(id: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (state.testPapers[id]) {
    delete state.testPapers[id];
    saveLocalDB(state);
    await syncToBlob(state);
    return true;
  }
  return false;
}

export async function assignTestPaperToClasses(
  testId: string,
  classIds: string[],
  options?: { isPublic?: boolean; examCode?: string }
): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (!state.testPapers[testId]) return false;
  state.testPapers[testId].assignedClassIds = classIds;
  if (options && typeof options.isPublic === 'boolean') {
    state.testPapers[testId].isPublic = options.isPublic;
  }
  if (options && typeof options.examCode === 'string') {
    state.testPapers[testId].examCode = options.examCode;
  }
  state.testPapers[testId].updatedAt = new Date().toISOString();
  saveLocalDB(state);
  await syncToBlob(state);
  return true;
}

export async function getAssignedTestPapersForClass(classId: string): Promise<TestPaper[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.testPapers).filter(
    (t) => t.assignedClassIds && t.assignedClassIds.includes(classId)
  );
}

/* ==========================================================
   學生作答與批改紀錄 (ExamSubmission) 資料庫操作
   ========================================================== */

export async function createSubmission(
  data: Omit<ExamSubmission, 'id' | 'submittedAt'>
): Promise<ExamSubmission> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const newSubmission: ExamSubmission = {
    ...data,
    id,
    submittedAt: now,
  };
  state.submissions[id] = newSubmission;
  saveLocalDB(state);
  await syncToBlob(state);
  return newSubmission;
}

export async function getSubmissionById(id: string): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return state.submissions[id] || null;
}

export async function getStudentSubmissions(studentId: string): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getStudentTestSubmission(
  studentId: string,
  testPaperId: string
): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  for (const sub of Object.values(state.submissions)) {
    if (sub.studentId === studentId && sub.testPaperId === testPaperId) {
      return sub;
    }
  }
  return null;
}

export async function getTestPaperSubmissions(testPaperId: string): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.testPaperId === testPaperId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
}

export async function getGradeSubmissions(targetGrade: number): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions).filter((s) => s.targetGrade === targetGrade);
}

/**
 * 教師閱卷改分與複核更新：
 * 重新計算總分、百分比、四維度得分率、PIRLS 國際量尺標準分、能力基準與全班同儕 PR
 */
export async function updateSubmissionReview(
  submissionId: string,
  reviewerName: string,
  answersUpdates: Array<{
    questionId: string;
    newScore: number;
    teacherComment?: string;
  }>,
  teacherGeneralNote?: string
): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const sub = state.submissions[submissionId];
  if (!sub) return null;

  const updateMap = new Map(answersUpdates.map((u) => [u.questionId, u]));

  const processEarned = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const processTotal = { 1: 0, 2: 0, 3: 0, 4: 0 };

  const updatedAnswers: StudentAnswer[] = sub.answers.map((ans) => {
    const pLevel = ans.processLevelNumber as 1 | 2 | 3 | 4;
    processTotal[pLevel] += ans.points;

    const update = updateMap.get(ans.questionId);
    if (update !== undefined) {
      const origScore = ans.originalScore !== undefined ? ans.originalScore : ans.score;
      const validScore = Math.max(0, Math.min(ans.points, Number(update.newScore)));
      processEarned[pLevel] += validScore;
      return {
        ...ans,
        originalScore: origScore,
        score: validScore,
        isTeacherReviewed: true,
        teacherScore: validScore,
        teacherComment: update.teacherComment !== undefined ? update.teacherComment : ans.teacherComment,
      };
    } else {
      processEarned[pLevel] += ans.score;
      return ans;
    }
  });

  const totalScore = Object.values(processEarned).reduce((a, b) => a + b, 0);
  const maxScore = sub.maxScore;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // 重新計算量尺與常模
  const scaleScore = calculatePIRLSScaleScore(totalScore, maxScore);
  const benchmark = getBenchmarkInfo(scaleScore);
  const normPR = estimateTheoreticalPR(scaleScore);

  sub.answers = updatedAnswers;
  sub.totalScore = totalScore;
  sub.percentage = percentage;
  sub.scaleScore = scaleScore;
  sub.benchmarkKey = benchmark.key;
  sub.benchmarkName = benchmark.name;
  sub.benchmarkDescription = benchmark.description;
  sub.normPR = normPR;
  sub.processScores = {
    level1: {
      earned: processEarned[1],
      total: processTotal[1],
      percentage: processTotal[1] > 0 ? Math.round((processEarned[1] / processTotal[1]) * 100) : 0,
    },
    level2: {
      earned: processEarned[2],
      total: processTotal[2],
      percentage: processTotal[2] > 0 ? Math.round((processEarned[2] / processTotal[2]) * 100) : 0,
    },
    level3: {
      earned: processEarned[3],
      total: processTotal[3],
      percentage: processTotal[3] > 0 ? Math.round((processEarned[3] / processTotal[3]) * 100) : 0,
    },
    level4: {
      earned: processEarned[4],
      total: processTotal[4],
      percentage: processTotal[4] > 0 ? Math.round((processEarned[4] / processTotal[4]) * 100) : 0,
    },
  };
  sub.isTeacherReviewed = true;
  sub.reviewedAt = new Date().toISOString();
  sub.reviewedBy = reviewerName;
  if (teacherGeneralNote !== undefined) {
    sub.teacherGeneralNote = teacherGeneralNote;
  }

  // 重新計算同試卷所有學生的班級同儕 PR
  const testSubs = Object.values(state.submissions).filter((s) => s.testPaperId === sub.testPaperId);
  const allScores = testSubs.map((s) => s.totalScore);
  for (const s of testSubs) {
    s.classPR = calculatePercentileRank(s.totalScore, allScores);
  }

  saveLocalDB(state);
  await syncToBlob(state);
  return sub;
}
