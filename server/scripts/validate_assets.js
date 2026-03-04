import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ITEMS } from '../../shared/items.js';
import { MONSTERS } from '../../shared/monsters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to public directories relative to script
const PUBLIC_ITEMS_DIR = path.resolve(__dirname, '../../client/public/items');
const PUBLIC_MONSTERS_DIR = path.resolve(__dirname, '../../client/public/monsters');

console.log('--- ASSET VALIDATION START ---');
console.log(`Checking items in: ${PUBLIC_ITEMS_DIR}`);
console.log(`Checking monsters in: ${PUBLIC_MONSTERS_DIR}`);

const missingItems = [];
const missingMonsters = [];

// Helper to recursively check items
const checkItemAssets = (obj) => {
    Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') {
            if (val.id && val.icon) {
                const iconPath = val.icon.startsWith('/') ? val.icon.substring(1) : val.icon;
                const fullPath = path.resolve(__dirname, '../../client/public', iconPath);
                if (!fs.existsSync(fullPath)) {
                    missingItems.push({ id: val.id, name: val.name, icon: val.icon, path: fullPath });
                }
            } else {
                checkItemAssets(val);
            }
        }
    });
};

// Helper to check monster assets
const checkMonsterAssets = () => {
    Object.values(MONSTERS).forEach(tierList => {
        tierList.forEach(monster => {
            if (monster.image) {
                const fullPath = path.join(PUBLIC_MONSTERS_DIR, monster.image);
                if (!fs.existsSync(fullPath)) {
                    missingMonsters.push({ id: monster.id, name: monster.name, image: monster.image, path: fullPath });
                }
            }
        });
    });
};

console.log('\n[1/2] Checking Item Icons...');
checkItemAssets(ITEMS);
if (missingItems.length === 0) {
    console.log('✅ All item icons found!');
} else {
    console.log(`❌ Found ${missingItems.length} missing item icons:`);
    missingItems.forEach(item => {
        console.log(`  - [${item.id}] ${item.name}: ${item.icon}`);
    });
}

console.log('\n[2/2] Checking Monster Images...');
checkMonsterAssets();
if (missingMonsters.length === 0) {
    console.log('✅ All monster images found!');
} else {
    console.log(`❌ Found ${missingMonsters.length} missing monster images:`);
    missingMonsters.forEach(m => {
        console.log(`  - [${m.id}] ${m.name}: ${m.image}`);
    });
}

console.log('\n--- ASSET VALIDATION FINISHED ---');

if (missingItems.length > 0 || missingMonsters.length > 0) {
    process.exit(1);
}
