export const metadata = {
  title: 'GlowBook API',
  description: 'Shared serverless backend API for GlowBook Marketplace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
