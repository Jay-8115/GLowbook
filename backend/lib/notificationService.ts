import { prisma } from './db';

// Unified helper for dispatching notifications, socket.io events, and simulated FCM pushes
export async function sendNotification({
  userId,
  staffId,
  title,
  body,
  type = 'SYSTEM',
  referenceId,
}: {
  userId?: string;
  staffId?: string;
  title: string;
  body: string;
  type?: string;
  referenceId?: string;
}) {
  try {
    const io = (global as any).io;
    let dbNotifId = '';

    if (userId) {
      // Create Database Notification for User (Customer or Owner)
      const notif = await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          referenceId,
        },
        include: { user: { select: { name: true, fcmToken: true } } },
      });
      dbNotifId = notif.id;

      // Broadcast Socket.io notification_created
      if (io) {
        io.to(`user:${userId}`).emit('notification_created', notif);
      }

      // Mock FCM Push Log
      const fcmToken = notif.user?.fcmToken || 'NO_FCM_TOKEN_REGISTERED';
      console.log('\x1b[36m%s\x1b[0m', '🔔 [MOCK FCM NOTIFICATION SENT to User/Owner]');
      console.log(`To User:   ${notif.user?.name || userId} (ID: ${userId})`);
      console.log(`FCM Token: ${fcmToken}`);
      console.log(`Title:     ${title}`);
      console.log(`Body:      ${body}`);
      console.log(`Type:      ${type}`);
      console.log(`Ref ID:    ${referenceId || 'N/A'}`);
      console.log(`DB ID:     ${notif.id}`);
    } else if (staffId) {
      // Create Database Notification for Staff member
      const notif = await prisma.staffNotification.create({
        data: {
          staffId,
          title,
          body,
        },
        include: { staff: { select: { name: true } } },
      });
      dbNotifId = notif.id;

      // Broadcast Socket.io staff notification_created
      if (io) {
        io.to(`staff:${staffId}`).emit('notification_created', notif);
      }

      // Mock FCM Push Log
      console.log('\x1b[35m%s\x1b[0m', '🔔 [MOCK FCM NOTIFICATION SENT to Staff]');
      console.log(`To Staff:  ${notif.staff?.name || staffId} (ID: ${staffId})`);
      console.log(`Title:     ${title}`);
      console.log(`Body:      ${body}`);
      console.log(`DB ID:     ${notif.id}`);
    }

    return dbNotifId;
  } catch (err) {
    console.error('Error in sendNotification helper:', err);
  }
}

// Broadcaster for Socket.io events
export function broadcastSocketEvent(room: string, eventName: string, payload: any) {
  const io = (global as any).io;
  if (io) {
    io.to(room).emit(eventName, payload);
    console.log(`[Socket] Emitted event "${eventName}" to room "${room}"`);
  } else {
    console.log(`[Socket] Warning: Socket server not initialized, skipped emitting "${eventName}"`);
  }
}

// Mock system booking reminder checking routine
export async function checkAndSendBookingReminders() {
  console.log('⏰ Checking appointment queues for upcoming reminders...');
  try {
    const now = new Date();
    
    // Fetch upcoming bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS'] },
        bookingDate: { gte: now },
      },
      include: {
        user: true,
        salon: true,
        service: true,
        staff: true,
      },
    });

    for (const b of bookings) {
      // Parse scheduled time e.g., "14:30"
      const [hours, minutes] = b.startTime.split(':').map(Number);
      const apptTime = new Date(b.bookingDate);
      apptTime.setHours(hours, minutes, 0, 0);

      const msDiff = apptTime.getTime() - now.getTime();
      const hoursDiff = msDiff / (1000 * 60 * 60);

      // 1. 24 Hours Reminder (between 23.5 and 24.5 hours ahead)
      if (hoursDiff >= 23.8 && hoursDiff <= 24.2) {
        await sendNotification({
          userId: b.userId,
          title: 'Appointment Reminder - 24 Hours',
          body: `Reminder: Your ${b.service.name} at ${b.salon.name} with ${b.staff.name} is scheduled for tomorrow at ${b.startTime}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          userId: b.salon.ownerId,
          title: 'Upcoming Appointment Alert',
          body: `Upcoming booking tomorrow at ${b.startTime} for ${b.service.name} with ${b.staff.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          staffId: b.staffId,
          title: 'Upcoming Service Alert',
          body: `You have an upcoming service tomorrow at ${b.startTime}: ${b.service.name} for client ${b.user.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
      }

      // 2. 2 Hours Reminder (between 1.8 and 2.2 hours ahead)
      if (hoursDiff >= 1.8 && hoursDiff <= 2.2) {
        await sendNotification({
          userId: b.userId,
          title: 'Appointment Reminder - 2 Hours',
          body: `Your appointment at ${b.salon.name} is in 2 hours at ${b.startTime}. Stylist: ${b.staff.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          userId: b.salon.ownerId,
          title: 'Upcoming Appointment Alert',
          body: `Appointment starting in 2 hours (at ${b.startTime}) with ${b.staff.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          staffId: b.staffId,
          title: 'Upcoming Service Alert',
          body: `Service starts in 2 hours (at ${b.startTime}): ${b.service.name} for ${b.user.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
      }

      // 3. 30 Minutes Reminder (between 0.4 and 0.6 hours ahead)
      if (hoursDiff >= 0.4 && hoursDiff <= 0.6) {
        await sendNotification({
          userId: b.userId,
          title: 'Appointment Reminder - 30 Minutes',
          body: `Get ready! Your appointment at ${b.salon.name} starts in 30 minutes (at ${b.startTime}).`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          userId: b.salon.ownerId,
          title: 'Upcoming Appointment Alert',
          body: `Upcoming appointment starting in 30 mins: ${b.service.name} with ${b.staff.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
        await sendNotification({
          staffId: b.staffId,
          title: 'Upcoming Service Alert',
          body: `Upcoming service in 30 mins: ${b.service.name} for client ${b.user.name}.`,
          type: 'REMINDER',
          referenceId: b.id,
        });
      }
    }
  } catch (err) {
    console.error('Error running booking reminders checker:', err);
  }
}
