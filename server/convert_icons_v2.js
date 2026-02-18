import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const monstersDir = '../client/public/monsters';

const iconsToConvert = [
    { in: 'TUNDRA_BEAR.png', out: 'tundra_bear.webp' },
    { in: 'SKY_WALKER.png', out: 'sky_stalker.webp' },
    { in: 'EXECUTIONER.png', out: 'executioner.webp' },
    { in: 'LAVA_HOUND.png', out: 'lava_hound.webp' },
    { in: 'STORM_WRAITH.png', out: 'storm_wraith.webp' },
    { in: 'RUNE_GUARDIAN.png', out: 'rune_guardian.webp' },
    { in: 'GLACER_GIANT.png', out: 'glacier_giant.webp' },
    { in: 'ABYSSAL_KNIGHT.png', out: 'abyssal_knight.webp' },
    { in: 'VOID_SERPENT.png', out: 'nebula_serpent.webp' },
    { in: 'STAR_DEVOURER.png', out: 'star_devourer.webp' },
    { in: 'COMIC_HORROR.png', out: 'cosmic_horror.webp' },
    { in: 'VOID_REAPER.png', out: 'void_reaper.webp' },
    { in: 'ETERNAL_WATCHER.png', out: 'eternal_watcher.webp' },
    { in: 'X.png', out: 'boss_void_entity.webp' },
    { in: 'Gemini_Generated_Image_dtjre8dtjre8dtjr.png', out: 'galaxy_eater.webp' }
];

async function convertIcons() {
    console.log('--- Starting Monster Icon Conversion Batch 2 ---');

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
