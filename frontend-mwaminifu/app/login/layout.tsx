import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ingia',
  description:
    'Ingia kwenye Mwaminifu ERP — mfumo wa usimamizi wa biashara, mauzo (POS), stoo, madeni na hesabu kwa maduka Tanzania.',
  alternates: { canonical: '/login' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Ingia | Mwaminifu ERP',
    description:
      'Mfumo wa usimamizi wa biashara, mauzo (POS), stoo, madeni na hesabu kwa maduka Tanzania.',
    url: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
