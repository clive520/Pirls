import {
  createUser,
  createClass,
  createStudentsBatch,
  getClassStudents,
  batchResetClassPasswords,
} from '../src/lib/db';
import { hashPassword, verifyPassword } from '../src/lib/auth';
import QRCode from 'qrcode';

async function testRandomPasswordsAndCards() {
  console.log('=== Test 6-Digit Random Password & QR Code Generation ===');

  const timestamp = Date.now();
  const teacher = await createUser({
    username: `t_card_${timestamp}`,
    passwordHash: await hashPassword('pass123'),
    displayName: '卡片測試老師',
    role: 'teacher',
    status: 'active',
    school: '鹿陽國小',
  });

  const cls = await createClass(teacher.id, '六年級測試班', 6);
  console.log('1. Created class:', cls.name, cls.id);

  // 1. 建立學生（不手動指定密碼，應自動由後端生成 6 碼隨機數字密碼）
  const students = await createStudentsBatch(teacher.id, cls.id, [
    {
      username: `stu_rand_01_${timestamp}`,
      displayName: '林小明',
      seatNumber: 1,
      gradeLevel: 6,
    },
    {
      username: `stu_rand_02_${timestamp}`,
      displayName: '張小華',
      seatNumber: 2,
      gradeLevel: 6,
    },
  ]);

  console.log('2. Created students count:', students.length);
  for (const s of students) {
    if (!s.initialPassword) {
      throw new Error(`Student ${s.displayName} missing initialPassword!`);
    }
    // 驗證是否為 6 碼純數字密碼
    const is6Digits = /^\d{6}$/.test(s.initialPassword);
    if (!is6Digits) {
      throw new Error(`Password ${s.initialPassword} is NOT a 6-digit number!`);
    }
    console.log(`3. Verified Student [${s.displayName}] 6-digit random password:`, s.initialPassword);

    // 驗證密碼雜湊能成功登入比對
    const match = await verifyPassword(s.initialPassword, s.passwordHash);
    if (!match) {
      throw new Error(`Password verification failed for ${s.displayName}`);
    }
  }

  // 4. 測試 getClassStudents 是否帶出 initialPassword
  const classStudents = await getClassStudents(cls.id);
  for (const cs of classStudents) {
    if (!cs.initialPassword || !/^\d{6}$/.test(cs.initialPassword)) {
      throw new Error(`getClassStudents student missing 6-digit initialPassword`);
    }
  }
  console.log('4. Verified getClassStudents preserves 6-digit initial passwords');

  // 5. 測試 batchResetClassPasswords 一鍵全班重設
  const oldPass1 = classStudents[0].initialPassword;
  const resetRes = await batchResetClassPasswords(cls.id);
  if (!resetRes.success || resetRes.count !== 2) {
    throw new Error('Batch reset passwords failed');
  }

  const updatedClassStudents = await getClassStudents(cls.id);
  const newPass1 = updatedClassStudents[0].initialPassword;
  if (!newPass1 || !/^\d{6}$/.test(newPass1) || newPass1 === oldPass1) {
    throw new Error('New password was not properly refreshed with a new 6-digit number');
  }
  console.log(`5. Verified batch reset refreshed password: ${oldPass1} -> ${newPass1}`);

  // 6. 測試 QRCode 生成
  const sampleUrl = `https://pirls-learning-system.vercel.app/login?teacherId=${teacher.id}&classId=${cls.id}&username=${classStudents[0].username}`;
  const qrDataUrl = await QRCode.toDataURL(sampleUrl, { width: 140, margin: 1 });
  if (!qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('QR Code generation did not return valid data URL');
  }
  console.log('6. Verified QRCode generation returns valid PNG data URL (length:', qrDataUrl.length, ')');

  console.log('\n=== ALL 6-DIGIT RANDOM PASSWORD & QR CODE TESTS PASSED ===');
}

testRandomPasswordsAndCards().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
