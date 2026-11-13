import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const BASE_URL = "http://localhost:3000";

async function loginAndGetToken(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  const cookies = res.headers.getSetCookie?.() || [];
  let token = '';
  for (const c of cookies) {
    const m = c.match(/pirls_token=([^;]+)/);
    if (m) token = m[1];
  }
  if (!token) {
    const raw = res.headers.get('set-cookie') || '';
    const m = raw.match(/pirls_token=([^;]+)/);
    if (m) token = m[1];
  }
  return { data, token };
}

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log('1. 獲取登入 Token...');
  const teacherAuth = await loginAndGetToken('teacher', 'teacher123');
  const studentAuth = await loginAndGetToken('s602_01', '185221');
  console.log('✓ 教師 Token:', teacherAuth.token ? '成功' : '失敗');
  console.log('✓ 學生 Token:', studentAuth.token ? '成功' : '失敗');

  const tmpProfile = path.resolve('tmp-chrome-capture');
  if (!fs.existsSync(tmpProfile)) fs.mkdirSync(tmpProfile, { recursive: true });

  console.log('2. 啟動 Headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1280,850',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const verRes = await fetch(`http://localhost:${PORT}/json/version`);
    const ver = await verRes.json();
    console.log('✓ 連線至 Chrome:', ver.Browser);

    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise(resolve => ws.addEventListener('open', resolve));
    console.log('✓ CDP WebSocket 已連接');

    await cdpSend(ws, 'Page.enable');
    await cdpSend(ws, 'Network.enable');

    const tasks = [
      {
        folder: '05試卷指派與A4列印',
        file: '01_試卷指派設定與題庫總覽.png',
        url: `${BASE_URL}/dashboard/teacher/test-papers`,
        role: 'teacher',
        waitMs: 3000
      },
      {
        folder: '05試卷指派與A4列印',
        file: '02_A4實體學生卷雙面排版.png',
        url: `${BASE_URL}/print/test_1793747348241_3pl94`,
        role: 'none',
        waitMs: 3000
      },
      {
        folder: '05試卷指派與A4列印',
        file: '03_A4教師解答卷與IEA雙位數代碼規準表.png',
        url: `${BASE_URL}/print/test_1793747348241_3pl94?showAnswers=true`,
        role: 'none',
        waitMs: 3000
      },
      {
        folder: '05試卷指派與A4列印',
        file: '04_學生帳密卡批次列印預覽.png',
        url: `${BASE_URL}/print/student-cards/cls_1793240000000_602`,
        role: 'teacher',
        waitMs: 3000
      },
      {
        folder: '06學生端測驗流程',
        file: '01_學生登入與身分認證.png',
        url: `${BASE_URL}/login`,
        role: 'none',
        waitMs: 2000
      },
      {
        folder: '06學生端測驗流程',
        file: '02_學生測驗工作台與待測任務.png',
        url: `${BASE_URL}/dashboard/student`,
        role: 'student',
        waitMs: 3000
      },
      {
        folder: '06學生端測驗流程',
        file: '03_線上雙欄閱讀與字級縮放測驗作答.png',
        url: `${BASE_URL}/practice/test_1793747348241_3pl94`,
        role: 'none',
        waitMs: 3000
      },
      {
        folder: '07學生端成績與診斷報告',
        file: '01_個人四維素養雷達圖與成績落點診斷.png',
        url: `${BASE_URL}/dashboard/student/result/sub_1793860439505_bq18z`,
        role: 'student',
        waitMs: 3000
      },
      {
        folder: '08教師批改審閱與AI重評',
        file: '01_學生作答審查與AI重評判分.png',
        url: `${BASE_URL}/dashboard/teacher/submissions/sub_1793860439505_bq18z`,
        role: 'teacher',
        waitMs: 3000
      },
      {
        folder: '09班級學力統計分析與Excel匯出',
        file: '01_全班國際量尺分佈與五大基準落點.png',
        url: `${BASE_URL}/dashboard/teacher/test-papers/test_1793747348241_3pl94/results`,
        role: 'teacher',
        waitMs: 3500
      },
      {
        folder: '09班級學力統計分析與Excel匯出',
        file: '02_雙班比較雷達圖與常模落點.png',
        url: `${BASE_URL}/dashboard/teacher/analytics/comparative`,
        role: 'teacher',
        waitMs: 3500
      },
      {
        folder: '10開放自學區',
        file: '01_開放自學區好文探索與即測即評.png',
        url: `${BASE_URL}/practice`,
        role: 'none',
        waitMs: 2500
      }
    ];

    for (const item of tasks) {
      console.log(`\n📷 正在拍攝: [${item.folder}] ${item.file}...`);
      const targetDir = path.resolve('public', '截圖', item.folder);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // 清除並設定 Cookie
      await cdpSend(ws, 'Network.clearBrowserCookies');
      if (item.role === 'teacher' && teacherAuth.token) {
        await cdpSend(ws, 'Network.setCookie', {
          name: 'pirls_token',
          value: teacherAuth.token,
          domain: 'localhost',
          path: '/'
        });
      } else if (item.role === 'student' && studentAuth.token) {
        await cdpSend(ws, 'Network.setCookie', {
          name: 'pirls_token',
          value: studentAuth.token,
          domain: 'localhost',
          path: '/'
        });
      }

      await cdpSend(ws, 'Page.navigate', { url: item.url });
      await new Promise(r => setTimeout(r, item.waitMs));

      const res = await cdpSend(ws, 'Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });

      const buffer = Buffer.from(res.data, 'base64');
      const outPath = path.join(targetDir, item.file);
      fs.writeFileSync(outPath, buffer);
      console.log(`✓ 已成功保存: ${item.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    ws.close();
  } catch (err) {
    console.error('執行過程發生錯誤:', err);
  } finally {
    chrome.kill('SIGTERM');
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

run();
