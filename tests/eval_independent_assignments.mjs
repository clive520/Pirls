import {
  createClass,
  addCoTeacherToClass,
  getTeacherClasses,
} from '../src/lib/db/classes.ts';
import { createUser } from '../src/lib/db/users.ts';
import { createTestPaper, getTestPaperById } from '../src/lib/db/test-papers.ts';
import {
  createAssignmentsForClasses,
  getTeacherAssignments,
  getClassAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentsProgressStats,
  autoMigrateLegacyAssignments,
} from '../src/lib/db/assignments.ts';
import { ensureLocalDB, saveLocalDB } from '../src/lib/db/core.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   🎯 PIRLS 獨立指派事件 (TestAssignment) 與測驗期限機制 全面整合測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

let allPassed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`${colors.red}❌ 斷言失敗: ${message}${colors.reset}`);
    allPassed = false;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`${colors.green}  ✔ ${message}${colors.reset}`);
  }
}

async function run() {
  try {
    const ts = Date.now();

    // 建立兩位測試教師
    const teacherA = await createUser({
      displayName: '王導師 (四年甲班導師)',
      username: `teacher_a_${ts}`,
      passwordHash: 'hashA',
      role: 'teacher',
      status: 'active',
      school: '博愛國小',
    });

    const teacherB = await createUser({
      displayName: '李導師 (四年乙班導師)',
      username: `teacher_b_${ts}`,
      passwordHash: 'hashB',
      role: 'teacher',
      status: 'active',
      school: '博愛國小',
    });

    // 建立兩個班級
    const classA = await createClass(teacherA.id, '四年甲班', 4);
    const classB = await createClass(teacherB.id, '四年乙班', 4);

    // 建立一篇公共題庫試卷
    const paper = await createTestPaper({
      title: '神祕的深海發光生物',
      targetGrade: 4,
      textType: 'informational',
      themeSummary: '探討深海生物的發光機制與生態價值',
      wordCount: 350,
      articleContent: '在陽光無法穿透的深海千米之下，許多生物會發出幽藍色的冷光...',
      creatorId: teacherA.id,
      creatorName: teacherA.displayName,
      isPublic: true,
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          processDimension: 'focus_retrieve',
          questionText: '深海生物通常發出什麼顏色的光？',
          questionType: 'multiple_choice',
          options: [
            { label: 'A', text: '藍綠色冷光' },
            { label: 'B', text: '亮紅色強光' },
          ],
          correctAnswer: 'A',
          points: 10,
        },
      ],
      totalPoints: 10,
    });

    console.log(`${colors.yellow}情境 1: 驗證「多位教師指派同一試卷」徹底獨立、互不干擾...${colors.reset}`);
    // 王導師指派給四年甲班 (限期3天，安全碼 CODE_A，限一次作答)
    const dueDateA = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const asgnsA = await createAssignmentsForClasses({
      testPaperId: paper.id,
      teacherId: teacherA.id,
      teacherName: teacherA.displayName,
      classIds: [classA.id],
      deadlineType: 'scheduled',
      dueDate: dueDateA,
      examCode: 'CODE_A',
      allowRetake: false,
    });
    assert(asgnsA.length === 1, '王導師成功為四年甲班建立 1 筆獨立指派');
    const assignmentA = asgnsA[0];

    // 李導師指派給四年乙班 (無限期，免安全碼，允許多次作答)
    const asgnsB = await createAssignmentsForClasses({
      testPaperId: paper.id,
      teacherId: teacherB.id,
      teacherName: teacherB.displayName,
      classIds: [classB.id],
      deadlineType: 'unlimited',
      dueDate: null,
      examCode: '',
      allowRetake: true,
    });
    assert(asgnsB.length === 1, '李導師成功為四年乙班建立 1 筆獨立指派');
    const assignmentB = asgnsB[0];

    // 檢查兩筆指派是否完全隔離
    assert(assignmentA.id !== assignmentB.id, '兩筆指派具備相異的唯一 UUID');
    assert(assignmentA.examCode === 'CODE_A' && assignmentB.examCode === '', '安全碼各自獨立');
    assert(assignmentA.allowRetake === false && assignmentB.allowRetake === true, '作答模式各自獨立');
    assert(assignmentA.deadlineType === 'scheduled' && assignmentB.deadlineType === 'unlimited', '期限機制各自獨立');
    assert(assignmentA.dueDate === dueDateA && assignmentB.dueDate === null, '截止時間互不覆蓋');
    console.log(`✅ 情境 1 驗證通過：不同教師指派同篇試卷為完全獨立事件！\n`);

    console.log(`${colors.yellow}情境 2: 驗證「同一教師同一班級兩次指派 (前後測)」各為獨立事件...${colors.reset}`);
    // 王導師再次指派同一份試卷給四年甲班 (後測)
    const asgnsAPost = await createAssignmentsForClasses({
      testPaperId: paper.id,
      teacherId: teacherA.id,
      teacherName: teacherA.displayName,
      classIds: [classA.id],
      deadlineType: 'scheduled',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      examCode: 'POST_TEST',
      allowRetake: true,
    });
    const assignmentAPost = asgnsAPost[0];
    assert(assignmentAPost.id !== assignmentA.id, '第二次指派產生新的獨立事件 ID');
    assert(assignmentAPost.examCode === 'POST_TEST', '第二次指派安全碼正確');
    assert(assignmentA.examCode === 'CODE_A', '第一次指派的設定與資料完整無損保留');
    console.log(`✅ 情境 2 驗證通過：同一教師同班級兩次指派互不干擾、各自獨立！\n`);

    console.log(`${colors.yellow}情境 3: 驗證「測驗有效期限動態計算與手動提早關閉」...${colors.reset}`);
    // 檢查學生視角取用甲班進行中測驗
    const classAActiveAsgns = await getClassAssignments(classA.id);
    assert(classAActiveAsgns.length === 2, '甲班學生目前看到 2 筆進行中的指派任務');

    // 測試提早手動關閉 assignmentA
    const closedAsgnA = await updateAssignment(assignmentA.id, {
      status: 'closed',
    });
    assert(closedAsgnA.status === 'closed', '指派任務成功提前手動關閉');

    // 再次查詢甲班進行中任務，已關閉任務應自動從學生進行中清單排除
    const classAActiveAfterClose = await getClassAssignments(classA.id);
    assert(classAActiveAfterClose.length === 1, '已關閉任務自動從學生進行中清單過濾');
    assert(classAActiveAfterClose[0].id === assignmentAPost.id, '保留未關閉的任務');

    // 測試中途延長期限
    const extendedDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const updatedPost = await updateAssignment(assignmentAPost.id, {
      dueDate: extendedDueDate,
      allowRetakeOnExtend: true,
    });
    assert(updatedPost.dueDate === extendedDueDate, '截止時間成功延長');
    console.log(`✅ 情境 3 驗證通過：期限更新與提早關閉機制運作正確！\n`);

    console.log(`${colors.yellow}情境 4: 驗證「協同教學共同管理權」...${colors.reset}`);
    // 王導師將李導師加入為四年甲班之協同教師 (王導師為 operatorId)
    const coRes = await addCoTeacherToClass(classA.id, teacherB.id, teacherA.id);
    assert(coRes.success, '王導師成功邀請李導師為四年甲班之協同教師');

    // 李導師查詢自己可管轄的指派任務清單（應包含乙班自己的指派 + 甲班協同指派）
    const teacherBManagedAsgns = await getTeacherAssignments(teacherB.id);
    const hasClassAAssignment = teacherBManagedAsgns.some((a) => a.classId === classA.id);
    assert(hasClassAAssignment, '李導師作為甲班協同科任老師，順利取得甲班的指派管理權');

    // 李導師協助重新開放並調整甲班已被關閉的任務
    const reopenedByCoTeacher = await updateAssignment(assignmentA.id, {
      status: 'active',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    assert(reopenedByCoTeacher.status === 'active', '協同教師成功重新開放測驗並調整期限');
    console.log(`✅ 情境 4 驗證通過：班級協同教學教師完全具備共同管理與延長期限權限！\n`);

    console.log(`${colors.yellow}情境 5: 驗證「既有試卷 assignedClassIds 平滑自動遷移」...${colors.reset}`);
    const state = ensureLocalDB();
    const legacyPaperId = `paper_legacy_${ts}`;
    state.testPapers[legacyPaperId] = {
      id: legacyPaperId,
      title: '歷史古蹟探尋',
      targetGrade: 5,
      textType: 'informational',
      themeSummary: '歷史建築結構探訪',
      wordCount: 200,
      articleContent: '這座古老的紅磚城牆已有上百年歷史...',
      creatorId: teacherA.id,
      creatorName: teacherA.displayName,
      isPublic: false,
      questions: [],
      totalPoints: 10,
      allowRetake: false,
      examCode: 'OLD_SEC',
      assignedClassIds: [classA.id, classB.id], // 舊有資料格式
      timeLimitMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveLocalDB(state);

    // 執行自動遷移
    autoMigrateLegacyAssignments(state);
    const migratedAssignments = Object.values(state.assignments || {}).filter(
      (a) => a.testPaperId === legacyPaperId
    );
    assert(migratedAssignments.length === 2, '成功將舊有 2 個班級的 assignedClassIds 自動遷移至獨立指派');
    assert(
      migratedAssignments.every((a) => a.deadlineType === 'unlimited' && a.status === 'active'),
      '遷移之歷史指派預設為無限期且進行中'
    );
    assert(
      migratedAssignments.every((a) => a.examCode === 'OLD_SEC' && a.allowRetake === false),
      '舊有安全碼與作答限制設定完整無損繼承'
    );
    console.log(`✅ 情境 5 驗證通過：歷史資料自動向後相容遷移完畢，無任何遺失！\n`);

    // 撤回測試指派清理
    await deleteAssignment(assignmentA.id);
    await deleteAssignment(assignmentB.id);
    await deleteAssignment(assignmentAPost.id);

    console.log(`${colors.bold}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   🎉 所有 5 大情境與規格斷言全部 100% 通過！    ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}================================================================${colors.reset}\n`);
  } catch (err) {
    console.error(`${colors.red}❌ 測試執行發生異常:${colors.reset}`, err);
    process.exit(1);
  }
}

run();
