'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'sponsor' | 'publisher'>('sponsor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-fill credentials based on selected role
  const email = role === 'sponsor' ? 'sponsor@example.com' : 'publisher@example.com';
  const password = 'password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Use Better Auth signIn.email with proper callbacks
    const { error: signInError } = await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: async (ctx) => {
          // Fetch user role to determine redirect
          try {
            const userId = ctx.data?.user?.id;
            if (userId) {
              const roleRes = await fetch(`${API_URL}/api/auth/role/${userId}`, {
                credentials: 'include',
              });
              const roleData = await roleRes.json();
              if (roleData.role === 'sponsor') {
                router.push('/dashboard/sponsor');
              } else if (roleData.role === 'publisher') {
                router.push('/dashboard/publisher');
              } else {
                router.push('/');
              }
            } else {
              router.push('/');
            }
          } catch {
            router.push('/');
          }
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Login failed');
          setLoading(false);
        },
      }
    );

    // Handle any errors not caught by onError callback
    if (signInError) {
      setError(signInError.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">Login to Anvara</h1>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Quick Login As
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'sponsor' | 'publisher')}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-3 py-2 text-gray-900"
            >
              <option value="sponsor">Sponsor (sponsor@example.com)</option>
              <option value="publisher">Publisher (publisher@example.com)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : `Login as ${role === 'sponsor' ? 'Sponsor' : 'Publisher'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
