import { QUESTS, NPCS } from '../../shared/quests.js';
import { ITEMS, getSkillForItem } from '../../shared/items.js';

export const QUEST_TYPES = {
    KILL: 'KILL',
    COLLECT: 'COLLECT',
    LEVEL: 'LEVEL',
    CRAFT: 'CRAFT',
    REFINE: 'REFINE',
    EQUIP: 'EQUIP',
    TALK: 'TALK',
    OPEN: 'OPEN',
    WORLD_BOSS: 'WORLD_BOSS',
    CRAFT_RUNE: 'CRAFT_RUNE',
    FUSE_RUNE: 'FUSE_RUNE'
};

export class QuestManager {
    constructor(gameManager) {
        this.gm = gameManager;
    }

    /**
     * Initializes quest state for a character if it doesn't exist.
     */
    initQuestState(char) {
        if (!char.state) char.state = {};
        if (!char.state.quests) {
            char.state.quests = {
                active: {},      // { questId: { progress: 0, completed: false } }
                completed: [],   // [questId1, questId2]
                npcTalked: []    // [npcId1, npcId2] (for TALK quests)
            };
        }
    }

    /**
     * Called when a player interacts with an NPC.
     */
    interactWithNPC(char, npcId) {
        this.initQuestState(char);
        const upperNpcId = npcId.toUpperCase();
        
        // Mark NPC as talked to if needed
        if (!char.state.quests.npcTalked.includes(upperNpcId)) {
            char.state.quests.npcTalked.push(upperNpcId);
            this.handleProgress(char, QUEST_TYPES.TALK, { npcId: upperNpcId });
        }

        // Potential for more logic here later (story triggers, etc.)
        return true;
    }

    /**
     * Accepts a quest if requirements are met.
     */
    acceptQuest(char, questId) {
        this.initQuestState(char);
        const quest = QUESTS[questId];

        if (!quest) return { success: false, error: 'Quest not found' };
        if (char.state.quests.active[questId]) return { success: false, error: 'Quest already active' };
        if (char.state.quests.completed.includes(questId)) return { success: false, error: 'Quest already completed' };

        // Initialize progress
        char.state.quests.active[questId] = {
            id: questId,
            npcId: quest.npcId,
            progress: 0,
            completed: false,
            acceptedAt: Date.now()
        };

        // If it's a TALK quest and the goal npcId matches the current npcId (quest.npcId),
        // we can assume they are already talking to them.
        if (quest.type === 'TALK' && quest.goal.npcId === quest.npcId) {
            char.state.quests.active[questId].progress = 1;
        }

        // Immediately check if quest is already "complete" (e.g., Level 10 quest accepted at Level 15)
        this.checkInitialProgress(char, questId);
        
        this.gm.markDirty(char.id);

        return { success: true };
    }

    /**
     * Main hook for progression. Managers (Combat, Activity, etc.) call this.
     */
    handleProgress(char, type, data) {
        this.initQuestState(char);
        const activeQuests = char.state.quests.active;

        for (const [questId, state] of Object.entries(activeQuests)) {
            if (state.completed) continue;

            const quest = QUESTS[questId];
            if (quest.type !== type) continue;

            let progressMade = false;

            switch (type) {
                case QUEST_TYPES.KILL:
                    if (quest.goal.monsterId === data.monsterId) {
                        state.progress += (data.count || 1);
                        progressMade = true;
                    }
                    break;

                case QUEST_TYPES.COLLECT:
                case QUEST_TYPES.CRAFT:
                case QUEST_TYPES.REFINE:
                    if (this.matchesItemGoal(char, quest.goal, data)) {
                        state.progress += (data.count || 1);
                        progressMade = true;
                    }
                    break;

                case QUEST_TYPES.LEVEL:
                    // Data is usually { globalLevel: X } or { skillId: X, level: Y }
                    if (quest.goal.level) {
                        const levelToMatch = data.globalLevel || this.calculateGlobalLevel(char);
                        if (levelToMatch >= quest.goal.level) {
                            state.progress = levelToMatch;
                            progressMade = true;
                        }
                    }
                    break;

                case QUEST_TYPES.TALK:
                    if (quest.goal.npcId === data.npcId) {
                        state.progress = 1;
                        progressMade = true;
                    }
                    break;
                
                case QUEST_TYPES.EQUIP:
                    if (this.matchesEquipGoal(char, quest.goal, data)) {
                        state.progress = 1;
                        progressMade = true;
                    }
                    break;
                
                case QUEST_TYPES.OPEN:
                    if (quest.goal.itemId === data.itemId) {
                        state.progress = 1;
                        progressMade = true;
                    }
                    break;

                case QUEST_TYPES.WORLD_BOSS:
                    state.progress += (data.count || 1);
                    progressMade = true;
                    break;

                case QUEST_TYPES.CRAFT_RUNE:
                    state.progress += (data.count || 1);
                    progressMade = true;
                    break;

                case QUEST_TYPES.FUSE_RUNE:
                    state.progress += (data.count || 1);
                    progressMade = true;
                    break;
            }

            if (progressMade) {
                this.checkCompletion(char, questId);
                this.gm.socket.broadcastToCharacter(char.id, 'quest_progress', { questId, progress: state.progress });
                this.gm.markDirty(char.id);
            }
        }
    }

    /**
     * Checks if a quest is finished and marks it.
     */
    checkCompletion(char, questId) {
        const state = char.state.quests.active[questId];
        const quest = QUESTS[questId];

        let isDone = false;
        if (quest.type === QUEST_TYPES.LEVEL) {
            isDone = state.progress >= quest.goal.level;
        } else if (quest.type === QUEST_TYPES.TALK || quest.type === QUEST_TYPES.EQUIP || quest.type === QUEST_TYPES.OPEN) {
            isDone = state.progress >= 1;
        } else {
            isDone = state.progress >= (quest.goal.count || 1);
        }

        if (isDone && !state.completed) {
            state.completed = true;
            this.gm.socket.broadcastToCharacter(char.id, 'quest_ready_to_claim', { questId });
            // Notification or Log
            this.gm.addNotification(char, {
                type: 'QUEST',
                title: 'Quest Complete!',
                message: `You completed "${quest.title}". Return to the NPC to receive your reward.`,
                rarity: 'RARE'
            });
        }
    }

    /**
     * Claims rewards and moves quest to completed list.
     */
    claimQuestReward(char, questId) {
        const state = char.state.quests.active[questId];
        if (!state || !state.completed) return { success: false, error: 'Quest not completed or not active' };

        const quest = QUESTS[questId];
        
        // 1. Give Silver
        if (quest.rewards.silver) {
            char.state.silver = (char.state.silver || 0) + quest.rewards.silver;
        }

        // 2. Give Items
        if (quest.rewards.items) {
            for (const [itemId, qty] of Object.entries(quest.rewards.items)) {
                this.gm.inventoryManager.addItemToInventory(char, itemId, qty);
            }
        }

        // 3. Give XP (Fixed or Dynamic)
        if (quest.rewards.xp) {
            for (const [skillId, amount] of Object.entries(quest.rewards.xp)) {
                this.gm.addXP(char, skillId, amount);
            }
        }

        // 4. Handle Proficiency XP (Dynamic based on weapon)
        if (quest.rewards.proficiencyXp) {
            const weaponId = char.state.equipment?.weapon;
            const skillId = weaponId ? getSkillForItem(weaponId) : 'COMBAT';
            this.gm.addXP(char, skillId, quest.rewards.proficiencyXp);
        }

        // 5. Handle Class-specific rewards
        if (quest.rewards.useClassXp) {
            const skillId = this.getClassGatherSkill(char);
            this.gm.addXP(char, skillId, quest.rewards.useClassXp);
        }
        if (quest.rewards.useClassRefineXp) {
            const skillId = this.getClassRefineSkill(char);
            this.gm.addXP(char, skillId, quest.rewards.useClassRefineXp);
        }
        if (quest.rewards.useClassCraftXp) {
            const skillId = this.getClassCraftSkill(char);
            this.gm.addXP(char, skillId, quest.rewards.useClassCraftXp);
        }

        // 6. Handle Class-specific item rewards
        if (quest.rewards.useClassItems) {
            const resourceId = this.getClassResource(char);
            this.gm.inventoryManager.addItemToInventory(char, resourceId, quest.rewards.useClassItems);
        }
        if (quest.rewards.useClassRefinedItems) {
            const resourceId = this.getClassRefinedResource(char);
            this.gm.inventoryManager.addItemToInventory(char, resourceId, quest.rewards.useClassRefinedItems);
        }

        // 7. Handle Class-specific equipment rewards
        if (quest.rewards.useClassEquipment) {
            const equipmentIds = this.getClassEquipmentSet(char);
            const npcName = NPCS[quest.npcId]?.name.split(' ')[0] || 'System';
            for (const eqId of equipmentIds) {
                this.gm.inventoryManager.addItemToInventory(char, eqId, 1, { craftedBy: npcName });
            }
        }

        // Finalize
        delete char.state.quests.active[questId];
        char.state.quests.completed.push(questId);
        
        this.gm.markDirty(char.id);

        return { success: true, rewards: quest.rewards };
    }

    // Helper functions
    matchesItemGoal(char, goal, data) {
        const itemId = data.itemId;
        if (goal.itemId === itemId) return true;

        if (goal.anyCombatGear) {
            const item = data.item || ITEMS.GEAR[itemId] || this.gm.inventoryManager.getItemData(itemId);
            const combatTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
            if (item && combatTypes.includes(item.type)) {
                const craftedBy = data.metadata?.craftedBy || item.craftedBy;
                if (goal.onlyCrafted && craftedBy !== char.name) return false;
                return true;
            }
        }
        
        if (goal.useClassResource) {
            const resource = this.getClassResource(char);
            return itemId === resource;
        }
        if (goal.useClassRefined) {
            const resource = this.getClassRefinedResource(char);
            return itemId === resource;
        }
        if (goal.useClassArmor) {
            const armor = this.getClassArmor(char);
            return itemId.startsWith(armor);
        }
        return false;
    }

    matchesEquipGoal(char, goal, data) {
        const itemId = data.itemId;
        if (!itemId) return false;
        
        // Handle if an object was passed instead of an ID string
        const actualId = typeof itemId === 'object' ? itemId.id : itemId;
        if (!actualId) return false;

        if (goal.itemId === actualId) return true;
        if (goal.anyItem && goal.anyItem.includes(actualId)) return true;

        if (goal.anyCombatGear) {
            const item = data.item || this.gm.inventoryManager.getItemData(actualId);
            const combatTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
            if (item && combatTypes.includes(item.type)) {
                if (goal.onlyCrafted && item.craftedBy !== char.name) return false;
                return true;
            }
        }

        if (goal.useClassArmor) {
            const armor = this.getClassArmor(char);
            return actualId.startsWith(armor);
        }

        if (goal.combatRune) {
            return actualId.includes('_RUNE_') && actualId.includes('ATTACK');
        }

        return false;
    }

    checkInitialProgress(char, questId) {
        const quest = QUESTS[questId];
        const state = char.state.quests.active[questId];

        if (quest.type === QUEST_TYPES.LEVEL) {
            const global = this.calculateGlobalLevel(char);
            if (global >= quest.goal.level) {
                state.progress = global;
                this.checkCompletion(char, questId);
            }
        }
        if (quest.type === QUEST_TYPES.TALK) {
            if (char.state.quests.npcTalked.includes(quest.goal.npcId)) {
                state.progress = 1;
                this.checkCompletion(char, questId);
            }
        }
        if (quest.type === QUEST_TYPES.EQUIP) {
            const equip = char.state.equipment;
            if (equip) {
                for (const slotName of Object.keys(equip)) {
                    const equipmentItem = equip[slotName];
                    const eqItemId = typeof equipmentItem === 'object' ? equipmentItem.id : equipmentItem;
                    const eqItemData = typeof equipmentItem === 'object' ? equipmentItem : null;
                    if (equipmentItem && this.matchesEquipGoal(char, quest.goal, { item: eqItemData, itemId: eqItemId })) {
                        state.progress = 1;
                        this.checkCompletion(char, questId);
                        break;
                    }
                }
            }
        }
    }

    calculateGlobalLevel(char) {
        if (!char.state.skills) return 0;
        const levels = Object.values(char.state.skills).map(s => s.level || 1);
        const sum = levels.reduce((a, b) => a + b, 0);
        // Returns "Total Levels Gained" (Sum of all levels - initial level 1 for each skill)
        return Math.max(0, sum - levels.length);
    }

    // Class Logic based on equipped weapon
    getClassResource(char) {
        const weapon = (char.state.equipment?.mainHand?.id || '').toUpperCase();
        const toolAxe = (char.state.equipment?.tool_axe?.id || '').toUpperCase();
        const toolPick = (char.state.equipment?.tool_pickaxe?.id || '').toUpperCase();
        const toolSickle = (char.state.equipment?.tool_sickle?.id || '').toUpperCase();
        const toolKnife = (char.state.equipment?.tool_knife?.id || '').toUpperCase();
        const toolRod = (char.state.equipment?.tool_rod?.id || '').toUpperCase();

        if (weapon.includes('BOW') || toolKnife.includes('KNIFE')) return 'T1_HIDE';
        if (weapon.includes('STAFF') || toolSickle.includes('SICKLE')) return 'T1_FIBER';
        if (weapon.includes('SWORD') || toolPick.includes('PICKAXE')) return 'T1_ORE';
        if (toolAxe.includes('AXE')) return 'T1_WOOD';
        if (toolRod.includes('ROD')) return 'T1_FISH';
        
        return 'T1_ORE'; // Default for Warrior-style start
    }

    getClassRefinedResource(char) {
        const res = this.getClassResource(char);
        if (res === 'T1_HIDE') return 'T1_LEATHER';
        if (res === 'T1_ORE') return 'T1_BAR';
        if (res === 'T1_FIBER') return 'T1_CLOTH';
        return 'T1_PLANK';
    }

    getClassEquipmentSet(char) {
        const weapon = (char.state.equipment?.mainHand?.id || '').toUpperCase();
        if (weapon.includes('BOW')) return ['T1_LEATHER_HELMET', 'T1_LEATHER_BOOTS', 'T1_LEATHER_GLOVES', 'T1_TORCH'];
        if (weapon.includes('STAFF')) return ['T1_CLOTH_HELMET', 'T1_CLOTH_BOOTS', 'T1_CLOTH_GLOVES', 'T1_TOME'];
        return ['T1_PLATE_HELMET', 'T1_PLATE_BOOTS', 'T1_PLATE_GLOVES', 'T1_SHEATH'];
    }

    getClassArmor(char) {
        const weapon = (char.state.equipment?.mainHand?.id || '').toUpperCase();
        if (weapon.includes('BOW')) return 'T1_LEATHER_ARMOR';
        if (weapon.includes('STAFF')) return 'T1_CLOTH_ARMOR';
        return 'T1_PLATE_ARMOR';
    }

    getClassGatherSkill(char) {
        const res = this.getClassResource(char);
        return getSkillForItem(res, 'COLLECT');
    }

    getClassRefineSkill(char) {
        const res = this.getClassRefinedResource(char);
        return getSkillForItem(res, 'REFINE');
    }

    getClassCraftSkill(char) {
        const res = this.getClassArmor(char);
        return getSkillForItem(res, 'CRAFT');
    }
}
