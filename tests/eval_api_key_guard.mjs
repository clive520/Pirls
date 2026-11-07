import { generatePIRLSTestPaper } from '../src/lib/ai/index.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   🛡️ AI API Key 必填檢驗與防誤導攔截機制 整合測試              ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

async function testApiKeyGuard() {
  console.log(`${colors.yellow}測試 1: 未提供 API Key 時，系統嚴格攔截並拋出填寫提示，絕不悄悄生成範例文章...${colors.reset}`);
  let blocked = false;
  try {
    await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '外星文明探險',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: false,
      creatorId: 'teacher_1',
      creatorName: '張老師',
      apiKey: '', // 刻意留空
    });
  } catch (err) {
    blocked = true;
    console.log(`  ✔ 成功攔截無金鑰請求，錯誤訊息: "${err.message}"`);
  }

  if (!blocked) {
    console.error(`${colors.red}❌ 失敗：系統未攔截空金鑰請求，仍生成了範例文章！${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ 測試 1 通過：無金鑰時嚴格阻擋並提示填寫！${colors.reset}\n`);
  }

  console.log(`${colors.yellow}測試 2: 僅在顯式宣告 allowMockFallback: true 時才允許備援（供離線自動測試專用）...${colors.reset}`);
  const mockPaper = await generatePIRLSTestPaper({
    mode: 'theme',
    theme: '離線測試',
    targetGrade: 4,
    textType: 'literary',
    questionCountMode: 'compact',
    includeDiagram: false,
    creatorId: 'teacher_test',
    creatorName: '測試老師',
    apiKey: '',
    allowMockFallback: true,
  });

  if (mockPaper && mockPaper.title) {
    console.log(`  ✔ 離線備援正常產出: 《${mockPaper.title}》`);
    console.log(`${colors.green}✅ 測試 2 通過：自動化離線測試相容性完整保留！${colors.reset}\n`);
  } else {
    console.error(`${colors.red}❌ 測試 2 失敗${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.bold}${colors.green}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}   🎉 API Key 防誤導攔截機制 100% 驗證通過！                   ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}================================================================${colors.reset}\n`);
}

testApiKeyGuard();
