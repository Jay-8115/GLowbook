import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Check db connectivity
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message || error,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
