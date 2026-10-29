import {
  createUser,
  getUserById,
  createClass,
  createStudentsBatch,
  updateStudentInfo,
  getStudentLoginDirectory,
} from '../src/lib/db';
import { hashPassword, verifyPassword } from '../src/lib/auth';

async function testStudentLoginAndEdit() {
  console.log('=== Test Student Login Directory & Teacher Student Edit ===');

  const timestamp = Date.now();
  const teacherUsername = `teacher_cascade_${timestamp}`;
  const teacherHash = await hashPassword('pass123');

  // 1. 建立測試教師
  const teacher = await createUser({
    username: teacherUsername,
    passwordHash: teacherHash,
    displayName: '階層登入測試老師',
    role: 'teacher',
    status: 'active',
    school: '臺北市階層國小',
  });
  console.log('1. Created teacher:', teacher.displayName, teacher.id);

  // 2. 建立測試班級
  const cls = await createClass(teacher.id, '四年階層班', 4);
  console.log('2. Created class:', cls.name, cls.id);

  // 3. 建立兩位測試學生
  const student1Username = `stu_cas_01_${timestamp}`;
  const student2Username = `stu_cas_02_${timestamp}`;
  const students = await createStudentsBatch(teacher.id, cls.id, [
    {
      username: student1Username,
      plainPassword: 'oldPass123',
      displayName: '王大同',
      seatNumber: 1,
      gradeLevel: 4,
    },
    {
      username: student2Username,
      plainPassword: 'pass456',
      displayName: '李小美',
      seatNumber: 2,
      gradeLevel: 4,
    },
  ]);
  console.log('3. Created students:', students.length);

  // 4. 驗證 getStudentLoginDirectory
  const directory = await getStudentLoginDirectory();
  const dirTeacher = directory.find((t) => t.id === teacher.id);
  if (!dirTeacher) {
    throw new Error('Teacher not found in directory');
  }
  console.log('4. Found teacher in directory:', dirTeacher.displayName, dirTeacher.school);

  const dirClass = dirTeacher.classes.find((c) => c.id === cls.id);
  if (!dirClass) {
    throw new Error('Class not found in directory');
  }
  console.log('5. Found class in directory:', dirClass.name, 'Students count:', dirClass.students.length);

  const dirStudent1 = dirClass.students.find((s) => s.username === student1Username);
  if (!dirStudent1 || dirStudent1.displayName !== '王大同' || dirStudent1.seatNumber !== 1) {
    throw new Error('Student 1 not properly listed in directory');
  }
  // 安全性檢查：絕對不可有 passwordHash 或任何密碼欄位
  if ((dirStudent1 as any).passwordHash || (dirStudent1 as any).plainPassword) {
    throw new Error('SECURITY VIOLATION: Directory leaked password fields!');
  }
  console.log('6. Student 1 in directory verified secure (no passwords leaked)');

  // 5. 測試教師編輯學生帳密 (updateStudentInfo)
  const student1Id = students[0].id;
  const newPassword = 'newStudentPass999';
  const newUsername = `stu_cas_01_renamed_${timestamp}`;

  const updateRes = await updateStudentInfo(student1Id, {
    displayName: '王大同 (改名)',
    seatNumber: 8,
    username: newUsername,
    plainPassword: newPassword,
  });

  if (!updateRes.success || !updateRes.student) {
    throw new Error(`Failed to update student: ${updateRes.error}`);
  }
  console.log('7. Updated student info successfully:', updateRes.student.displayName);

  // 6. 驗證資料庫中的更新內容與密碼加鹽驗證
  const updatedStudentInDb = await getUserById(student1Id);
  if (!updatedStudentInDb) throw new Error('Student not found in DB');

  if (updatedStudentInDb.displayName !== '王大同 (改名)') throw new Error('displayName mismatch');
  if (updatedStudentInDb.seatNumber !== 8) throw new Error('seatNumber mismatch');
  if (updatedStudentInDb.username !== newUsername) throw new Error('username mismatch');

  const newPassValid = await verifyPassword(newPassword, updatedStudentInDb.passwordHash);
  if (!newPassValid) throw new Error('New password verification failed');

  const oldPassRejected = !(await verifyPassword('oldPass123', updatedStudentInDb.passwordHash));
  if (!oldPassRejected) throw new Error('Old password should be rejected');

  console.log('8. Verified new password passes and old password fails');

  // 7. 測試重複帳號衝突防護
  const conflictRes = await updateStudentInfo(student1Id, {
    username: student2Username, // 嘗試改為李小美的帳號
  });
  if (conflictRes.success) {
    throw new Error('Duplicate username should have been rejected!');
  }
  console.log('9. Duplicate username conflict prevention verified:', conflictRes.error);

  console.log('\n=== ALL STUDENT LOGIN & EDIT TESTS PASSED ===');
}

testStudentLoginAndEdit().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
