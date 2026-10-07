import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { legacySceneByMood, sceneAssets, type LegacyLandscapeMood, type SceneName } from './scene-registry';

import { useTheme } from '@/theme/ThemeProvider';

export type LandscapeMood = LegacyLandscapeMood;

type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentSoft: string;
  ink: string;
  muted: string;
  line: string;
  warm: string;
};

/** Lightweight scene-family artwork. All art is decorative; nearby UI carries meaning. */
export function LearningLandscape({
  mood = 'journey',
  scene,
  height = 132,
}: {
  mood?: LandscapeMood;
  scene?: SceneName;
  height?: number;
}) {
  const theme = useTheme();
  const name = scene ?? legacySceneByMood[mood];
  const asset = sceneAssets[name];
  const dark = theme.mode === 'dark';
  const accent = theme.skillColors[asset.accent];
  const palette: Palette = {
    background: dark ? theme.backgroundSecondary : sceneBackground(name),
    surface: dark ? theme.surface : '#FFFFFF',
    surfaceAlt: dark ? theme.surfaceElevated : '#F5F7FC',
    accent,
    accentSoft: dark ? theme.primarySoft : '#E9EFFF',
    ink: theme.textPrimary,
    muted: theme.textMuted,
    line: dark ? theme.border : '#CBD3E2',
    warm: dark ? '#D8B477' : '#E89A5A',
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { height, backgroundColor: palette.background }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
        <Rect width="360" height="150" fill={palette.background} />
        {asset.composition === 'book-path' ? <LearnScene palette={palette} /> : null}
        {asset.composition === 'target-practice' ? <PracticeScene palette={palette} /> : null}
        {asset.composition === 'reading-desk' ? <ReadScene palette={palette} /> : null}
        {asset.composition === 'headphone-rhythm' ? <ListenScene palette={palette} /> : null}
        {asset.composition === 'microphone-dialogue' ? <SpeakScene palette={palette} /> : null}
        {asset.composition === 'milestone-gate' ? <HskScene palette={palette} /> : null}
        {asset.composition === 'seal-collection' ? <AchievementScene palette={palette} /> : null}
        {asset.composition === 'rising-chart' ? <StatsScene palette={palette} /> : null}
        {asset.composition === 'open-door' ? <WelcomeScene palette={palette} /> : null}
      </Svg>
    </View>
  );
}

function LearnScene({ palette: p }: { palette: Palette }) {
  return <>
    <Circle cx="291" cy="34" r="19" fill={p.warm} opacity="0.82" />
    <Path d="M0 103 Q61 61 121 101 Q176 51 236 96 Q294 60 360 100 V150 H0Z" fill={p.accent} opacity="0.18" />
    <Path d="M0 119 Q67 82 129 119 Q192 83 247 116 Q303 87 360 119 V150 H0Z" fill={p.accent} opacity="0.32" />
    <Path d="M122 150 C150 137 157 122 176 105 C192 91 213 91 233 102 C211 109 205 122 211 134 C217 143 231 147 247 150" fill="none" stroke={p.warm} strokeWidth="7" strokeLinecap="round" />
    <Path d="M57 105 Q83 94 109 105 V128 Q83 118 57 128Z" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Path d="M83 105 V126" stroke={p.accent} strokeWidth="2" />
    <Circle cx="274" cy="112" r="7" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Circle cx="310" cy="104" r="7" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Circle cx="341" cy="114" r="7" fill={p.surface} stroke={p.accent} strokeWidth="3" />
  </>;
}

function PracticeScene({ palette: p }: { palette: Palette }) {
  return <>
    <Circle cx="180" cy="77" r="59" fill={p.accent} opacity="0.08" />
    <Circle cx="180" cy="77" r="43" fill={p.surface} stroke={p.accent} strokeWidth="4" />
    <Circle cx="180" cy="77" r="27" fill={p.accentSoft} stroke={p.accent} strokeWidth="3" />
    <Circle cx="180" cy="77" r="8" fill={p.accent} />
    <Path d="M292 31 L205 67 M276 30 L292 31 L293 47" fill="none" stroke={p.warm} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M37 130 H323" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
    <Circle cx="62" cy="130" r="6" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Circle cx="298" cy="130" r="6" fill={p.surface} stroke={p.accent} strokeWidth="3" />
  </>;
}

function ReadScene({ palette: p }: { palette: Palette }) {
  return <>
    <Path d="M0 84 Q54 56 110 82 T220 79 T360 78" fill="none" stroke={p.accent} strokeWidth="2" opacity="0.22" />
    <Path d="M0 112 H360" stroke={p.line} strokeWidth="2" />
    <Rect x="35" y="110" width="290" height="24" rx="4" fill={p.accent} opacity="0.18" />
    <Path d="M82 45 Q124 34 177 51 V112 Q131 96 82 108Z" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Path d="M177 51 Q226 34 279 45 V108 Q228 96 177 112Z" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Path d="M177 51 V112" stroke={p.line} strokeWidth="2" />
    <Path d="M101 65 H153 M101 76 H153 M101 87 H144 M201 65 H259 M201 76 H259 M201 87 H249" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
    <Path d="M54 39 C62 30 71 30 79 39 M282 34 C291 25 302 25 311 34" fill="none" stroke={p.warm} strokeWidth="3" strokeLinecap="round" />
  </>;
}

function ListenScene({ palette: p }: { palette: Palette }) {
  return <>
    <Circle cx="180" cy="77" r="49" fill={p.accent} opacity="0.12" />
    <Circle cx="180" cy="77" r="32" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Path d="M121 80 V70 C121 38 145 17 180 17 C215 17 239 38 239 70 V80" fill="none" stroke={p.accent} strokeWidth="10" strokeLinecap="round" />
    <Path d="M121 71 C108 69 99 78 99 91 V103 C99 115 108 121 121 117Z M239 71 C252 69 261 78 261 91 V103 C261 115 252 121 239 117Z" fill={p.surface} stroke={p.accent} strokeWidth="4" />
    <Path d="M47 60 Q62 77 47 94 M32 49 Q54 77 32 105 M313 60 Q298 77 313 94 M328 49 Q306 77 328 105" fill="none" stroke={p.warm} strokeWidth="3" strokeLinecap="round" />
    <Circle cx="180" cy="77" r="7" fill={p.accent} />
    <Path d="M180 88 V101" stroke={p.accent} strokeWidth="4" strokeLinecap="round" />
  </>;
}

function SpeakScene({ palette: p }: { palette: Palette }) {
  return <>
    <Circle cx="178" cy="75" r="47" fill={p.accent} opacity="0.1" />
    <Path d="M178 29 C163 29 153 41 153 57 V79 C153 95 163 104 178 104 C193 104 203 95 203 79 V57 C203 41 193 29 178 29Z" fill={p.surface} stroke={p.accent} strokeWidth="4" />
    <Path d="M137 73 V80 C137 105 154 121 178 121 C202 121 219 105 219 80 V73 M178 121 V135 M160 135 H196" fill="none" stroke={p.accent} strokeWidth="4" strokeLinecap="round" />
    <Path d="M66 42 H117 Q125 42 125 50 V69 Q125 77 117 77 H99 L85 89 V77 H66 Q58 77 58 69 V50 Q58 42 66 42Z" fill={p.surface} stroke={p.warm} strokeWidth="3" />
    <Path d="M238 62 H291 Q299 62 299 70 V89 Q299 97 291 97 H278 L264 109 V97 H238 Q230 97 230 89 V70 Q230 62 238 62Z" fill={p.surface} stroke={p.accent} strokeWidth="3" />
    <Path d="M76 59 H107 M248 79 H281" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
  </>;
}

function HskScene({ palette: p }: { palette: Palette }) {
  return <>
    <Path d="M35 124 H325" stroke={p.line} strokeWidth="5" strokeLinecap="round" />
    <Path d="M53 118 V60 Q53 39 74 39 H112 Q133 39 133 60 V118 M227 118 V60 Q227 39 248 39 H286 Q307 39 307 60 V118" fill="none" stroke={p.accent} strokeWidth="6" />
    <Path d="M180 124 C180 107 165 102 165 88 C165 75 180 64 180 49 C180 66 195 75 195 89 C195 103 180 109 180 124Z" fill={p.warm} opacity="0.78" />
    {[0, 1, 2, 3, 4].map((index) => <Circle key={index} cx={82 + index * 49} cy={132 - (index % 2) * 3} r={index === 0 ? 8 : 6} fill={index < 2 ? p.accent : p.surface} stroke={p.accent} strokeWidth="2" />)}
    <Path d="M146 31 H214" stroke={p.line} strokeWidth="2" strokeDasharray="5 7" />
  </>;
}

function AchievementScene({ palette: p }: { palette: Palette }) {
  return <>
    <Rect x="26" y="24" width="308" height="108" rx="15" fill={p.accent} opacity="0.08" stroke={p.accent} strokeWidth="2" />
    <Circle cx="99" cy="77" r="37" fill={p.surface} stroke={p.warm} strokeWidth="4" />
    <Circle cx="99" cy="77" r="25" fill={p.accentSoft} stroke={p.accent} strokeWidth="2" />
    <Path d="M86 78 L96 88 L114 64" fill="none" stroke={p.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M165 54 H281 M165 72 H267 M165 90 H250" stroke={p.line} strokeWidth="5" strokeLinecap="round" />
    <Path d="M71 114 L79 137 L99 124 L119 137 L127 114" fill={p.warm} opacity="0.76" />
    <Rect x="280" y="101" width="34" height="20" rx="3" fill={p.surface} stroke={p.accent} strokeWidth="2" transform="rotate(-8 280 101)" />
  </>;
}

function StatsScene({ palette: p }: { palette: Palette }) {
  return <>
    {[0, 1, 2].map((index) => <Line key={index} x1="44" y1={40 + index * 29} x2="325" y2={40 + index * 29} stroke={p.line} strokeWidth="1.5" strokeDasharray="4 6" />)}
    <Rect x="65" y="86" width="31" height="42" rx="5" fill={p.accent} opacity="0.55" />
    <Rect x="119" y="69" width="31" height="59" rx="5" fill={p.accent} opacity="0.68" />
    <Rect x="173" y="54" width="31" height="74" rx="5" fill={p.accent} opacity="0.8" />
    <Rect x="227" y="36" width="31" height="92" rx="5" fill={p.accent} />
    <Path d="M57 78 L132 61 L185 46 L252 26" fill="none" stroke={p.warm} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M239 26 H253 V40" fill="none" stroke={p.warm} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="57" cy="78" r="5" fill={p.surface} stroke={p.warm} strokeWidth="3" />
    <Circle cx="132" cy="61" r="5" fill={p.surface} stroke={p.warm} strokeWidth="3" />
    <Circle cx="185" cy="46" r="5" fill={p.surface} stroke={p.warm} strokeWidth="3" />
  </>;
}

function WelcomeScene({ palette: p }: { palette: Palette }) {
  return <>
    <Circle cx="288" cy="42" r="23" fill={p.warm} opacity="0.84" />
    <Path d="M82 133 V48 Q82 34 97 34 H167 Q182 34 182 48 V133Z" fill={p.surface} stroke={p.accent} strokeWidth="4" />
    <Path d="M113 133 V78 Q113 67 124 67 H182 V133" fill={p.accentSoft} stroke={p.accent} strokeWidth="3" />
    <Circle cx="167" cy="102" r="3" fill={p.accent} />
    <Path d="M45 134 Q72 117 97 134 M199 134 Q223 116 248 134 M274 134 Q300 118 326 134" fill="none" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
    <Path d="M36 58 C48 47 60 47 72 58 M209 51 C219 41 230 41 240 51" fill="none" stroke={p.warm} strokeWidth="3" strokeLinecap="round" />
  </>;
}

function sceneBackground(scene: SceneName) {
  if (scene === 'practice') return '#E9EDF6';
  if (scene === 'read') return '#F1EDE0';
  if (scene === 'listen') return '#EFEAF8';
  if (scene === 'speak') return '#F1EAF1';
  if (scene === 'hsk') return '#EAF0F4';
  if (scene === 'achievement') return '#F6EFE2';
  if (scene === 'stats') return '#E9EFF5';
  return '#EDF1F7';
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden', width: '100%' } });
