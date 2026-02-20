'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/auth-client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    const performLogout = async () => {
      try {
        await authClient.signOut();
      } finally {
        if (isActive) {
          router.replace('/');
        }
      }
    };

    void performLogout();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-[var(--color-muted)]">
      Signing you out...
    </div>
  );
}
