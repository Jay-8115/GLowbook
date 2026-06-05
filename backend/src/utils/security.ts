import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'glowbook_access_secret_123!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'glowbook_refresh_secret_123!';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string; role: string };
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; role: string };
  } catch (error) {
    return null;
  }
}
