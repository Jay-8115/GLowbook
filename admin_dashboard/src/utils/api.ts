export function getAuthHeader(): string {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) return `Bearer ${token}`;
  }
  return 'Bearer admin_token_placeholder';
}
