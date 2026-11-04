import React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

interface IllustrationProps {
  width?: number;
  height?: number;
  color?: string;
  isDark?: boolean;
}

/**
 * Hero Illustration: A motivating learning journey with a rocket taking off towards stars,
 * symbolizing rapid vocabulary progress and language acquisition.
 */
export function EnglishHeroIllustration({
  width = 160,
  height = 130,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 130" fill="none">
      <Defs>
        <LinearGradient id="heroSky" x1="0" y1="0" x2="160" y2="130" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
        </LinearGradient>
        <LinearGradient id="rocketBody" x1="60" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#2563EB" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>
        <LinearGradient id="rocketFire" x1="75" y1="80" x2="85" y2="115" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="70%" stopColor="#EF4444" />
          <Stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="cloudGrad" x1="0" y1="90" x2="0" y2="130" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.6" />
        </LinearGradient>
      </Defs>

      {/* Orbit Rings & Background aura */}
      <Circle cx="80" cy="65" r="58" fill="url(#heroSky)" />
      <Circle cx="80" cy="65" r="52" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />

      {/* Stars */}
      <Path d="M30 35 L33 42 L40 45 L33 48 L30 55 L27 48 L20 45 L27 42 Z" fill="#FBBF24" />
      <Path d="M135 25 L137 30 L142 32 L137 34 L135 39 L133 34 L128 32 L133 30 Z" fill="#F59E0B" />
      <Circle cx="125" cy="80" r="3" fill="#60A5FA" />
      <Circle cx="35" cy="85" r="2.5" fill="#818CF8" />

      {/* Rocket Exhaust Flame */}
      <Path d="M72 82 Q80 115 80 120 Q80 115 88 82 Z" fill="url(#rocketFire)" />
      <Path d="M75 82 Q80 102 80 106 Q80 102 85 82 Z" fill="#FEF08A" />

      {/* Rocket Body */}
      <G transform="translate(0, -2)">
        {/* Left Wing */}
        <Path d="M66 65 L50 82 L65 78 Z" fill="#1D4ED8" />
        {/* Right Wing */}
        <Path d="M94 65 L110 82 L95 78 Z" fill="#1D4ED8" />
        {/* Main Fuselage */}
        <Path d="M80 18 C70 30 65 55 67 80 L93 80 C95 55 90 30 80 18 Z" fill="url(#rocketBody)" />
        {/* Rocket Tip */}
        <Path d="M80 18 C75 25 73 35 73 40 L87 40 C87 35 85 25 80 18 Z" fill="#EF4444" />
        {/* Porthole */}
        <Circle cx="80" cy="52" r="9" fill="#DBEAFE" stroke="#FFFFFF" strokeWidth="2.5" />
        <Circle cx="80" cy="52" r="6" fill="#3B82F6" />
        <Circle cx="78" cy="50" r="2" fill="#FFFFFF" />
      </G>

      {/* Clouds at bottom */}
      <Path d="M25 125 Q40 105 60 115 Q80 98 100 112 Q120 102 140 125 Z" fill="url(#cloudGrad)" />
    </Svg>
  );
}

/**
 * Empty Decks / Flashcards Illustration:
 * An inviting stack of colorful learning flashcards with a vibrant plus badge.
 */
export function EmptyDecksIllustration({
  width = 140,
  height = 120,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 120" fill="none">
      <Defs>
        <LinearGradient id="deckBack" x1="20" y1="30" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>
        <LinearGradient id="deckMid" x1="30" y1="20" x2="110" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#38BDF8" />
          <Stop offset="100%" stopColor="#0284C7" />
        </LinearGradient>
        <LinearGradient id="deckFront" x1="40" y1="15" x2="120" y2="85" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F1F5F9" />
        </LinearGradient>
      </Defs>

      {/* Card 1 (Bottom) */}
      <Rect x="20" y="35" width="80" height="60" rx="10" transform="rotate(-10 60 65)" fill="url(#deckBack)" opacity="0.6" />

      {/* Card 2 (Middle) */}
      <Rect x="30" y="25" width="80" height="60" rx="10" transform="rotate(6 70 55)" fill="url(#deckMid)" opacity="0.85" />

      {/* Card 3 (Top Front) */}
      <Rect x="32" y="22" width="82" height="64" rx="12" fill="url(#deckFront)" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Content lines on front card */}
      <Rect x="44" y="36" width="36" height="8" rx="4" fill="#2563EB" />
      <Rect x="44" y="50" width="58" height="5" rx="2.5" fill="#94A3B8" />
      <Rect x="44" y="60" width="45" height="5" rx="2.5" fill="#CBD5E1" />

      {/* Floating Sparkles & Star */}
      <Path d="M115 15 L117 21 L123 23 L117 25 L115 31 L113 25 L107 23 L113 21 Z" fill="#F59E0B" />
      <Circle cx="25" cy="20" r="3" fill="#60A5FA" />
      <Circle cx="125" cy="70" r="2.5" fill="#A855F7" />

      {/* Floating Plus Badge */}
      <Circle cx="98" cy="74" r="16" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
      <Path d="M98 66 L98 82 M90 74 L106 74" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Empty Review / All Caught Up Illustration:
 * Celebratory golden shield/trophy indicating the learner has reviewed all due cards!
 */
export function EmptyReviewIllustration({
  width = 140,
  height = 120,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 120" fill="none">
      <Defs>
        <LinearGradient id="trophyGold" x1="45" y1="20" x2="95" y2="85" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="50%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#D97706" />
        </LinearGradient>
        <LinearGradient id="sunAura" x1="70" y1="10" x2="70" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FDE68A" stopOpacity="0.1" />
        </LinearGradient>
      </Defs>

      {/* Radiant Sun/Aura */}
      <Circle cx="70" cy="55" r="45" fill="url(#sunAura)" />
      <Circle cx="70" cy="55" r="38" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      {/* Sparkles */}
      <Path d="M25 40 L27 45 L32 47 L27 49 L25 54 L23 49 L18 47 L23 45 Z" fill="#F59E0B" />
      <Path d="M115 35 L117 40 L122 42 L117 44 L115 49 L113 44 L108 42 L113 40 Z" fill="#10B981" />
      <Circle cx="30" cy="80" r="3" fill="#60A5FA" />
      <Circle cx="112" cy="75" r="3" fill="#8B5CF6" />

      {/* Trophy Body */}
      <Path d="M50 30 H90 V52 C90 64 80 72 70 72 C60 72 50 64 50 52 Z" fill="url(#trophyGold)" />
      {/* Handles */}
      <Path d="M50 36 H40 C36 36 34 44 40 50 L50 52" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M90 36 H100 C104 36 106 44 100 50 L90 52" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Trophy Stem & Base */}
      <Rect x="65" y="72" width="10" height="12" fill="#D97706" />
      <Rect x="54" y="84" width="32" height="10" rx="3" fill="#B45309" />

      {/* Checkmark in Trophy */}
      <Circle cx="70" cy="48" r="14" fill="#FFFFFF" />
      <Path d="M64 48 L68 53 L77 43" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Reader Illustration:
 * An elegant open book with reading glasses and bookmarks.
 */
export function EmptyReaderIllustration({
  width = 140,
  height = 110,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 110" fill="none">
      <Defs>
        <LinearGradient id="bookLeft" x1="20" y1="20" x2="70" y2="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E2E8F0" />
        </LinearGradient>
        <LinearGradient id="bookRight" x1="70" y1="20" x2="120" y2="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#F8FAFC" />
          <Stop offset="100%" stopColor="#CBD5E1" />
        </LinearGradient>
        <LinearGradient id="coverGrad" x1="15" y1="80" x2="125" y2="95" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#0D9488" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
      </Defs>

      {/* Background Aura */}
      <Circle cx="70" cy="50" r="42" fill="#F0FDFA" />

      {/* Book Cover */}
      <Path d="M15 75 Q70 85 125 75 L125 85 Q70 95 15 85 Z" fill="url(#coverGrad)" />

      {/* Left Page */}
      <Path d="M22 28 Q46 22 68 28 L68 76 Q46 70 22 76 Z" fill="url(#bookLeft)" stroke="#CBD5E1" strokeWidth="1" />
      {/* Right Page */}
      <Path d="M72 28 Q94 22 118 28 L118 76 Q94 70 72 76 Z" fill="url(#bookRight)" stroke="#94A3B8" strokeWidth="1" />

      {/* Spine / Book Center */}
      <Path d="M68 28 C70 30 70 74 68 76 C70 74 72 74 72 76 L72 28 Z" fill="#0D9488" />

      {/* Bookmark Ribbon */}
      <Path d="M70 28 L70 52 L75 48 L80 52 L80 28" fill="#EF4444" />

      {/* Text lines */}
      <Rect x="30" y="38" width="28" height="4" rx="2" fill="#0D9488" opacity="0.8" />
      <Rect x="30" y="47" width="24" height="3" rx="1.5" fill="#94A3B8" opacity="0.6" />
      <Rect x="30" y="55" width="26" height="3" rx="1.5" fill="#94A3B8" opacity="0.6" />
      <Rect x="30" y="63" width="18" height="3" rx="1.5" fill="#CBD5E1" />

      <Rect x="82" y="38" width="26" height="4" rx="2" fill="#0D9488" opacity="0.8" />
      <Rect x="82" y="47" width="28" height="3" rx="1.5" fill="#94A3B8" opacity="0.6" />
      <Rect x="82" y="55" width="22" height="3" rx="1.5" fill="#94A3B8" opacity="0.6" />
      <Rect x="82" y="63" width="20" height="3" rx="1.5" fill="#CBD5E1" />

      {/* Sparkles */}
      <Path d="M120 18 L122 23 L127 25 L122 27 L120 32 L118 27 L113 25 L118 23 Z" fill="#F59E0B" />
      <Circle cx="20" cy="22" r="2.5" fill="#14B8A6" />
    </Svg>
  );
}

/**
 * Statistics & Progress Growth Illustration:
 * A thriving seedling with analytics milestone charts.
 */
export function EmptyStatsIllustration({
  width = 140,
  height = 110,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 110" fill="none">
      <Defs>
        <LinearGradient id="plantLeaf" x1="60" y1="20" x2="90" y2="60" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#4ADE80" />
          <Stop offset="100%" stopColor="#16A34A" />
        </LinearGradient>
        <LinearGradient id="potGrad" x1="50" y1="65" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#F97316" />
          <Stop offset="100%" stopColor="#C2410C" />
        </LinearGradient>
      </Defs>

      {/* Analytics Chart Backdrop */}
      <Rect x="20" y="15" width="100" height="65" rx="12" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
      <Path d="M30 65 L50 48 L70 54 L90 32 L110 24" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="50" cy="48" r="3.5" fill="#3B82F6" />
      <Circle cx="90" cy="32" r="3.5" fill="#3B82F6" />
      <Circle cx="110" cy="24" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />

      {/* Plant Pot */}
      <Path d="M52 68 H88 L83 95 H57 Z" fill="url(#potGrad)" />
      <Rect x="49" y="65" width="42" height="6" rx="3" fill="#EA580C" />

      {/* Plant Stem */}
      <Path d="M70 66 Q68 40 70 30" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />

      {/* Leaves */}
      <Path d="M70 42 C82 38 86 28 84 25 C75 25 72 35 70 42 Z" fill="url(#plantLeaf)" />
      <Path d="M70 35 C58 30 54 22 56 19 C65 20 68 28 70 35 Z" fill="#22C55E" />

      {/* Sun Sparkle */}
      <Path d="M118 8 L120 13 L125 15 L120 17 L118 22 L116 17 L111 15 L116 13 Z" fill="#FBBF24" />
    </Svg>
  );
}

/**
 * CEFR Level Mountain Journey Illustration:
 * An inspiring tiered mountain journey symbolizing the A1->C2 English path.
 */
export function CefrJourneyIllustration({
  width = 150,
  height = 110,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 150 110" fill="none">
      <Defs>
        <LinearGradient id="mountain" x1="75" y1="15" x2="75" y2="95" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#4338CA" />
          <Stop offset="100%" stopColor="#1E1B4B" />
        </LinearGradient>
      </Defs>

      {/* Sun / Goal at peak */}
      <Circle cx="115" cy="25" r="16" fill="#FEF08A" />
      <Circle cx="115" cy="25" r="12" fill="#FBBF24" />

      {/* Distant Mountain */}
      <Path d="M15 95 L55 35 L95 95 Z" fill="#6366F1" opacity="0.3" />

      {/* Main Mountain Peak */}
      <Path d="M35 95 L110 20 L145 95 Z" fill="url(#mountain)" />
      {/* Mountain Snow Peak */}
      <Path d="M110 20 L122 45 L114 42 L106 48 L98 42 Z" fill="#EEF2FF" />

      {/* Stepping Stones / Path */}
      <Path d="M30 90 Q60 85 75 75 Q90 65 98 52 Q105 40 110 24" stroke="#F59E0B" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />

      {/* Level Flag at Summit */}
      <Path d="M110 20 V8 M110 8 L124 13 L110 18" stroke="#EF4444" strokeWidth="2" fill="#EF4444" />

      {/* Clouds */}
      <Path d="M10 98 Q30 88 50 95 Q70 88 90 95 Q110 88 140 98 Z" fill="#E0E7FF" opacity="0.8" />
    </Svg>
  );
}

/**
 * Bulk Add Illustration:
 * An import file icon converting bulk text into organized flashcards.
 */
export function BulkAddIllustration({
  width = 130,
  height = 100,
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 130 100" fill="none">
      <Defs>
        <LinearGradient id="docGrad" x1="30" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F1F5F9" />
        </LinearGradient>
      </Defs>

      {/* Backdrop Card */}
      <Rect x="48" y="24" width="60" height="65" rx="8" fill="#93C5FD" opacity="0.6" transform="rotate(8 78 56)" />

      {/* Main Document */}
      <Rect x="26" y="14" width="62" height="74" rx="8" fill="url(#docGrad)" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Document Lines */}
      <Rect x="36" y="26" width="24" height="5" rx="2" fill="#2563EB" />
      <Rect x="36" y="37" width="42" height="4" rx="2" fill="#94A3B8" />
      <Rect x="36" y="46" width="38" height="4" rx="2" fill="#94A3B8" />
      <Rect x="36" y="55" width="40" height="4" rx="2" fill="#94A3B8" />
      <Rect x="36" y="64" width="30" height="4" rx="2" fill="#CBD5E1" />

      {/* Flying Arrow Tag */}
      <Circle cx="88" cy="65" r="16" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
      <Path d="M82 65 L94 65 M89 60 L94 65 L89 70" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Sparkles */}
      <Circle cx="102" cy="22" r="3" fill="#F59E0B" />
      <Circle cx="18" cy="38" r="2.5" fill="#3B82F6" />
    </Svg>
  );
}

/**
 * English Badge:
 * Compact, modern crest badge with "EN" letters.
 */
export function EnglishBadge({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect width="28" height="28" rx="8" fill="#2563EB" />
      <Path
        d="M8 8 H14 M8 14 H13 M8 20 H14 M8 8 V20 M17 20 V8 L23 20 V8"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
