import { describe, expect, it } from 'vitest';

import { compactEditorHeight, editorScrollDelta, keyboardFreeBottom } from './keyboard-visibility';

describe('bulk editor visibility geometry', () => {
  it('scrolls a fourth line above the keyboard without moving an already visible editor', () => {
    const delta = editorScrollDelta(440, 132, 100, 500);
    expect(delta).toBe(84);
    expect(editorScrollDelta(440 - delta, 132, 100, 500)).toBe(0);
    expect(editorScrollDelta(170, 132, 100, 500)).toBe(0);
  });
  it('restores an editor above the viewport when revisiting earlier lines, not always to the end', () => {
    const delta = editorScrollDelta(70, 132, 100, 500);
    expect(delta).toBe(-42);
    expect(editorScrollDelta(70 - delta, 132, 100, 500)).toBe(0);
  });
  it('bounds the editor for 100-line paste, large fonts, and a compact resized viewport', () => {
    expect(compactEditorHeight(2600, 1, 600)).toBe(132);
    const compact = compactEditorHeight(5200, 2, 280);
    expect(compact).toBeLessThanOrEqual(280 * 0.38);
    const huge = compactEditorHeight(5200, 2, 900);
    expect(huge).toBe(232);
    expect(editorScrollDelta(300, 232, 100, 290)).toBe(188);
  });
  it('does not jump on detached, zero-size, or corrupt native measurements', () => {
    expect(editorScrollDelta(NaN, 132, 0, 500)).toBe(0);
    expect(editorScrollDelta(300, 0, 0, 500)).toBe(0);
    expect(editorScrollDelta(300, 132, 500, 0)).toBe(0);
  });
  it('caps against actual space above a tall keyboard rather than the full screen', () => {
    const bottom = keyboardFreeBottom(20, 320, 100, 600, { screenX: 0, screenY: 220, width: 360, height: 480 });
    const height = Math.min(compactEditorHeight(2600, 2, 700), bottom - 100 - 24);
    expect(height).toBe(96);
    const delta = editorScrollDelta(400, height, 100, bottom);
    expect(editorScrollDelta(400 - delta, height, 100, bottom)).toBe(0);
  });
  it('does not treat a non-overlapping floating keyboard as a full-width obstruction', () => {
    expect(keyboardFreeBottom(20, 300, 100, 600, { screenX: 500, screenY: 350, width: 250, height: 250 })).toBe(700);
    expect(keyboardFreeBottom(500, 200, 100, 600, { screenX: 500, screenY: 350, width: 250, height: 250 })).toBe(350);
  });
});
