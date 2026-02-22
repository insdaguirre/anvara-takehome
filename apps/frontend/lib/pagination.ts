export function buildPageWindows(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push('ellipsis');
  for (let page = left; page <= right; page += 1) {
    pages.push(page);
  }
  if (right < total - 1) pages.push('ellipsis');

  pages.push(total);
  return pages;
}
