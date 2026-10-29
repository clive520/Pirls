import {
  createSubmission,
  getSubmissionById,
  updateSubmissionReview,
  getTestPaperById,
  createTestPaper,
} from '../src/lib/db';
import { regradeQuestionWithAI } from '../src/lib/gemini-regrader';
import { calculatePIRLSScaleScore } from '../src/lib/pirls-norm';

async function testTeacherReviewAndAiRegrade() {
  console.log('=== Step 1: Create Test Paper & Dummy Submission ===');

  const testPaper = await createTestPaper({
    title: '智慧小鎮的綠能革命',
    targetGrade: 4,
    textType: 'informational',
    themeSummary: '透過綠能與環保科技，培養永續思辨能力。',
    wordCount: 920,
    articleContent: '智慧小鎮的居民起初依賴燃煤發電，環境受到污染。後來大家經歷了風災與空氣惡化，齊心投入太陽能與風力發電。最後大家明白了守護自然環境才是最珍貴的資產。',
    paragraphs: [
      { paragraphNumber: 1, text: '智慧小鎮的居民起初依賴燃煤發電，環境受到污染。後來大家經歷了風災與空氣惡化，齊心投入太陽能與風力發電。最後大家明白了守護自然環境才是最珍貴的資產。' }
    ],
    questions: [
      {
        id: 'q1_mc',
        questionNumber: 1,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        prompt: '智慧小鎮最初依賴何種發電方式？',
        points: 1,
        options: [
          { label: 'A', text: '燃煤發電', isCorrect: true, explanation: '文中有直接陳述。' },
          { label: 'B', text: '核能發電', isCorrect: false, explanation: '未提及。' },
        ],
        correctAnswerLabel: 'A',
      },
      {
        id: 'q2_cr',
        questionNumber: 2,
        processLevel: 'interpret',
        processLevelNumber: 3,
        type: 'constructed_response',
        prompt: '請說明鎮民一開始的想法是什麼？後來發生了什麼事改變了他們的想法？',
        points: 3,
        rubric: {
          maxScore: 3,
          criteria: [
            { score: 3, code: '30', description: '完整寫出前後對比與因果事件', keyEvidenceNeeded: ['燃煤污染', '風災空污', '齊心投入綠能'] },
            { score: 2, code: '21', description: '寫出想法轉變但細節不足', keyEvidenceNeeded: ['燃煤', '綠能'] },
            { score: 1, code: '11', description: '僅寫出一種想法', keyEvidenceNeeded: ['綠能'] },
            { score: 0, code: '79', description: '未切中核心', keyEvidenceNeeded: [] },
          ],
          sampleFullCreditAnswer: '起初依賴燃煤導致污染，後來因為經歷風災與空污，最後齊心轉向太陽能，明白了環境的重要。',
        },
      },
    ],
    totalPoints: 4,
    creatorId: 'teacher_test_001',
    creatorName: '黃老師',
    isPublic: false,
    timeLimitMinutes: 40,
  });

  const studentAnswerText = '起初大家用煤炭發電造成很臭的空氣，後來經歷可怕的風災，最後大家一起改用太陽能發電，體會到愛護地球的重要。';

  const initialSubmission = await createSubmission({
    testPaperId: testPaper.id,
    testPaperTitle: testPaper.title,
    targetGrade: testPaper.targetGrade,
    textType: testPaper.textType,
    studentId: 'stu_test_regrade_01',
    studentName: '陳小華',
    classId: 'cls_test_001',
    className: '四年二班',
    seatNumber: 12,
    totalScore: 2,
    maxScore: 4,
    percentage: 50,
    scaleScore: calculatePIRLSScaleScore(2, 4),
    processScores: {
      level1: { earned: 1, total: 1, percentage: 100 },
      level2: { earned: 0, total: 0, percentage: 0 },
      level3: { earned: 1, total: 3, percentage: 33 },
      level4: { earned: 0, total: 0, percentage: 0 },
    },
    answers: [
      {
        questionId: 'q1_mc',
        questionNumber: 1,
        type: 'multiple_choice',
        processLevel: 'retrieve',
        processLevelNumber: 1,
        points: 1,
        studentAnswer: 'A',
        score: 1,
        maxScore: 1,
        isCorrect: true,
      },
      {
        questionId: 'q2_cr',
        questionNumber: 2,
        type: 'constructed_response',
        processLevel: 'interpret',
        processLevelNumber: 3,
        points: 3,
        studentAnswer: studentAnswerText,
        score: 1, // 假定 AI 初評較嚴格只給 1 分
        maxScore: 3,
      },
    ],
  });

  console.log('Initial score:', initialSubmission.totalScore, '/ 4, ScaleScore:', initialSubmission.scaleScore);

  console.log('\n=== Step 2: Test AI Deep Regrading Engine ===');
  const crQuestion = testPaper.questions.find((q) => q.id === 'q2_cr')!;
  const aiResult = await regradeQuestionWithAI({
    testPaper,
    question: crQuestion,
    studentAnswer: studentAnswerText,
  });

  console.log('AI Regrade Suggested Score:', aiResult.suggestedScore, '/ 3 (Code:', aiResult.scoreCode, ')');
  console.log('AI Regrade Reason:', aiResult.reason);
  console.log('AI Key Evidence Found:', aiResult.keyEvidenceFound);

  if (aiResult.suggestedScore < 2) {
    throw new Error('AI regrade suggested score should be at least 2 for a strong answer');
  }
  console.log('AI Regrade Verification: PASS');

  console.log('\n=== Step 3: Test Teacher Review & Score Overriding ===');
  // 老師決定給 3 分滿分，並補充溫暖叮嚀
  const updatedSub = await updateSubmissionReview(
    initialSubmission.id,
    '黃老師 (授課導師)',
    [
      {
        questionId: 'q2_cr',
        newScore: 3,
        teacherComment: '小華，這題寫得很完整，有把風災與轉向太陽能的因果寫出來，老師調為 3 分！',
      },
    ],
    '小華本次在詮釋整合展現了很棒的進步，繼續保持！'
  );

  console.log('Updated Submission totalScore:', updatedSub?.totalScore, '(Expected: 4)');
  console.log('Updated Submission scaleScore:', updatedSub?.scaleScore);
  console.log('Updated Submission benchmark:', updatedSub?.benchmarkName);
  console.log('Updated Submission isTeacherReviewed:', updatedSub?.isTeacherReviewed);
  console.log('Teacher Comment on Q2:', updatedSub?.answers[1].teacherComment);

  if (updatedSub?.totalScore !== 4) {
    throw new Error(`Total score should be 4, got ${updatedSub?.totalScore}`);
  }
  if (!updatedSub.isTeacherReviewed) {
    throw new Error('isTeacherReviewed should be true');
  }

  console.log('\n=== ALL TEACHER REVIEW & AI REGRADE TESTS PASSED ===');
}

testTeacherReviewAndAiRegrade().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
