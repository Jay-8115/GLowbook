import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash standard password "password123" and admin password "admin123"
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 1. Create categories
  const categories = [
    { name: 'Haircuts & Styling', icon: 'scissors', salonCount: 1 },
    { name: 'Nail Services', icon: 'hand_sparkles', salonCount: 1 },
    { name: 'Facial & Skin Care', icon: 'face_retouching', salonCount: 1 },
    { name: 'Massage Therapy', icon: 'spa', salonCount: 1 },
    { name: 'Makeup & Cosmetics', icon: 'brush', salonCount: 1 },
  ];

  const dbCategories = [];
  for (const cat of categories) {
    const createdCat = await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, salonCount: cat.salonCount },
      create: cat,
    });
    dbCategories.push(createdCat);
  }
  console.log(`Created ${dbCategories.length} categories.`);

  // 2. Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@glowbook.com' },
    update: {
      passwordHash: adminPasswordHash,
    },
    create: {
      name: 'GlowBook Admin',
      email: 'admin@glowbook.com',
      passwordHash: adminPasswordHash,
      phone: '+15550100',
      role: 'ADMIN',
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@glowbook.com' },
    update: {},
    create: {
      name: 'John Salon Owner',
      email: 'owner@glowbook.com',
      passwordHash,
      phone: '+15550101',
      role: 'OWNER',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@glowbook.com' },
    update: {},
    create: {
      name: 'Alice Customer',
      email: 'customer@glowbook.com',
      passwordHash,
      phone: '+15550102',
      role: 'USER',
      wallet: { create: { balance: 100.0 } },
      loyaltyPoints: { create: { points: 50 } },
    },
  });

  console.log('Seeded users (Admin, Owner, Customer).');

  // 3. Create a salon for owner
  const salon = await prisma.salon.create({
    data: {
      name: 'Luxe Hair & Nail Lounge',
      description: 'GlowBook premium vendor offering world-class haircuts, coloring, styling, and nail art in a serene modern lounge environment.',
      ownerId: owner.id,
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      lat: 39.7817,
      lng: -89.6501,
      phone: '+15550201',
      imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600',
      images: [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600',
        'https://images.unsplash.com/photo-1521590832167-7bcbfea63334?q=80&w=600',
        'https://images.unsplash.com/photo-1633681926035-ec1ac984418a?q=80&w=600',
      ],
      avgRating: 4.8,
      totalReviews: 2,
      totalBookings: 12,
      isActive: true,
      isVerified: true,
      openTime: '09:00',
      closeTime: '20:00',
      totalSeats: 3,
    },
  });

  console.log(`Created salon "${salon.name}".`);

  // 4. Create services for salon
  const haircutCat = dbCategories.find(c => c.name === 'Haircuts & Styling');
  const nailCat = dbCategories.find(c => c.name === 'Nail Services');

  if (haircutCat && nailCat) {
    const services = [
      {
        salonId: salon.id,
        name: 'Signature Men\'s Haircut',
        description: 'Includes hot towel finish, wash, hair conditioning, and precision style cut.',
        price: 35.0,
        durationMinutes: 30,
        categoryId: haircutCat.id,
        imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400',
        isActive: true,
        discountPercent: 10.0,
      },
      {
        salonId: salon.id,
        name: 'Luxury Women\'s Blowout & Cut',
        description: 'Includes deep cleansing wash, nourishing hair mask, precision cut, and signature blowout style.',
        price: 75.0,
        durationMinutes: 60,
        categoryId: haircutCat.id,
        imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400',
        isActive: true,
        discountPercent: 0.0,
      },
      {
        salonId: salon.id,
        name: 'Gel Manicure & Polish',
        description: 'Nail shaping, cuticle grooming, hand massage, and long-lasting premium gel polish.',
        price: 45.0,
        durationMinutes: 45,
        categoryId: nailCat.id,
        imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=400',
        isActive: true,
        discountPercent: 5.0,
      },
    ];

    for (const service of services) {
      await prisma.service.create({ data: service });
    }
  }

  // 5. Create Staff members
  const staffMembers = [
    {
      salonId: salon.id,
      name: 'Sarah Connor',
      role: 'Master Hair Stylist',
      specialization: 'Hair coloring, Balayage, Precision haircuts',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150',
      isAvailable: true,
    },
    {
      salonId: salon.id,
      name: 'David Beckham',
      role: 'Senior Barber',
      specialization: 'Men\'s grooming, Fades, Hot towel shaves',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150',
      isAvailable: true,
    },
  ];

  for (const staff of staffMembers) {
    await prisma.staff.create({ data: staff });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
