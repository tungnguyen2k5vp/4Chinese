import { describe, expect, it } from 'vitest';

import { resolveModalAnimationType } from '@/services/ui/modal-animation';

describe('modal animation preference', () => {
  it('keeps full motion only when the OS and app allow it', () => {
    expect(resolveModalAnimationType('full', false)).toBe('slide');
    expect(resolveModalAnimationType('full', true)).toBe('fade');
  });
  it('reduces motion and honors the explicit off setting', () => {
    expect(resolveModalAnimationType('reduced', false)).toBe('fade');
    expect(resolveModalAnimationType('off', false)).toBe('none');
    expect(resolveModalAnimationType('off', true)).toBe('none');
  });
});
