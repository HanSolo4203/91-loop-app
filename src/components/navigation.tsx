'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { BLUR_DATA_URL, getImageSizes } from '@/lib/utils/image-helpers';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  User,
  Menu,
  X,
  FileSpreadsheet,
  LogOut,
  Calculator,
  Radio,
  ChevronDown,
  Users,
  CalendarDays,
  Banknote
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { playLogoutChime } from '@/lib/utils/sounds';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'New Batch',
    href: '/batch/new',
    icon: PlusCircle,
  },
  {
    name: 'Quick Calculator',
    href: '/calculator',
    icon: Calculator,
  },
  {
    name: 'RFID Tracking',
    href: '/dashboard/rfid',
    icon: Radio,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileSpreadsheet,
  },
  {
    name: 'Employees',
    href: '/staff/employees',
    icon: Users,
  },
  {
    name: 'Schedule',
    href: '/staff/schedule',
    icon: CalendarDays,
  },
  {
    name: 'Payroll',
    href: '/staff/payroll',
    icon: Banknote,
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Close dropdown when route changes
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [pathname]);

  // Close on escape key
  const closeMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeMenus]);

  const handleLogout = async () => {
    try {
      playLogoutChime();
      // Delay to let the longer chime play before navigation
      await new Promise(resolve => setTimeout(resolve, 800));
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-14 sm:h-16 min-h-14">
          {/* Logo and Brand */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Link href="/dashboard" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
              <Image
                src="/rsllogo.png"
                alt="RSL Express"
                width={2364}
                height={297}
                className="h-6 sm:h-7 w-auto max-h-8 object-contain object-left"
                quality={90}
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes={getImageSizes({
                  mobile: '120px',
                  tablet: '150px',
                  default: '200px',
                })}
              />
            </Link>
          </div>

          {/* Desktop Navigation - horizontal scroll on narrow, wrap-friendly on wide */}
          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0 overflow-x-auto overflow-y-hidden"
            aria-label="Main navigation"
          >
            <div className="flex items-center gap-1 flex-shrink-0">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex-shrink-0 inline-flex min-w-0 rounded-md"
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 h-9 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                        isActive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Profile Section */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* User Profile Dropdown */}
            <div className="hidden sm:block relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 h-9 px-2 sm:px-3 rounded-full"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <span className="hidden lg:inline text-sm font-medium text-slate-900 truncate max-w-[120px]">Admin User</span>
                <ChevronDown className={cn("w-4 h-4 flex-shrink-0 transition-transform", userDropdownOpen && "rotate-180")} />
              </Button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-none first:rounded-t-md transition-colors",
                          pathname === '/settings' && "bg-slate-50 font-medium"
                        )}
                      >
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        <span>Settings</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-b-md text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={mobileMenuOpen}
              className="md:hidden rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white animate-fadeIn overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="px-2 pt-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors h-11 min-h-[44px] rounded-md",
                        isActive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}

              {/* Mobile User Profile */}
              <div className="pt-4 mt-2 border-t border-slate-200 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
                </div>

                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button
                    variant={pathname === '/settings' ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start flex items-center gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md",
                      pathname === '/settings'
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span>Settings</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className="w-full justify-start flex items-center gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
