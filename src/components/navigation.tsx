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
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Brand */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/rsllogo.png"
                alt="RSL Express"
                width={2364}
                height={297}
                className="h-6 sm:h-7 w-auto object-contain"
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center flex-1 justify-center gap-2 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href} className="flex-1 max-w-[140px]">
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm sm:text-base font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Profile Section */}
          <div className="flex items-center space-x-4">
            {/* User Profile Dropdown */}
            <div className="hidden sm:block relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
              >
                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <span className="hidden lg:inline text-sm font-medium text-slate-900">Admin User</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
              
              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-20">
                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className={cn(
                          "flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100",
                          pathname === '/settings' && "bg-slate-50"
                        )}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <LogOut className="w-4 h-4" />
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
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start flex items-center space-x-3 px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
              
              {/* Mobile User Profile */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Admin User</p>
                  </div>
                </div>
                
                {/* Mobile Settings Button */}
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={pathname === '/settings' ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start flex items-center space-x-3 px-3 py-2 text-sm font-medium transition-colors",
                      pathname === '/settings'
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Button>
                </Link>
                
                {/* Mobile Logout Button */}
                <Button
                  variant="ghost"
                  className="w-full justify-start flex items-center space-x-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
