import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const monstersDir = '../client/public/monsters';

const iconsToConvert = [
    { in: 'ASH_GHOUL.png', out: 'ash_ghoul.webp' },
    { in: 'BANDIT_THUG.png', out: 'bandit_thug.webp' },
    { in: 'CORRUPTED_PALADIN.png', out: 'corrupted_paladin.webp' },
    { in: 'CRIMSON_BAT.png', out: 'crimson_bat.webp' },
    { in: 'FOX.png', out: 'fox.webp' },
    { in: 'GIANT_AEGLE.png', out: 'giant_eagle.webp' },
    { in: 'HARPY.png', out: 'harpy.webp' },
    { in: 'HIGHLAND_COW.png', out: 'highland_cow.webp' },
    { in: 'MOUNTAIN_GOAT.png', out: 'mountain_goat.webp' },
    { in: 'ROGUE_KNOGHT.png', out: 'rogue_knight.webp' },
    { in: 'SNAKE.png', out: 'snake.webp' },
    { in: 'SNOW_LEOPARD.png', out: 'snow_leopard.webp' },
    { in: 'STAG.png', out: 'stag.webp' },
    { in: 'SWAMP_TROC.png', out: 'swamp_troc.webp' },
    { in: 'WILD_HOG.png', out: 'wild_hog.webp' }
];

async function convertIcons() {
    console.log('--- Starting Monster Icon Conversion ---');

    for (const icon of iconsToConvert) {
        const inputPath = path.join(monstersDir, icon.in);
        const outputPath = path.join(monstersDir, icon.out);

        if (!fs.existsSync(inputPath)) {
            console.warn(`[WARN] Input file not found: ${icon.in}`);
            continue;
        }

        try {
            await sharp(inputPath)
                .webp({ quality: 80 })
                .toFile(outputPath);
            console.log(`[SUCCESS] Converted ${icon.in} to ${icon.out}`);
        } catch (err) {
            console.error(`[ERROR] Failed to convert ${icon.in}:`, err.message);
        }
    }

    console.log('--- Conversion Finished ---');
}

convertIcons();
