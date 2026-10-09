import type { Locale } from './translations';

export const navText: Record<Locale, Record<'home' | 'features' | 'pricing' | 'how' | 'about' | 'login' | 'getStarted', string>> = {
  en: { home: 'Home', features: 'Features', pricing: 'Pricing', how: 'How It Works', about: 'About', login: 'Login', getStarted: 'Get Started' },
  sw: { home: 'Nyumbani', features: 'Vipengele', pricing: 'Bei', how: 'Jinsi Inavyofanya Kazi', about: 'Kuhusu', login: 'Ingia', getStarted: 'Anza' },
};

export const commonText: Record<
  Locale,
  Record<'seeAllFeatures' | 'learnMore' | 'seeFullPricing' | 'findAgent' | 'contactUs' | 'mostPopular' | 'perMonth' | 'choosePlan' | 'backToHome' | 'allRights' | 'privacy' | 'talkToAgent', string>
> = {
  en: {
    seeAllFeatures: 'See All Features',
    learnMore: 'Learn More',
    seeFullPricing: 'See Full Pricing',
    findAgent: 'Find an Agent',
    contactUs: 'Contact Us',
    mostPopular: 'Most Popular',
    perMonth: '/month',
    choosePlan: 'Choose Plan',
    backToHome: 'Back to Home',
    allRights: '© 2026 Mwaminifu. All rights reserved.',
    privacy: 'Privacy · Terms · Cookies',
    talkToAgent: 'Talk to an agent',
  },
  sw: {
    seeAllFeatures: 'Ona Vipengele Vyote',
    learnMore: 'Jifunze Zaidi',
    seeFullPricing: 'Ona Bei Kamili',
    findAgent: 'Pata Wakala',
    contactUs: 'Wasiliana Nasi',
    mostPopular: 'Inapendwa Zaidi',
    perMonth: '/mwezi',
    choosePlan: 'Chagua Mpango',
    backToHome: 'Rudi Nyumbani',
    allRights: '© 2026 Mwaminifu. Haki zote zimehifadhiwa.',
    privacy: 'Faragha · Masharti · Vidakuzi',
    talkToAgent: 'Zungumza na wakala',
  },
};

type FeatureItem = { key: string; title: string; desc: string; bullets: string[] };

export const featuresPageText: Record<
  Locale,
  { eyebrow: string; title: string; subtitle: string; items: FeatureItem[]; ctaTitle: string; ctaSubtitle: string }
> = {
  en: {
    eyebrow: 'Features',
    title: 'Every tool your shop needs — in one app',
    subtitle: 'From the sales counter to the back office, Mwaminifu connects each part of your business so you always know what is happening.',
    items: [
      {
        key: 'pos',
        title: 'POS (Sales)',
        desc: 'Record sales in seconds, split payments between cash and mobile money, and issue professional receipts.',
        bullets: ['Barcode & search checkout', 'Cash, M-Pesa, Airtel, Tigo & credit', 'Split payments and held sales', 'Print or WhatsApp receipts'],
      },
      {
        key: 'inventory',
        title: 'Inventory',
        desc: 'Track every product, unit and location with low-stock alerts before you run out.',
        bullets: ['Multiple units and pack sizes', 'Low-stock and out-of-stock alerts', 'Stock movements history', 'Reorder levels per product'],
      },
      {
        key: 'customers',
        title: 'Customers & Credit',
        desc: 'Manage customer credit with confidence, record partial payments and send statements.',
        bullets: ['Credit limits per customer', 'Partial repayment tracking', 'Aging and overdue alerts', 'Share statement on WhatsApp'],
      },
      {
        key: 'reports',
        title: 'Reports',
        desc: 'Understand your business with clear sales, profit, inventory and valuation reports.',
        bullets: ['Daily, weekly and monthly views', 'Profit by product and category', 'Business valuation', 'Export CSV and PDF'],
      },
      {
        key: 'finance',
        title: 'Finance',
        desc: 'Control cash, expenses, loans and supplier payables from a single finance workspace.',
        bullets: ['Expense approvals', 'Cash-in / cash-out ledger', 'Supplier payables', 'Loan tracking and repayments'],
      },
      {
        key: 'employees',
        title: 'Employees',
        desc: 'Give every team member the right access and see exactly who did what, and when.',
        bullets: ['Employee PIN sign-in', 'Granular permissions', 'Shift and blind-drop controls', 'Activity audit per user'],
      },
      {
        key: 'multishop',
        title: 'Multi-Shop',
        desc: 'Run up to five shops under one account and switch between them instantly.',
        bullets: ['One login for every branch', 'Link up to 5 shops', 'Per-shop reports', 'Discount on 3+ shops'],
      },
      {
        key: 'offline',
        title: 'Offline',
        desc: 'Keep selling when the network drops. Mwaminifu syncs automatically when you reconnect.',
        bullets: ['Works without internet', 'Automatic background sync', 'No lost sales', 'Reliable during outages'],
      },
    ],
    ctaTitle: 'See Mwaminifu in your own shop',
    ctaSubtitle: 'Meet an AGAC agent and we will set everything up for you.',
  },
  sw: {
    eyebrow: 'Vipengele',
    title: 'Kila kifaa anachohitaji duka lako — kwenye app moja',
    subtitle: 'Kutoka kaunta hadi ofisi ya nyuma, Mwaminifu inaunganisha kila sehemu ya biashara yako ili ujue kila kinachoendelea.',
    items: [
      {
        key: 'pos',
        title: 'POS (Mauzo)',
        desc: 'Rekodi mauzo kwa sekunde, gawanya malipo kati ya taslimu na pesa za simu, na toa risiti za kitaalamu.',
        bullets: ['Malipo kwa barcode na utafutaji', 'Taslimu, M-Pesa, Airtel, Tigo na deni', 'Malipo yaliyogawanywa', 'Chapisha au tuma risiti WhatsApp'],
      },
      {
        key: 'inventory',
        title: 'Bidhaa',
        desc: 'Fuatilia kila bidhaa, kipimo na eneo kwa tahadhari za hisa ndogo kabla ya kuisha.',
        bullets: ['Vipimo na pakiti mbalimbali', 'Tahadhari za hisa ndogo', 'Historia ya mienendo ya hisa', 'Kiwango cha kuagiza kwa bidhaa'],
      },
      {
        key: 'customers',
        title: 'Wateja na Deni',
        desc: 'Simamia deni la wateja kwa uhakika, rekodi malipo ya sehemu na tuma taarifa.',
        bullets: ['Kikomo cha deni kwa mteja', 'Ufuatiliaji wa malipo ya sehemu', 'Tahadhari za madeni yaliyochelewa', 'Tuma taarifa WhatsApp'],
      },
      {
        key: 'reports',
        title: 'Ripoti',
        desc: 'Elewa biashara yako kwa ripoti wazi za mauzo, faida, stoo na thamani.',
        bullets: ['Mwonekano wa kila siku, wiki na mwezi', 'Faida kwa bidhaa na kategoria', 'Thamani ya biashara', 'Toa CSV na PDF'],
      },
      {
        key: 'finance',
        title: 'Fedha',
        desc: 'Dhibiti fedha taslimu, gharama, mikopo na madeni kwa wasambazaji sehemu moja.',
        bullets: ['Uidhinishaji wa gharama', 'Daftari la fedha ndani/nje', 'Madeni kwa wasambazaji', 'Ufuatiliaji wa mikopo'],
      },
      {
        key: 'employees',
        title: 'Wafanyakazi',
        desc: 'Wape kila mfanyakazi ruhusa sahihi na uone nani alifanya nini, na lini.',
        bullets: ['Kuingia kwa PIN', 'Ruhusa maalumu', 'Udhibiti wa zamu na blind-drop', 'Kumbukumbu kwa mtumiaji'],
      },
      {
        key: 'multishop',
        title: 'Maduka Mengi',
        desc: 'Endesha hadi maduka matano chini ya akaunti moja na ubadilishe papo hapo.',
        bullets: ['Kuingia moja kwa kila tawi', 'Unganisha hadi maduka 5', 'Ripoti kwa kila duka', 'Punguzo kwa maduka 3+'],
      },
      {
        key: 'offline',
        title: 'Bila Mtandao',
        desc: 'Endelea kuuza mtandao ukienda. Mwaminifu inasawazisha yenyewe unapoingia tena.',
        bullets: ['Inafanya kazi bila mtandao', 'Usawazishaji wa nyuma', 'Hakuna mauzo yaliyopotea', 'Inategemewa wakati wa kukatika'],
      },
    ],
    ctaTitle: 'Ona Mwaminifu kwenye duka lako',
    ctaSubtitle: 'Kutana na Wakala wa AGAC na tutakuandalia kila kitu.',
  },
};

export const pricingPageText: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    comparisonTitle: string;
    included: string;
    featureCol: string;
    multishopTitle: string;
    multishopSubtitle: string;
    faqTitle: string;
    faqs: { q: string; a: string }[];
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    contactTitle: string;
    contactSubtitle: string;
    billing: Record<string, string>;
  }
> = {
  en: {
    eyebrow: 'Pricing',
    title: 'Simple pricing for every shop',
    subtitle: 'One monthly fee. No hidden charges. Cancel anytime.',
    comparisonTitle: 'Compare plans',
    included: 'Included',
    featureCol: 'Feature',
    multishopTitle: 'Link more shops, pay less',
    multishopSubtitle: 'Add 3 or more shops and get one free every month.',
    faqTitle: 'Pricing questions',
    faqs: [
      { q: 'Can I change my plan?', a: 'Yes. You can move between plans at any time through your agent.' },
      { q: 'What payment methods do you accept?', a: 'Cash, M-Pesa, Airtel Money, Tigo Pesa, and bank transfer.' },
      { q: 'Is there a contract?', a: 'No. Mwaminifu is month to month with no long-term contract.' },
      { q: 'What happens if I pay late?', a: 'You get a grace period to keep using the app while you settle payment.' },
      { q: 'How does the multi-shop discount work?', a: 'Link 3 or more shops under one account and one shop is free each month.' },
    ],
    emptyTitle: 'Plans are being set up',
    emptyBody: 'Our team is finalizing the pricing plans. Please contact an agent to get started today.',
    emptyCta: 'Talk to an agent',
    contactTitle: 'Talk to an agent',
    contactSubtitle: 'We will help you choose the right plan and get you registered.',
    billing: { MONTHLY: 'month', YEARLY: 'year', WEEKLY: 'week', ONE_TIME: 'once' },
  },
  sw: {
    eyebrow: 'Bei',
    title: 'Bei rahisi kwa kila duka',
    subtitle: 'Malipo moja kwa mwezi. Hakuna gharama za siri. Acha wakati wowote.',
    comparisonTitle: 'Linganisha mipango',
    included: 'Ipo',
    featureCol: 'Kipengele',
    multishopTitle: 'Unganisha maduka zaidi, lipa kidogo',
    multishopSubtitle: 'Ongeza maduka 3 au zaidi na upate moja bure kila mwezi.',
    faqTitle: 'Maswali ya bei',
    faqs: [
      { q: 'Naweza kubadilisha mpango?', a: 'Ndiyo. Unaweza kubadilisha mipango wakati wowote kupitia wakala.' },
      { q: 'Mnakubali njia gani za malipo?', a: 'Taslimu, M-Pesa, Airtel Money, Tigo Pesa na benki.' },
      { q: 'Kuna mkataba?', a: 'Hapana. Mwaminifu ni mwezi kwa mwezi bila mkataba wa muda mrefu.' },
      { q: 'Nikichelewa kulipa?', a: 'Unapata kipindi cha neema kuendelea kutumia app wakati unakamilisha malipo.' },
      { q: 'Punguzo la maduka mengi linafanyaje kazi?', a: 'Unganisha maduka 3 au zaidi chini ya akaunti moja na duka moja huwa bure kila mwezi.' },
    ],
    emptyTitle: 'Mipango inaandaliwa',
    emptyBody: 'Timu yetu inakamilisha mipango ya bei. Tafadhali wasiliana na wakala kuanza leo.',
    emptyCta: 'Zungumza na wakala',
    contactTitle: 'Zungumza na wakala',
    contactSubtitle: 'Tutakusaidia kuchagua mpango unaofaa na kukusajili.',
    billing: { MONTHLY: 'mwezi', YEARLY: 'mwaka', WEEKLY: 'wiki', ONE_TIME: 'mara moja' },
  },
};

export const howPageText: Record<
  Locale,
  { eyebrow: string; title: string; subtitle: string; steps: { title: string; desc: string }[]; ctaTitle: string; ctaSubtitle: string }
> = {
  en: {
    eyebrow: 'How It Works',
    title: 'From first meeting to first sale',
    subtitle: 'Six simple steps. An AGAC agent walks with you the whole way.',
    steps: [
      { title: 'Meet an Agent', desc: 'Contact an AGAC agent in your area. They visit your shop and answer every question.' },
      { title: 'Agent Registers You', desc: 'The agent captures your shop details and creates your business account.' },
      { title: 'Activate with OTP', desc: 'You receive a one-time code on your phone. Enter it to activate your account.' },
      { title: 'Add Your Team', desc: 'Create employee PINs and choose exactly what each person can access.' },
      { title: 'Choose Plan & Pay', desc: 'Pick Basic or Premium and pay with cash, M-Pesa, Airtel or Tigo.' },
      { title: 'Start Selling', desc: 'Open the POS, scan your products and record your first sale — online or offline.' },
    ],
    ctaTitle: 'Ready to get started?',
    ctaSubtitle: 'An agent near you can set everything up in a single visit.',
  },
  sw: {
    eyebrow: 'Jinsi Inavyofanya Kazi',
    title: 'Kutoka mkutano wa kwanza hadi mauzo ya kwanza',
    subtitle: 'Hatua sita rahisi. Wakala wa AGAC anaenda nawe hatua kwa hatua.',
    steps: [
      { title: 'Kutana na Wakala', desc: 'Wasiliana na Wakala wa AGAC katika eneo lako. Anakuja dukani kwako na kujibu maswali yote.' },
      { title: 'Wakala Anakusajili', desc: 'Wakala anarekodi taarifa za duka lako na kufungua akaunti ya biashara yako.' },
      { title: 'Washa kwa OTP', desc: 'Unapokea msimbo wa mara moja kwenye simu. Uweke ili kuwasha akaunti yako.' },
      { title: 'Ongeza Timu Yako', desc: 'Unda PIN za wafanyakazi na uchague kila mmoja anaweza kufikia nini.' },
      { title: 'Chagua Mpango na Lipa', desc: 'Chagua Basic au Premium na lipa kwa taslimu, M-Pesa, Airtel au Tigo.' },
      { title: 'Anza Kuuza', desc: 'Fungua POS, changanua bidhaa na rekodi mauzo yako ya kwanza — mtandaoni au bila mtandao.' },
    ],
    ctaTitle: 'Uko tayari kuanza?',
    ctaSubtitle: 'Wakala aliye karibu nawe anaweza kuandaa kila kitu kwa ziara moja.',
  },
};

export const aboutPageText: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    missionTitle: string;
    missionBody: string;
    missionPoints: string[];
    storyTitle: string;
    storySubtitle: string;
    milestones: { year: string; title: string; desc: string }[];
    differentTitle: string;
    differentSubtitle: string;
    different: { title: string; desc: string }[];
    valuesTitle: string;
    valuesSubtitle: string;
    values: { title: string; desc: string }[];
    contactTitle: string;
    contactSubtitle: string;
    contact: { channel: string; value: string; note: string }[];
    faqTitle: string;
    faqs: { q: string; a: string }[];
  }
> = {
  en: {
    eyebrow: 'About',
    title: 'Built in Tanzania, for Tanzanian businesses',
    subtitle: 'We build dependable software that helps local shops sell more, lose less and grow with confidence.',
    missionTitle: 'Our mission',
    missionBody: 'Mwaminifu means “trustworthy”. We exist to give every duka, pharmacy, hardware store and restaurant the same quality of tools that big companies take for granted — in Swahili, on any phone, and even without internet.',
    missionPoints: ['Trustworthy records for every shilling', 'Tools that work on a basic smartphone', 'Built and supported locally'],
    storyTitle: 'Our story',
    storySubtitle: 'A few milestones on the way to modernizing how Tanzania trades.',
    milestones: [
      { year: '2023', title: 'The idea', desc: 'We spoke to hundreds of shop owners about lost sales, missing stock and unrecorded debt.' },
      { year: '2024', title: 'First shops online', desc: 'Mwaminifu launched with POS, inventory and customer credit for early businesses.' },
      { year: '2025', title: 'Offline-first', desc: 'We rebuilt the app to work fully offline with automatic sync.' },
      { year: '2026', title: 'Nationwide', desc: 'AGAC agents now onboard businesses across Tanzania, with multi-shop support.' },
    ],
    differentTitle: 'What makes us different',
    differentSubtitle: 'We did not copy software built for other markets. We built for Tanzania.',
    different: [
      { title: 'Made in Tanzania', desc: 'Designed with local shops, taxes, units and Kifungo cha bei (pricing habits) in mind.' },
      { title: 'Works Offline', desc: 'The app keeps working when the network fails and syncs when it returns.' },
      { title: 'Swahili Support', desc: 'Full Swahili interface and support, with English when you need it.' },
      { title: 'Fair Pricing', desc: 'Affordable monthly plans with a discount on multi-shop accounts.' },
    ],
    valuesTitle: 'Our values',
    valuesSubtitle: 'The principles behind every decision we make.',
    values: [
      { title: 'Uaminifu (Trust)', desc: 'Accurate records and honest advice build lasting relationships.' },
      { title: 'Urahisi (Simplicity)', desc: 'Powerful should still feel easy for a busy shop owner.' },
      { title: 'Uimara (Reliability)', desc: 'Your business cannot wait. Neither does the app.' },
      { title: 'Msaada (Support)', desc: 'Real people, ready to help in the language you speak.' },
    ],
    contactTitle: 'Contact us',
    contactSubtitle: 'Questions, demos or support — we are one message away.',
    contact: [
      { channel: 'Phone', value: '+255 784 815 686', note: 'Mon–Sat, 8am–6pm' },
      { channel: 'Email', value: 'emmanuel@gmail.com', note: 'We reply within a day' },
      { channel: 'WhatsApp', value: '+255 784 815 686', note: 'Chat with support' },
    ],
    faqTitle: 'About Mwaminifu',
    faqs: [
      { q: 'Who can use Mwaminifu?', a: 'Any shop, pharmacy, hardware store, restaurant or growing business in Tanzania.' },
      { q: 'Do I need a smartphone?', a: 'No. Mwaminifu works on a basic smartphone, tablet or desktop computer.' },
      { q: 'Is my data safe?', a: 'Your data is encrypted and visible only to users you authorize.' },
      { q: 'How do I get support?', a: 'Reach us by phone, email or WhatsApp, or through your AGAC agent.' },
    ],
  },
  sw: {
    eyebrow: 'Kuhusu',
    title: 'Imeundwa Tanzania, kwa biashara za Tanzania',
    subtitle: 'Tunaunda programu ya kuaminika inayosaidia maduka ya hapa kuuza zaidi, kupoteza kidogo na kukua kwa uhakika.',
    missionTitle: 'Dhamira yetu',
    missionBody: 'Mwaminifu maana yake ni “kuaminika”. Tunakuwepo kumpa kila duka, duka la dawa, vifaa na mgahawa zana bora ambazo makampuni makubwa huchukulia kawaida — kwa Kiswahili, kwenye simu yoyote, na hata bila mtandao.',
    missionPoints: ['Kumbukumbu za kuaminika kwa kila shilingi', 'Zana zinazofanya kazi kwenye simu ya kawaida', 'Zimeundwa na kusaidiwa hapa nchini'],
    storyTitle: 'Historia yetu',
    storySubtitle: 'Hatua chache safarini kuelekea kuboresha biashara Tanzania.',
    milestones: [
      { year: '2023', title: 'Wazo', desc: 'Tulizungumza na mamia ya wamiliki kuhusu mauzo yaliyopotea, stoo na madeni yasiyorekodiwa.' },
      { year: '2024', title: 'Maduka ya kwanza', desc: 'Mwaminifu ilianza na POS, stoo na deni la wateja kwa biashara za mwanzo.' },
      { year: '2025', title: 'Bila mtandao', desc: 'Tulijenga upya app ifanye kazi bila mtandao kabisa na kusawazisha yenyewe.' },
      { year: '2026', title: 'Nchi nzima', desc: 'Wakala wa AGAC sasa wanasajili biashara Tanzania nzima, na msaada wa maduka mengi.' },
    ],
    differentTitle: 'Kinachotutofautisha',
    differentSubtitle: 'Hatukunakili programu za masoko mengine. Tumeundwa kwa Tanzania.',
    different: [
      { title: 'Imeundwa Tanzania', desc: 'Imeundwa kwa maduka ya hapa, kodi, vipimo na tabia za bei.' },
      { title: 'Inafanya Kazi Bila Mtandao', desc: 'App inaendelea kufanya kazi mtandao ukienda na kusawazisha ukiingia.' },
      { title: 'Msaada wa Kiswahili', desc: 'Kiolesura na msaada kamili wa Kiswahili, pamoja na Kiingereza.' },
      { title: 'Bei Nafuu', desc: 'Mipango ya kila mwezi ya bei nafuu na punguzo kwa maduka mengi.' },
    ],
    valuesTitle: 'Maadili yetu',
    valuesSubtitle: 'Kanuni nyuma ya kila uamuzi tunaofanya.',
    values: [
      { title: 'Uaminifu', desc: 'Kumbukumbu sahihi na ushauri wa kweli hujenga uhusiano wa kudumu.' },
      { title: 'Urahisi', desc: 'Nguvu bado inapaswa kuwa rahisi kwa mwenye duka mwenye shughuli.' },
      { title: 'Uimara', desc: 'Biashara yako haiwezi kusubiri. App pia haisubiri.' },
      { title: 'Msaada', desc: 'Watu halisi, tayari kusaidia kwa lugha unayoongea.' },
    ],
    contactTitle: 'Wasiliana nasi',
    contactSubtitle: 'Maswali, maonyesho au msaada — tuko ujumbe mmoja mbali.',
    contact: [
      { channel: 'Simu', value: '+255 784 815 686', note: 'Jumatatu–Jumamosi, 8am–6pm' },
      { channel: 'Barua pepe', value: 'emmanuel@gmail.com', note: 'Tunajibu ndani ya siku' },
      { channel: 'WhatsApp', value: '+255 784 815 686', note: 'Zungumza na msaada' },
    ],
    faqTitle: 'Kuhusu Mwaminifu',
    faqs: [
      { q: 'Nani anaweza kutumia Mwaminifu?', a: 'Duka lolote, duka la dawa, vifaa, mgahawa au biashara inayokua Tanzania.' },
      { q: 'Nahitaji simu ya kisasa?', a: 'Hapana. Mwaminifu inafanya kazi kwenye simu ya kawaida, talet au kompyuta.' },
      { q: 'Data yangu iko salama?', a: 'Data yako imesimbwa na inaonekana kwa watumiaji unaowaruhusu pekee.' },
      { q: 'Napata msaada vipi?', a: 'Wasiliana kwa simu, barua pepe au WhatsApp, au kupitia wakala wako wa AGAC.' },
    ],
  },
};
