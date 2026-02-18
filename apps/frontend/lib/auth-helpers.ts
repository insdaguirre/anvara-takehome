const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export type UserRole = 'sponsor' | 'publisher' | null;

export interface RoleData {
  role: UserRole;
  sponsorId?: string;
  publisherId?: string;
  name?: string;
}

interface GetUserRoleOptions {
  throwOnUnavailable?: boolean;
}

/**
 * Fetch user role from the backend based on userId.
 * Returns role info including sponsorId/publisherId if applicable.
 */
export async function getUserRole(
  userId: string,
  options?: GetUserRoleOptions
): Promise<RoleData> {
  const throwOnUnavailable = options?.throwOnUnavailable ?? false;

  try {
    const res = await fetch(`${API_URL}/api/auth/role/${userId}`, {
      cache: 'no-store', // Always fetch fresh role data
    });
    if (!res.ok) {
      if (throwOnUnavailable && res.status >= 500) {
        throw new Error(`Role service error (${res.status})`);
      }
      return { role: null };
    }
    return await res.json();
  } catch (error) {
    if (throwOnUnavailable) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to reach role service');
    }
    return { role: null };
  }
}
