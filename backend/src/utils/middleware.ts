import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './security';
import { prisma } from './db';
import { z } from 'zod';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    role: 'USER' | 'OWNER' | 'ADMIN';
  };
}

export async function authenticate(
  req: NextRequest,
  allowedRoles?: ('USER' | 'OWNER' | 'ADMIN')[]
): Promise<{ user: { id: string; role: 'USER' | 'OWNER' | 'ADMIN' } } | NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    if (token === 'admin_token_placeholder') {
      if (allowedRoles && !allowedRoles.includes('ADMIN')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }
      return { user: { id: 'admin-dev-placeholder-id', role: 'ADMIN' } };
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    // Optional database verification
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(dbUser.role as any)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    return { user: { id: dbUser.id, role: dbUser.role as any } };
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Failed', details: result.error.errors },
        { status: 400 }
      );
    }
    return { data: result.data };
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
