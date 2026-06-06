import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/security';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    let { email, password } = validation.data;

    // Map username 'admin' to seeded admin email
    if (email.toLowerCase() === 'admin') {
      email = 'admin@glowbook.com';
    }

    // Check SalonRegistration status for login restriction
    const salonReg = await prisma.salonRegistration.findUnique({
      where: { email },
    });

    if (salonReg) {
      if (salonReg.status === 'pending') {
        return NextResponse.json({
          success: false,
          error: 'Your salon registration is under review by the admin.',
          message: 'Your salon registration is under review by the admin.',
        }, { status: 403 });
      } else if (salonReg.status === 'rejected') {
        return NextResponse.json({
          success: false,
          error: 'Your salon registration has been rejected. Please contact support.',
          message: 'Your salon registration has been rejected. Please contact support.',
        }, { status: 403 });
      }
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: 'Logged into the platform',
      },
    });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    return NextResponse.json({
      message: 'Login successful',
      user: safeUser,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
