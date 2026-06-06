import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id }
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const salon = await prisma.salon.findFirst({
      where: { ownerId: user.id }
    });

    const registration = await prisma.salonRegistration.findUnique({
      where: { email: user.email }
    });

    // Determine status
    // If registration exists, we use its status.
    // Otherwise, we check if there's a salon and if it's verified (approved)
    const status = registration ? registration.status : (salon?.isVerified ? 'approved' : 'pending');
    const isApproved = status === 'approved';

    return NextResponse.json({
      ownerId: user.id,
      salonId: salon?.id || '',
      salonStatus: status,
      salonName: salon?.name || registration?.salonName || '',
      isApproved
    });
  } catch (error) {
    console.error('Fetch owner profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
