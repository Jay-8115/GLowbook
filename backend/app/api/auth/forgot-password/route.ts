import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { email } = validation.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Mock OTP: 123456 (logged in console and audit logs)
      const mockOtp = '123456';
      console.log(`[MOCK OTP] Password reset request for user ${email}. Verification OTP: ${mockOtp}`);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          details: `Requested reset. Verification OTP: ${mockOtp}`,
        },
      });
    }

    // Always return a success message for security/privacy (no user enumeration)
    return NextResponse.json({
      message: 'If a user with this email exists, a password reset OTP has been generated.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
