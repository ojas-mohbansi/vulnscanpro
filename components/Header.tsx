
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, History, Terminal, Settings, Package, Layers, Globe, Box, 
  Activity, Network, BookOpen, CalendarClock, Zap, Share2, BarChart2, 
  Scan, Menu, X, Database, Radar, LayoutGrid, ChevronRight, User, Info, Code
} from 'lucide-react';
import { useI18n } from '../lib/hooks/useI18n';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface NavGroupDef {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const Header: React.FC = () => {
  const location = useLocation();
  const { t } = useI18n();
  const p = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [p]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const groups: NavGroupDef[] = [
    {
      id: 'scans',
      label: 'Scans',
      icon: Scan,
      items: [
        { path: '/scan', label: t('nav.scan', 'New Scan'), icon: Terminal, description: 'Configure and start a new vulnerability scan' },
        { path: '/batch', label: t('nav.batch', 'Batch Scanner'), icon: Layers, description: 'Process multiple targets sequentially' },
        { path: '/scheduler', label: 'Scheduler', icon: CalendarClock, description: 'Manage recurring scan jobs' },
        { path: '/history', label: t('nav.history', 'Scan History'), icon: History, description: 'View past results and comparisons' },
      ]
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: Activity,
      items: [
        { path: '/threats', label: 'Threat Intel Feed', icon: ShieldAlert, description: 'Real-time global threat indicators' },
        { path: '/analytics', label: 'Trend Analytics', icon: BarChart2, description: 'Vulnerability trends over time' },
        { path: '/graph', label: 'Knowledge Graph', icon: Share2, description: 'Interactive CVE/CWE relationship map' },
        { path: '/map', label: 'Attack Surface', icon: Network, description: 'Visual map of your scan targets' },
        { path: '/geomap', label: 'Global Threat Map', icon: Globe, description: 'Geographic distribution of risks' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Package,
      items: [
        { path: '/dependencies', label: 'Dependency Check', icon: Box, description: 'Scan package.json/requirements.txt' },
        { path: '/simulation', label: 'Attack Simulation', icon: Zap, description: 'Safe reproduction of attacks' },
        { path: '/benchmark', label: 'System Benchmarks', icon: Radar, description: 'Performance and latency metrics' },
        { path: '/education', label: 'Education Hub', icon: BookOpen, description: 'Security guides and best practices' },
        { path: '/marketplace', label: 'Plugin Marketplace', icon: Database, description: 'Download community rules' },
      ]
    }
  ];

  return (
    <>
      {/* --- Mobile & Tablet Top Bar (< lg) --- */}
      <header className="lg:hidden sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md h-16 flex items-center px-4 justify-between transition-all duration-300 shadow-sm safe-top">
        <Link to="/" className="flex items-center gap-2 group shrink-0 select-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg" aria-label="VulnScan Pro Home">
          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 group-hover:border-primary/50 group-hover:bg-slate-800 transition-all shadow-sm">
            <ShieldAlert className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">VulnScan<span className="text-primary">Pro</span></span>
        </Link>

        <div className="flex items-center gap-2">
          <Link 
            to="/developer"
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Developer Profile"
          >
            <Code className="w-5 h-5" />
          </Link>
          
          <button 
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* --- Mobile Drawer --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setMobileMenuOpen(false)} 
            aria-hidden="true"
          />
          
          {/* Drawer Panel */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-[320px] h-[100dvh] bg-slate-950 border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0 safe-top">
              <span className="font-bold text-white flex items-center gap-2 select-none">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Navigation
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 overscroll-contain">
              {groups.map(g => (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                    <g.icon className="w-3 h-3" /> {g.label}
                  </div>
                  <div className="space-y-1">
                    {g.items.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-start gap-3 px-3 py-3 rounded-lg text-sm transition-all active:scale-[0.98] group focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          p === item.path 
                            ? 'bg-slate-800 text-white border-l-2 border-primary shadow-sm' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${p === item.path ? 'text-primary' : 'text-slate-500 group-hover:text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 safe-bottom space-y-2">
               <Link 
                 to="/developer" 
                 onClick={() => setMobileMenuOpen(false)}
                 className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium active:scale-[0.98] border border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
               >
                 <Code className="w-4 h-4" /> Developer
               </Link>
               <Link 
                 to="/settings" 
                 onClick={() => setMobileMenuOpen(false)}
                 className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm font-medium active:scale-[0.98] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
               >
                 <Settings className="w-4 h-4" /> Settings
               </Link>
            </div>
          </div>
        </div>
      )}

      {/* --- Desktop Sidebar (lg+) --- */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-slate-950 border-r border-slate-800 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* Logo Area */}
        <div className="p-6 pb-2 shrink-0">
          <Link to="/" className="flex items-center gap-3 group mb-6 select-none focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl">
            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 group-hover:border-primary/50 group-hover:bg-slate-800 transition-all shadow-lg shadow-black/20">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">VulnScan<span className="text-primary">Pro</span></h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 <p className="text-[10px] text-slate-500 font-mono font-medium tracking-wide uppercase">v2.4.0 Stable</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 pb-6 space-y-8">
          {groups.map(g => (
            <div key={g.id} className="space-y-2">
              <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                <g.icon className="w-3.5 h-3.5" />
                {g.label}
              </div>
              <div className="space-y-0.5">
                {g.items.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      p === item.path 
                        ? 'bg-primary/10 text-white font-medium shadow-sm ring-1 ring-white/5' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${p === item.path ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {p === item.path && <ChevronRight className="w-3 h-3 text-primary opacity-50 shrink-0" />}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30 shrink-0 space-y-1">
           <Link 
             to="/developer" 
             className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
               p === '/developer' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
             }`}
           >
             <Code className="w-4 h-4" />
             Developer
           </Link>
           <Link 
             to="/settings" 
             className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
               p === '/settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
             }`}
           >
             <Settings className="w-4 h-4" />
             {t('nav.settings', 'Settings')}
           </Link>
        </div>
      </aside>
    </>
  );
};

export default Header;
