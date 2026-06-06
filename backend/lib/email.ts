import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.join(process.cwd(), 'mock_emails.log');

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = `
========================================
TIMESTAMP: ${timestamp}
TO: ${to}
SUBJECT: ${subject}
BODY:
${html}
========================================
\n`;

  try {
    fs.appendFileSync(LOG_FILE_PATH, logEntry, 'utf8');
  } catch (err) {
    console.error('Failed to write to mock email log:', err);
  }

  // Print a premium looking card in the console log
  console.log('\x1b[35m%s\x1b[0m', '✉️  [MOCK EMAIL SENT]');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Details logged to: ${LOG_FILE_PATH}`);
}

export async function sendApprovalEmail(
  email: string,
  ownerName: string,
  tempUsername: string,
  tempPassword: string
) {
  const html = `
Hello Salon Owner,

Your salon has been approved.

Login Credentials:

Username: ${tempUsername}
Password: ${tempPassword}

Please change your password after login.

Regards,
GlowBook Team
  `.trim().replace(/\n/g, '<br/>');

  await sendEmail({
    to: email,
    subject: 'GlowBook Salon Approved',
    html,
  });
}

export async function sendRejectionEmail(
  email: string,
  ownerName: string,
  rejectionReason: string
) {
  const html = `
Hello Salon Owner,

Your salon registration request has been rejected.

Reason for rejection:
${rejectionReason}

Please contact support if you have any questions.

Regards,
GlowBook Team
  `.trim().replace(/\n/g, '<br/>');

  await sendEmail({
    to: email,
    subject: 'GlowBook Salon Registration Request Status',
    html,
  });
}
