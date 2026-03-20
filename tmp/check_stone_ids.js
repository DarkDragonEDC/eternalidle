
import { resolveItem } from '../shared/items.js';

const testIds = [
    'ENHANCEMENT_STONE_MAGE_OFF_HAND',
    'ENHANCEMENT_STONE_WARRIOR_OFF_HAND',
    'ENHANCEMENT_STONE_HUNTER_OFF_HAND'
];

console.log("Verificando resolução das pedras de off-hand:");
testIds.forEach(id => {
    const item = resolveItem(id);
    if (item) {
        console.log(`✅ [${id}] Resolvido com sucesso: ${item.name}`);
        if (item.icon === '/items/ORB.webp') {
            console.log(`   Ícone correto: ${item.icon}`);
        } else {
            console.log(`   ❌ Ícone incorreto: ${item.icon}`);
        }
    } else {
        console.log(`❌ [${id}] Erro ao resolver item.`);
    }
});
