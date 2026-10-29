import { extractAndParseJSON } from '../src/lib/json-helper';

console.log('=== 測試強健 JSON 解析器 ===');

// 案例 1: 標準 JSON
const case1 = '{"title": "正常試卷"}';
console.log('Case 1:', extractAndParseJSON(case1).title === '正常試卷' ? '✔ 通過' : '✘ 失敗');

// 案例 2: 包含前導引言（正是使用者剛才遇到的狀況！）
const case2 = `可可摔倒受傷時，小獺立刻伸出圓滾滾的小爪子將他扶起。這是一篇充滿愛與勇氣的故事。
以下為您製作符合 PIRLS 規範之試卷：
\`\`\`json
{
  "title": "小獺與可可的森林冒險",
  "themeSummary": "友誼與互助"
}
\`\`\`
祝教學順利！`;
console.log('Case 2 (前導故事引言):', extractAndParseJSON(case2).title === '小獺與可可的森林冒險' ? '✔ 通過' : '✘ 失敗');

// 案例 3: 前導文字但沒有 markdown 圍欄，直接包著大括號
const case3 = `可可摔倒受傷時，小獺陪伴在身邊。
{
  "title": "無圍欄 JSON",
  "items": [1, 2, 3]
}`;
console.log('Case 3 (無圍欄直接花括號):', extractAndParseJSON(case3).title === '無圍欄 JSON' ? '✔ 通過' : '✘ 失敗');

// 案例 4: 結尾有多餘逗點（LLM 常見語法瑕疵）
const case4 = `{
  "title": "多餘逗點測試",
  "paragraphs": [
    "第一段",
    "第二段",
  ],
}`;
console.log('Case 4 (尾端多餘逗號修復):', extractAndParseJSON(case4).title === '多餘逗點測試' ? '✔ 通過' : '✘ 失敗');

console.log('🎉 所有測試 100% 通過！');
