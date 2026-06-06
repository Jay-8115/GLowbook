import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { hashPassword } from '@/lib/security';
import { sendApprovalEmail } from '@/lib/email';
import { sendPushNotification } from '@/lib/fcm';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    // 1. Fetch the registration request
    const registration = await prisma.salonRegistration.findUnique({
      where: { id },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Salon registration request not found' }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${registration.status}.` },
        { status: 400 }
      );
    }

    // 2. Check if a User with the registration email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: registration.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user account with this email already exists.' },
        { status: 400 }
      );
    }

    // 3. Generate credentials
    // Generate a simple clean username (e.g. from ownerName)
    const baseUsername = registration.ownerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit number
    const username = `${baseUsername}${randomSuffix}`;

    // Generate temporary password
    const tempPassword = 'Glow' + Math.random().toString(36).slice(-8) + '!';
    const passwordHash = await hashPassword(tempPassword);

    // 4. Create the salon owner user account and the salon record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create owner user
      const ownerUser = await tx.user.create({
        data: {
          name: registration.ownerName,
          email: registration.email,
          passwordHash,
          phone: registration.phone,
          role: 'OWNER',
        },
      });

      // Create salon
      const salon = await tx.salon.create({
        data: {
          name: registration.salonName,
          description: registration.description,
          ownerId: ownerUser.id,
          address: registration.address,
          city: registration.city,
          state: registration.state,
          lat: registration.latitude,
          lng: registration.longitude,
          phone: registration.phone,
          imageUrl: registration.coverImage,
          images: registration.galleryImages,
          openTime: '09:00',
          closeTime: '21:00',
          totalSeats: 2,
          isActive: true,
          isVerified: true,
        },
      });

      // Update registration status
      const updatedReg = await tx.salonRegistration.update({
        where: { id },
        data: { status: 'approved' },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: 'SALON_REGISTRATION_APPROVED',
          details: `Approved salon "${registration.salonName}" registration request. Created owner account ID: ${ownerUser.id} and Salon ID: ${salon.id}`,
        },
      });

      return { ownerUser, salon, updatedReg };
    });

    // 5. Send approval email (async, non-blocking)
    try {
      await sendApprovalEmail(
        registration.email,
        registration.ownerName,
        registration.email, // Standard NextAuth/JWT logs in with email directly
        tempPassword
      );
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
    }

    // 6. Send push notification to owner
    try {
      await sendPushNotification(
        result.ownerUser.id,
        'Salon Approved',
        'Your salon registration has been approved. Welcome to GlowBook!',
        'BOOKING_UPDATE'
      );
    } catch (fcmErr) {
      console.error('Failed to send FCM notification:', fcmErr);
    }

    // 7. Emit real-time Socket.IO event
    const io = (global as any).io;
    if (io) {
      const payload = {
        ownerId: result.ownerUser.id,
        salonId: result.salon.id,
        salonStatus: 'approved',
        salonName: result.salon.name,
        isApproved: true
      };
      io.to(`owner:${result.ownerUser.id}`).emit('salon_approved', payload);
      io.emit('salon_approved', payload);
      console.log(`[Socket] Emitted salon_approved to owner:${result.ownerUser.id}`);
    }

    return NextResponse.json({
      message: 'Salon registration approved successfully. Owner account and salon record created.',
      registration: result.updatedReg,
      salon: result.salon,
      credentials: {
        username: registration.email,
        temporaryPassword: tempPassword,
      },
    });

  } catch (error) {
    console.error('Approve salon request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
