import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ITEM_LOOKUP, resolveItem } from '../../shared/items.js';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function elevate() {
    const charName = '<EternoDev>';
    console.log(`Elevating ${charName} to endgame...`);

    const { data: char, error: findError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', charName)
        .maybeSingle();

    if (findError || !char) {
        console.error('Character not found:', findError || 'No character');
        return;
    }

    // 1. Max Skills
    const skills = {};
    const skillKeys = [
        'LUMBERJACK', 'ORE_MINER', 'ANIMAL_SKINNER', 'FIBER_HARVESTER',
        'PLANK_REFINER', 'METAL_BAR_REFINER', 'LEATHER_REFINER', 'CLOTH_REFINER',
        'WARRIOR_CRAFTER', 'MAGE_CRAFTER', 'TOOL_CRAFTER', 'COMBAT',
        'FISHING', 'COOKING', 'DUNGEONEERING', 'HERBALISM', 'DISTILLATION', 'ALCHEMY',
        'SWORD_MASTERY', 'BOW_MASTERY', 'FIRE_STAFF_MASTERY', 'RUNE'
    ];
    skillKeys.forEach(k => {
        skills[k] = { level: 100, xp: 0, nextLevelXp: Infinity };
    });

    // 2. Endgame Equipment (Signed by EternoDev)
    const signature = 'EternoDev';
    const equip = char.state.equipment || {};

    const endgameItems = {
        mainHand: 'T10_SWORD_Q4',
        offHand: 'T10_SHEATH_Q4',
        chest: 'T10_PLATE_ARMOR_Q4',
        helmet: 'T10_PLATE_HELMET_Q4',
        boots: 'T10_PLATE_BOOTS_Q4',
        gloves: 'T10_PLATE_GLOVES_Q4',
        cape: 'T10_PLATE_CAPE_Q4',
        tool_axe: 'T10_AXE_Q4',
        tool_pickaxe: 'T10_PICKAXE_Q4',
        tool_knife: 'T10_SKINNING_KNIFE_Q4',
        tool_sickle: 'T10_SICKLE_Q4',
        tool_rod: 'T10_FISHING_ROD_Q4',
        tool_pouch: 'T10_POUCH_Q4'
    };

    for (const [slot, baseId] of Object.entries(endgameItems)) {
        const fullId = `${baseId}::${signature}`;
        const itemData = resolveItem(fullId);
        if (itemData) {
            equip[slot] = itemData;
        } else {
            console.warn(`Could not resolve endgame item: ${fullId}`);
        }
    }

    // 3. Best Runes (T10 3-star)
    // Format: T10_RUNE_{ACT}_{EFF}_3STAR
    const actEffMap = {
        WOOD: 'XP', WOOD_COPY: 'COPY', WOOD_SPEED: 'SPEED',
        ORE: 'XP', ORE_COPY: 'COPY', ORE_SPEED: 'SPEED',
        HIDE: 'XP', HIDE_COPY: 'COPY', HIDE_SPEED: 'SPEED',
        FIBER: 'XP', FIBER_COPY: 'COPY', FIBER_SPEED: 'SPEED',
        HERB: 'XP', HERB_COPY: 'COPY', HERB_SPEED: 'SPEED',
        FISH: 'XP', FISH_COPY: 'COPY', FISH_SPEED: 'SPEED',
        METAL: 'XP', METAL_COPY: 'COPY', METAL_EFF: 'EFF',
        PLANK: 'XP', PLANK_COPY: 'COPY', PLANK_EFF: 'EFF',
        LEATHER: 'XP', LEATHER_COPY: 'COPY', LEATHER_EFF: 'EFF',
        CLOTH: 'XP', CLOTH_COPY: 'COPY', CLOTH_EFF: 'EFF',
        EXTRACT: 'XP', EXTRACT_COPY: 'COPY', EXTRACT_EFF: 'EFF',
        WARRIOR: 'XP', WARRIOR_COPY: 'COPY', WARRIOR_EFF: 'EFF',
        HUNTER: 'XP', HUNTER_COPY: 'COPY', HUNTER_EFF: 'EFF',
        MAGE: 'XP', MAGE_COPY: 'COPY', MAGE_EFF: 'EFF',
        TOOLS: 'XP', TOOLS_COPY: 'COPY', TOOLS_EFF: 'EFF',
        COOKING: 'XP', COOKING_COPY: 'COPY', COOKING_EFF: 'EFF',
        ALCHEMY: 'XP', ALCHEMY_COPY: 'COPY', ALCHEMY_EFF: 'EFF',
        ATTACK: 'ATTACK', ATTACK_SAVE_FOOD: 'SAVE_FOOD'
    };

    for (const [actInfo, eff] of Object.entries(actEffMap)) {
        // ACT format from shared/items.js
        // WOOD_XP -> rune_WOOD_XP
        // ATTACK_ATTACK -> rune_ATTACK_ATTACK
        const act = actInfo.includes('_') ? actInfo.split('_')[0] : actInfo;
        const runeId = `T10_RUNE_${act}_${eff}_3STAR`;
        const runeData = resolveItem(runeId);
        if (runeData) {
            equip[`rune_${act}_${eff}`] = runeData;
        }
    }

    // 4. Update State
    const newState = {
        ...char.state,
        skills,
        equipment: equip,
        silver: (char.state.silver || 0) + 1000000000, // 1B Silver
        crowns: (char.state.crowns || 0) + 1000000 // 1M Orbs
    };

    const { error: updateError } = await supabase
        .from('characters')
        .update({
            skills: skills,
            state: newState
        })
        .eq('id', char.id);

    if (updateError) {
        console.error('Update error:', updateError);
    } else {
        console.log('EternoDev elevated successfully!');
    }
}

elevate();
