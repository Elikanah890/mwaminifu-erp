import type { Locale } from './translations';

export type HomeText = {
  navFeatures: string;
  navPricing: string;
  navHow: string;
  navAbout: string;
  login: string;
  getStarted: string;
  watchDemo: string;
  heroTitle: string;
  heroSubtitle: string;
  badgeOffline: string;
  badgeLang: string;
  badgeDevices: string;
  trustedBy: string;
  businesses: string;
  transactions: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: Array<{ title: string; desc: string }>;
  howTitle: string;
  howSubtitle: string;
  steps: Array<{ title: string; desc: string }>;
  findAgent: string;
  pricingTitle: string;
  pricingSubtitle: string;
  whyTitle: string;
  whySubtitle: string;
  benefits: Array<{ title: string; desc: string }>;
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: Array<{ quote: string; name: string; meta: string }>;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  finalTitle: string;
  finalSubtitle: string;
  contactUs: string;
  footerTagline: string;
  footerAbout: string;
  footerFeatures: string;
  footerSupport: string;
  footerContact: string;
  copyright: string;
};

export const homeText: Record<Locale, HomeText> = {
  en: {
    navFeatures: 'Features',
    navPricing: 'Pricing',
    navHow: 'How It Works',
    navAbout: 'About',
    login: 'Login',
    getStarted: 'Get Started',
    watchDemo: 'Watch Demo',
    heroTitle: 'Smart Business Management for Tanzania',
    heroSubtitle: 'Record sales, track stock, manage credit — all in one app. Works offline.',
    badgeOffline: 'Works Offline',
    badgeLang: 'Swahili & English',
    badgeDevices: 'Mobile & Desktop',
    trustedBy: 'Trusted by businesses across Tanzania',
    businesses: 'Active Businesses',
    transactions: 'Transactions Recorded',
    featuresTitle: 'Everything you need to run a shop',
    featuresSubtitle: 'A complete ERP for daily operations, credit, stock, staff and management reports.',
    features: [
      { title: 'POS (Sales)', desc: 'Record sales fast, split payments and issue receipts.' },
      { title: 'Inventory', desc: 'Track stock, multiple units and low-stock alerts.' },
      { title: 'Customers', desc: 'Manage credit, partial payments and statements.' },
      { title: 'Reports', desc: 'Sales, profit, inventory and business valuation.' },
      { title: 'Finance', desc: 'Expenses, cash management, loans and payables.' },
      { title: 'Employees', desc: 'Manage staff with granular permissions.' },
      { title: 'Multi-Shop', desc: 'Link up to 5 shops under one account.' },
      { title: 'Offline', desc: 'Works without internet and syncs automatically.' },
    ],
    howTitle: 'How it works',
    howSubtitle: 'Get your business set up with an AGAC agent.',
    steps: [
      { title: 'Meet an AGAC Agent', desc: 'Contact an agent in your area to get started.' },
      { title: 'Get Started', desc: 'Receive an OTP on your phone and activate your account.' },
      { title: 'Pay & Use', desc: 'Choose a plan and start selling immediately.' },
    ],
    findAgent: 'Find an Agent Near You',
    pricingTitle: 'Simple pricing for every shop',
    pricingSubtitle: 'Monthly plans that grow with your business.',
    whyTitle: 'Built for Tanzanian businesses',
    whySubtitle: 'Every workflow is designed for local shops, teams and low-connectivity days.',
    benefits: [
      { title: 'Full Swahili Support', desc: 'Built for local businesses with clear labels.' },
      { title: 'Works Offline', desc: 'No internet? No problem. Keep selling.' },
      { title: 'Track Every Shilling', desc: 'Know your profit, cash and debts.' },
      { title: 'Built for Teams', desc: 'Employee PIN, blind drop and granular permissions.' },
    ],
    testimonialsTitle: 'Loved by shop owners',
    testimonialsSubtitle: 'Early feedback from real businesses across Tanzania.',
    testimonials: [
      { quote: 'I finally know my daily profit without guessing.', name: 'Amina Juma', meta: 'Grocery · Dar es Salaam' },
      { quote: 'The offline POS helps us sell even during outages.', name: 'Peter Mwamba', meta: 'Hardware · Arusha' },
      { quote: 'Tracking customer credit is much easier now.', name: 'Grace Mrema', meta: 'Pharmacy · Mwanza' },
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'How do I sign up?', a: 'Contact an AGAC agent in your area to register your shop.' },
      { q: 'Do I need internet?', a: 'No. Mwaminifu works offline and syncs later.' },
      { q: 'Can I use it on my phone?', a: 'Yes. It works on mobile, tablet and desktop.' },
      { q: 'What payment methods are supported?', a: 'Cash, M-Pesa, Airtel Money, Tigo Pesa, and credit sales.' },
      { q: 'Can I manage multiple shops?', a: 'Yes. Link up to five shops under one account.' },
      { q: 'Is my data safe?', a: 'Your data is protected and only visible to authorized users.' },
    ],
    finalTitle: 'Ready to modernize your business?',
    finalSubtitle: 'Join businesses using Mwaminifu to sell, stock and track credit with confidence.',
    contactUs: 'Contact Us',
    footerTagline: 'Trustworthy tools for growing shops.',
    footerAbout: 'About',
    footerFeatures: 'Features',
    footerSupport: 'Support',
    footerContact: 'Contact',
    copyright: '© 2026 Mwaminifu. All rights reserved.',
  },
  sw: {
    navFeatures: 'Vipengele',
    navPricing: 'Bei',
    navHow: 'Jinsi Inavyofanya Kazi',
    navAbout: 'Kuhusu',
    login: 'Ingia',
    getStarted: 'Anza',
    watchDemo: 'Tazama Demo',
    heroTitle: 'Usimamizi wa Biashara Bora Tanzania',
    heroSubtitle: 'Rekodi mauzo, fuatilia stoo, simamia deni — yote kwenye app moja. Inafanya kazi bila mtandao.',
    badgeOffline: 'Inafanya Kazi Bila Mtandao',
    badgeLang: 'Kiswahili & Kiingereza',
    badgeDevices: 'Simu & Kompyuta',
    trustedBy: 'Inatumiwa na biashara Tanzania nzima',
    businesses: 'Biashara Hai',
    transactions: 'Miamala Iliyorekodiwa',
    featuresTitle: 'Kila kitu cha kuendesha duka chako',
    featuresSubtitle: 'Mfumo kamili wa mauzo ya kila siku, deni, stoo, wafanyakazi na ripoti za usimamizi.',
    features: [
      { title: 'POS (Mauzo)', desc: 'Rekodi mauzo haraka, gawanya malipo na toa risiti.' },
      { title: 'Bidhaa', desc: 'Fuatilia hisa, vitengo mbalimbali na kengele za hisa ndogo.' },
      { title: 'Wateja', desc: 'Simamia deni, malipo ya sehemu na taarifa za wateja.' },
      { title: 'Ripoti', desc: 'Mauzo, faida, stoo na thamani ya biashara.' },
      { title: 'Fedha', desc: 'Gharama, usimamizi wa fedha taslimu, mikopo na malipo.' },
      { title: 'Wafanyakazi', desc: 'Simamia timu kwa ruhusa maalumu.' },
      { title: 'Maduka Mengi', desc: 'Unganisha hadi maduka 5 chini ya akaunti moja.' },
      { title: 'Bila Mtandao', desc: 'Inafanya kazi bila mtandao na inasawazisha baadaye.' },
    ],
    howTitle: 'Jinsi inavyofanya kazi',
    howSubtitle: 'Anza na Wakala wa AGAC karibu nawe.',
    steps: [
      { title: 'Pata Wakala wa AGAC', desc: 'Wasiliana na wakala katika eneo lako ili kuanza.' },
      { title: 'Anza Akaunti', desc: 'Pokea OTP kwenye simu na kuwasha akaunti yako.' },
      { title: 'Lipa na Tumia', desc: 'Chagua Mpango na anza kuuza mara moja.' },
    ],
    findAgent: 'Pata Wakala Karibu',
    pricingTitle: 'Bei rahisi kwa kila duka',
    pricingSubtitle: 'Mipango ya kila mwezi inayotambaa na biashara yako.',
    whyTitle: 'Wameandaliwa kwa biashara za Tanzania',
    whySubtitle: 'Kila kazi imeundwa kwa maduka ya hapa, timu ndogo na siku za mtandao hafifu.',
    benefits: [
      { title: 'Kiswahili Kamili', desc: 'Wameandaliwa kwa biashara za hapa na maelezo wazi.' },
      { title: 'Inafanya Kazi Bila Mtandao', desc: 'Hakuna mtandao? Hakuna shida. Endelea kuuza.' },
      { title: 'Fuatilia Kila Shilingi', desc: 'Jua faida, fedha na madeni yako.' },
      { title: 'Imefanyiwa Timu', desc: 'PIN ya mfanyakazi, blind drop na ruhusa maalumu.' },
    ],
    testimonialsTitle: 'Wamiliki wa maduka wanakipenda',
    testimonialsSubtitle: 'Maoni ya awali kutoka biashara halisi Tanzania nzima.',
    testimonials: [
      { quote: 'Sasa najua faida yangu ya kila siku bila kukisia.', name: 'Amina Juma', meta: 'Jumla · Dar es Salaam' },
      { quote: 'POS bila mtandao inatusaidia kuuza wakati wa kukatika.', name: 'Peter Mwamba', meta: 'Vifaa · Arusha' },
      { quote: 'Kufuatilia deni la wateja ni rahisi zaidi.', name: 'Grace Mrema', meta: 'Duka la Dawa · Mwanza' },
    ],
    faqTitle: 'Maswali yanayoulizwa mara kwa mara',
    faqs: [
      { q: 'Ninajisajili vipi?', a: 'Wasiliana na Wakala wa AGAC katika eneo lako.' },
      { q: 'Nahitaji internet?', a: 'Hapana. Mwaminifu inafanya kazi bila mtandao.' },
      { q: 'Naweza kutumia kwenye simu?', a: 'Ndiyo. Inafanya kazi kwenye simu, talet na kompyuta.' },
      { q: 'Ni njia gani za malipo?', a: 'Taslimu, M-Pesa, Airtel Money, Tigo Pesa na deni.' },
      { q: 'Naweza kusimamia maduka mengi?', a: 'Ndiyo. Unganisha hadi maduka mitano.' },
      { q: 'Data yangu iko salama?', a: 'Data yako inalindwa na inaonekana kwa watu wenye ruhusa.' },
    ],
    finalTitle: 'Uko tayari kuboresha biashara yako?',
    finalSubtitle: 'Jiunge na biashara zinazotumia Mwaminifu kuuza, kuhifadhi stoo na kufuatilia deni kwa uhakika.',
    contactUs: 'Wasiliana Nasi',
    footerTagline: 'Vifaa vya kuaminika kwa maduka yanayokua.',
    footerAbout: 'Kuhusu',
    footerFeatures: 'Vipengele',
    footerSupport: 'Msaada',
    footerContact: 'Mawasiliano',
    copyright: '© 2026 Mwaminifu. Haki zote zimehifadhiwa.',
  },
};
