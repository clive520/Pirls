import { GoogleAuth } from 'google-auth-library';
import path from 'path';

async function checkCloudRunServices() {
  const saPath = path.resolve(process.cwd(), 'service-account.json');
  const auth = new GoogleAuth({
    keyFile: saPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const projectId = 'pirls-system';

  console.log(`正在查詢專案 [${projectId}] 的 Cloud Run 服務列表...`);

  // 查詢所有區域的 Cloud Run 服務 (v2 API)
  try {
    const url = `https://run.googleapis.com/v2/projects/${projectId}/locations/-/services`;
    const res = await client.request<{ services?: any[] }>({ url });
    const services = res.data.services || [];

    if (services.length === 0) {
      console.log('尚未找到已完成的 Cloud Run 服務 (可能建置中或尚未完成)。');
      // 嘗試查詢 Cloud Build 建置紀錄
      await checkCloudBuilds(client, projectId);
      return;
    }

    console.log(`✔ 找到 ${services.length} 個 Cloud Run 服務：`);
    for (const svc of services) {
      console.log(`----------------------------------------`);
      console.log(`服務名稱: ${svc.name}`);
      console.log(`服務網址 (URL): ${svc.uri}`);
      console.log(`最新部署修訂版: ${svc.latestReadyRevision || svc.latestCreatedRevision}`);
      console.log(`執行狀態: ${JSON.stringify(svc.conditions?.map((c: any) => ({ type: c.type, state: c.state })))}`);
      console.log(`----------------------------------------`);
    }
  } catch (err: any) {
    console.error('查詢 Cloud Run 失敗:', err.message);
    if (err.response?.data) {
      console.error('詳細錯誤:', JSON.stringify(err.response.data));
    }
    // 嘗試查詢 Cloud Build
    await checkCloudBuilds(client, projectId);
  }
}

async function checkCloudBuilds(client: any, projectId: string) {
  try {
    console.log(`正在檢查專案 [${projectId}] 的 Cloud Build 建置歷史與進度...`);
    const buildUrl = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds?pageSize=5`;
    const res = await client.request<{ builds?: any[] }>({ url: buildUrl });
    const builds = res.data.builds || [];

    if (builds.length === 0) {
      console.log('目前沒有進行中的 Cloud Build 任務。');
      return;
    }

    console.log(`✔ 找到最近的 ${builds.length} 次建置任務：`);
    for (const b of builds) {
      console.log(`- Build ID: ${b.id} | 狀態: ${b.status} | 建立時間: ${b.createTime} | 耗時: ${b.duration || '進行中'}`);
      if (b.logUrl) console.log(`  日誌: ${b.logUrl}`);
    }
  } catch (e: any) {
    console.log('無法查詢 Cloud Build (可能權限受限或 API 尚未調用):', e.message);
  }
}

checkCloudRunServices().catch(console.error);
