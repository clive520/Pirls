import { createTestPaper, getTestPaperById, updateTestPaper } from '../src/lib/db/test-papers.ts';

async function run() {
  console.log('🧪 開始驗證「教師編輯文章更換圖片」持久化與更新測試...');

  // 1. 建立測試試卷
  const initialPaper = await createTestPaper({
    title: '插圖更換測試文章',
    targetGrade: 4,
    textType: 'literary',
    themeSummary: '測試圖片更新',
    wordCount: 100,
    articleContent: '這是第一段文章內容。\n\n這是第二段文章內容。',
    paragraphs: [
      { paragraphNumber: 1, text: '這是第一段文章內容。' },
      { paragraphNumber: 2, text: '這是第二段文章內容。' },
    ],
    illustrations: [
      {
        id: 'ill_scene_1_init',
        paragraphNumber: 1,
        caption: '原始圖片圖說',
        type: 'illustration_url',
        imageUrl: 'data:image/jpeg;base64,OLD_IMAGE_DATA_INITIAL',
      },
    ],
    questions: [
      {
        id: 'q1',
        questionNumber: 1,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        prompt: '第一段在說什麼？',
        points: 1,
        options: [
          { label: 'A', text: '選項A', isCorrect: true, explanation: '正解' },
          { label: 'B', text: '選項B', isCorrect: false, explanation: '錯誤' },
        ],
      },
    ],
    totalPoints: 1,
    creatorId: 'teacher_mock_1',
    creatorName: '測試教師',
    isPublic: false,
    timeLimitMinutes: 0,
  });

  console.log('✅ 建立初始試卷成功，ID:', initialPaper.id);
  console.log('  - 初始圖片 URL:', initialPaper.illustrations[0].imageUrl);

  // 2. 模擬前端 api.teacher.updateTestPaper 送出 { testPaper: ... } 包裹 payload
  console.log('\n🔄 測試情境 1：模擬前端 api.teacher.updateTestPaper 送出 { testPaper: updatedPaper }...');
  const newImageUrl1 = 'data:image/jpeg;base64,UPDATED_IMAGE_REPLACED_SCENE_1_XYZ';
  const updatedIllustrations1 = [
    {
      ...initialPaper.illustrations[0],
      caption: '更換後之新插圖圖說 (情境1)',
      imageUrl: newImageUrl1,
    },
  ];

  const updatePayloadWithWrapper = {
    testPaper: {
      ...initialPaper,
      illustrations: updatedIllustrations1,
      title: '插圖更換測試文章（標題亦同步更新）',
    },
  };

  const result1 = await updateTestPaper(initialPaper.id, updatePayloadWithWrapper);
  if (!result1) {
    throw new Error('updateTestPaper 返回 null！');
  }

  const fetched1 = await getTestPaperById(initialPaper.id);
  if (!fetched1) {
    throw new Error('getTestPaperById 找不到試卷！');
  }

  console.log('  - 查驗更新後圖片 URL:', fetched1.illustrations[0].imageUrl);
  console.log('  - 查驗更新後圖說:', fetched1.illustrations[0].caption);
  console.log('  - 查驗更新後標題:', fetched1.title);
  console.log('  - 查驗是否有髒資料 nested testPaper 鍵:', Boolean(fetched1.testPaper));

  if (fetched1.illustrations[0].imageUrl !== newImageUrl1) {
    throw new Error(`❌ 圖片更換失敗！期望: ${newImageUrl1}，實際: ${fetched1.illustrations[0].imageUrl}`);
  }
  if (fetched1.illustrations[0].caption !== '更換後之新插圖圖說 (情境1)') {
    throw new Error(`❌ 圖說更新失敗！`);
  }
  if (fetched1.title !== '插圖更換測試文章（標題亦同步更新）') {
    throw new Error(`❌ 標題更新失敗！`);
  }
  if (fetched1.testPaper !== undefined) {
    throw new Error(`❌ 資料庫包含髒資料 nested testPaper 鍵！`);
  }
  console.log('✅ 情境 1 通過：包裹 { testPaper } 正確被解開，圖片與文章資料成功更換！');

  // 3. 測試情境 2：直接送出無包裹 updates
  console.log('\n🔄 測試情境 2：直接傳遞 Partial<TestPaper> updates...');
  const newImageUrl2 = 'data:image/jpeg;base64,UPDATED_IMAGE_SCENE_2_DIRECT';
  await updateTestPaper(initialPaper.id, {
    illustrations: [
      {
        ...fetched1.illustrations[0],
        imageUrl: newImageUrl2,
        caption: '第二次直接更換圖片',
      },
    ],
  });

  const fetched2 = await getTestPaperById(initialPaper.id);
  if (fetched2.illustrations[0].imageUrl !== newImageUrl2) {
    throw new Error(`❌ 第二次圖片更換失敗！`);
  }
  console.log('  - 第二次更新後圖片 URL:', fetched2.illustrations[0].imageUrl);
  console.log('✅ 情境 2 通過：直接 Partial updates 亦相容且正確更換！');

  // 清理測試試卷，保持資料庫乾淨
  const { deleteTestPaper } = await import('../src/lib/db/test-papers.ts');
  await deleteTestPaper(initialPaper.id);
  console.log('🧹 測試試卷已自動清理完畢');

  console.log('\n🎉 所有「教師文章更換圖片」持久化與資料庫測試全數通過！');
}

run().catch((err) => {
  console.error('❌ 測試失敗:', err);
  process.exit(1);
});
