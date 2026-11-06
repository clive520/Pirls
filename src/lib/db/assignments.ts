import {
  ensureLocalDB,
  saveLocalDB,
  syncCloudOnBoot,
  syncToBlob,
  syncAssignmentToFirestore,
  deleteAssignmentFromFirestore,
  DBState,
} from './core';
import { getTeacherClasses } from './classes';
import { TestAssignment, TestPaper, ClassRoom, ExamSubmission } from '../types';

/**
 * 輔助格式化派卷日期 (如 11/07)
 */
function formatMonthDay(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

/**
 * 自動向下相容無縫遷移：
 * 若系統啟動時偵測到既有試卷帶有 assignedClassIds 但尚未建立 TestAssignment 記錄，
 * 自動為其無損生成歷史指派事件，並關聯既有繳卷紀錄。
 */
export function autoMigrateLegacyAssignments(state: DBState): boolean {
  if (!state.assignments) {
    state.assignments = {};
  }

  let migratedCount = 0;
  const papers = Object.values(state.testPapers || {});

  for (const paper of papers) {
    if (paper.assignedClassIds && Array.isArray(paper.assignedClassIds) && paper.assignedClassIds.length > 0) {
      for (const classId of paper.assignedClassIds) {
        const cls = state.classes ? state.classes[classId] : null;
        const assignmentId = `asgn_migrated_${paper.id}_${classId}`;

        // 檢查此試卷與此班級是否已存在任何指派記錄（避免已建立指派的試卷被重複建立遷移副本）
        const hasExisting = Object.values(state.assignments).some(
          (a) => a.testPaperId === paper.id && a.classId === classId
        );

        if (!hasExisting && !state.assignments[assignmentId]) {
          const dateStr = paper.createdAt ? new Date(paper.createdAt) : new Date();
          const tName = paper.creatorName || '任課教師';
          const asgn: TestAssignment = {
            id: assignmentId,
            testPaperId: paper.id,
            testPaperTitle: paper.title,
            teacherId: paper.creatorId,
            teacherName: tName,
            classId,
            className: cls ? cls.name : '指派班級',
            gradeLevel: cls ? cls.gradeLevel : paper.targetGrade || 4,
            assignmentTitle: `《${paper.title}》(${tName} 歷程派卷)`,
            allowRetake: paper.allowRetake !== false,
            examCode: paper.examCode || '',
            deadlineType: 'unlimited',
            dueDate: null,
            status: 'active',
            createdAt: paper.createdAt || new Date().toISOString(),
            updatedAt: paper.updatedAt || new Date().toISOString(),
          };
          state.assignments[assignmentId] = asgn;
          migratedCount++;
        }
      }
    }
  }

  // 關聯無 assignmentId 的歷史學生繳卷
  if (state.submissions) {
    for (const sub of Object.values(state.submissions)) {
      if (!sub.assignmentId && sub.testPaperId && sub.classId) {
        const candidateId = `asgn_migrated_${sub.testPaperId}_${sub.classId}`;
        if (state.assignments[candidateId]) {
          sub.assignmentId = candidateId;
        }
      }
    }
  }

  if (migratedCount > 0) {
    saveLocalDB(state);
  }

  return migratedCount > 0;
}

export interface CreateAssignmentsParams {
  testPaperId: string;
  classIds: string[];
  teacherId: string;
  teacherName: string;
  allowRetake?: boolean;
  examCode?: string;
  deadlineType?: 'unlimited' | 'scheduled';
  dueDate?: string | null;
}

/**
 * 核心指派：為選取的各個班級「分別建立獨立指派事件」
 * 各班擁有專屬指派 ID，設定互不干擾！
 */
export async function createAssignmentsForClasses(
  params: CreateAssignmentsParams
): Promise<TestAssignment[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  autoMigrateLegacyAssignments(state);

  const paper = state.testPapers[params.testPaperId];
  if (!paper) {
    throw new Error('找不到欲指派的試卷');
  }

  const createdAssignments: TestAssignment[] = [];
  const now = new Date();
  const dateTag = formatMonthDay(now);

  for (const classId of params.classIds) {
    const cls = state.classes[classId];
    if (!cls) continue;

    const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignmentTitle = `《${paper.title}》(${params.teacherName} ${dateTag} 派卷)`;

    const newAssignment: TestAssignment = {
      id: assignmentId,
      testPaperId: paper.id,
      testPaperTitle: paper.title,
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      classId: cls.id,
      className: cls.name,
      gradeLevel: cls.gradeLevel,
      assignmentTitle,
      allowRetake: params.allowRetake !== false,
      examCode: (params.examCode || '').trim(),
      deadlineType: params.deadlineType || 'unlimited',
      dueDate: params.deadlineType === 'scheduled' && params.dueDate ? params.dueDate : null,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (!state.assignments) {
      state.assignments = {};
    }
    state.assignments[assignmentId] = newAssignment;
    createdAssignments.push(newAssignment);

    // 同步至 Cloud Firestore
    await syncAssignmentToFirestore(newAssignment).catch((e) =>
      console.warn('[DB] Firestore assignment sync note:', e)
    );

    // 保持試卷庫 assignedClassIds 快取兼向下相容
    if (!paper.assignedClassIds) paper.assignedClassIds = [];
    if (!paper.assignedClassIds.includes(cls.id)) {
      paper.assignedClassIds.push(cls.id);
    }
  }

  saveLocalDB(state);
  await syncToBlob(state);

  return createdAssignments;
}

/**
 * 取得特定教師可見的指派任務（包含自己發起的任務、以及所協同班級中的所有任務）
 * 滿足「協同教師享有完全共同管理權」規範！
 */
export async function getTeacherAssignments(
  teacherId: string,
  isAdmin: boolean = false
): Promise<TestAssignment[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  autoMigrateLegacyAssignments(state);

  const teacherClasses = await getTeacherClasses(teacherId, isAdmin ? 'admin' : 'teacher');
  const accessibleClassIds = new Set(teacherClasses.map((c) => c.id));

  const allAssignments = Object.values(state.assignments || {});

  return allAssignments
    .filter(
      (asgn) =>
        isAdmin ||
        asgn.teacherId === teacherId ||
        accessibleClassIds.has(asgn.classId)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 取得特定班級目前開放中的指派任務（學生專屬）
 */
export async function getClassAssignments(classId: string): Promise<TestAssignment[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  autoMigrateLegacyAssignments(state);

  const allAssignments = Object.values(state.assignments || {});
  return allAssignments
    .filter((asgn) => asgn.classId === classId && asgn.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 依 ID 取得單筆指派事件
 */
export async function getAssignmentById(id: string): Promise<TestAssignment | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  autoMigrateLegacyAssignments(state);

  return state.assignments?.[id] || null;
}

/**
 * 更新指派事件（修改截止期限、切換開放狀態、安全碼等）
 */
export async function updateAssignment(
  id: string,
  updates: Partial<TestAssignment>
): Promise<TestAssignment | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (!state.assignments || !state.assignments[id]) return null;

  const current = state.assignments[id];
  const updated: TestAssignment = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  state.assignments[id] = updated;
  saveLocalDB(state);

  await syncAssignmentToFirestore(updated).catch((e) =>
    console.warn('[DB] Firestore assignment update note:', e)
  );
  await syncToBlob(state);

  return updated;
}

/**
 * 刪除或撤回指派事件（不影響題庫試卷與其他班級指派）
 */
export async function deleteAssignment(id: string): Promise<boolean> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  if (!state.assignments || !state.assignments[id]) return false;

  const target = state.assignments[id];
  delete state.assignments[id];

  // 檢查該試卷是否在此班級還有其他指派，若無則自 paper.assignedClassIds 移除
  const paper = state.testPapers[target.testPaperId];
  if (paper && paper.assignedClassIds) {
    const hasOtherSameClass = Object.values(state.assignments).some(
      (a) => a.testPaperId === target.testPaperId && a.classId === target.classId
    );
    if (!hasOtherSameClass) {
      paper.assignedClassIds = paper.assignedClassIds.filter((cid) => cid !== target.classId);
    }
  }

  saveLocalDB(state);
  await deleteAssignmentFromFirestore(id).catch((e) =>
    console.warn('[DB] Firestore assignment delete note:', e)
  );
  await syncToBlob(state);

  return true;
}

export interface AssignmentProgressStats {
  assignmentId: string;
  totalStudents: number;
  submittedCount: number;
  avgScore: number;
  maxScore: number;
}

/**
 * 取得各指派事件的繳卷進度與分數統計
 */
export async function getAssignmentsProgressStats(
  assignmentIds?: string[]
): Promise<Record<string, AssignmentProgressStats>> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  autoMigrateLegacyAssignments(state);

  const statsMap: Record<string, AssignmentProgressStats> = {};
  const targetIds = assignmentIds || Object.keys(state.assignments || {});
  const allSubs = Object.values(state.submissions || {});

  for (const asgnId of targetIds) {
    const asgn = state.assignments?.[asgnId];
    if (!asgn) continue;

    const cls = state.classes[asgn.classId];
    const totalStudents = cls?.studentCount || 0;

    // 尋找此指派下的繳卷（優先比對 assignmentId，次之比對 testPaperId + classId 相容歷程）
    const matchingSubs = allSubs.filter(
      (s) =>
        s.assignmentId === asgnId ||
        (!s.assignmentId &&
          s.testPaperId === asgn.testPaperId &&
          s.classId === asgn.classId)
    );

    const submittedCount = matchingSubs.length;
    let avgScore = 0;
    let maxScore = 0;

    if (submittedCount > 0) {
      const sum = matchingSubs.reduce((acc, s) => acc + s.totalScore, 0);
      avgScore = Math.round((sum / submittedCount) * 10) / 10;
      maxScore = Math.max(...matchingSubs.map((s) => s.totalScore));
    }

    statsMap[asgnId] = {
      assignmentId: asgnId,
      totalStudents,
      submittedCount,
      avgScore,
      maxScore,
    };
  }

  return statsMap;
}
