import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const salons = await prisma.salon.findMany({
      where: { ownerId: auth.user.id },
      select: { id: true }
    });
    const salonIds = salons.map((s) => s.id);

    if (salonIds.length === 0) {
      return NextResponse.json({
        dailyRevenue: [],
        weeklyRevenue: [],
        monthlyRevenue: [],
        yearlyRevenue: [],
        lifetimeRevenue: 0,
        revenueByService: [],
        revenueByCategory: [],
        revenueByStaff: [],
        growthPercent: 0,
        charts: []
      });
    }

    const now = new Date();

    // 1. Fetch completed bookings
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds },
        status: 'COMPLETED'
      },
      include: {
        service: {
          include: { category: true }
        },
        staff: true
      },
      orderBy: { bookingDate: 'asc' }
    });

    // 2. Compute Lifetime Revenue
    let lifetimeRevenue = 0;
    bookings.forEach((b) => {
      lifetimeRevenue += b.totalPrice;
    });

    // 3. Daily Revenue (last 7 days)
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, 0);
    }
    bookings.forEach((b) => {
      const key = new Date(b.bookingDate).toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + b.totalPrice);
      }
    });
    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue
    }));

    // 4. Weekly Revenue (last 4 weeks)
    const weeklyRevenue: { week: string; revenue: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(now.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(now.getDate() - i * 7);
      let sum = 0;
      bookings.forEach((b) => {
        const bDate = new Date(b.bookingDate);
        if (bDate >= start && bDate < end) {
          sum += b.totalPrice;
        }
      });
      weeklyRevenue.push({
        week: `Wk ${4 - i}`,
        revenue: sum
      });
    }

    // 5. Monthly Revenue (last 6 months)
    const monthlyMap = new Map<string, number>();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, 0);
    }
    bookings.forEach((b) => {
      const bDate = new Date(b.bookingDate);
      const key = `${bDate.getFullYear()}-${bDate.getMonth()}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + b.totalPrice);
      }
    });
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([key, revenue]) => {
      const [year, month] = key.split('-').map(Number);
      const name = monthFormatter.format(new Date(year, month, 1));
      return {
        month: `${name} ${year}`,
        revenue
      };
    });

    // 6. Yearly Revenue (last 2 years)
    const yearlyMap = new Map<number, number>();
    yearlyMap.set(now.getFullYear() - 1, 0);
    yearlyMap.set(now.getFullYear(), 0);
    bookings.forEach((b) => {
      const year = new Date(b.bookingDate).getFullYear();
      if (yearlyMap.has(year)) {
        yearlyMap.set(year, (yearlyMap.get(year) || 0) + b.totalPrice);
      }
    });
    const yearlyRevenue = Array.from(yearlyMap.entries()).map(([year, revenue]) => ({
      year,
      revenue
    }));

    // 7. Growth Percent (This Month vs Last Month)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    bookings.forEach((b) => {
      const bDate = new Date(b.bookingDate);
      if (bDate >= thisMonthStart && bDate <= now) {
        thisMonthRevenue += b.totalPrice;
      } else if (bDate >= lastMonthStart && bDate <= lastMonthEnd) {
        lastMonthRevenue += b.totalPrice;
      }
    });

    const growthPercent = lastMonthRevenue === 0
      ? (thisMonthRevenue > 0 ? 100 : 0)
      : parseFloat((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1));

    // 8. Breakdown by Service
    const serviceMap = new Map<string, number>();
    bookings.forEach((b) => {
      const name = b.service.name;
      serviceMap.set(name, (serviceMap.get(name) || 0) + b.totalPrice);
    });
    const revenueByService = Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 9. Breakdown by Category
    const categoryMap = new Map<string, number>();
    bookings.forEach((b) => {
      const name = b.service.category?.name || 'General';
      categoryMap.set(name, (categoryMap.get(name) || 0) + b.totalPrice);
    });
    const revenueByCategory = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 10. Breakdown by Staff
    const staffMap = new Map<string, number>();
    bookings.forEach((b) => {
      const name = b.staff.name;
      staffMap.set(name, (staffMap.get(name) || 0) + b.totalPrice);
    });
    const revenueByStaff = Array.from(staffMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      lifetimeRevenue,
      revenueByService,
      revenueByCategory,
      revenueByStaff,
      growthPercent,
      charts: monthlyRevenue // Recharts charts commonly use the monthly data format
    });

  } catch (error) {
    console.error('Fetch owner revenue error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
