import bcrypt from 'bcryptjs';
export { signSessionToken, verifySessionToken } from './jwt';

const SALT_ROUNDS = 10;

/**
 * 密碼加鹽雜湊 (Bcrypt)
 */
export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * 密碼比對驗證
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}
