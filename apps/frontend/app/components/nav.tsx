import { headers } from 'next/headers';
import { auth } from '@/auth';
import { getUserRole, type UserRole } from '@/lib/auth-helpers';
import { NavClient } from './nav-client';

export async function Nav() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let role: UserRole = null;

  if (session?.user?.id) {
    const roleData = await getUserRole(session.user.id);
    role = roleData.role;
  }

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
      }
    : null;

  return <NavClient user={user} role={role} />;
}
