import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const itemsDir = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/client/public/items';

async function convert() {
    console.log('Starting conversion...');
    const files = fs.readdirSync(itemsDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));

    console.log(`Found ${pngFiles.length} PNG files.`);

    for (const file of pngFiles) {
        const inputPath = path.join(itemsDir, file);
        const outputPath = path.join(itemsDir, file.replace('.png', '.webp'));

        try {
            await sharp(inputPath)
                .webp({ quality: 85 })
                .toFile(outputPath);
            console.log(`Converted: ${file} -> ${file.replace('.png', '.webp')}`);
        } catch (err) {
            console.error(`Error converting ${file}:`, err);
        }
    }

    console.log('Conversion complete.');
}

convert();
