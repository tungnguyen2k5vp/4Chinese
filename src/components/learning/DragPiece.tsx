import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Every drag action also has a tap equivalent for screen readers and small screens. */
export function DragPiece({ children, label, disabled = false, onPress, onDrop, style }: {
  children: ReactNode; label: string; disabled?: boolean; onPress: () => void;
  onDrop: (x: number, y: number) => void; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [offset] = useState(() => new Animated.ValueXY()), [dragging, setDragging] = useState(false);
  useEffect(() => () => offset.stopAnimation(), [offset]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, g) => !disabled && (Math.abs(g.dy) > 10 || Math.abs(g.dx) > 10),
    onPanResponderGrant: () => { offset.stopAnimation(); setDragging(true); },
    onPanResponderMove: (_event, g) => offset.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_event, g) => {
      setDragging(false); onDrop(g.moveX, g.moveY);
      if (reduced) offset.setValue({ x: 0, y: 0 });
      else Animated.timing(offset, { toValue: { x: 0, y: 0 }, duration: 140, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => { setDragging(false); offset.setValue({ x: 0, y: 0 }); },
  }), [disabled, offset, onDrop, reduced]);
  return <Animated.View {...pan.panHandlers} style={{ zIndex: dragging ? 20 : 0, transform: offset.getTranslateTransform() }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[style, dragging && { opacity: 0.85 }]}>{children}</Pressable>
  </Animated.View>;
}
