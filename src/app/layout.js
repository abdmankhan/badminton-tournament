import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Badminton Tournament Manager',
  description: 'Live scoring and tournament management for doubles badminton',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
