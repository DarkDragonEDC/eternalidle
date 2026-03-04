import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BANNER_DIR = path.resolve(__dirname, '../client/public/banner');

async function convertBanners() {
    console.log(`Checking directory: ${BANNER_DIR}`);
    if (!fs.existsSync(BANNER_DIR)) {
        console.error("Banner directory not found!");
        process.exit(1);
    }

    const files = fs.readdirSync(BANNER_DIR);
    const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

    if (pngFiles.length === 0) {
        console.log("No PNG files found to convert.");
        return;
    }

    console.log(`Found ${pngFiles.length} PNG files. Starting conversion...`);

    for (const file of pngFiles) {
        const inputPath = path.join(BANNER_DIR, file);
        const filenameWithoutExt = path.parse(file).name;
        const outputPath = path.join(BANNER_DIR, `${filenameWithoutExt}.webp`);

        try {
            console.log(`Processing: ${file}`);
            await sharp(inputPath)
                .webp({ quality: 80 })
                .toFile(outputPath);

            console.log(`✅ Converted to ${filenameWithoutExt}.webp`);

            // Delete original PNG
            fs.unlinkSync(inputPath);
            console.log(`🗑️ Deleted original ${file}`);
        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err);
        }
    }

    console.log("Conversion complete!");
}

convertBanners();
