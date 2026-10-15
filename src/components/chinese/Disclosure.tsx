import { useState, type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export function Disclosure({ title, children, initiallyOpen = false }: PropsWithChildren<{ title: string; initiallyOpen?: boolean }>) {
  const [open, setOpen] = useState(initiallyOpen);
  const theme = useTheme();
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
      <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 17, fontWeight: "700" }}>{title}</Text><Text style={{ color: theme.primaryText }}>{open ? "⌃" : "⌄"}</Text>
    </Pressable>
    {open ? children : null}
  </View>;
}
