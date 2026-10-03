import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import { useAuth } from '../auth/AuthContext';
import AuthModal, { AuthMode } from '../components/auth/AuthModal';
import AppIcon from '../components/ui/AppIcon';

interface LandingPageProps {
  defaultAuthMode?: 'login' | 'register';
}

export const LandingPage: React.FC<LandingPageProps> = ({ defaultAuthMode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { email?: string; verified?: boolean } | null;

  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'dashboard' | 'workspace' | 'minflow' | 'audit'>('dashboard');

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: AuthMode;
    email?: string;
    successNotice?: string;
  }>({
    isOpen: !!defaultAuthMode,
    mode: defaultAuthMode || 'login',
    email: routeState?.email || '',
    successNotice: routeState?.verified ? 'Email verified successfully! Please sign in with your credentials.' : undefined,
  });

  useEffect(() => {
    if (defaultAuthMode) {
      setAuthModal({
        isOpen: true,
        mode: defaultAuthMode,
        email: routeState?.email || '',
        successNotice: routeState?.verified ? 'Email verified successfully! Please sign in with your credentials.' : undefined,
      });
    }
  }, [defaultAuthMode, routeState]);

  const handleOpenAuth = (mode: AuthMode) => {
    setAuthModal({ isOpen: true, mode, email: '', successNotice: undefined });
  };

  const handleCloseAuth = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
    if (defaultAuthMode) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-surface">
      {/* Sticky Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <SplitMateLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              How It Works
            </a>
            <a href="#showcase" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Product Preview
            </a>
            <a href="#use-cases" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Use Cases
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-primary-container text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary transition-all shadow-sm font-medium flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <AppIcon name="arrow_forward" size={18} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('login')}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors px-3 py-1.5 font-medium cursor-pointer"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('register')}
                  className="bg-primary-container text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary transition-all shadow-sm font-medium cursor-pointer"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-16 flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden pb-16 pt-12 md:pt-16">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-primary-fixed/30 rounded-full blur-[120px] opacity-70" />
          <div className="pointer-events-none absolute top-72 -left-20 w-96 h-96 bg-secondary-fixed/40 rounded-full blur-[100px] opacity-60" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl flex flex-col items-center text-center">
            {/* FinTech Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high border border-surface-container-highest text-on-surface shadow-xs mb-6">
              <span className="text-sm">✨</span>
              <span className="font-label-md text-label-md font-medium text-on-surface">
                The Modern Splitwise Alternative for FinTech Teams & Friends
              </span>
              <AppIcon name="arrow_forward" size={16} className="text-primary" />
            </div>

            {/* Main Headline */}
            <h1 className="font-display-lg text-display-lg md:text-[56px] md:leading-[64px] text-on-surface tracking-tight max-w-4xl mx-auto font-bold">
              Split expenses without the <span className="text-primary-container">spreadsheet chaos.</span>
            </h1>

            {/* Subtitle */}
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mt-4 leading-relaxed">
              SplitMate makes shared expenses simple. Create groups, split bills, track balances, and settle up — all in one place with real-time sync and zero mental math.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => handleOpenAuth('register')}
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 font-medium cursor-pointer"
              >
                <span>Get Started Free</span>
                <AppIcon name="arrow_forward" size={18} />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 bg-surface-container-lowest text-on-surface font-label-md text-label-md px-6 py-3 rounded-lg border border-outline-variant/60 hover:bg-surface-container-low shadow-xs transition-all font-medium"
              >
                <AppIcon name="play_circle" size={20} className="text-primary" />
                <span>See how it works</span>
              </a>
            </div>

            {/* Social Proof Strip */}
            <div className="flex items-center justify-center gap-2 mt-6 text-on-surface-variant">
              <div className="flex items-center text-amber-500 text-sm tracking-tighter">
                ★★★★★
              </div>
              <p className="font-body-sm text-body-sm font-medium">
                <span className="font-semibold text-on-surface">4.9/5</span> from 42,000+ active flatmates, travelers, and event organizers ·{' '}
                <span className="text-primary-container font-medium">No credit card required</span>
              </p>
            </div>

            {/* Interactive High-Fidelity App Mockup Container */}
            <div className="relative w-full max-w-5xl mt-12 pt-2">
              {/* Floating Callout Pill: Left */}
              <div className="hidden lg:flex absolute -left-6 top-24 z-20 items-center gap-2 bg-surface-container-lowest text-on-surface px-4 py-2.5 rounded-full shadow-xl border border-surface-container-high animate-bounce" style={{ animationDuration: '3.5s' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                <span className="font-label-sm text-label-sm font-semibold tracking-tight">⚡ Min-Flow Algorithm: Reduces 18 transfers to 3</span>
              </div>

              {/* Floating Callout Pill: Right Top */}
              <div className="hidden lg:flex absolute -right-4 top-16 z-20 items-center gap-2 bg-surface-container-lowest text-on-surface px-4 py-2.5 rounded-full shadow-xl border border-surface-container-high">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
                </span>
                <span className="font-label-sm text-label-sm font-semibold tracking-tight">🔔 Real-time WebSocket sync</span>
              </div>

              {/* Floating Callout Pill: Right Bottom */}
              <div className="hidden lg:flex absolute -right-6 bottom-16 z-20 items-center gap-2 bg-surface-container-lowest text-on-surface px-4 py-2.5 rounded-full shadow-xl border border-surface-container-high">
                <AppIcon name="qr_code_scanner" size={18} className="text-primary-container" />
                <span className="font-label-sm text-label-sm font-semibold tracking-tight">📱 Instant UPI / QR settlement</span>
              </div>

              {/* Glass / Structured Browser Mockup Shell */}
              <div className="w-full bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden text-left border border-surface-container-high/80">
                {/* Mockup Title Bar */}
                <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-surface-container-high/60">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-400" />
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="h-4 w-px bg-outline-variant/40 ml-1" />
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <AppIcon name="groups" size={16} className="text-primary-container" />
                      <span className="font-label-sm text-label-sm font-semibold">SplitMate Workspace · Goa Trip 2024</span>
                    </div>
                  </div>
                  {/* Sync Tag & Action Tools */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-xs border border-surface-container-high">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                      <span className="font-label-sm text-label-sm font-semibold text-tertiary">Live</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                      <span>8 Members</span>
                      <span className="text-outline-variant">•</span>
                      <span>INR (₹)</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Top Financial Summary Metric Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-container-high p-px">
                  <div className="bg-surface-container-lowest p-4 flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Total Balance</span>
                    <span className="font-currency-display text-currency-display text-tertiary mt-1 tabular-nums font-bold">+₹3,370</span>
                    <span className="font-body-sm text-body-sm text-tertiary font-medium">You are in overall credit</span>
                  </div>
                  <div className="bg-surface-container-lowest p-4 flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">You Owe</span>
                    <span className="font-currency-display text-currency-display text-error mt-1 tabular-nums font-bold">₹2,450</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Across 2 friends</span>
                  </div>
                  <div className="bg-surface-container-lowest p-4 flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">You Are Owed</span>
                    <span className="font-currency-display text-currency-display text-tertiary mt-1 tabular-nums font-bold">₹5,820</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">From 3 friends</span>
                  </div>
                  <div className="bg-surface-container-lowest p-4 flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Active Groups</span>
                    <span className="font-currency-display text-currency-display text-on-surface mt-1 tabular-nums font-bold">6</span>
                    <span className="font-body-sm text-body-sm text-primary-container font-medium">3 Pending Settlements</span>
                  </div>
                </div>

                {/* Mockup Interior Split Layout: Activity & Settlement */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-surface-container-lowest">
                  {/* Left Column: Recent Shared Expenses */}
                  <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5">
                        <AppIcon name="receipt_long" size={18} className="text-primary-container" />
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Recent Expenses</h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-primary-container font-semibold cursor-pointer hover:underline">+ Add Bill</span>
                    </div>

                    {/* Expense items */}
                    <div className="p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0 text-on-primary-fixed">
                          <AppIcon name="restaurant" size={20} />
                        </div>
                        <div className="truncate">
                          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">Fisherman's Wharf Seafood Feast</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Paid by <span className="font-medium text-on-surface">You</span> · Split with 4</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <span className="font-currency-md text-currency-md text-on-surface block tabular-nums font-semibold">₹3,600</span>
                        <span className="font-body-sm text-body-sm text-tertiary font-semibold">+₹2,700 you lent</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center shrink-0 text-secondary">
                          <AppIcon name="villa" size={20} />
                        </div>
                        <div className="truncate">
                          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">Villa Rental Deposit (Anjuna)</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Paid by <span className="font-medium text-on-surface">Aman</span> · Split equally (8)</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <span className="font-currency-md text-currency-md text-on-surface block tabular-nums font-semibold">₹20,000</span>
                        <span className="font-body-sm text-body-sm text-error font-semibold">-₹2,500 your share</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed-dim flex items-center justify-center shrink-0 text-on-primary-fixed">
                          <AppIcon name="directions_car" size={20} />
                        </div>
                        <div className="truncate">
                          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">Self-drive Thar Rental (4 Days)</h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Paid by <span className="font-medium text-on-surface">You</span> · Split with 4</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <span className="font-currency-md text-currency-md text-on-surface block tabular-nums font-semibold">₹6,400</span>
                        <span className="font-body-sm text-body-sm text-tertiary font-semibold">+₹4,800 you lent</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Simplified Settlement Box */}
                  <div className="lg:col-span-5 flex flex-col gap-3 bg-surface p-4 rounded-xl border border-surface-container-high/60">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5">
                        <AppIcon name="payments" size={18} className="text-secondary" />
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Simplified Debts</h3>
                      </div>
                      <span className="font-label-sm text-[11px] bg-secondary-fixed text-secondary px-2 py-0.5 rounded-full font-semibold">Min-Flow Active</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-surface-container-high/40 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-[11px]">RV</span>
                            <p className="font-body-md text-body-md font-semibold text-on-surface">Rahul Verma</p>
                          </div>
                          <span className="font-body-sm text-body-sm text-tertiary font-medium pl-7.5">owes you ₹1,600</span>
                        </div>
                        <span className="bg-primary-container text-on-primary font-label-sm text-label-sm px-3 py-1.5 rounded-lg font-medium shadow-xs">
                          Remind
                        </span>
                      </div>

                      <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-surface-container-high/40 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-[11px]">PS</span>
                            <p className="font-body-md text-body-md font-semibold text-on-surface">Priya Sharma</p>
                          </div>
                          <span className="font-body-sm text-body-sm text-tertiary font-medium pl-7.5">owes you ₹850</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2.5 py-1 rounded">Pending</span>
                      </div>

                      <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-surface-container-high/40 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold text-[11px]">AK</span>
                            <p className="font-body-md text-body-md font-semibold text-on-surface">Aman Kapoor</p>
                          </div>
                          <span className="font-body-sm text-body-sm text-error font-medium pl-7.5">you owe ₹1,450</span>
                        </div>
                        <span className="bg-surface-container-highest text-on-surface font-label-sm text-label-sm px-3 py-1.5 rounded-lg font-medium">
                          Settle UPI
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 p-2 bg-secondary-fixed/40 rounded-lg flex items-center gap-2 text-secondary">
                      <AppIcon name="info" size={16} />
                      <span className="font-body-sm text-body-sm">3 direct payments resolve all 8 group balances.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST & VALUE HIGHLIGHT STRIP */}
        <section className="w-full bg-surface-container-lowest border-y border-surface-container-high/60 shadow-xs py-10 my-4" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3 p-2">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
                  <AppIcon name="bolt" size={22} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Simple Expense Splitting</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-normal">Equal, custom, and percentage splits calculated in under 3 seconds.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
                  <AppIcon name="sync" size={22} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Real-Time Balance Updates</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-normal">Instant sync via WebSockets across iOS, Android, and Web clients.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-tertiary shrink-0">
                  <AppIcon name="balance" size={22} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Clear Settlement Tracking</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-normal">One-tap UPI & instant bank receipts with zero ambiguity or guesswork.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <AppIcon name="hub" size={22} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Built for Groups & Trips</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-normal">Multi-currency exchange engine, itemized tax, and complete audit timeline.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS (3-Step Workflow) */}
        <section className="w-full py-16" id="how-it-works">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-container font-semibold">Workflow Engine</span>
              <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface font-bold mt-1">
                Settle up in three effortless steps
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Engineered for effortless social finances. No calculations to defend, no awkward reminders to write.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-full bg-surface-container-high text-primary-container font-bold text-sm flex items-center justify-center">01</span>
                    <AppIcon name="group_add" size={24} className="text-primary-container" />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">Create a group</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Set up an apartment tab, vacation trip, or dinner squad. Invite friends with a simple invite link or email in seconds.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-surface-container-low rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">Goa Trip 2024 · 8 members joined</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary font-bold text-sm flex items-center justify-center">02</span>
                    <AppIcon name="receipt" size={24} className="text-secondary" />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">Add shared expenses</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Snap a bill, choose who paid, and split equally or customize exact shares. SplitMate validates every rupee automatically.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">Dinner ₹2,400 split equally</span>
                  <span className="font-label-sm text-label-sm text-primary-container font-bold">₹600/person</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-sm flex items-center justify-center">03</span>
                    <AppIcon name="check_circle" size={24} className="text-tertiary" />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">Settle balances</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Our debt simplification algorithm cuts unnecessary transfers down to the bare minimum. Pay directly via UPI with a single tap.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-tertiary-fixed/30 rounded-lg flex items-center gap-2 text-on-tertiary-fixed">
                  <AppIcon name="verified" size={18} />
                  <span className="font-label-sm text-label-sm font-semibold truncate">✓ Rahul settled ₹1,600 via GPay</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES (6-Card Grid) */}
        <section className="w-full py-16 bg-surface-container-low" id="features-grid">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="max-w-3xl mb-12">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-container font-semibold">Engineering Precision</span>
              <h2 className="font-headline-lg text-headline-lg md:text-[34px] md:leading-[42px] text-on-surface font-bold mt-1">
                Designed for precision, clarity, and peace of mind
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Built from the ground up for zero ambiguity, mathematically guaranteed ledger balancing, and social peace of mind.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Shared Expenses', desc: 'Record and split expenses with your group with itemized receipts and tax breakdowns. Attach photo bills for unquestioned clarity.', icon: 'receipt_long', color: 'text-primary-container' },
                { title: 'Smart Splitting', desc: 'Split equally, assign exact rupee amounts, or use dynamic percentages with visual discrepancy warnings if figures do not sum to 100%.', icon: 'tune', color: 'text-secondary' },
                { title: 'Live Balances', desc: 'See who owes whom instantly with clear color-coded indicators. Never guess your financial position or balance totals again.', icon: 'account_balance_wallet', color: 'text-tertiary' },
                { title: 'Easy Settlements', desc: 'Record payments, integrate direct UPI transfers, and keep ledgers accurate without awkward follow-ups or lingering debts.', icon: 'payments', color: 'text-primary' },
                { title: 'Activity Timeline', desc: 'Audit trail of every edit, settlement, and new receipt. Full accountability and complete transparency for every member in the group.', icon: 'history_edu', color: 'text-primary-container' },
                { title: 'Real-Time Updates', desc: 'Powered by WebSocket connectivity. Everyone sees changes instantaneously without refreshing or maintaining duplicate spreadsheets.', icon: 'bolt', color: 'text-secondary' },
              ].map((feat, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center ${feat.color} mb-4`}>
                    <AppIcon name={feat.icon} size={26} />
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">{feat.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEEP DIVE PRODUCT PREVIEW / INTERACTIVE SHOWCASE */}
        <section className="w-full py-16" id="showcase">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="bg-surface-container-lowest p-6 md:p-10 rounded-3xl border border-surface-container-high/80 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-surface-container-high/60">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">Product Showcase</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">Deep-dive into the SplitMate console</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Switch perspectives to see how real-time simplification eliminates friction.</p>
                </div>

                {/* Perspective Switching Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container-low rounded-xl">
                  {[
                    { id: 'dashboard', label: 'Dashboard View' },
                    { id: 'workspace', label: 'Group Workspace' },
                    { id: 'minflow', label: 'Min-Flow Settlement' },
                    { id: 'audit', label: 'Audit Timeline' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveShowcaseTab(tab.id as any)}
                      className={`px-4 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${
                        activeShowcaseTab === tab.id
                          ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Showcase Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-surface-container-low rounded-2xl p-5 border border-surface-container-high/60">
                  {activeShowcaseTab === 'dashboard' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl shadow-xs">
                        <div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Active Workspace</span>
                          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Flat #402 · Indiranagar</h3>
                        </div>
                        <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-fixed/40 px-2.5 py-1 rounded-full font-semibold">
                          Settled this month: ₹18,400
                        </span>
                      </div>
                      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-semibold text-on-surface">Monthly Spend Distribution</span>
                          <span className="font-currency-md text-currency-md font-bold text-on-surface tabular-nums">Total: ₹42,850</span>
                        </div>
                        <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden flex">
                          <div className="bg-primary-container h-full" style={{ width: '48%' }} />
                          <div className="bg-secondary h-full" style={{ width: '24%' }} />
                          <div className="bg-tertiary h-full" style={{ width: '18%' }} />
                          <div className="bg-amber-400 h-full" style={{ width: '10%' }} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-body-sm text-on-surface-variant">
                          <span>● Rent (48%)</span>
                          <span>● Groceries (24%)</span>
                          <span>● Utilities (18%)</span>
                          <span>● Other (10%)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeShowcaseTab === 'workspace' && (
                    <div className="p-4 bg-surface-container-lowest rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Trip Roster & Member Status</span>
                        <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full font-medium">6 Active Members</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                          <span className="font-body-md text-body-md text-on-surface font-medium">Aman Kapoor</span>
                          <span className="font-label-sm text-label-sm text-tertiary font-semibold">+₹4,200 (Paid for Airbnb)</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                          <span className="font-body-md text-body-md text-on-surface font-medium">Rohan Gupta</span>
                          <span className="font-label-sm text-label-sm text-error font-semibold">-₹1,800 (Owes for Meals)</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                          <span className="font-body-md text-body-md text-on-surface font-medium">Sneha Patil</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">₹0 (All Settled)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeShowcaseTab === 'minflow' && (
                    <div className="p-4 bg-surface-container-lowest rounded-xl shadow-xs">
                      <div className="flex items-center gap-2 mb-2 text-secondary">
                        <AppIcon name="auto_fix_high" size={20} />
                        <span className="font-headline-sm text-headline-sm font-semibold">Graph-Based Debt Simplification</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Original graph had 14 independent cross-debts. Min-Flow collapsed them into 2 net payments:</p>
                      <div className="flex flex-col gap-2">
                        <div className="p-3 bg-surface rounded-lg flex items-center justify-between">
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">Aman → Rahul (₹2,100)</span>
                          <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 rounded-full font-medium">Optimized</span>
                        </div>
                        <div className="p-3 bg-surface rounded-lg flex items-center justify-between">
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">Priya → You (₹1,450)</span>
                          <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 rounded-full font-medium">Optimized</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeShowcaseTab === 'audit' && (
                    <div className="p-4 bg-surface-container-lowest rounded-xl shadow-xs">
                      <span className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-3 block">Immutable Ledger Logs</span>
                      <div className="flex flex-col gap-2.5 text-on-surface-variant">
                        <div className="text-[13px] border-l-2 border-primary pl-3 py-1">
                          <span className="font-bold text-on-surface">12:42 PM:</span> Aman marked ₹1,600 received from Rahul via Google Pay UPI.
                        </div>
                        <div className="text-[13px] border-l-2 border-secondary pl-3 py-1">
                          <span className="font-bold text-on-surface">11:15 AM:</span> You edited split share for "Fuel Tanker" from equal to custom ₹1,400.
                        </div>
                        <div className="text-[13px] border-l-2 border-tertiary pl-3 py-1">
                          <span className="font-bold text-on-surface">Yesterday:</span> Group "Goa Trip 2024" created by You.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 4 cols: Highlights & Security card */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-high/60">
                    <span className="font-label-sm text-label-sm text-error font-semibold flex items-center gap-1">
                      <AppIcon name="trending_down" size={16} />
                      Where you owe most
                    </span>
                    <h4 className="font-headline-md text-headline-md text-on-surface font-bold mt-1">Goa Trip 2024</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      You owe ₹2,450 to Aman for the Villa Deposit. Settle before Friday to close out the trip tab.
                    </p>
                  </div>
                  <div className="bg-primary-container text-on-primary p-5 rounded-xl shadow-md">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AppIcon name="verified_user" size={20} />
                      <span className="font-headline-sm text-headline-sm font-semibold">Bank Grade Security</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
                      Zero credential storage. UPI payments execute safely on your favorite payment application with end-to-end encryption.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES SECTION */}
        <section className="w-full py-16 bg-surface" id="use-cases">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-container font-semibold">Universal Applicability</span>
              <h2 className="font-headline-lg text-headline-lg md:text-[34px] md:leading-[42px] text-on-surface font-bold mt-1">
                Built for every shared moment
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Whether you're splitting international flights or daily chai rounds, SplitMate adapts to the dynamic of your group.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Scenario 1: Trips */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                <div className="h-44 w-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white">
                  <AppIcon name="flight_takeoff" size={48} className="opacity-80" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-0.5 rounded-full text-on-surface font-label-sm text-label-sm font-semibold mb-2">
                      <span>✈️</span> Trips & Vacations
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Holidays & Treks</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                      Split hotels, transport, shared villas, activities, and dining without holding onto crumpled paper receipts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-container-high/60 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                    <span>Multi-currency support</span>
                    <span className="font-semibold text-primary-container">Offline ready →</span>
                  </div>
                </div>
              </div>

              {/* Scenario 2: Flatmates */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                <div className="h-44 w-full bg-gradient-to-br from-indigo-600 to-blue-800 flex items-center justify-center text-white">
                  <AppIcon name="home" size={48} className="opacity-80" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-0.5 rounded-full text-on-surface font-label-sm text-label-sm font-semibold mb-2">
                      <span>🏠</span> Flatmates & Roommates
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Shared Apartments</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                      Track recurring rent, Wi-Fi bills, groceries, cooking gas, and maintenance with monthly rollover summaries.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-container-high/60 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                    <span>Monthly rollover tab</span>
                    <span className="font-semibold text-primary-container">Recurring bills →</span>
                  </div>
                </div>
              </div>

              {/* Scenario 3: Events */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                <div className="h-44 w-full bg-gradient-to-br from-amber-600 to-orange-800 flex items-center justify-center text-white">
                  <AppIcon name="celebration" size={48} className="opacity-80" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-0.5 rounded-full text-on-surface font-label-sm text-label-sm font-semibold mb-2">
                      <span>🎉</span> Friends & Dinners
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Dinners & Parties</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                      Keep night-outs, parties, festival celebrations, and group birthday gifts organized without calculation arguments.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-container-high/60 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                    <span>Itemized bill splits</span>
                    <span className="font-semibold text-primary-container">Zero math →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON MATRIX */}
        <section className="w-full py-16 bg-surface-container-low">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">The SplitMate Advantage</span>
              <h2 className="font-headline-lg text-headline-lg md:text-[32px] md:leading-[40px] text-on-surface font-bold mt-1">
                Why switch from messy spreadsheets?
              </h2>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl shadow-lg border border-surface-container-high/60 overflow-hidden grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 md:p-8 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-surface-container-high/60">
                <div className="flex items-center gap-2 text-error">
                  <AppIcon name="cancel" size={24} />
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Spreadsheets & Legacy Apps</h3>
                </div>
                <ul className="flex flex-col gap-3 font-body-md text-body-md text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <AppIcon name="close" size={18} className="text-error shrink-0 mt-0.5" />
                    <span>Broken formulas, accidental cell overwrites, and zero input validation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AppIcon name="close" size={18} className="text-error shrink-0 mt-0.5" />
                    <span>Unnecessary complex web of 15+ circular transfers between group members.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AppIcon name="close" size={18} className="text-error shrink-0 mt-0.5" />
                    <span>Awkward manual reminder messages on WhatsApp asking people to pay back.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 md:p-8 bg-primary-fixed/20 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary-container">
                  <AppIcon name="check_circle" size={24} />
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">SplitMate Platform</h3>
                </div>
                <ul className="flex flex-col gap-3 font-body-md text-body-md text-on-surface">
                  <li className="flex items-start gap-2">
                    <AppIcon name="check" size={18} className="text-primary-container shrink-0 mt-0.5" />
                    <span><strong>Instant Min-Flow Reduction:</strong> Turns dozens of micro-debts into 2-3 direct payments.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AppIcon name="check" size={18} className="text-primary-container shrink-0 mt-0.5" />
                    <span><strong>Live WebSocket Sync:</strong> Real-time balances updated across all devices immediately.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AppIcon name="check" size={18} className="text-primary-container shrink-0 mt-0.5" />
                    <span><strong>Direct UPI Settlements:</strong> One-tap QR & app links without typing UPI IDs manually.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION (CTA BANNER) */}
        <section className="w-full py-16 my-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl">
            <div className="relative bg-primary-container text-on-primary rounded-3xl p-8 md:p-16 overflow-hidden shadow-2xl flex flex-col items-center text-center">
              <div className="relative z-10 max-w-3xl flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white font-label-sm text-label-sm font-semibold mb-4">
                  <span>✨</span> No more money awkwardness
                </div>
                <h2 className="font-display-lg text-display-lg md:text-[44px] md:leading-[52px] font-bold tracking-tight text-white">
                  Ready to simplify shared expenses?
                </h2>
                <p className="font-body-lg text-body-lg text-on-primary-container max-w-xl mx-auto mt-3 leading-relaxed">
                  Join over 40,000+ groups splitting expenses effortlessly. Get started in less than 30 seconds with complete peace of mind.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('register')}
                    className="bg-white text-primary-container font-label-md text-label-md font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Create Free Account</span>
                    <AppIcon name="arrow_forward" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('login')}
                    className="border border-white/40 text-white font-label-md text-label-md font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                </div>
                <span className="font-body-sm text-body-sm text-on-primary-container/80 mt-4">
                  Free forever for personal groups · No credit card required · Instant setup
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container-high/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-space-xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
            <div className="flex flex-col gap-3">
              <SplitMateLogo size="sm" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                The precision collaborative expense and debt settlement platform built to eliminate friction around group finances.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Product</span>
              <a href="#features" className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface">Features</a>
              <a href="#how-it-works" className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface">Smart Split Engine</a>
              <a href="#showcase" className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface">Live Settlement</a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Security & Privacy</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Bank Grade Security</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">End-to-End Encryption</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Zero Credential Storage</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Status</span>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                <span>All systems operational</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                © {new Date().getFullYear()} SplitMate Technologies Inc.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Compact Animated Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        initialEmail={authModal.email}
        initialSuccessNotice={authModal.successNotice}
        onClose={handleCloseAuth}
      />
    </div>
  );
};

export default LandingPage;
