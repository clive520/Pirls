import {
  createUser,
  getUserByUsername,
  createClass,
  getTeacherClasses,
  getTeacherTestPapers,
  createTestPaper,
  assignTestPaperToClasses,
} from './src/lib/db.ts';
import { hashPassword } from './src/lib/auth.ts';
import { generatePIRLSTestPaper } from './src/lib/llm-adapter.ts';

async function seedDemo() {
  console.log('--- 建立標準體驗帳號 ---');

  // 1. 教師帳號: teacher / teacher123
  let teacher = await getUserByUsername('teacher');
  if (!teacher) {
    const pwdHash = await hashPassword('teacher123');
    teacher = await createUser({
      username: 'teacher',
      passwordHash: pwdHash,
      displayName: '林志賢 老師',
      role: 'teacher',
      status: 'active',
      schoolName: '台北市智慧實驗國小',
      subjectArea: '國語文與閱讀素養',
    });
    console.log('✓ 建立教師帳號: teacher / teacher123');
  } else {
    console.log('✓ 教師帳號已存在: teacher');
  }

  // 2. 班級: 四年一班
  const classes = await getTeacherClasses(teacher.id);
  let cls = classes[0];
  if (!cls) {
    cls = await createClass(teacher.id, '四年一班', 4);
    console.log('✓ 建立班級: 四年一班');
  }

  // 3. 學生帳號: student / student123
  let student = await getUserByUsername('student');
  if (!student) {
    const pwdHash = await hashPassword('student123');
    student = await createUser({
      username: 'student',
      passwordHash: pwdHash,
      displayName: '陳大同 同學',
      role: 'student',
      status: 'active',
      teacherId: teacher.id,
      classId: cls.id,
      className: cls.name,
      seatNumber: 1,
      gradeLevel: 4,
    });
    console.log('✓ 建立學生帳號: student / student123 (座號 1號)');
  } else {
    console.log('✓ 學生帳號已存在: student');
  }

  // 4. 確保有一份指派給四年一班且公開的試卷
  const papers = await getTeacherTestPapers(teacher.id);
  if (papers.length === 0) {
    const sample = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '守護森林的老松樹',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: teacher.id,
      creatorName: teacher.displayName,
    });
    const saved = await createTestPaper(sample);
    await assignTestPaperToClasses(saved.id, [cls.id], {
      isPublic: true,
      examCode: 'PIRLS2026',
    });
    console.log(`✓ 建立標準試卷《${saved.title}》並指派至四年一班 (ID: ${saved.id})`);
  } else {
    // 確保第一份指派給此班級
    await assignTestPaperToClasses(papers[0].id, [cls.id], {
      isPublic: true,
      examCode: 'PIRLS2026',
    });
    console.log(`✓ 已確認試卷《${papers[0].title}》指派至四年一班`);
  }

  console.log('--- 體驗帳號與題庫設置完成！ ---');
}

seedDemo().catch(console.error);
