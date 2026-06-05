import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken } from '@/lib/security';
import { z } from 'zod';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = refreshSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { refreshToken } = validation.data;
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const newAccessToken = generateAccessToken(decoded.userId, decoded.role);

    return NextResponse.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
