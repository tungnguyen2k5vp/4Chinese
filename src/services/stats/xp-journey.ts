/** Cosmetic recognition only: never interpreted as HSK proficiency or SRS mastery. */
export const xpMilestones = [
  { xp: 0, title: 'Bước đầu', icon: 'leaf-outline' },
  { xp: 500, title: 'Giữ nhịp', icon: 'footsteps-outline' },
  { xp: 2000, title: 'Bền bỉ', icon: 'flame-outline' },
  { xp: 5000, title: 'Vững bước', icon: 'ribbon-outline' },
  { xp: 10000, title: 'Truyền cảm hứng', icon: 'sunny-outline' },
  { xp: 20000, title: 'Hành trình rực rỡ', icon: 'trophy-outline' },
] as const;

export function getXpJourney(total: number, today = 0) {
  const totalXp = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const todayXp = Number.isFinite(today) ? Math.max(0, Math.floor(today)) : 0;
  const level = Math.floor(totalXp / 500) + 1;
  const levelStart = (level - 1) * 500;
  const title = [...xpMilestones].reverse().find(item => totalXp >= item.xp)!;
  const nextTitle = xpMilestones.find(item => item.xp > totalXp) ?? null;
  const dailyTarget = todayXp < 50 ? 50 : todayXp < 100 ? 100 : 200;
  return { totalXp, todayXp, level, title, nextTitle, levelProgress: (totalXp - levelStart) / 500,
    nextLevelXp: level * 500, remainingXp: level * 500 - totalXp,
    dailyTarget, dailyProgress: Math.min(1, todayXp / dailyTarget), dailyDone: todayXp >= 200 };
}
