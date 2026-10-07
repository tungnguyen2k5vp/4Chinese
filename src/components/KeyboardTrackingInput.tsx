import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, Platform, TextInput, useWindowDimensions, type ScrollView, type TextInputProps } from 'react-native';

import { compactEditorHeight, editorScrollDelta, keyboardFreeBottom } from '@/services/ui/keyboard-visibility';

/** Four visible lines with native caret scrolling; outer scroll keeps that editor above the keyboard. */
export function KeyboardTrackingInput({ scrollRef, scrollOffset, viewportRevision = 0, style, onFocus, onBlur, onContentSizeChange,
  onSelectionChange, onLayout, ...props }: TextInputProps & {
    scrollRef: RefObject<ScrollView | null>; scrollOffset: RefObject<number>; viewportRevision?: number;
  }) {
  const inputRef = useRef<TextInput>(null);
  const focused = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const frame = useRef<number | null>(null);
  const keyboardFrame = useRef<{ screenX: number; screenY: number; width: number; height: number } | null>(null);
  const dimensions = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const height = Math.min(compactEditorHeight(contentHeight, dimensions.fontScale, dimensions.height),
    availableHeight === null ? Infinity : Math.max(1, availableHeight - 24));
  const reveal = useCallback(() => {
    if (!focused.current) return;
    const ticket = ++generation.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x: number, viewportY: number, _width: number, viewportHeight: number) => {
        inputRef.current?.measureInWindow((inputX, inputY, inputWidth, inputHeight) => {
          if (!alive.current || !focused.current || ticket !== generation.current) return;
          const bottom = keyboardFreeBottom(inputX, inputWidth, viewportY, viewportHeight, keyboardFrame.current);
          setAvailableHeight(Math.max(0, bottom - viewportY));
          const delta = editorScrollDelta(inputY, inputHeight, viewportY, bottom);
          if (Math.abs(delta) > 1) scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: false });
        });
      });
    });
  }, [scrollOffset, scrollRef]);
  useEffect(() => {
    alive.current = true;
    const show = Keyboard.addListener('keyboardDidShow', event => { keyboardFrame.current = event.endCoordinates; reveal(); });
    const change = Keyboard.addListener('keyboardWillChangeFrame', event => { keyboardFrame.current = event.endCoordinates; reveal(); });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardFrame.current = null; setAvailableHeight(null); reveal(); });
    return () => {
      alive.current = false;
      // This is a request token, not a DOM ref: invalidate any pending measurement on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      show.remove(); change.remove(); hide.remove();
    };
  }, [reveal]);
  useEffect(() => { reveal(); }, [dimensions.height, dimensions.width, dimensions.fontScale, height, viewportRevision, reveal]);
  return <TextInput {...props} ref={inputRef} multiline scrollEnabled
    style={[style, { minHeight: 0, height, maxHeight: height }]}
    onFocus={event => { focused.current = true; keyboardFrame.current = Platform.OS === 'web' ? null : Keyboard.metrics() ?? null; onFocus?.(event); reveal(); }}
    onBlur={event => { focused.current = false; generation.current++; onBlur?.(event); }}
    onContentSizeChange={event => { setContentHeight(event.nativeEvent.contentSize.height); onContentSizeChange?.(event); reveal(); }}
    onSelectionChange={event => { onSelectionChange?.(event); reveal(); }}
    onLayout={event => { onLayout?.(event); reveal(); }}
    // Keep Android's adjustResize; iOS gets keyboard avoidance from the owning Screen.
    {...(Platform.OS === 'android' ? { underlineColorAndroid: 'transparent' } : {})}
  />;
}
