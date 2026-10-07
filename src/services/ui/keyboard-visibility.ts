/** Move only enough to keep the editor inside its measured, keyboard-free viewport. */
export function editorScrollDelta(inputTop: number, inputHeight: number, viewportTop: number,
  viewportBottom: number, gap = 12): number {
  if (![inputTop, inputHeight, viewportTop, viewportBottom, gap].every(Number.isFinite) || inputHeight <= 0 || viewportBottom <= viewportTop) return 0;
  const top = viewportTop + gap;
  const bottom = viewportBottom - gap;
  // On very small/large-font viewports favor the editor's top; internal native caret scrolling remains enabled.
  if (inputHeight > bottom - top) return inputTop - top;
  if (inputTop < top) return inputTop - top;
  if (inputTop + inputHeight > bottom) return inputTop + inputHeight - bottom;
  return 0;
}

export function compactEditorHeight(contentHeight: number, fontScale: number, viewportHeight: number): number {
  const scale = Math.max(1, Number.isFinite(fontScale) ? fontScale : 1);
  const cap = Math.max(72, Math.min(25 * scale * 4 + 32, viewportHeight * 0.38));
  return Math.min(cap, Math.max(Math.min(25 * scale * 4 + 32, cap), Number.isFinite(contentHeight) ? contentHeight : 0));
}

export function keyboardFreeBottom(inputX: number, inputWidth: number, viewportTop: number, viewportHeight: number,
  keyboard: { screenX: number; screenY: number; width: number; height: number } | null): number {
  const bottom = viewportTop + viewportHeight;
  if (!keyboard || ![keyboard.screenX, keyboard.screenY, keyboard.width, keyboard.height].every(Number.isFinite)
    || keyboard.width <= 0 || keyboard.height <= 0) return bottom;
  // Floating keyboards outside this editor's horizontal bounds must not move it.
  if (inputX + inputWidth <= keyboard.screenX || inputX >= keyboard.screenX + keyboard.width
    || keyboard.screenY >= bottom || keyboard.screenY + keyboard.height <= viewportTop) return bottom;
  return Math.max(viewportTop, Math.min(bottom, keyboard.screenY));
}
