import { generatePIRLSTestPaper } from '../src/lib/llm-adapter';

async function runTests() {
  console.log('=== 1. 測試無 API Key 時的離線體驗模式 ===');
  const mockResult = await generatePIRLSTestPaper({
    mode: 'theme',
    theme: '海洋生物探索',
    targetGrade: 4,
    textType: 'literary',
    questionCountMode: 'compact',
    creatorId: 'teacher_1',
    creatorName: '王老師',
  });
  console.log('✔ 無 API Key 回傳標題:', mockResult.title);
  console.log('✔ 題目總數:', mockResult.questions.length);

  console.log('\n=== 2. 測試帶入無效 API Key 時的行為 ===');
  let thrownError: any = null;
  try {
    await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '外太空探險',
      targetGrade: 5,
      textType: 'informational',
      questionCountMode: 'compact',
      apiKey: 'AIzaSyFakeInvalidKeyForTesting12345',
      creatorId: 'teacher_1',
      creatorName: '王老師',
    });
  } catch (err: any) {
    thrownError = err;
  }

  if (thrownError) {
    console.log('✔ 成功捕獲真實 Google 錯誤 (沒有被偷偷換成老松樹!):');
    console.log('   錯誤訊息:', thrownError.message);
  } else {
    console.error('❌ 失敗: 未拋出異常，可能又被靜默回退了！');
    process.exit(1);
  }

  console.log('\n🎉 所有 LLM 核心適配器修復測試通過！');
}

runTests().catch(err => {
  console.error('測試失敗:', err);
  process.exit(1);
});
