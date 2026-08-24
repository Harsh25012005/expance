const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ASSETS_DIR = path.resolve(__dirname, '../assets');
const SOURCE_LOGO = path.join(ASSETS_DIR, 'logo.png');

console.log('Loading source logo:', SOURCE_LOGO);
const srcBuf = fs.readFileSync(SOURCE_LOGO);
const src = PNG.sync.read(srcBuf);

console.log(`Source image size: ${src.width}x${src.height}`);

// Step 1: Detect exact bounding box of the non-transparent logo
let minX = src.width, maxX = 0, minY = src.height, maxY = 0;
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const idx = (y * src.width + x) * 4;
    const alpha = src.data[idx + 3];
    if (alpha > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const logoWidth = maxX - minX + 1;
const logoHeight = maxY - minY + 1;
const logoCenterX = (minX + maxX) / 2;
const logoCenterY = (minY + maxY) / 2;

console.log('Logo visual bounds:', {
  minX,
  maxX,
  minY,
  maxY,
  width: logoWidth,
  height: logoHeight,
  centerX: logoCenterX,
  centerY: logoCenterY,
  aspectRatio: (logoWidth / logoHeight).toFixed(4),
});

// Step 2: Bilinear sample with alpha handling
function sampleSource(sx, sy) {
  if (sx < 0 || sx >= src.width - 1 || sy < 0 || sy >= src.height - 1) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = sx - x0;
  const fy = sy - y0;

  const i00 = (y0 * src.width + x0) * 4;
  const i10 = (y0 * src.width + x1) * 4;
  const i01 = (y1 * src.width + x0) * 4;
  const i11 = (y1 * src.width + x1) * 4;

  const a00 = src.data[i00 + 3] / 255;
  const a10 = src.data[i10 + 3] / 255;
  const a01 = src.data[i01 + 3] / 255;
  const a11 = src.data[i11 + 3] / 255;

  const a =
    (1 - fx) * (1 - fy) * a00 +
    fx * (1 - fy) * a10 +
    (1 - fx) * fy * a01 +
    fx * fy * a11;

  const r =
    (1 - fx) * (1 - fy) * src.data[i00] +
    fx * (1 - fy) * src.data[i10] +
    (1 - fx) * fy * src.data[i01] +
    fx * fy * src.data[i11];

  const g =
    (1 - fx) * (1 - fy) * src.data[i00 + 1] +
    fx * (1 - fy) * src.data[i10 + 1] +
    (1 - fx) * fy * src.data[i01 + 1] +
    fx * fy * src.data[i11 + 1];

  const b =
    (1 - fx) * (1 - fy) * src.data[i00 + 2] +
    fx * (1 - fy) * src.data[i10 + 2] +
    (1 - fx) * fy * src.data[i01 + 2] +
    fx * fy * src.data[i11 + 2];

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.min(255, Math.max(0, Math.round(a * 255))),
  };
}

// Step 3: High-quality supersampled canvas renderer
function renderIconCanvas({ size, targetLogoWidth, isSolidWhiteBackground }) {
  const dst = new PNG({ width: size, height: size });
  const scale = targetLogoWidth / logoWidth;
  const dstCX = size / 2;
  const dstCY = size / 2;

  // 3x3 supersampling per pixel for crisp antialiasing
  const SUPERSAMPLE = 3;
  const subStep = 1 / SUPERSAMPLE;

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      let totalA = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const sampleX = dx + (sx + 0.5) * subStep;
          const sampleY = dy + (sy + 0.5) * subStep;

          const srcX = logoCenterX + (sampleX - dstCX) / scale;
          const srcY = logoCenterY + (sampleY - dstCY) / scale;

          const sampled = sampleSource(srcX, srcY);
          totalA += sampled.a;
          totalR += sampled.r;
          totalG += sampled.g;
          totalB += sampled.b;
        }
      }

      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const avgA = totalA / samples;
      const avgR = totalR / samples;
      const avgG = totalG / samples;
      const avgB = totalB / samples;

      const dstIdx = (dy * size + dx) * 4;

      if (isSolidWhiteBackground) {
        // Solid #FFFFFF background compositing
        const alphaNorm = avgA / 255;
        dst.data[dstIdx] = Math.round(avgR * alphaNorm + 255 * (1 - alphaNorm));
        dst.data[dstIdx + 1] = Math.round(avgG * alphaNorm + 255 * (1 - alphaNorm));
        dst.data[dstIdx + 2] = Math.round(avgB * alphaNorm + 255 * (1 - alphaNorm));
        dst.data[dstIdx + 3] = 255; // 100% opaque solid white
      } else {
        // Transparent background with anti-aliased black logo
        dst.data[dstIdx] = Math.round(avgR);
        dst.data[dstIdx + 1] = Math.round(avgG);
        dst.data[dstIdx + 2] = Math.round(avgB);
        dst.data[dstIdx + 3] = Math.round(avgA);
      }
    }
  }
  return dst;
}

// Step 4: Solid pure white background generator
function renderSolidWhite(size) {
  const dst = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size * 4; i += 4) {
    dst.data[i] = 255;
    dst.data[i + 1] = 255;
    dst.data[i + 2] = 255;
    dst.data[i + 3] = 255;
  }
  return dst;
}

// Generate all required assets
// Canvas size: 1024x1024
// Target logo width: 576px (~56.2% canvas width, ~47.3% canvas height, perfectly fitting inside Android 72dp circle/squircle masks with 0 clipping)
const CANVAS_SIZE = 1024;
const TARGET_LOGO_WIDTH = 576;

console.log('\n--- Generating App Assets ---');

// 1. icon.png (iOS and standard launcher: pure solid white #FFFFFF background, centered medium logo)
console.log('Generating assets/icon.png (Solid #FFFFFF background)...');
const iconPng = renderIconCanvas({
  size: CANVAS_SIZE,
  targetLogoWidth: TARGET_LOGO_WIDTH,
  isSolidWhiteBackground: true,
});
fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), PNG.sync.write(iconPng));

// 2. android-icon-foreground.png (Android adaptive foreground: transparent background, centered medium logo)
console.log('Generating assets/android-icon-foreground.png (Transparent background)...');
const androidFgPng = renderIconCanvas({
  size: CANVAS_SIZE,
  targetLogoWidth: TARGET_LOGO_WIDTH,
  isSolidWhiteBackground: false,
});
fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-foreground.png'), PNG.sync.write(androidFgPng));

// 3. android-icon-background.png (Android adaptive background: pure solid #FFFFFF, 100% opaque)
console.log('Generating assets/android-icon-background.png (Solid #FFFFFF)...');
const androidBgPng = renderSolidWhite(CANVAS_SIZE);
fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-background.png'), PNG.sync.write(androidBgPng));

// 4. android-icon-monochrome.png (Android 13+ themed adaptive icon: transparent background, centered medium logo)
console.log('Generating assets/android-icon-monochrome.png (Transparent background)...');
const androidMonoPng = renderIconCanvas({
  size: CANVAS_SIZE,
  targetLogoWidth: TARGET_LOGO_WIDTH,
  isSolidWhiteBackground: false,
});
fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-monochrome.png'), PNG.sync.write(androidMonoPng));

// 5. favicon.png (Web favicon: solid white background with centered logo)
console.log('Generating assets/favicon.png...');
const faviconPng = renderIconCanvas({
  size: CANVAS_SIZE,
  targetLogoWidth: TARGET_LOGO_WIDTH,
  isSolidWhiteBackground: true,
});
fs.writeFileSync(path.join(ASSETS_DIR, 'favicon.png'), PNG.sync.write(faviconPng));

// 6. splash-icon.png (Splash icon: centered logo)
console.log('Generating assets/splash-icon.png...');
const splashPng = renderIconCanvas({
  size: CANVAS_SIZE,
  targetLogoWidth: TARGET_LOGO_WIDTH,
  isSolidWhiteBackground: false,
});
fs.writeFileSync(path.join(ASSETS_DIR, 'splash-icon.png'), PNG.sync.write(splashPng));

console.log('\nAll assets generated successfully!');
