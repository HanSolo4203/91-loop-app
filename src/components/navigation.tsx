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
  Banknote,
  Receipt,
  FileText,
  BarChart3,
  UserCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { playLogoutChime } from '@/lib/utils/sounds';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Batch', href: '/batch/new', icon: PlusCircle },
  { name: 'Calculator', href: '/calculator', icon: Calculator },
  { name: 'RFID', href: '/dashboard/rfid', icon: Radio },
];

const reportsNav: NavItem[] = [
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Business Plan', href: '/business-plan', icon: FileText },
];

const staffNav: NavItem[] = [
  { name: 'Employees', href: '/staff/employees', icon: Users },
  { name: 'Schedule', href: '/staff/schedule', icon: CalendarDays },
  { name: 'Payroll', href: '/staff/payroll', icon: Banknote },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function isGroupActive(pathname: string, items: NavItem[]) {
  return items.some((item) => isActive(pathname, item.href));
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  useEffect(() => {
    setUserDropdownOpen(false);
    setReportsOpen(false);
    setStaffOpen(false);
  }, [pathname]);

  const closeMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setReportsOpen(false);
    setStaffOpen(false);
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
      await new Promise((resolve) => setTimeout(resolve, 800));
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-2 px-4 py-2.5 text-sm rounded-md transition-colors w-full text-left',
      active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'
    );

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-14 sm:h-16 min-h-14">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
            >
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

          {/* Desktop: grouped nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0" aria-label="Main navigation">
            {/* Primary: Dashboard, New Batch, Calculator, RFID */}
            <div className="flex items-center gap-0.5 bg-slate-100/80 rounded-lg p-0.5">
              {primaryNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link key={item.name} href={item.href} className="flex-shrink-0 rounded-md">
                    <Button
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 px-3 text-sm font-medium rounded-md gap-1.5',
                        active ? 'bg-white shadow-sm text-slate-900 hover:bg-white' : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden lg:inline">{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Reports & Finance dropdown */}
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportsOpen(!reportsOpen)}
                aria-expanded={reportsOpen}
                aria-haspopup="true"
                className={cn(
                  'h-9 px-3 gap-1.5 text-sm font-medium rounded-md',
                  isGroupActive(pathname, reportsNav)
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">Reports & finance</span>
                <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', reportsOpen && 'rotate-180')} />
              </Button>
              {reportsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setReportsOpen(false)} aria-hidden="true" />
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                    {reportsNav.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setReportsOpen(false)}
                        className={linkClass(isActive(pathname, item.href))}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Staff dropdown */}
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStaffOpen(!staffOpen)}
                aria-expanded={staffOpen}
                aria-haspopup="true"
                className={cn(
                  'h-9 px-3 gap-1.5 text-sm font-medium rounded-md',
                  isGroupActive(pathname, staffNav)
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <UserCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">Staff</span>
                <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', staffOpen && 'rotate-180')} />
              </Button>
              {staffOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStaffOpen(false)} aria-hidden="true" />
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                    {staffNav.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setStaffOpen(false)}
                        className={linkClass(isActive(pathname, item.href))}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
                <span className="hidden lg:inline text-sm font-medium text-slate-900 truncate max-w-[120px]">
                  Admin User
                </span>
                <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', userDropdownOpen && 'rotate-180')} />
              </Button>
              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-none first:rounded-t-md transition-colors',
                        pathname === '/settings' && 'bg-slate-50 font-medium'
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
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              aria-expanded={mobileMenuOpen}
              className="md:hidden rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu: grouped with section labels */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white animate-fadeIn overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="px-2 pt-2 pb-4 space-y-6">
              <div>
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Work</p>
                <div className="space-y-0.5">
                  {primaryNav.map((item) => (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button
                        variant={isActive(pathname, item.href) ? 'default' : 'ghost'}
                        className={cn(
                          'w-full justify-start gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md',
                          isActive(pathname, item.href) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Reports & finance</p>
                <div className="space-y-0.5">
                  {reportsNav.map((item) => (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button
                        variant={isActive(pathname, item.href) ? 'default' : 'ghost'}
                        className={cn(
                          'w-full justify-start gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md',
                          isActive(pathname, item.href) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Staff</p>
                <div className="space-y-0.5">
                  {staffNav.map((item) => (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button
                        variant={isActive(pathname, item.href) ? 'default' : 'ghost'}
                        className={cn(
                          'w-full justify-start gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md',
                          isActive(pathname, item.href) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-200 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">Admin User</p>
                </div>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button
                    variant={pathname === '/settings' ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md',
                      pathname === '/settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-3 text-sm font-medium h-11 min-h-[44px] rounded-md text-slate-600 hover:bg-slate-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
