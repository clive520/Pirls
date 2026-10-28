import { SignJWT, jwtVerify } from 'jose';
import { AuthSession } from './types';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'pirls-secret-key-national-reading-literacy-2026';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * 簽發 JWT Session Token (使用 jose 函式庫，完全相容 Edge Runtime 與 Node.js)
 */
export async function signSessionToken(session: AuthSession): Promise<string> {
  return await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * 驗證並解密 JWT Session Token (Edge Runtime 相容)
 */
export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}
