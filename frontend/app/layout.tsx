import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CodeMp AI',
    template: '%s | CodeMp AI',
  },
  description:
    'AI-powered code analysis and auto-refactor tool for TypeScript, JavaScript and Python.',
  keywords: [
    'AI code review',
    'Next.js',
    'TypeScript',
    'JavaScript',
    'Python',
    'Linting',
    'Auto refactor',
  ],
  authors: [{ name: 'Marcelo Palma' }],
  creator: 'Marcelo Palma',
  openGraph: {
    title: 'CodeMp AI',
    description:
      'AI-powered code analysis and automatic refactoring tool.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}