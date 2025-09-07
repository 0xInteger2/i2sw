import fs from 'fs';
import path from 'path';
import { vectorize } from '@neplex/vectorizer';

const inputDir = './png_frames'; // Directory containing PNG images
const outputDir = './output'; // Directory to save SVG files

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to convert a PNG image to SVG
async function convertToSVG(inputPath, outputPath) {
    try {
        const imgBuffer = fs.readFileSync(inputPath);
        const svg = await vectorize(imgBuffer);
        fs.writeFileSync(outputPath, svg);
        console.log(`Converted: ${inputPath} → ${outputPath}`);
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error);
    }
}

// Process all PNG files in the input directory
fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.png'))
    .forEach(file => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file.replace('.png', '.svg'));
        convertToSVG(inputPath, outputPath);
    });
