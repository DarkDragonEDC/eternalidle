import { ITEMS } from '../../shared/items.js';
import fs from 'fs';
import path from 'path';

const results = [];

function traverse(obj, category = '') {
    if (!obj || typeof obj !== 'object') return;

    if (obj.id && obj.name) {
        // It's an item
        if (!obj.icon || obj.icon === '' || obj.icon === '/items/placeholder.webp' || obj.icon.includes('placeholder')) {
            results.push({
                category: category,
                id: obj.id,
                name: obj.name,
                tier: obj.tier || 'N/A',
                type: obj.type || 'N/A',
                currentIcon: obj.icon || 'NONE'
            });
        }
        return;
    }

    for (const [key, value] of Object.entries(obj)) {
        const newCategory = category ? `${category} > ${key}` : key;
        traverse(value, newCategory);
    }
}

console.log('Analyzing items for missing icons...');
traverse(ITEMS);

const csvHeader = 'Category,ID,Name,Tier,Type,CurrentIcon\n';
const csvRows = results.map(r => `"${r.category}","${r.id}","${r.name}","${r.tier}","${r.type}","${r.currentIcon}"`).join('\n');
const csvContent = csvHeader + csvRows;

const outputPath = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/items_missing_icons.csv';
fs.writeFileSync(outputPath, csvContent);

console.log(`Found ${results.length} items without icons.`);
console.log(`CSV report saved to: ${outputPath}`);
