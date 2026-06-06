export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://g-lowbook.vercel.app';

if (typeof window !== 'undefined') {
  console.log('================================');
  console.log('NEXT_PUBLIC_API_URL =', process.env.NEXT_PUBLIC_API_URL);
  console.log('API_URL =', API_URL);
  console.log('NODE_ENV =', process.env.NODE_ENV);
  console.log('================================');
}

export function getAuthHeader(): string {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) return `Bearer ${token}`;
  }
  return 'Bearer admin_token_placeholder';
}
