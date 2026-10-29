import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

async function migrateData() {
  console.log('=== 開始遷移現有資料庫至 Google Cloud Firestore ===');

  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    throw new Error('未找到 service-account.json');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = admin.firestore();

  // 讀取本地目前的完整種子資料庫
  const dataPath = path.resolve(process.cwd(), 'data', 'pirls_database.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error('未找到 data/pirls_database.json');
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const state = JSON.parse(raw);

  const usersCount = Object.keys(state.users || {}).length;
  const classesCount = Object.keys(state.classes || {}).length;
  const testPapersCount = Object.keys(state.testPapers || {}).length;
  const submissionsCount = Object.keys(state.submissions || {}).length;

  console.log(`即將遷移的資料規模：`);
  console.log(`- 使用者帳號 (Users): ${usersCount} 筆`);
  console.log(`- 班級資訊 (Classes): ${classesCount} 筆`);
  console.log(`- PIRLS 題本 (Test Papers): ${testPapersCount} 份`);
  console.log(`- 測驗作答 (Submissions): ${submissionsCount} 筆`);

  // 1. 寫入全域狀態快照文檔 (供快速冷啟動 0ms 還原)
  console.log('\n[1/2] 正在寫入 Firestore 主狀態快照 (_pirls_system/database_state)...');
  await db.collection('_pirls_system').doc('database_state').set({
    users: state.users || {},
    classes: state.classes || {},
    testPapers: state.testPapers || {},
    submissions: state.submissions || {},
    lastSyncedAt: new Date().toISOString(),
    migratedFrom: 'local_database_seed',
  });
  console.log('✔ 主狀態快照同步完成！');

  // 2. 依正規 NoSQL 結構寫入個別集合 (供後續高併發分散查詢)
  console.log('\n[2/2] 正在批次寫入 Firestore 正規集合 (users, classes, testPapers, submissions)...');
  
  const batch = db.batch();
  let batchCount = 0;

  for (const [id, user] of Object.entries(state.users || {})) {
    batch.set(db.collection('users').doc(id), user);
    batchCount++;
  }

  for (const [id, cls] of Object.entries(state.classes || {})) {
    batch.set(db.collection('classes').doc(id), cls);
    batchCount++;
  }

  for (const [id, paper] of Object.entries(state.testPapers || {})) {
    batch.set(db.collection('testPapers').doc(id), paper);
    batchCount++;
  }

  for (const [id, sub] of Object.entries(state.submissions || {})) {
    batch.set(db.collection('submissions').doc(id), sub);
    batchCount++;
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`✔ 成功提交 ${batchCount} 筆文檔至 Firestore 集合！`);
  }

  console.log('\n🎉 所有資料已 100% 成功遷移並保存在 Google Cloud Firestore！');
}

migrateData().catch((err) => {
  console.error('❌ 遷移過程失敗:', err);
  process.exit(1);
});
