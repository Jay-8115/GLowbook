import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const salonRegisterSchema = z.object({
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number must be at least 5 characters'),
  salonName: z.string().min(2, 'Salon name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  latitude: z.number(),
  longitude: z.number(),
  coverImage: z.string().url('Cover image must be a valid URL'),
  galleryImages: z.array(z.string().url('Gallery images must be valid URLs')).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = salonRegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if email already registered in SalonRegistration
    const existingReg = await prisma.salonRegistration.findUnique({
      where: { email: validation.data.email },
    });

    if (existingReg) {
      return NextResponse.json(
        { error: 'A salon registration request already exists for this email.' },
        { status: 400 }
      );
    }

    // Also check if User table has this email
    const existingUser = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user account with this email already exists.' },
        { status: 400 }
      );
    }

    const registration = await prisma.salonRegistration.create({
      data: {
        ...validation.data,
        status: 'pending',
      },
    });

    return NextResponse.json(
      {
        message: 'Salon registration request submitted successfully. It is under admin review.',
        registration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Salon registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
