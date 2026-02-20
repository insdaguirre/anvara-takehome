'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/auth-client';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import GlassSurface from './GlassSurface';
import StaggeredMenu from './StaggeredMenu';
import { ThemeToggle } from './theme-toggle';

type UserRole = 'sponsor' | 'publisher' | null;

export function Nav() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const user = session?.user;
  const [role, setRole] = useState<UserRole>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useBodyScrollLock(isMobileMenuOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: Convert to server component and fetch role server-side
  // Fetch user role from backend when user is logged in
  useEffect(() => {
    if (user?.id) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291'}/api/auth/role/${user.id}`,
        { credentials: 'include' }
      )
        .then((res) => res.json())
        .then((data) => setRole(data.role))
        .catch(() => setRole(null));
    } else {
      setRole(null);
    }
  }, [user?.id]);

  const dashboardLink =
    user && role === 'sponsor'
      ? { href: '/dashboard/sponsor', label: 'My Campaigns' }
      : user && role === 'publisher'
        ? { href: '/dashboard/publisher', label: 'My Ad Slots' }
        : null;

  const menuItems = [
    { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
    { label: 'Marketplace', ariaLabel: 'Browse marketplace listings', link: '/marketplace' },
    ...(dashboardLink
      ? [
          {
            label: dashboardLink.label,
            ariaLabel: `Go to ${dashboardLink.label.toLowerCase()}`,
            link: dashboardLink.href,
          },
        ]
      : []),
    ...(user ? [{ label: 'Logout', ariaLabel: 'Log out of your account', link: '/logout' }] : []),
    ...(!user ? [{ label: 'Login', ariaLabel: 'Go to login page', link: '/login' }] : []),
  ];

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/';
        },
      },
    });
  };

  const getNavLinkClassName = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    if (isActive) {
      return 'nav-link-active';
    }
    return 'nav-link-inactive';
  };

  return (
    <>
      <header className="sticky top-0 z-[70] hidden px-4 pt-4 lg:block">
        <GlassSurface
          width="100%"
          height={72}
          borderRadius={999}
          backgroundOpacity={0.14}
          saturation={1.35}
          brightness={55}
          className="mx-auto max-w-6xl border border-white/15"
        >
          <nav className="flex h-full w-full items-center justify-between px-4 sm:px-5">
            <Link href="/" className="hidden shrink-0 items-center lg:flex">
              <Image
                src="/anvara-logo.avif"
                alt="Anvara logo"
                width={140}
                height={44}
                priority
                className="h-7 w-auto sm:h-8"
              />
            </Link>

            <div className="hidden items-center gap-6 lg:flex">
              <Link
                href="/marketplace"
                className={getNavLinkClassName('/marketplace')}
              >
                Marketplace
              </Link>

              {dashboardLink && (
                <Link
                  href={dashboardLink.href}
                  className={getNavLinkClassName(dashboardLink.href)}
                >
                  {dashboardLink.label}
                </Link>
              )}

              {!mounted || isPending ? (
                <span className="text-[var(--color-muted)]">...</span>
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--color-foreground)]">
                    {user.name} {role && `(${role})`}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-500"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Login
                </Link>
              )}

              <ThemeToggle />
            </div>
          </nav>
        </GlassSurface>
      </header>

      <div className="lg:hidden">
        <div
          aria-hidden="true"
          className="h-[calc(max(1rem,env(safe-area-inset-top))+72px+0.75rem)]"
        />
        <div className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[79]">
          <GlassSurface
            width="100%"
            height={72}
            borderRadius={999}
            backgroundOpacity={0.14}
            saturation={1.35}
            brightness={55}
            className="mx-auto max-w-6xl border border-white/15"
          />
        </div>
        <StaggeredMenu
          className="mobile-fixed-staggered"
          position="right"
          items={menuItems}
          socialItems={[]}
          displaySocials={false}
          displayItemNumbering={false}
          menuButtonColor="var(--color-foreground)"
          openMenuButtonColor="#ffffff"
          changeMenuColorOnOpen={true}
          colors={['#B19EEF', '#5227FF']}
          logoUrl="/anvara-logo.avif"
          accentColor="#5227FF"
          onMenuOpen={() => setIsMobileMenuOpen(true)}
          onMenuClose={() => setIsMobileMenuOpen(false)}
          isFixed
          rightSlot={<ThemeToggle />}
        />
      </div>
    </>
  );
}
