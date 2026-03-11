import { getSkillForItem, getLevelRequirement } from '@shared/items';

export const isLocked = (type, item, gameState) => {
  if (!gameState?.state || !item) return false;
  const tier = Number(item.tier) || 1;
  const skillKey = getSkillForItem(item.id, type);
  const userLevel = gameState.state.skills?.[skillKey]?.level || 1;
  const requiredLevel = getLevelRequirement(tier);

  return userLevel < requiredLevel;
};

export const getSafeAmount = (entry) => {
  if (!entry) return 0;
  if (typeof entry === 'number') return entry;
  return entry.amount || 0;
};
