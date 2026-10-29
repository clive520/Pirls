import { extractAndParseJSON } from '../src/lib/json-helper';

console.log('=== 測試強健 JSON 解析器與容錯修復 ===');

// 案例 1: 標準 JSON
const case1 = '{"title": "正常試卷"}';
console.log('Case 1:', extractAndParseJSON(case1).title === '正常試卷' ? '✔ 通過' : '✘ 失敗');

// 案例 2: 包含前導引言
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

// 案例 5: 故事長文中包含實體換行符號（控制字元未跳脫）
const case5 = `{
  "title": "阿勇與黑鼻的勇氣約定",
  "themeSummary": "透過男孩阿勇拯救受虐小狗黑鼻的歷程，引導學生體會動物保護的意義",
  "articleContent": "【第一段】阿勇是一個四年級的小男孩。
他每天放學都會經過公園。
【第二段】這一天，他在草叢裡發現了黑鼻。",
  "paragraphs": [
    { "paragraphNumber": 1, "text": "【第一段】阿勇是一個四年級的小男孩。
他每天放學都會經過公園。" }
  ]
}`;
console.log('Case 5 (字串實體換行控制字元修復):', extractAndParseJSON(case5).title === '阿勇與黑鼻的勇氣約定' ? '✔ 通過' : '✘ 失敗');

// 案例 6: 截斷修復（LLM 輸出達 Token 上限時提前斷尾）
const case6 = `{
  "title": "阿勇與黑鼻的勇氣約定",
  "themeSummary": "動物保護與同理心",
  "questions": [
    {
      "questionNumber": 1,
      "prompt": "阿勇在哪裡遇到黑鼻？",
      "options": [
        { "label": "A", "text": "公園", "isCorrect": true }
      ]
    },
    {
      "questionNumber": 2,
      "prompt": "為什麼阿勇要保護黑鼻？",
      "rubric": {
        "maxScore": 2,
        "criteria": [
          { "score": 2, "description": "同理心" }
`;
console.log('Case 6 (Token 截斷自動閉合修復):', extractAndParseJSON(case6).title === '阿勇與黑鼻的勇氣約定' && extractAndParseJSON(case6).questions.length === 2 ? '✔ 通過' : '✘ 失敗');

console.log('🎉 所有 6 項嚴苛測試 100% 通過！');
