import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

async function testConnection() {
  console.log('=== 正在測試 Google Cloud / Firebase 服務帳戶連線 ===');

  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    throw new Error('未找到 service-account.json');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  console.log('專案 ID:', serviceAccount.project_id);
  console.log('客戶端 Email:', serviceAccount.client_email);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = admin.firestore();
  console.log('已建立 Firestore 客戶端，正在測試讀寫權限...');

  const testRef = db.collection('_system_health').doc('ping');
  await testRef.set({
    status: 'ok',
    testedAt: new Date().toISOString(),
    system: 'PIRLS Cloud Run Integration',
  });

  const snap = await testRef.get();
  console.log('✔ 成功讀取 Firestore 測試文件:', snap.data());

  // 清除測試文檔
  await testRef.delete();
  console.log('✔ 成功清除測試文檔');
  console.log('🎉 Google Cloud Firestore 驗證 100% 成功！權限完全正常！');
}

testConnection().catch((err) => {
  console.error('❌ Firestore 連線或權限測試失敗:', err);
  process.exit(1);
});
