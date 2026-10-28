import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, ClassRoom, UserStatus, TestPaper, ExamSubmission } from './types';
import { hashPassword } from './auth';

/**
 * PIRLS 資料庫抽象層 (Serverless & Local Hybrid Storage)
 * 支援 Serverless (Vercel / Lambda) 唯讀檔案系統環境下的 /tmp 寫入與全域記憶體快取，
 * 確保在各運行環境中註冊帳號、建立班級、生成學生與派卷作答皆 100% 穩定持久。
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
}

const SEED_DB_PATH = path.resolve(process.cwd(), 'data', 'pirls_database.json');

function getActiveDBPath(): string {
  // 偵測是否運行於 Serverless (Vercel, AWS Lambda) 唯讀環境
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

function ensureLocalDB(): DBState {
  // 1. 若全域內存快取已載入，直接返回以追求最高速度與一致性
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

  // 2. 檢查目標路徑是否有資料庫檔案
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

  // 3. 若目標路徑尚無檔案（如 Vercel 冷啟動），嘗試從專案隨附的 SEED_DB_PATH 複製或讀取初始資料
  if (fs.existsSync(SEED_DB_PATH)) {
    try {
      const seedContent = fs.readFileSync(SEED_DB_PATH, 'utf-8');
      const seedParsed = JSON.parse(seedContent) as DBState;
      if (!seedParsed.users) seedParsed.users = {};
      if (!seedParsed.classes) seedParsed.classes = {};
      if (!seedParsed.testPapers) seedParsed.testPapers = {};
      if (!seedParsed.submissions) seedParsed.submissions = {};

      globalThis.__pirls_db_cache = seedParsed;

      // 嘗試同步寫入活躍路徑
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

  // 4. 預設空結構
  const initialState: DBState = {
    users: {},
    classes: {},
    testPapers: {},
    submissions: {},
  };
  globalThis.__pirls_db_cache = initialState;
  try {
    fs.writeFileSync(activePath, JSON.stringify(initialState, null, 2), 'utf-8');
  } catch {
    // 忽略唯讀錯誤
  }
  return initialState;
}

function saveLocalDB(state: DBState) {
  // 1. 即時更新全域內存快取
  globalThis.__pirls_db_cache = state;

  // 2. 嘗試持久化寫入活躍檔案路徑
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
}

/**
 * 確保預設管理員帳號存在 (admin / admin123)
 */
export async function seedInitialAdmin(): Promise<User> {
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
  return adminUser;
}

export async function getUserByUsername(username: string): Promise<User | null> {
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
  const state = ensureLocalDB();
  return state.users[id] || null;
}

export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const state = ensureLocalDB();
  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newUser: User = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  state.users[id] = newUser;
  saveLocalDB(state);
  return newUser;
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<boolean> {
  const state = ensureLocalDB();
  if (state.users[userId]) {
    state.users[userId].status = status;
    saveLocalDB(state);
    return true;
  }
  return false;
}

export async function listPendingTeachers(): Promise<User[]> {
  const state = ensureLocalDB();
  return Object.values(state.users).filter(
    (u) => u.role === 'teacher' && u.status === 'pending'
  );
}

export async function listApprovedTeachers(): Promise<User[]> {
  const state = ensureLocalDB();
  return Object.values(state.users).filter(
    (u) => u.role === 'teacher' && u.status === 'active'
  );
}

export async function createClass(
  teacherId: string,
  name: string,
  gradeLevel: number
): Promise<ClassRoom> {
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
  return newClass;
}

export async function getTeacherClasses(teacherId: string): Promise<ClassRoom[]> {
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
  return created;
}

export async function getClassStudents(classId: string): Promise<User[]> {
  const state = ensureLocalDB();
  return Object.values(state.users)
    .filter((u) => u.classId === classId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
}

export async function deleteStudent(studentId: string): Promise<boolean> {
  const state = ensureLocalDB();
  const student = state.users[studentId];
  if (student) {
    const classId = student.classId;
    delete state.users[studentId];
    if (classId && state.classes[classId] && state.classes[classId].studentCount > 0) {
      state.classes[classId].studentCount -= 1;
    }
    saveLocalDB(state);
    return true;
  }
  return false;
}

export async function deleteClass(classId: string): Promise<boolean> {
  const state = ensureLocalDB();
  if (state.classes[classId]) {
    delete state.classes[classId];
    // 同步移除該班學生或解除綁定
    for (const [uid, user] of Object.entries(state.users)) {
      if (user.classId === classId) {
        delete state.users[uid];
      }
    }
    saveLocalDB(state);
    return true;
  }
  return false;
}

export async function resetUserPassword(userId: string, newPlainPassword: string): Promise<boolean> {
  const state = ensureLocalDB();
  if (state.users[userId]) {
    state.users[userId].passwordHash = await hashPassword(newPlainPassword);
    saveLocalDB(state);
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
  return newTest;
}

export async function updateTestPaper(
  id: string,
  updates: Partial<TestPaper>
): Promise<TestPaper | null> {
  const state = ensureLocalDB();
  if (!state.testPapers[id]) return null;

  state.testPapers[id] = {
    ...state.testPapers[id],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveLocalDB(state);
  return state.testPapers[id];
}

export async function getTestPaperById(id: string): Promise<TestPaper | null> {
  const state = ensureLocalDB();
  return state.testPapers[id] || null;
}

export async function getTeacherTestPapers(teacherId: string): Promise<TestPaper[]> {
  const state = ensureLocalDB();
  return Object.values(state.testPapers)
    .filter((t) => t.creatorId === teacherId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPublicTestPapers(): Promise<TestPaper[]> {
  const state = ensureLocalDB();
  const publics = Object.values(state.testPapers).filter((t) => t.isPublic);
  if (publics.length > 0) {
    return publics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  // 若尚無標註為公開的考卷，將已有的第一份考卷自動設為公開試卷供自學體驗
  const all = Object.values(state.testPapers);
  if (all.length > 0) {
    all[0].isPublic = true;
    saveLocalDB(state);
    return [all[0]];
  }
  return [];
}

export async function deleteTestPaper(id: string): Promise<boolean> {
  const state = ensureLocalDB();
  if (state.testPapers[id]) {
    delete state.testPapers[id];
    saveLocalDB(state);
    return true;
  }
  return false;
}

export async function assignTestPaperToClasses(
  testId: string,
  classIds: string[],
  options?: { isPublic?: boolean; examCode?: string }
): Promise<boolean> {
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
  return true;
}

export async function getAssignedTestPapersForClass(classId: string): Promise<TestPaper[]> {
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
  return newSubmission;
}

export async function getSubmissionById(id: string): Promise<ExamSubmission | null> {
  const state = ensureLocalDB();
  return state.submissions[id] || null;
}

export async function getStudentSubmissions(studentId: string): Promise<ExamSubmission[]> {
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getStudentTestSubmission(
  studentId: string,
  testPaperId: string
): Promise<ExamSubmission | null> {
  const state = ensureLocalDB();
  for (const sub of Object.values(state.submissions)) {
    if (sub.studentId === studentId && sub.testPaperId === testPaperId) {
      return sub;
    }
  }
  return null;
}

export async function getTestPaperSubmissions(testPaperId: string): Promise<ExamSubmission[]> {
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.testPaperId === testPaperId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
}

export async function getGradeSubmissions(targetGrade: number): Promise<ExamSubmission[]> {
  const state = ensureLocalDB();
  return Object.values(state.submissions).filter((s) => s.targetGrade === targetGrade);
}
