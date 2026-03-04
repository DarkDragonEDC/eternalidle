import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const monstersDir = '../client/public/monsters';

async function convertRuneGuardian() {
    console.log('--- Re-converting Rune Guardian ---');
    const inputPath = path.join(monstersDir, 'rune_guardian.png');
    const outputPath = path.join(monstersDir, 'rune_guardian.webp');

    if (!fs.existsSync(inputPath)) {
        console.error('[ERROR] rune_guardian.png not found');
        return;
    }

    try {
        await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath);
        console.log('[SUCCESS] Re-converted rune_guardian.png to rune_guardian.webp');
    } catch (err) {
        console.error('[ERROR] Failed to convert:', err.message);
    }
}

convertRuneGuardian();
