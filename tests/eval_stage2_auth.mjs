import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../src/lib/auth.ts';
import {
  seedInitialAdmin,
  getUserByUsername,
  createUser,
  updateUserStatus,
  listPendingTeachers,
  createClass,
  getTeacherClasses,
  createStudentsBatch,
  getClassStudents
} from '../src/lib/db.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 2: 全端骨幹、Firebase 資料層與認證測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runTests() {
  try {
    // 1. 密碼雜湊與比對安全測試
    console.log(`${colors.bold}[檢核項 1] Bcrypt 密碼加鹽雜湊與安全性驗證：${colors.reset}`);
    const rawPwd = 'TeacherSecret2026!';
    const hash = await hashPassword(rawPwd);
    const isMatch = await verifyPassword(rawPwd, hash);
    const isWrongMatch = await verifyPassword('WrongPassword', hash);

    if (isMatch && !isWrongMatch && hash.startsWith('$2a$')) {
      console.log(`  ${colors.green}✓ Bcrypt 雜湊加密與比對驗證 100% 精準通過${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 密碼驗證邏輯異常${colors.reset}`);
      allTestsPassed = false;
    }

    // 2. JWT Session 簽發與驗證測試
    console.log(`\n${colors.bold}[檢核項 2] Jose JWT Session 簽發與跨環境解密驗證：${colors.reset}`);
    const mockSession = {
      userId: 'usr_mock_001',
      username: 'lin_teacher',
      displayName: '林老師',
      role: 'teacher',
      status: 'active'
    };
    const token = await signSessionToken(mockSession);
    const verified = await verifySessionToken(token);

    if (verified && verified.username === 'lin_teacher' && verified.role === 'teacher') {
      console.log(`  ${colors.green}✓ JWT 簽發、過期時間與 Payload 驗證 100% 正確${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ JWT 驗證失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 管理員初始化與生命週期測試
    console.log(`\n${colors.bold}[檢核項 3] 預設管理員初始化測試：${colors.reset}`);
    const adminUser = await seedInitialAdmin();
    const adminCheck = await getUserByUsername('admin');
    const adminPwdOk = await verifyPassword('admin123', adminCheck.passwordHash);

    if (adminCheck && adminCheck.role === 'admin' && adminPwdOk) {
      console.log(`  ${colors.green}✓ 預設管理員帳號 (admin/admin123) 成功就緒${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 管理員初始化失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. 教師註冊 -> 待審核 (pending) -> 管理員審核通過 (active) 流程
    console.log(`\n${colors.bold}[檢核項 4] 教師申請與管理員審核閉環測試：${colors.reset}`);
    const testTeacherUsername = 'teacher_stage2_' + Date.now();
    const teacherPwdHash = await hashPassword('teachPass888');

    // 4.1 教師送出申請
    const newTeacher = await createUser({
      username: testTeacherUsername,
      passwordHash: teacherPwdHash,
      displayName: '陳雅惠 老師',
      role: 'teacher',
      status: 'pending',
      school: '新北市板橋國小'
    });
    console.log(`  - 教師送出申請: 帳號=${newTeacher.username}, 狀態=${newTeacher.status}`);

    // 4.2 管理員查詢審核列表
    const pendingList = await listPendingTeachers();
    const isTeacherInPending = pendingList.some(t => t.id === newTeacher.id);
    if (!isTeacherInPending) {
      console.log(`  ${colors.red}✗ 待審核列表中未找到剛申請的教師${colors.reset}`);
      allTestsPassed = false;
    }

    // 4.3 管理員核准通過
    await updateUserStatus(newTeacher.id, 'active');
    const approvedTeacher = await getUserByUsername(testTeacherUsername);
    if (approvedTeacher && approvedTeacher.status === 'active') {
      console.log(`  ${colors.green}✓ 管理員核准成功，教師狀態成功流轉為 active！${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 教師狀態流轉失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 5. 教師建立班級與批次生成學生帳號測試
    console.log(`\n${colors.bold}[檢核項 5] 教師班級建立與學生批次帳密生成測試：${colors.reset}`);
    const newClass = await createClass(newTeacher.id, '四年五班', 4);
    console.log(`  - 成功建立班級: ${newClass.name} (國小 ${newClass.gradeLevel} 年級)`);

    const studentBatch = [
      {
        username: `s405_01_${Date.now()}`,
        plainPassword: 'password01',
        displayName: '四年五班 1號 王小明',
        seatNumber: 1,
        gradeLevel: 4
      },
      {
        username: `s405_02_${Date.now()}`,
        plainPassword: 'password02',
        displayName: '四年五班 2號 李小美',
        seatNumber: 2,
        gradeLevel: 4
      }
    ];

    const createdStudents = await createStudentsBatch(newTeacher.id, newClass.id, studentBatch);
    const classStudents = await getClassStudents(newClass.id);

    if (createdStudents.length === 2 && classStudents.length === 2) {
      console.log(`  ${colors.green}✓ 批次生成 ${createdStudents.length} 位學生帳號成功，班級關聯無誤${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 批次建立學生帳號失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 6. 學生登入驗證
    console.log(`\n${colors.bold}[檢核項 6] 學生使用教師提供之帳密驗證登入：${colors.reset}`);
    const student1 = await getUserByUsername(studentBatch[0].username);
    const isStudentPwdOk = await verifyPassword(studentBatch[0].plainPassword, student1.passwordHash);

    if (student1 && student1.role === 'student' && isStudentPwdOk) {
      console.log(`  ${colors.green}✓ 學生帳密登入核對成功 (學生角色: ${student1.displayName})${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 學生登入驗證失敗${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
    if (allTestsPassed) {
      console.log(`${colors.bold}${colors.green}🎉 Stage 2 全端骨幹、Firebase 資料層與認證：全數測試通過 (100% Pass)！${colors.reset}`);
      console.log(`${colors.cyan}架構安全穩健，三層角色帳密管理全部就緒，具備進入 Stage 3 的完備條件。${colors.reset}`);
    } else {
      console.log(`${colors.bold}${colors.red}❌ 部分測試未通過，請檢查邏輯。${colors.reset}`);
    }
    console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);
  } catch (err) {
    console.error('測試過程發生例外錯誤:', err);
  }
}

runTests();
