import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { put, list, getDownloadUrl } from '@vercel/blob';
import { User, ClassRoom, TestPaper, ExamSubmission } from '../types';

/**
 * PIRLS 核心資料庫狀態介面
 */
export interface DBState {
  users: Record<string, User>;
  classes: Record<string, ClassRoom>;
  testPapers: Record<string, TestPaper>;
  submissions: Record<string, ExamSubmission>;
  lastSyncedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __pirls_db_cache: DBState | undefined;
  // eslint-disable-next-line no-var
  var __pirls_blob_last_synced: number | undefined;
}

export const SEED_DB_PATH = path.resolve(process.cwd(), 'data', 'pirls_database.json');
export const BLOB_FILE_NAME = 'database/pirls_database.json';

/**
 * 判斷是否處於 Next.js 打包建置階段。建置階段嚴禁發送生產雲端寫入請求。
 */
export function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.NEXT_PHASE === 'phase-export'
  );
}

export function getActiveDBPath(): string {
  if (process.platform !== 'win32' && process.env.NODE_ENV === 'production') {
    return '/tmp/pirls_database.json';
  }
  return SEED_DB_PATH;
}

export function getFirestoreInstance(): FirebaseFirestore.Firestore | null {
  if (isBuildPhase()) return null;

  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // 1. 本地 service-account.json
  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id,
      });
      return admin.firestore();
    } catch (e) {
      console.warn('[DB] Failed to init firebase-admin from service-account.json:', e);
    }
  }

  // 2. 環境變數憑證
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      return admin.firestore();
    } catch (e) {
      console.warn('[DB] Failed to init firebase-admin from env:', e);
    }
  }

  // 3. Google Cloud Run (Application Default Credentials - ADC)
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
    try {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'pirls-system',
      });
      return admin.firestore();
    } catch (e) {
      console.warn('[DB] Failed to init firebase-admin with ADC:', e);
    }
  }

  return null;
}

export async function fetchFromFirestore(): Promise<{ data: DBState | null; exists: boolean }> {
  const db = getFirestoreInstance();
  if (!db) return { data: null, exists: false };

  try {
    const [usersSnap, classesSnap, testPapersSnap, submissionsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('classes').get(),
      db.collection('testPapers').get(),
      db.collection('submissions').get(),
    ]);

    if (!testPapersSnap.empty || !usersSnap.empty) {
      const data: DBState = {
        users: {},
        classes: {},
        testPapers: {},
        submissions: {},
      };
      usersSnap.forEach((doc) => {
        data.users[doc.id] = doc.data() as User;
      });
      classesSnap.forEach((doc) => {
        data.classes[doc.id] = doc.data() as ClassRoom;
      });
      testPapersSnap.forEach((doc) => {
        data.testPapers[doc.id] = doc.data() as TestPaper;
      });
      submissionsSnap.forEach((doc) => {
        data.submissions[doc.id] = doc.data() as ExamSubmission;
      });
      return { data, exists: true };
    }

    return { data: null, exists: false };
  } catch (err) {
    console.warn('[DB] Firestore fetch note:', err);
    return { data: null, exists: false };
  }
}

export async function syncToFirestore(state: DBState): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;

  try {
    let batch = db.batch();
    let opCount = 0;

    for (const [id, paper] of Object.entries(state.testPapers)) {
      batch.set(db.collection('testPapers').doc(id), paper, { merge: true });
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
    for (const [id, user] of Object.entries(state.users)) {
      batch.set(db.collection('users').doc(id), user, { merge: true });
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
    for (const [id, cls] of Object.entries(state.classes)) {
      batch.set(db.collection('classes').doc(id), cls, { merge: true });
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
    for (const [id, sub] of Object.entries(state.submissions)) {
      batch.set(db.collection('submissions').doc(id), sub, { merge: true });
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err) {
    console.warn('[DB] Firestore sync warning:', err);
  }
}

export async function syncTestPaperToFirestore(paper: TestPaper): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('testPapers').doc(paper.id).set(paper);
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to sync testPaper to Firestore:', err);
    throw err;
  }
}

export async function deleteTestPaperFromFirestore(id: string): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('testPapers').doc(id).delete();
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to delete testPaper from Firestore:', err);
  }
}

export async function syncUserToFirestore(user: User): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('users').doc(user.id).set(user);
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to sync user to Firestore:', err);
  }
}

export async function deleteUserFromFirestore(id: string): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('users').doc(id).delete();
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to delete user from Firestore:', err);
  }
}

export async function syncClassToFirestore(cls: ClassRoom): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('classes').doc(cls.id).set(cls);
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to sync class to Firestore:', err);
  }
}

export async function deleteClassFromFirestore(id: string): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('classes').doc(id).delete();
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to delete class from Firestore:', err);
  }
}

export async function syncSubmissionToFirestore(sub: ExamSubmission): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('submissions').doc(sub.id).set(sub);
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to sync submission to Firestore:', err);
  }
}

export async function deleteSubmissionFromFirestore(id: string): Promise<void> {
  if (isBuildPhase()) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    await db.collection('submissions').doc(id).delete();
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err: any) {
    console.error('[DB] Failed to delete submission from Firestore:', err);
  }
}

export async function batchDeleteFromFirestore(
  items: { collection: string; id: string }[]
): Promise<void> {
  if (isBuildPhase() || items.length === 0) return;
  const db = getFirestoreInstance();
  if (!db) return;
  try {
    let batch = db.batch();
    let count = 0;
    for (const item of items) {
      batch.delete(db.collection(item.collection).doc(item.id));
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err) {
    console.error('[DB] Failed batchDeleteFromFirestore:', err);
  }
}

export async function fetchFromBlob(): Promise<{ data: DBState | null; exists: boolean }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { data: null, exists: false };

  try {
    const { blobs } = await list({ prefix: BLOB_FILE_NAME, token });
    if (blobs && blobs.length > 0) {
      const downloadUrl = blobs[0].downloadUrl || getDownloadUrl(blobs[0].url);
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as DBState;
        if (!data.users) data.users = {};
        if (!data.classes) data.classes = {};
        if (!data.testPapers) data.testPapers = {};
        if (!data.submissions) data.submissions = {};
        return { data, exists: true };
      }
      return { data: null, exists: true };
    }
    return { data: null, exists: false };
  } catch (err) {
    console.warn('[DB] Blob fetch note:', err);
    return { data: null, exists: false };
  }
}

export async function syncToBlob(state: DBState): Promise<void> {
  if (isBuildPhase()) return;

  await syncToFirestore(state).catch((e) => console.warn('[DB] Firestore sync error:', e));

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await put(BLOB_FILE_NAME, JSON.stringify(state, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    globalThis.__pirls_blob_last_synced = Date.now();
  } catch (err) {
    console.warn('[DB] Blob sync warning:', err);
  }
}

export async function syncCloudOnBoot(): Promise<void> {
  if (isBuildPhase()) return;

  const now = Date.now();
  if (globalThis.__pirls_db_cache && globalThis.__pirls_blob_last_synced && now - globalThis.__pirls_blob_last_synced < 5000) {
    return;
  }

  const firestoreDb = getFirestoreInstance();
  if (firestoreDb) {
    try {
      const { data: cloud, exists } = await fetchFromFirestore();
      if (cloud) {
        globalThis.__pirls_db_cache = cloud;
        globalThis.__pirls_blob_last_synced = now;
        try {
          fs.writeFileSync(getActiveDBPath(), JSON.stringify(cloud, null, 2), 'utf-8');
        } catch {}
        return;
      } else if (!exists && !isBuildPhase()) {
        const seed = ensureLocalDB();
        await syncToFirestore(seed);
        globalThis.__pirls_blob_last_synced = now;
        return;
      }
    } catch (err) {
      console.warn('[DB] syncCloudOnBoot (Firestore) note:', err);
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    globalThis.__pirls_blob_last_synced = now;
    return;
  }

  try {
    const { data: cloud, exists } = await fetchFromBlob();
    if (cloud) {
      globalThis.__pirls_db_cache = cloud;
      globalThis.__pirls_blob_last_synced = now;
      try {
        fs.writeFileSync(getActiveDBPath(), JSON.stringify(cloud, null, 2), 'utf-8');
      } catch {}
    } else if (!exists && !isBuildPhase()) {
      const seed = ensureLocalDB();
      await syncToBlob(seed);
      globalThis.__pirls_blob_last_synced = now;
    }
  } catch (err) {
    console.warn('[DB] syncCloudOnBoot error:', err);
  }
}

export function ensureLocalDB(): DBState {
  if (globalThis.__pirls_db_cache) {
    return globalThis.__pirls_db_cache;
  }

  const activePath = getActiveDBPath();
  const dir = path.dirname(activePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn('[DB] Failed to ensure directory:', e);
  }

  if (fs.existsSync(activePath)) {
    try {
      const content = fs.readFileSync(activePath, 'utf-8');
      const parsed = JSON.parse(content) as DBState;
      if (!parsed.users) parsed.users = {};
      if (!parsed.classes) parsed.classes = {};
      if (!parsed.testPapers) parsed.testPapers = {};
      if (!parsed.submissions) parsed.submissions = {};
      globalThis.__pirls_db_cache = parsed;
      return parsed;
    } catch (e) {
      console.warn('[DB] Failed to parse active db file:', e);
    }
  }

  if (fs.existsSync(SEED_DB_PATH)) {
    try {
      const seedContent = fs.readFileSync(SEED_DB_PATH, 'utf-8');
      const seedParsed = JSON.parse(seedContent) as DBState;
      if (!seedParsed.users) seedParsed.users = {};
      if (!seedParsed.classes) seedParsed.classes = {};
      if (!seedParsed.testPapers) seedParsed.testPapers = {};
      if (!seedParsed.submissions) seedParsed.submissions = {};
      globalThis.__pirls_db_cache = seedParsed;
      try {
        fs.writeFileSync(activePath, JSON.stringify(seedParsed, null, 2), 'utf-8');
      } catch {}
      return seedParsed;
    } catch (e) {
      console.warn('[DB] Failed to parse seed database:', e);
    }
  }

  const emptyDB: DBState = {
    users: {},
    classes: {},
    testPapers: {},
    submissions: {},
  };
  globalThis.__pirls_db_cache = emptyDB;
  return emptyDB;
}

export function saveLocalDB(state: DBState): void {
  globalThis.__pirls_db_cache = state;
  const activePath = getActiveDBPath();
  try {
    const dir = path.dirname(activePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(activePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[DB] Failed to save active db file:', e);
  }
}
