export const mapTabCategoryToSkill = (tab, category) => {
  const maps = {
    gathering: {
      WOOD: 'LUMBERJACK',
      ORE: 'ORE_MINER',
      HIDE: 'ANIMAL_SKINNER',
      FIBER: 'FIBER_HARVESTER',
      FISH: 'FISHING',
      HERB: 'HERBALISM'
    },
    refining: {
      PLANK: 'PLANK_REFINER',
      BAR: 'METAL_BAR_REFINER',
      LEATHER: 'LEATHER_REFINER',
      CLOTH: 'CLOTH_REFINER',
      EXTRACT: 'DISTILLATION'
    },
    crafting: {
      WARRIORS_FORGE: 'WARRIOR_CRAFTER',
      HUNTERS_LODGE: 'HUNTER_CRAFTER',
      MAGES_TOWER: 'MAGE_CRAFTER',
      COOKING_STATION: 'COOKING',
      ALCHEMY_LAB: 'ALCHEMY',
      TOOLMAKER: 'TOOL_CRAFTER'
    },
    combat: {
      COMBAT: 'COMBAT'
    },
    merging: {
      RUNE: 'RUNE'
    },
    dungeon: {
      DUNGEONEERING: 'DUNGEONEERING'
    }
  };
  return maps[tab.toLowerCase()]?.[category.toUpperCase()];
};
