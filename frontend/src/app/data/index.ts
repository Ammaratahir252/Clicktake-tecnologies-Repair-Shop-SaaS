// ─── NAVIGATION ───────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: "Features",   href: "features"   },
  { label: "How It Works", href: "howitworks" },
  { label: "Roles",      href: "roles"      },
  { label: "Pricing",    href: "pricing"    },
  { label: "About",      href: "about"      },
  { label: "Blog",       href: "blog"       },
  { label: "FAQ",        href: "faq"        },
  { label: "Contact",    href: "contact"    },
];

// ─── STATS ────────────────────────────────────────────────────────────────────
export const STATS = [
  { value: "10K+",  label: "Repairs Tracked"       },
  { value: "500+",  label: "Active Shops"           },
  { value: "98%",   label: "Customer Satisfaction"  },
  { value: "24/7",  label: "Real-time Updates"      },
];

// ─── FEATURES ─────────────────────────────────────────────────────────────────
export const FEATURES = [
  {
    icon: "Ticket",
    color: "#1d4ed8", bg: "#dbeafe",
    title: "Smart Ticket Management",
    desc: "Create, assign, and track every repair ticket from intake to delivery. Real-time status updates keep your whole team in sync — no more lost jobs or missed follow-ups.",
    badge: null,
  },
  {
    icon: "Bot",
    color: "#6d28d9", bg: "#ede9fe",
    title: "AI-Powered Diagnostics",
    desc: "GPT-4o assistant helps technicians identify issues 60% faster using a RAG-enhanced repair knowledge base. Ask in plain language, get expert-level answers instantly.",
    badge: "AI",
  },
  {
    icon: "Truck",
    color: "#c2410c", bg: "#ffedd5",
    title: "Live Delivery Tracking",
    desc: "End-to-end pickup & delivery with real-time GPS tracking for customers and drivers. Automated SMS/email notifications at every checkpoint — zero guesswork.",
    badge: null,
  },
  {
    icon: "Package",
    color: "#065f46", bg: "#d1fae5",
    title: "Smart Inventory Control",
    desc: "Track parts, manage stock levels, and receive low-stock alerts before you run out. Barcode scanning, supplier management, and purchase orders all built in.",
    badge: null,
  },
  {
    icon: "BarChart3",
    color: "#92400e", bg: "#fef3c7",
    title: "Analytics & Reports",
    desc: "Revenue reports, technician performance metrics, SLA tracking, and customer trends — all the insights you need to grow your shop and make data-driven decisions.",
    badge: null,
  },
  {
    icon: "Shield",
    color: "#be123c", bg: "#ffe4e6",
    title: "Role-Based Access Control",
    desc: "Granular permissions for every role. Owners, managers, technicians, front desk, drivers, and customers each see exactly what they need — with full audit logging.",
    badge: null,
  },
  {
    icon: "CreditCard",
    color: "#0369a1", bg: "#e0f2fe",
    title: "Integrated Payments",
    desc: "Accept JazzCash, EasyPaisa, PayPal, and bank transfer. Generate invoices, send payment links, and reconcile revenue — all from one dashboard.",
    badge: null,
  },
  {
    icon: "MessageSquare",
    color: "#4f46e5", bg: "#eef2ff",
    title: "Customer Communication",
    desc: "Automated status updates via SMS and email. Customers can approve estimates digitally, sign repairs, and leave reviews — no phone tag required.",
    badge: null,
  },
  {
    icon: "Smartphone",
    color: "#0f766e", bg: "#ccfbf1",
    title: "PWA Mobile App",
    desc: "Full progressive web app — works on any device, installs on home screen, runs offline. Technicians and drivers stay connected even without internet.",
    badge: "PWA",
  },
];

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Customer Brings In Device",
    desc: "Front desk creates a ticket in under 60 seconds. Capture device details, issue description, customer info, and photos. Customer gets an instant SMS confirmation.",
    color: "#1d4ed8", bg: "#dbeafe",
    icon: "ClipboardList",
  },
  {
    step: "02",
    title: "Manager Assigns to Technician",
    desc: "Manager reviews incoming tickets and assigns to the best-fit technician based on skill and workload. Priority flags and SLA deadlines are set automatically.",
    color: "#6d28d9", bg: "#ede9fe",
    icon: "UserCheck",
  },
  {
    step: "03",
    title: "Technician Diagnoses & Repairs",
    desc: "Technician opens the job, runs AI diagnostics if needed, logs time, requests parts from inventory, and uploads repair photos as evidence of work done.",
    color: "#065f46", bg: "#d1fae5",
    icon: "Wrench",
  },
  {
    step: "04",
    title: "Customer Approves Estimate",
    desc: "Estimate is sent digitally. Customer reviews, signs, and approves from their phone in one tap. No printing, no waiting — repair starts immediately after approval.",
    color: "#92400e", bg: "#fef3c7",
    icon: "FileCheck",
  },
  {
    step: "05",
    title: "Payment & Delivery",
    desc: "Once complete, customer pays online or in-store. Driver picks up or delivers if needed — with live GPS tracking. Customer gets receipt and leaves a review.",
    color: "#c2410c", bg: "#ffedd5",
    icon: "CheckCircle2",
  },
];

// ─── ROLES ────────────────────────────────────────────────────────────────────
export const ROLES = [
  {
    icon: "Store",
    color: "#1d4ed8", bg: "#dbeafe",
    label: "Owner",
    desc: "Full command of your business. Monitor revenue, manage your team, and access every report from anywhere in the world.",
    perks: ["Full analytics dashboard", "Revenue & profit reports", "Team management", "Multi-location support", "Billing control"],
  },
  {
    icon: "Key",
    color: "#6d28d9", bg: "#ede9fe",
    label: "Manager",
    desc: "Oversee daily operations, assign tickets, manage staff scheduling, and monitor SLA compliance across your shop.",
    perks: ["Ticket oversight & assignment", "Staff scheduling", "Inventory management", "SLA & KPI monitoring", "Customer escalations"],
  },
  {
    icon: "MonitorSmartphone",
    color: "#065f46", bg: "#d1fae5",
    label: "Front Desk",
    desc: "Handle customer intake, create tickets, process payments, and print receipts — all from one clean, fast interface.",
    perks: ["Customer intake flow", "Payment processing", "Ticket creation", "Estimate sending", "Receipt printing"],
  },
  {
    icon: "Wrench",
    color: "#92400e", bg: "#fef3c7",
    label: "Technician",
    desc: "Get your assigned queue, log hours, run AI diagnostics, request parts, and upload repair photos as you work.",
    perks: ["Assigned ticket queue", "Time & labor logging", "AI diagnostic assistant", "Parts requests", "Repair photo upload"],
  },
  {
    icon: "Truck",
    color: "#c2410c", bg: "#ffedd5",
    label: "Driver",
    desc: "Manage pickup & delivery jobs with GPS navigation, live customer communication, and digital proof of delivery.",
    perks: ["Pickup/delivery job queue", "GPS navigation", "Customer contact", "Delivery confirmation", "Route optimization"],
  },
  {
    icon: "HeartHandshake",
    color: "#0369a1", bg: "#e0f2fe",
    label: "Customer",
    desc: "Track your device's repair status live, digitally sign estimates, pay online, and book doorstep pickup or delivery.",
    perks: ["Live repair tracking", "Digital estimate signing", "Online payments", "Repair history", "Doorstep booking"],
  },
];

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
export const TESTIMONIALS = [
  {
    name: "Ahmed Hassan",
    role: "Owner, TechFix Lahore",
    text: "DibnowRepairSaaS completely transformed how we operate. Ticket management alone saved us 3 hours daily — and the AI diagnostics blew our technicians away.",
    stars: 5, initials: "AH", color: "#1d4ed8",
    metric: "3hrs/day saved",
  },
  {
    name: "Fatima Malik",
    role: "Manager, QuickRepair Karachi",
    text: "The AI diagnostics feature is genuinely incredible. Our technicians now solve complex issues 50% faster. The SLA tracking has also made our shop much more accountable.",
    stars: 5, initials: "FM", color: "#6d28d9",
    metric: "50% faster repairs",
  },
  {
    name: "Usman Khan",
    role: "Owner, GadgetDoc Islamabad",
    text: "The customer portal is a game changer. Clients love tracking their device in real time. Our 5-star reviews doubled in the first month after switching.",
    stars: 5, initials: "UK", color: "#065f46",
    metric: "2× 5-star reviews",
  },
  {
    name: "Sara Raza",
    role: "Front Desk, iCare Faisalabad",
    text: "I used to dread intake — manual forms, lost tickets, angry customers. Now I create a ticket in under a minute and everything is tracked automatically. Life-changing.",
    stars: 5, initials: "SR", color: "#be123c",
    metric: "<60s per intake",
  },
];

// ─── PRICING ──────────────────────────────────────────────────────────────────
export const PRICING = [
  {
    name: "Starter",
    price: "$29", period: "/mo",
    desc: "Perfect for solo technicians and small shops just getting started.",
    features: [
      "Up to 5 staff accounts",
      "Ticket management",
      "Customer portal",
      "Basic inventory",
      "Email support",
      "Mobile PWA app",
      "PDF invoices",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$79", period: "/mo",
    desc: "Everything you need to run a high-efficiency repair shop at scale.",
    features: [
      "Unlimited staff accounts",
      "AI Diagnostics (GPT-4o)",
      "Live delivery GPS tracking",
      "Advanced inventory & POs",
      "Full analytics dashboard",
      "Priority support 24/7",
      "Custom branding",
      "Digital signatures",
      "JazzCash / EasyPaisa",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom", period: "",
    desc: "Multi-location support with dedicated account management and SLA guarantees.",
    features: [
      "Unlimited locations",
      "Custom integrations & API",
      "SLA guarantees",
      "Dedicated account manager",
      "On-premise deployment option",
      "White-label branding",
      "SSO / LDAP",
      "Custom reporting",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

// ─── ABOUT ────────────────────────────────────────────────────────────────────
export const TEAM = [
  { name: "Ali Raza", role: "CEO & Co-founder", initials: "AR", color: "#1d4ed8", bio: "10+ years in SaaS. Previously built platforms for 3 logistics companies across South Asia." },
  { name: "Zara Siddiqui", role: "CTO", initials: "ZS", color: "#6d28d9", bio: "Ex-Google engineer. Led backend architecture for platforms serving 5M+ daily users." },
  { name: "Hamza Tariq", role: "Head of Product", initials: "HT", color: "#065f46", bio: "Former repair shop owner turned product builder. Knows the pain firsthand." },
  { name: "Nadia Baig", role: "Head of Design", initials: "NB", color: "#be123c", bio: "Crafts interfaces that feel obvious. Obsessed with reducing clicks-to-done." },
];

export const ABOUT_VALUES = [
  { title: "Built for the field", desc: "We started in a repair shop in Lahore. Every feature solves a real problem we witnessed firsthand.", icon: "Wrench", color: "#1d4ed8", bg: "#dbeafe" },
  { title: "Relentless simplicity", desc: "If a technician has to open a manual, we failed. We iterate until things are obvious.", icon: "Zap", color: "#6d28d9", bg: "#ede9fe" },
  { title: "Pakistan-first", desc: "Local payment methods, Urdu support, PKR currency, and servers in the region. We belong here.", icon: "Globe", color: "#065f46", bg: "#d1fae5" },
  { title: "Transparent always", desc: "No hidden fees, no vendor lock-in, no dark patterns. We grow only when our customers grow.", icon: "Shield", color: "#c2410c", bg: "#ffedd5" },
];

// ─── BLOG ─────────────────────────────────────────────────────────────────────
export const BLOG_POSTS = [
  {
    title: "How AI Diagnostics Cut Repair Time by 60% in 3 Months",
    excerpt: "We analyzed data from 500+ shops using our AI diagnostic tool and found a consistent pattern: technicians who use AI assistance close tickets significantly faster — without sacrificing quality.",
    category: "AI & Technology",
    date: "June 3, 2026",
    readTime: "6 min read",
    color: "#6d28d9", bg: "#ede9fe",
    initials: "AT",
  },
  {
    title: "The Real Cost of Manual Ticket Tracking (And How to Fix It)",
    excerpt: "Spreadsheets, WhatsApp groups, sticky notes — most repair shops are hemorrhaging hours every week on manual tracking. Here's what the data says and a simple path forward.",
    category: "Operations",
    date: "May 28, 2026",
    readTime: "5 min read",
    color: "#1d4ed8", bg: "#dbeafe",
    initials: "ZS",
  },
  {
    title: "JazzCash & EasyPaisa Integration: What It Means for Repair Shops",
    excerpt: "Pakistan's mobile wallet adoption crossed 40M users in 2025. We broke down why accepting digital payments isn't just convenient — it's now a competitive necessity.",
    category: "Payments",
    date: "May 19, 2026",
    readTime: "4 min read",
    color: "#065f46", bg: "#d1fae5",
    initials: "NB",
  },
  {
    title: "Building a 5-Star Repair Shop: Lessons from 100 Customer Reviews",
    excerpt: "We studied 100 customer reviews across our platform to find what separates 5-star shops from 3-star ones. Spoiler: it's almost never about the repair quality itself.",
    category: "Customer Success",
    date: "May 12, 2026",
    readTime: "7 min read",
    color: "#c2410c", bg: "#ffedd5",
    initials: "HT",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export const FAQS = [
  {
    q: "Is there a free trial? Do I need a credit card?",
    a: "Yes — our Starter plan is free to try for 14 days with no credit card required. You get full access to all core features so you can properly evaluate the platform before committing.",
  },
  {
    q: "Can I import my existing customer and ticket data?",
    a: "Absolutely. We provide CSV import tools for customers, tickets, inventory, and repair history. Our onboarding team will help you migrate from any existing system — including spreadsheets — at no extra cost.",
  },
  {
    q: "Does it work on mobile? Do I need to install an app?",
    a: "DibnowRepairSaaS is a full Progressive Web App (PWA). It works on any device via browser, installs to your home screen like a native app, and has offline support for technicians and drivers in low-connectivity areas.",
  },
  {
    q: "Which payment methods are supported?",
    a: "We support JazzCash, EasyPaisa, PayPal, Stripe, and bank transfer. Invoices can be sent via SMS or email with a one-tap payment link. All transactions are logged automatically in the revenue dashboard.",
  },
  {
    q: "How does the AI Diagnostics feature work?",
    a: "Our AI Diagnostic assistant is powered by GPT-4o with a Retrieval-Augmented Generation (RAG) knowledge base built from thousands of device repair guides, common fault trees, and community diagnostics. Technicians describe the symptom, and the AI suggests likely causes and repair steps.",
  },
  {
    q: "Can I manage multiple shop locations?",
    a: "Yes — our Enterprise plan supports unlimited locations under one account. Each location has its own dashboard, inventory, and staff, but owners can view consolidated reports across all branches from a single view.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted at rest and in transit (AES-256 + TLS 1.3). We host on AWS in the Asia Pacific region, run automated daily backups, and are compliant with Pakistan's PECA data protection guidelines. You can export all your data at any time.",
  },
  {
    q: "What kind of support is available?",
    a: "Starter plans include email support with 48-hour response times. Pro plans get priority support with 4-hour response times, live chat, and access to our dedicated WhatsApp support channel. Enterprise customers get a dedicated account manager.",
  },
];