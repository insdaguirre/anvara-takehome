export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function formatPrice(n: number): string {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
