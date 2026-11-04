import { TestPaper } from '../types';
import {
  ensureLocalDB,
  saveLocalDB,
  syncCloudOnBoot,
  syncToBlob,
  syncTestPaperToFirestore,
  deleteTestPaperFromFirestore,
} from './core';

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

  // 直接以單文檔原子寫入 Firestore testPapers 集合，保證即時持久化且不受 1MB 總庫限制！
  await syncTestPaperToFirestore(newTest).catch((e) => console.warn('[DB] Direct Firestore testPaper write warning:', e));
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
  const updated = state.testPapers[id];
  saveLocalDB(state);

  await syncTestPaperToFirestore(updated).catch((e) => console.warn('[DB] Direct Firestore testPaper update warning:', e));
  await syncToBlob(state);
  return updated;
}

export async function getTestPaperById(id: string): Promise<TestPaper | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return state.testPapers[id] || null;
}

export async function getTeacherTestPapers(teacherId: string, isAdmin: boolean = false): Promise<TestPaper[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.testPapers)
    .filter((t) => isAdmin || t.creatorId === teacherId || t.isPublic)
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
    await deleteTestPaperFromFirestore(id).catch((e) => console.warn('[DB] Direct Firestore testPaper delete note:', e));
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
