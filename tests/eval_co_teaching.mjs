import {
  createClass,
  getTeacherClasses,
  createStudentsBatch,
  getClassStudents,
  getClassCoTeachers,
  addCoTeacherToClass,
  removeCoTeacherFromClass,
  deleteClass,
} from '../src/lib/db/classes.ts';
import { createUser } from '../src/lib/db/users.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   🤝 PIRLS 班級協同教學與教師共同管理 (Co-teaching) 整合測試    ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

let allPassed = true;

async function run() {
  try {
    const timestamp = Date.now();
    // 建立 3 位測試教師帳號
    const teacherA = await createUser({
      displayName: '張導師 (班導)',
      username: `t_mentor_${timestamp}`,
      passwordHash: 'hash123',
      role: 'teacher',
      status: 'active',
      school: '博愛國小'
    });
    const teacherB = await createUser({
      displayName: '李老師 (國語科任)',
      username: `t_subject_${timestamp}`,
      passwordHash: 'hash123',
      role: 'teacher',
      status: 'active',
      school: '博愛國小'
    });
    const teacherC = await createUser({
      displayName: '王老師 (閱推教師)',
      username: `t_reading_${timestamp}`,
      passwordHash: 'hash123',
      role: 'teacher',
      status: 'active',
      school: '博愛國小'
    });

    // 1. 張導師建立五年三班
    console.log(`${colors.yellow}步驟 1: 張導師 (主責) 建立五年三班...${colors.reset}`);
    const myClass = await createClass(teacherA.id, '五年三班 (協同實驗班)', 5);
    await createStudentsBatch(teacherA.id, myClass.id, [
      { username: 'stu_503_01', displayName: '陳小美', seatNumber: 1, gradeLevel: 5 },
      { username: 'stu_503_02', displayName: '黃大同', seatNumber: 2, gradeLevel: 5 }
    ]);
    console.log(`✅ 班級建立成功: ${myClass.name} (主責: ${teacherA.displayName})`);

    // 2. 檢測尚未邀請時，李老師與王老師無法看到該班級
    console.log(`\n${colors.yellow}步驟 2: 檢驗李老師與王老師在受邀前的班級存取隔離...${colors.reset}`);
    const bClassesBefore = await getTeacherClasses(teacherB.id);
    const hasClassBefore = bClassesBefore.some((c) => c.id === myClass.id);
    if (hasClassBefore) {
      console.error(`❌ 李老師尚未受邀，卻看到五年三班！`);
      allPassed = false;
    } else {
      console.log(`✅ 權限隔離正確：李老師目前無權檢視五年三班`);
    }

    // 3. 檢測非主責教師嘗試邀請他人被拒絕
    console.log(`\n${colors.yellow}步驟 3: 檢驗權限防禦：非主責教師嘗試邀請他人...${colors.reset}`);
    const hackInvite = await addCoTeacherToClass(myClass.id, teacherC.id, teacherB.id);
    if (hackInvite.success) {
      console.error(`❌ 非主責教師竟然可以邀請其他人共同管理！`);
      allPassed = false;
    } else {
      console.log(`✅ 權限防禦生效：${hackInvite.error}`);
    }

    // 4. 張導師邀請李老師與王老師加入共同管理
    console.log(`\n${colors.yellow}步驟 4: 張導師邀請李老師 (國語科任) 與王老師 (閱推老師) 加入共同管理...${colors.reset}`);
    const inviteB = await addCoTeacherToClass(myClass.id, teacherB.id, teacherA.id);
    const inviteC = await addCoTeacherToClass(myClass.id, teacherC.id, teacherA.id);
    if (!inviteB.success || !inviteC.success) {
      console.error(`❌ 邀請失敗:`, inviteB.error, inviteC.error);
      allPassed = false;
    } else {
      console.log(`✅ 邀請成功！`);
    }

    // 5. 檢驗協同教師在儀表板可見該班級，並正確標註身分
    console.log(`\n${colors.yellow}步驟 5: 檢驗李老師在教師儀表板之班級清單...${colors.reset}`);
    const bClassesAfter = await getTeacherClasses(teacherB.id);
    const targetClassForB = bClassesAfter.find((c) => c.id === myClass.id);
    if (!targetClassForB) {
      console.error(`❌ 李老師受邀後，依然無法在班級清單看到五年三班！`);
      allPassed = false;
    } else {
      console.log(`✅ 李老師成功看到五年三班！`);
      console.log(`- 是否為主責 (isOwner): ${targetClassForB.isOwner} (預期: false)`);
      console.log(`- 是否為協同 (isCoTeacher): ${targetClassForB.isCoTeacher} (預期: true)`);
      console.log(`- 主責導師名稱: ${targetClassForB.primaryTeacherName} (預期: 張導師 (班導))`);
      console.log(`- 協同教師名單: ${targetClassForB.coTeacherNames?.join(', ')}`);

      if (targetClassForB.isOwner !== false || targetClassForB.isCoTeacher !== true) {
        console.error(`❌ 身分標籤不符合預期！`);
        allPassed = false;
      } else {
        console.log(`✅ 身分屬性完全符合協同教學規格！`);
      }
    }

    // 6. 檢驗李老師存取五年三班學生名冊
    console.log(`\n${colors.yellow}步驟 6: 檢驗李老師存取班級學生名冊...${colors.reset}`);
    const students = await getClassStudents(myClass.id);
    console.log(`✅ 成功取得五年三班學生名冊，共 ${students.length} 位學生`);
    if (students.length !== 2) {
      allPassed = false;
    }

    // 7. 檢驗協同成員詳情 API
    console.log(`\n${colors.yellow}步驟 7: 檢驗 getClassCoTeachers 共同管理名冊...${colors.reset}`);
    const coTeachersInfo = await getClassCoTeachers(myClass.id, teacherA.id);
    if (!coTeachersInfo) {
      console.error(`❌ getClassCoTeachers 回傳 null！`);
      allPassed = false;
    } else {
      console.log(`✅ 主責導師: ${coTeachersInfo.owner.displayName}`);
      console.log(`✅ 協同教師數: ${coTeachersInfo.coTeachers.length} 位 (${coTeachersInfo.coTeachers.map(c => c.displayName).join(', ')})`);
      if (coTeachersInfo.coTeachers.length !== 2) {
        console.error(`❌ 協同教師數應為 2 位！`);
        allPassed = false;
      }
    }

    // 8. 檢驗協同教師嘗試刪除班級被安全攔截
    console.log(`\n${colors.yellow}步驟 8: 檢驗協同教師 (李老師) 嘗試刪除五年三班...${colors.reset}`);
    const deleteAttempt = await deleteClass(myClass.id, teacherB.id, 'teacher');
    if (deleteAttempt.success) {
      console.error(`❌ 協同教師不應該能夠刪除班級！安全漏洞！`);
      allPassed = false;
    } else {
      console.log(`✅ 安全防護成功攔截：${deleteAttempt.error}`);
    }

    // 9. 協同教師李老師主動退出共同管理
    console.log(`\n${colors.yellow}步驟 9: 協同教師 (李老師) 自願退出共同管理...${colors.reset}`);
    const leaveRes = await removeCoTeacherFromClass(myClass.id, teacherB.id, teacherB.id);
    if (!leaveRes.success) {
      console.error(`❌ 退出共同管理失敗:`, leaveRes.error);
      allPassed = false;
    } else {
      console.log(`✅ 李老師成功退出共同管理`);
      const bClassesAfterLeave = await getTeacherClasses(teacherB.id);
      const stillHas = bClassesAfterLeave.some((c) => c.id === myClass.id);
      if (stillHas) {
        console.error(`❌ 李老師退出後仍看到該班級！`);
        allPassed = false;
      } else {
        console.log(`✅ 李老師的班級清單已不再出現五年三班`);
      }
    }

    // 10. 主責導師 A 移除王老師，並最終刪除班級
    console.log(`\n${colors.yellow}步驟 10: 主責導師張導師移除王老師，並正常刪除班級...${colors.reset}`);
    await removeCoTeacherFromClass(myClass.id, teacherC.id, teacherA.id);
    const finalDelete = await deleteClass(myClass.id, teacherA.id, 'teacher');
    if (!finalDelete.success) {
      console.error(`❌ 主責導師刪除班級失敗:`, finalDelete.error);
      allPassed = false;
    } else {
      console.log(`✅ 主責導師成功刪除班級`);
    }

    // 總結
    if (allPassed) {
      console.log(`\n${colors.bold}${colors.green}🎉 全部測試 100% 通過！班級共同管理與協同教學機制運作完美！${colors.reset}\n`);
    } else {
      console.log(`\n${colors.bold}${colors.red}❌ 部分測試未通過，請檢查錯誤紀錄。${colors.reset}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('測試失敗：', err);
    process.exit(1);
  }
}

run();
