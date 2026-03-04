import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const itemsDir = 'c:/Users/Cliente/Desktop/projetinho/Game/eternalidle/client/public/items';

async function convertIcons() {
    const files = fs.readdirSync(itemsDir);
    const pngs = files.filter(f => f.includes('DAMAGE_POTION') && f.endsWith('.png'));

    console.log(`Found ${pngs.length} PNGs to convert...`);

    for (const file of pngs) {
        const inputPath = path.join(itemsDir, file);
        const outputPath = path.join(itemsDir, file.replace('.png', '.webp'));

        try {
            await sharp(inputPath)
                .webp({ quality: 90 })
                .toFile(outputPath);

            console.log(`Converted: ${file} -> ${path.basename(outputPath)}`);

            // Delete original PNG
            fs.unlinkSync(inputPath);
            console.log(`Deleted: ${file}`);
        } catch (err) {
            console.error(`Error converting ${file}:`, err);
        }
    }

    console.log('Conversion complete.');
}

convertIcons();
