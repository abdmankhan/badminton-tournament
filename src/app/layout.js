import './globals.css';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from '@/components/ThemeProvider';


export const metadata = {
  title: 'Badminton Tournament Manager',
  description: 'Live scoring and tournament management for doubles badminton',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
