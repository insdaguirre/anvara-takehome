'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authClient } from '@/auth-client';
import GlassSurface from './GlassSurface';

type UserRole = 'sponsor' | 'publisher' | null;

export function Nav() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [role, setRole] = useState<UserRole>(null);

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

  // TODO: Add active link styling using usePathname() from next/navigation
  // The current page's link should be highlighted differently

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
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
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/anvara-logo.avif"
              alt="Anvara logo"
              width={140}
              height={44}
              priority
              className="h-7 w-auto sm:h-8"
            />
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              Marketplace
            </Link>

            {user && role === 'sponsor' && (
              <Link
                href="/dashboard/sponsor"
                className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                My Campaigns
              </Link>
            )}
            {user && role === 'publisher' && (
              <Link
                href="/dashboard/publisher"
                className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                My Ad Slots
              </Link>
            )}

            {isPending ? (
              <span className="text-[var(--color-muted)]">...</span>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--color-muted)]">
                  {user.name} {role && `(${role})`}
                </span>
                <button
                  onClick={async () => {
                    await authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          window.location.href = '/';
                        },
                      },
                    });
                  }}
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
          </div>
        </nav>
      </GlassSurface>
    </header>
  );
}
