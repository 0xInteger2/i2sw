import fs from "fs";
import path from "path";
import { optimize } from "svgo";

const framesDir = "./svgs";
const outputFile = "animation_optimized.svg";
const frameRate = 10;

const files = fs
  .readdirSync(framesDir)
  .filter((f) => f.endsWith(".svg"))
  .sort((a, b) => {
    const getNum = (name) => parseInt(name.match(/\d+/)?.[0] || 0);
    return getNum(a) - getNum(b);
  });

const numFrames = files.length;
const dur = (numFrames / frameRate).toFixed(3);

// Extract and optimize paths for each frame
const symbols = files.map((file, idx) => {
  const content = fs.readFileSync(path.join(framesDir, file), "utf8");
  // Remove outer <svg>, keep only inner content
  const inner = content.replace(/<\/*svg[^>]*>/g, "");
  // Optimize using SVGO
  const optimized = optimize(`<svg>${inner}</svg>`, { multipass: true }).data;
  // Extract inner <svg> content again
  const innerOptimized = optimized.replace(/<\/*svg[^>]*>/g, "");
  return `<symbol id="frame${idx}">${innerOptimized}</symbol>`;
});

// Single <use> element with SMIL
const useElement = `<use id="animFrame" href="#frame0"/>`;
const values = Array.from(
  { length: numFrames },
  (_, idx) => `#frame${idx}`
).join(";");
const animateTag = `<animate xlink:href="#animFrame" attributeName="href" values="${values}" dur="${dur}s" repeatCount="indefinite"/>`;

// Combine optimized SVG
const finalSvg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    ${symbols.join("\n")}
  </defs>
  ${useElement}
  ${animateTag}
</svg>
`;

fs.writeFileSync(outputFile, finalSvg);
console.log("Optimized sequential SMIL SVG animation generated:", outputFile);
