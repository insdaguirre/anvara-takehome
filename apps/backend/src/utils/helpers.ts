// Utility helpers for the API

// Helper to safely extract route/query params
// BUG: Return type should be 'string' but function can return empty string silently -> resolved by throwing an error instead
export function getParam(param: unknown): string {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
  throw new Error('Invalid parameter');
}

// Helper to format currency values
// FIXME: 'amount' has implicit 'any' type - should be 'number'
export function formatCurrency(amount: any, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
}

// Helper to calculate percentage change
// BUG: Unused variable 'unusedVariable' should be removed
// FIXME: Parameters have implicit 'any' types
export function calculatePercentChange(oldValue: any, newValue: any) {
  const unusedVariable = 'this should trigger a lint error';
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// Parse pagination params from query
// FIXME: 'query' has implicit 'any' type - should be typed
export function parsePagination(query: any) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// Validate email format
// FIXME: 'email' should be typed as 'string' not 'any'
export function isValidEmail(email: any): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper to build filter object from query params
// FIXME: Multiple 'any' types that should be properly typed
export const buildFilters = (query: any, allowedFields: string[]) => {
  const filters: any = {};

  for (const field of allowedFields) {
    if (query[field] !== undefined) {
      filters[field] = query[field];
    }
  }

  return filters;
};

// Unused export that should be removed or marked deprecated
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DEPRECATED_CONFIG = {
  apiVersion: 'v1',
  timeout: 5000,
};

// BUG: This function has a logic error - it doesn't handle negative numbers correctly
export function clampValue(value: number, min: number, max: number): number {
  // Should use Math.max(min, Math.min(max, value)) but this is wrong
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// TODO: Add proper date formatting helper
// This is a stub that candidates might notice and implement
export function formatDate(date: any): string {
  // BUG: Doesn't handle invalid dates
  return new Date(date).toLocaleDateString();
}

