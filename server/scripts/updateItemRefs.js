import fs from 'fs';

const itemsFile = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/shared/items.js';

function updateReferences() {
    console.log('Updating references in items.js...');
    let content = fs.readFileSync(itemsFile, 'utf8');

    // Replace .png' with .webp' and .png" with .webp"
    const updatedContent = content.replace(/\.png'/g, ".webp'").replace(/\.png"/g, '.webp"');

    fs.writeFileSync(itemsFile, updatedContent);
    console.log('References updated.');
}

updateReferences();
