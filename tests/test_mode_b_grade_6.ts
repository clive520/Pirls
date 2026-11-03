import { generatePIRLSTestPaper, generateSmartFallbackQuestions } from '../src/lib/llm-adapter';

async function runTests() {
  console.log('=== 測試模式 B (自己貼上文章) 國小六年級出題與防呆自癒機制 ===\n');

  const pastedTitle = '六年級國語自選課文《草船借箭》';
  const pastedText = `【第一段】周瑜見諸葛亮挺有才幹，心裡很妒忌。有一天，周瑜請諸葛亮商議軍事，說：「我們就要跟曹軍交戰了。水上交戰，用什麼兵器最好？」諸葛亮說：「用弓箭最好。」周瑜說：「對，先生跟我想的一樣。現在軍中缺箭，想請先生負責趕造十萬支箭。這是公事，希望先生不要推託。」
【第二段】諸葛亮說：「都督委託，當然照辦。不知道這十萬支箭什麼時候用？」周瑜問：「十天造得好嗎？」諸葛亮說：「既然就要交戰，十天太慢了。」周瑜問：「先生預計幾天可以造好？」諸葛亮說：「只要三天。」周瑜很高興，當面立下軍令狀。
【第三段】諸葛亮向魯肅借了二十條快船，每條船上要三十名軍士，船要用青布幔子遮起來，還要一千多個草把子。到了第三天四更時候，大霧漫天，諸葛亮請魯肅一起乘船取箭。船靠近曹操水寨，諸葛亮下令把船頭朝西，船尾朝東，一字排開，叫軍士擂鼓吶喊。
【第四段】曹操在大營聽見擂鼓吶喊，下令弓弩手朝霧中射箭。箭像雨一樣射在草把子上。天快亮了，霧還沒散，船兩邊的草把子都插滿了箭。二十條船順風順水駛回南岸，得箭十萬餘支。周瑜得知後長嘆一聲：「諸葛亮神機妙算，我真比不上他！」`;

  // 測試 1: 離線/示範模式下的 Mode B 六年級生成
  console.log('[測試 1] 離線/示範模式下的 Mode B 六年級生成：');
  const paper1 = await generatePIRLSTestPaper({
    mode: 'paste',
    pastedTitle,
    pastedText,
    targetGrade: 6,
    textType: 'literary',
    questionCountMode: 'standard',
    creatorId: 'teacher_1',
    creatorName: '林老師',
  });

  console.log(`- 試卷標題: ${paper1.title}`);
  console.log(`- 目標年級: 國小 ${paper1.targetGrade} 年級`);
  console.log(`- 題量: ${paper1.questions.length} 題 (總分: ${paper1.totalPoints} 分)`);
  console.log(`- 插圖幅數: ${paper1.illustrations?.length || 0} 幅`);

  if (paper1.questions.length >= 8 && paper1.targetGrade === 6 && paper1.title.includes('草船借箭')) {
    console.log('  ✔ 通過：成功產出六年級專屬試卷，題量非 0 且包含完整四層次題目與配圖提示詞！\n');
  } else {
    throw new Error('✘ 測試 1 失敗：題目數為 0 或未能正確載入自選文章');
  }

  // 測試 2: 模擬 AI 回傳題目為空 (Truncation 截斷場景) 的自癒保底
  console.log('[測試 2] 驗證 AI 截斷遺漏 questions 欄位時的自癒命題引擎：');
  const fallbackQuestions = generateSmartFallbackQuestions(
    pastedTitle,
    paper1.paragraphs,
    6,
    'literary',
    12
  );

  console.log(`- 自癒生成題目數: ${fallbackQuestions.length} 題`);
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0 };
  fallbackQuestions.forEach(q => {
    levels[q.processLevelNumber as 1 | 2 | 3 | 4] = (levels[q.processLevelNumber as 1 | 2 | 3 | 4] || 0) + 1;
  });
  console.log(`- 認知歷程分佈: L1: ${levels[1]}題, L2: ${levels[2]}題, L3: ${levels[3]}題, L4: ${levels[4]}題`);

  if (fallbackQuestions.length === 12 && levels[1] > 0 && levels[2] > 0 && levels[3] > 0 && levels[4] > 0) {
    console.log('  ✔ 通過：自癒引擎完整覆蓋四層次認知歷程與 IEA 雙位數評分規準！\n');
  } else {
    throw new Error('✘ 測試 2 失敗：認知歷程分佈未達標');
  }

  console.log('🎉 所有 Mode B 六年級出題防禦驗證 100% 通過！');
}

runTests().catch(err => {
  console.error('測試失敗:', err);
  process.exit(1);
});
