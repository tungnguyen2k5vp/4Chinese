import { useLocalSearchParams } from "expo-router";

import { ChineseScreen } from "@/components/ChineseScreen";
import { ExamCenterContent } from "@/components/exam/ExamCenterContent";
import type { HskBand } from "@/types/models";

export default function ExamCenter() {
  const { band } = useLocalSearchParams<{ band?: string }>();
  const selected: HskBand = band === "7-9" ? "7-9" : [1, 2, 3, 4, 5, 6].includes(Number(band)) ? Number(band) as HskBand : 1;
  return <ChineseScreen><ExamCenterContent initialBand={selected} /></ChineseScreen>;
}
