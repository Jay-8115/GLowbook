import { prisma } from './db';

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  type: 'BOOKING_UPDATE' | 'PROMOTION' | 'REMINDER' | 'REVIEW_RECEIVED' = 'BOOKING_UPDATE'
) {
  try {
    // 1. Fetch user to check for FCM Token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, fcmToken: true },
    });

    const fcmToken = user?.fcmToken || 'NO_FCM_TOKEN_REGISTERED';

    // 2. Create the Database Notification so it lists in the app
    const dbNotif = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        isRead: false,
      },
    });

    // 3. Print FCM Send logs in the node process
    console.log('\x1b[36m%s\x1b[0m', '🔔 [MOCK FCM NOTIFICATION SENT]');
    console.log(`To User:   ${user?.name || userId} (ID: ${userId})`);
    console.log(`FCM Token: ${fcmToken}`);
    console.log(`Title:     ${title}`);
    console.log(`Body:      ${body}`);
    console.log(`DB Ref ID: ${dbNotif.id}`);

    return dbNotif;
  } catch (error) {
    console.error('Error sending mock push notification:', error);
  }
}
