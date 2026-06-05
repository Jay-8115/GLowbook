import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Global middleware logic (if any)
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
