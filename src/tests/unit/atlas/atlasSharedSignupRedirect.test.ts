import { describe, expect, it } from 'vitest';
import { getAuthEmailRedirect } from '@/lib/authFlow';
describe('Shared page registration confirmation destination', () => {
  it('preserves the opaque viewer route after account email confirmation', () => {
    expect(getAuthEmailRedirect('https://example.test', '/shared/pages/11111111-1111-4111-8111-111111111111')).toBe('https://example.test/shared/pages/11111111-1111-4111-8111-111111111111');
  });
  it('keeps old signup defaults and rejects off-site destinations', () => {
    for (const value of [undefined, 'https://evil.test/', '//evil.test/', '/\\evil.test/', '/%2F%2Fevil.test/']) {
      expect(getAuthEmailRedirect('https://example.test', value)).toBe('https://example.test/');
    }
  });
});
