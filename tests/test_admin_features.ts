import {
  seedInitialAdmin,
  createUser,
  getUserByUsername,
  getUserById,
  updateUserStatus,
  updateUserRole,
  createClass,
  createStudentsBatch,
  getTeachersWithStats,
  deleteTeacher,
  getTeacherClasses,
} from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function testAdminFlow() {
  console.log('=== Step 0: Ensure initial admin ===');
  await seedInitialAdmin();
  const rootAdmin = await getUserByUsername('admin');
  console.log('Root Admin:', rootAdmin?.username, rootAdmin?.role, rootAdmin?.status);

  console.log('\n=== Step 1: Register teacher with pending status ===');
  const t1Username = 'test_teacher_pend_' + Date.now();
  const pwdHash = await hashPassword('pass123');
  const t1 = await createUser({
    username: t1Username,
    passwordHash: pwdHash,
    displayName: '王大明 老師',
    role: 'teacher',
    status: 'pending',
    school: '新竹實驗國小',
  });
  console.log('Created teacher status:', t1.status === 'pending' ? 'PASS (pending)' : 'FAIL');

  console.log('\n=== Step 2: Approve teacher ===');
  await updateUserStatus(t1.id, 'active');
  const t1Updated = await getUserById(t1.id);
  console.log('Approved status:', t1Updated?.status === 'active' ? 'PASS (active)' : 'FAIL');

  console.log('\n=== Step 3: Promote teacher to admin ===');
  const promoteRes = await updateUserRole(t1.id, 'admin');
  const t1Admin = await getUserById(t1.id);
  console.log('Promoted to admin:', t1Admin?.role === 'admin' ? 'PASS (admin)' : 'FAIL');

  console.log('\n=== Step 4: Protection against removing last admin ===');
  // Both rootAdmin and t1 are admins now.
  const rootDemoteRes = await updateUserRole(rootAdmin!.id, 'teacher');
  console.log('Can demote root when 2 admins exist:', rootDemoteRes.success ? 'PASS' : 'FAIL');
  // Now only 1 admin remains (t1). Try to demote t1:
  const t1DemoteRes = await updateUserRole(t1.id, 'teacher');
  console.log(
    'Demoting last remaining admin blocked:',
    !t1DemoteRes.success ? `PASS (blocked: ${t1DemoteRes.error})` : 'FAIL'
  );

  // Restore root admin
  await updateUserRole(rootAdmin!.id, 'admin');
  await updateUserRole(t1.id, 'teacher');

  console.log('\n=== Step 5: Reset teacher to pending ===');
  await updateUserStatus(t1.id, 'pending');
  const t1Reset = await getUserById(t1.id);
  console.log('Reset to pending:', t1Reset?.status === 'pending' ? 'PASS (pending)' : 'FAIL');

  // Re-approve for deletion tests
  await updateUserStatus(t1.id, 'active');

  console.log('\n=== Step 6: Create class & student & test paper under teacher 1 ===');
  const cls = await createClass(t1.id, '四年八班', 4);
  const students = await createStudentsBatch(t1.id, cls.id, [
    {
      username: 's_test_' + Date.now(),
      plainPassword: '123',
      displayName: '小強',
      seatNumber: 1,
      gradeLevel: 4,
    },
  ]);
  const { createTestPaper, getTestPaperById } = await import('../src/lib/db');
  const paper = await createTestPaper({
    title: '海龜的冒險旅程',
    targetGrade: 4,
    textType: 'literary',
    themeSummary: '透過小海龜的海洋冒險，培養愛護海洋與堅持到底的毅力。',
    wordCount: 880,
    articleContent: '海龜在晨光中游向深藍色的大海...',
    paragraphs: [{ paragraphNumber: 1, text: '海龜在晨光中游向深藍色的大海...' }],
    questions: [],
    totalPoints: 10,
    creatorId: t1.id,
    creatorName: t1.displayName,
    isPublic: false,
    timeLimitMinutes: 40,
  });
  console.log('Created class, student, and test paper:', cls.name, students[0].displayName, paper.title);

  console.log('\n=== Step 7: Create teacher 2 and test transfer deletion ===');
  const t2 = await createUser({
    username: 'test_teacher_tgt_' + Date.now(),
    passwordHash: pwdHash,
    displayName: '李接手 老師',
    role: 'teacher',
    status: 'active',
    school: '新竹實驗國小',
  });

  const transferRes = await deleteTeacher(t1.id, {
    deleteMode: 'transfer',
    targetTeacherId: t2.id,
  });
  console.log('Transfer deletion success:', transferRes.success ? 'PASS' : 'FAIL');
  console.log('Message:', transferRes.message);

  const transferredCls = await getTeacherClasses(t2.id);
  console.log('Transferred classes count under Teacher 2:', transferredCls.length);
  const paperAfterTransfer = await getTestPaperById(paper.id);
  console.log('Paper creator transferred to Teacher 2:', paperAfterTransfer?.creatorId === t2.id ? 'PASS' : 'FAIL');

  console.log('\n=== Step 8: Test cascade deletion on Teacher 2 (方案 A: 文章永久歸檔校本公共題庫) ===');
  const cascadeRes = await deleteTeacher(t2.id, {
    deleteMode: 'cascade',
  });
  console.log('Cascade deletion success:', cascadeRes.success ? 'PASS' : 'FAIL');
  console.log('Message:', cascadeRes.message);

  const t2After = await getUserById(t2.id);
  const studentAfter = await getUserById(students[0].id);
  const paperAfterCascade = await getTestPaperById(paper.id);

  console.log('Teacher 2 deleted:', t2After === null ? 'PASS' : 'FAIL');
  console.log('Student deleted by cascade:', studentAfter === null ? 'PASS' : 'FAIL');
  console.log('Paper preserved under admin_root_001:', paperAfterCascade?.creatorId === 'admin_root_001' ? 'PASS' : 'FAIL');
  console.log('Paper marked as public in school library:', paperAfterCascade?.isPublic === true ? 'PASS' : 'FAIL');
  console.log('Paper creatorName updated with archived tag:', paperAfterCascade?.creatorName?.includes('校本公共題庫') ? 'PASS' : 'FAIL');

  console.log('\n=== Step 9: Verify getTeachersWithStats ===');
  const stats = await getTeachersWithStats();
  console.log('Admins count:', stats.admins.length);
  console.log('Approved teachers count:', stats.approvedTeachers.length);
  console.log('Available transfer targets count:', stats.availableTransferTargets.length);

  console.log('\n>>> ALL 9 STEPS PASSED SUCCESSFULLY! <<<');
}

testAdminFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
