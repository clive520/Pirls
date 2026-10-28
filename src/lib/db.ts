import fs from 'fs';
import path from 'path';
import { User, ClassRoom, UserStatus, TestPaper, ExamSubmission } from './types';
import { hashPassword } from './auth';

/**
 * PIRLS 資料庫抽象層 (Firebase Database Abstraction)
 * 支援 Firebase 與 本地持久化資料存儲 (Zero-config Dual Mode)，
 * 確保在尚未配置 Firebase 雲端金鑰時亦可立即啟動與完整測試。
 */

interface DBState {
  users: Record<string, User>;
  classes: Record<string, ClassRoom>;
  testPapers: Record<string, TestPaper>;
  submissions: Record<string, ExamSubmission>;
}

const LOCAL_DB_PATH = path.resolve(process.cwd(), 'data', 'pirls_database.json');

function ensureLocalDB(): DBState {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initialState: DBState = {
      users: {},
      classes: {},
      testPapers: {},
      submissions: {},
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }

  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const parsed = JSON.parse(content) as DBState;
    if (!parsed.testPapers) parsed.testPapers = {};
    if (!parsed.submissions) parsed.submissions = {};
    return parsed;
  } catch {
    return { users: {}, classes: {}, testPapers: {}, submissions: {} };
  }
}

function saveLocalDB(state: DBState) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
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
  return Object.values(state.users).filter((u) => u.classId === classId);
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
