import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('StaggeredMenu icon behavior contract', () => {
  it('keeps plus glyph and rotates between 0 and 45 degrees by open state', () => {
    const source = readFileSync(new URL('./StaggeredMenu.jsx', import.meta.url), 'utf8');

    expect(source).toContain('const targetRotate = opening ? 45 : 0;');
    expect(source).toContain('<span ref={iconRef} className="sm-toggle-icon" aria-hidden="true">');
    expect(source).toContain('\n+\n</span>');
    expect(source).not.toContain('{open ? "\\u00d7" : "+"}');
  });
});
