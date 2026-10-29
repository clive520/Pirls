import {
  createUser,
  getUserById,
  resetUserPassword,
} from '../src/lib/db';
import { hashPassword, verifyPassword } from '../src/lib/auth';

async function testPasswordReset() {
  console.log('=== Test Password Reset (Option 1) ===');

  const username = 'test_teacher_reset_' + Date.now();
  const initialPlain = 'initialPass123';
  const initialHash = await hashPassword(initialPlain);

  const teacher = await createUser({
    username,
    passwordHash: initialHash,
    displayName: '重設密碼測試老師',
    role: 'teacher',
    status: 'active',
    school: '測試實驗國小',
  });

  console.log('1. Created teacher:', teacher.username, 'ID:', teacher.id);

  // Verify initial password works
  const match1 = await verifyPassword(initialPlain, teacher.passwordHash);
  console.log('2. Initial password verification:', match1 ? 'PASS' : 'FAIL');

  // Admin resets password to custom: "newSecurePass888"
  const newPlain1 = 'newSecurePass888';
  const success1 = await resetUserPassword(teacher.id, newPlain1);
  console.log('3. Reset to newSecurePass888 success:', success1 ? 'PASS' : 'FAIL');

  // Verify new password matches
  const updatedTeacher1 = await getUserById(teacher.id);
  const match2 = await verifyPassword(newPlain1, updatedTeacher1!.passwordHash);
  const oldMatchFailed = !(await verifyPassword(initialPlain, updatedTeacher1!.passwordHash));
  console.log('4. New password verification:', match2 ? 'PASS' : 'FAIL');
  console.log('5. Old password rejected:', oldMatchFailed ? 'PASS' : 'FAIL');

  // Admin resets to default: "teacher123"
  const defaultPlain = 'teacher123';
  const success2 = await resetUserPassword(teacher.id, defaultPlain);
  console.log('6. Reset to default (teacher123) success:', success2 ? 'PASS' : 'FAIL');

  const updatedTeacher2 = await getUserById(teacher.id);
  const match3 = await verifyPassword(defaultPlain, updatedTeacher2!.passwordHash);
  console.log('7. Default password verification:', match3 ? 'PASS' : 'FAIL');

  console.log('\n=== ALL PASSWORD RESET TESTS PASSED ===');
}

testPasswordReset().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
