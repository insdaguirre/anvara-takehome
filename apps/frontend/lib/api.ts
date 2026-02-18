// Simple API client
// FIXME: This client has no error response parsing - when API returns { error: "..." },
// we should extract and throw that message instead of generic "API request failed"

// TODO: Add authentication token to requests
// Hint: Include credentials: 'include' for cookie-based auth, or
// add Authorization header for token-based auth

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    let payload: unknown;

    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      const errorMessage = payload.error;
      if (typeof errorMessage === 'string' && errorMessage.length > 0) {
        throw new Error(errorMessage);
      }
    }

    throw new Error('API request failed');
  }

  return res.json();
}

// Campaigns
export const getCampaigns = () => api<any[]>('/api/campaigns');
export const getCampaign = (id: string) => api<any>(`/api/campaigns/${id}`);
export const createCampaign = (data: any) =>
  api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });
// TODO: Add updateCampaign and deleteCampaign functions

// Ad Slots
export const getAdSlots = () => api<any[]>('/api/ad-slots');
export const getAdSlot = (id: string) => api<any>(`/api/ad-slots/${id}`);
export const createAdSlot = (data: any) =>
  api('/api/ad-slots', { method: 'POST', body: JSON.stringify(data) });
// TODO: Add updateAdSlot, deleteAdSlot functions

// Public marketplace routes
export const getMarketplaceAdSlots = () => api<any[]>('/api/marketplace/ad-slots');
export const getMarketplaceAdSlot = (id: string) => api<any>(`/api/marketplace/ad-slots/${id}`);

// Placements
export const getPlacements = () => api<any[]>('/api/placements');
export const createPlacement = (data: any) =>
  api('/api/placements', { method: 'POST', body: JSON.stringify(data) });

// Dashboard
export const getStats = () => api<any>('/api/dashboard/stats');
