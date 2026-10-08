import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  HelpCircle, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  CalendarDays,
  LayoutDashboard, 
  LogOut, 
  Store,
  Send,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentSection: string;
  onNavigate: (section: string) => void;
  isAdmin: boolean;
  onAdminLogout: () => void;
  telegramUrl?: string;
  telegramSupportUrl?: string;
  websiteName?: string;
  websiteLogoUrl?: string;
  navbarStoreText?: string;
  navbarRulesText?: string;
  navbarTrackText?: string;
  navbarFaqText?: string;
  navbarSupportText?: string;
  navbarTelegramText?: string;
  navbarAdminText?: string;
  navbarMenuText?: string;
  navbarCloseText?: string;
  navbarTagline?: string;
  navbarStoreDescription?: string;
  navbarRulesDescription?: string;
  navbarTrackDescription?: string;
  navbarFaqDescription?: string;
  navbarSupportDescription?: string;
  navbarTelegramDescription?: string;
  navbarAdminDescription?: string;
  rulesTitle?: string;
  rulesSubtitle?: string;
  rulesDoneText?: string;
  setupChannelUrl?: string;
  showUserMenu?: boolean;
  showAdminMenu?: boolean;
  showStoreItem?: boolean;
  showRulesItem?: boolean;
  showTrackItem?: boolean;
  showFaqItem?: boolean;
  showSupportItem?: boolean;
  showTelegramItem?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onNavigate,
  isAdmin,
  onAdminLogout,
  telegramUrl = '',
  telegramSupportUrl = '',
  websiteName = 'PeakLoader Shop',
  websiteLogoUrl = '/logo.jpg',
  navbarStoreText = 'Store',
  navbarRulesText = 'Follow Rules',
  navbarTrackText = 'Track Order',
  navbarFaqText = 'FAQ',
  navbarSupportText = 'Support',
  navbarTelegramText = 'Telegram Support',
  navbarAdminText = 'Admin',
  navbarMenuText = 'Menu',
  navbarCloseText = 'Close',
  navbarTagline = 'Instant Digital License & Key Portal',
  navbarStoreDescription = 'Products & Licenses',
  navbarRulesDescription = 'Flag Ban Safety',
  navbarTrackDescription = 'Find Key by Order ID',
  navbarFaqDescription = 'Frequently Asked Questions',
  navbarSupportDescription = 'Contact & Ticket',
  navbarTelegramDescription = 'Telegram Support',
  navbarAdminDescription = 'Login to Control Panel',
  rulesTitle = 'Follow Rules',
  rulesSubtitle = 'Flag Ban Safety Notice',
  rulesDoneText = 'Done & Close',
  setupChannelUrl = '',
  showUserMenu = true,
  showAdminMenu = true,
  showStoreItem = true,
  showRulesItem = true,
  showTrackItem = true,
  showFaqItem = true,
  showSupportItem = true,
  showTelegramItem = true
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const hasUserMenuItems = showUserMenu && (
    showStoreItem || showRulesItem || showTrackItem || showFaqItem || showSupportItem || showTelegramItem
  );
  const hasMenuItems = hasUserMenuItems || showAdminMenu;

  useEffect(() => {
    if (!showRulesModal) return;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [showRulesModal]);

  const handleNav = (section: string) => {
    onNavigate(section);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div 
            onClick={() => handleNav(showUserMenu ? 'home' : 'admin-login')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 group-hover:scale-105 transition-all duration-300 shrink-0">
              <img 
                src={websiteLogoUrl || '/logo.jpg'} 
                alt="PeakLoader Shop Logo" 
                className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  {websiteName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">{navbarTagline}</p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu Button */}
            {hasMenuItems && <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-slate-950/50 active:scale-95"
            >
              {isMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-rose-400" />
                  <span>{navbarCloseText}</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4 text-emerald-400" />
                  <span>{navbarMenuText}</span>
                </>
              )}
            </button>}
          </div>
        </div>

        {/* Dropdown Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-2xl shadow-2xl p-4 sm:p-6 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-w-xl mx-auto space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
                Navigation Menu
              </div>

              {showUserMenu && showStoreItem && <>
              {/* Store */}
              <button
                onClick={() => handleNav('home')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  currentSection === 'home'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-200 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentSection === 'home' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <span>{navbarStoreText}</span>
                </div>
                <span className="text-xs text-slate-500">{navbarStoreDescription}</span>
              </button>

              </>}

              {/* Follow Rules */}
              {showUserMenu && showRulesItem && <>
              <button onClick={() => { setIsMenuOpen(false); setShowRulesModal(true); }} className="w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all">
                <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><ShieldAlert className="w-4 h-4" /></div><span>{navbarRulesText}</span></div>
                <span className="text-xs text-amber-400/70">{navbarRulesDescription}</span>
              </button>
              </>}

              {/* Track Order */}
              {showUserMenu && showTrackItem && <>
              <button
                onClick={() => handleNav('lookup')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  currentSection === 'lookup'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-200 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentSection === 'lookup' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                    <Search className="w-4 h-4" />
                  </div>
                  <span>{navbarTrackText}</span>
                </div>
                <span className="text-xs text-slate-500">{navbarTrackDescription}</span>
              </button>
              </>}

              {/* FAQ */}
              {showUserMenu && showFaqItem && <>
              <button
                onClick={() => handleNav('faq')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  currentSection === 'faq'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-200 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentSection === 'faq' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span>{navbarFaqText}</span>
                </div>
                <span className="text-xs text-slate-500">{navbarFaqDescription}</span>
              </button>
              </>}

              {/* Support */}
              {showUserMenu && showSupportItem && <>
              <button
                onClick={() => handleNav('contact')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  currentSection === 'contact'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-200 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentSection === 'contact' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>{navbarSupportText}</span>
                </div>
                <span className="text-xs text-slate-500">{navbarSupportDescription}</span>
              </button>
              </>}

              {/* Telegram Live Support Link */}
              {showUserMenu && showTelegramItem && <>
              <a
                href={telegramSupportUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <span>{navbarTelegramText}</span>
                </div>
                <span className="text-xs text-sky-400/80">{navbarTelegramDescription}</span>
              </a>
              </>}

              {/* Admin Option */}
              {showAdminMenu && <div className={`${hasUserMenuItems ? 'pt-2 border-t border-slate-900' : ''}`}>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNav('admin')}
                      className={`flex-1 flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-all ${
                        currentSection === 'admin'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>{navbarAdminText}</span>
                      </div>
                      <span className="text-xs opacity-80">{navbarAdminDescription}</span>
                    </button>
                    <button
                      onClick={() => {
                        onAdminLogout();
                        setIsMenuOpen(false);
                      }}
                      title="Logout Admin"
                      className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleNav('admin-login')}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-semibold transition-all ${
                      currentSection === 'admin-login'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span>{navbarAdminText}</span>
                    </div>
                    <span className="text-xs text-slate-500">{navbarAdminDescription}</span>
                  </button>
                )}
              </div>}

            </div>
          </div>
        )}
      </div>

      {showRulesModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overscroll-none" role="dialog" aria-modal="true" aria-label="Follow Rules" onWheel={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()}>
          <div className="relative flex w-full max-w-lg h-[min(760px,calc(100dvh-24px))] sm:h-[min(760px,calc(100dvh-40px))] flex-col overflow-hidden rounded-3xl bg-slate-900 border border-amber-500/20 shadow-2xl shadow-black/60">
            <div className="shrink-0 flex items-center justify-between px-5 sm:px-7 py-5 border-b border-slate-800/70"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center"><ShieldAlert className="w-5 h-5" /></div><div><h3 className="text-base font-extrabold text-white">{rulesTitle}</h3><p className="text-[11px] text-slate-400">{rulesSubtitle}</p></div></div><button onClick={()=>setShowRulesModal(false)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all" aria-label="Close rules"><X className="w-4 h-4" /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-5 text-sm leading-7 text-slate-300"><div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5 space-y-3"><p className="text-center text-lg font-extrabold text-amber-400">📣 Flag Ban Safety 📣</p><p className="font-extrabold text-white">❗️ IMPORTANT NOTICE – Follow These Rules ❗️</p><p>Guys, please follow these rules strictly 🔺</p><p>🔥 <strong className="text-white">Aimbot is very powerful</strong><br />So don’t misuse it and don’t play like a hacker.</p><p>💀 Don’t play aggressive<br />💀 Don’t kill Rank Pushers<br />💀 Don’t show off</p><p>🎯 <strong className="text-white">Kill Limit: 7–8 only</strong><br />🇺🇸 Play safe<br />📍 Maintain distance<br />📉 Avoid reports at any cost</p><div className="pt-2 border-t border-slate-800"><p className="font-extrabold text-white">Remember:</p><p>Play smart = <span className="text-emerald-400 font-bold">Safe ID</span></p><p>Show off = <span className="text-rose-400 font-bold">Flag Ban ❌</span></p></div><p className="text-center font-extrabold text-white pt-2">Stay low. Stay safe</p></div></div>
            <div className="shrink-0 border-t border-slate-800/70 px-5 sm:px-7 py-3 space-y-2">
              {setupChannelUrl.trim() && (
                <a href={setupChannelUrl.trim()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs border border-emerald-400 transition-all shadow-lg shadow-emerald-500/20">Setup Guide</a>
              )}
              <button onClick={()=>setShowRulesModal(false)} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all">{rulesDoneText}</button>
            </div>
          </div>
        </div>, document.body)}
    </header>
  );
};
