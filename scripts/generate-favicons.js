const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  const sourcePath = path.join(process.cwd(), 'public', 'logo-m.png');
  const trimmed = await sharp(sourcePath).trim().toBuffer();

  async function makeSquareIcon(size, innerRatio = 0.88) {
    const innerSize = Math.round(size * innerRatio);
    const resizedInner = await sharp(trimmed)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    return sharp(resizedInner)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }

  function createIco(entries) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // ICO format
    header.writeUInt16LE(entries.length, 4); // Number of images

    let offset = 6 + 16 * entries.length;
    const dirList = [];
    const bufList = [];

    for (const e of entries) {
      const dir = Buffer.alloc(16);
      dir.writeUInt8(e.width >= 256 ? 0 : e.width, 0);
      dir.writeUInt8(e.height >= 256 ? 0 : e.height, 1);
      dir.writeUInt8(0, 2); // color count
      dir.writeUInt8(0, 3); // reserved
      dir.writeUInt16LE(1, 4); // color planes
      dir.writeUInt16LE(32, 6); // bits per pixel
      dir.writeUInt32LE(e.buffer.length, 8); // image size
      dir.writeUInt32LE(offset, 12); // image offset

      dirList.push(dir);
      bufList.push(e.buffer);
      offset += e.buffer.length;
    }

    return Buffer.concat([header, ...dirList, ...bufList]);
  }

  // Generate PNGs
  const p512 = await makeSquareIcon(512);
  const p192 = await makeSquareIcon(192);
  const p180 = await makeSquareIcon(180);
  const p144 = await makeSquareIcon(144);
  const p96 = await makeSquareIcon(96);
  const p48 = await makeSquareIcon(48);
  const p32 = await makeSquareIcon(32);
  const p16 = await makeSquareIcon(16);

  // Generate real ICO file with 48x48, 32x32, 16x16
  const icoBuffer = createIco([
    { width: 48, height: 48, buffer: p48 },
    { width: 32, height: 32, buffer: p32 },
    { width: 16, height: 16, buffer: p16 },
  ]);

  const targets = [
    // Public directory
    { file: 'public/favicon.ico', data: icoBuffer },
    { file: 'public/icon.png', data: p512 },
    { file: 'public/icon-512.png', data: p512 },
    { file: 'public/icon-192.png', data: p192 },
    { file: 'public/icon-144.png', data: p144 },
    { file: 'public/icon-96.png', data: p96 },
    { file: 'public/icon-48.png', data: p48 },
    { file: 'public/apple-touch-icon.png', data: p180 },
    { file: 'public/favicon-32x32.png', data: p32 },
    { file: 'public/favicon-16x16.png', data: p16 },
    // Also overwrite logo-m.png with perfectly square 512x512 so legacy references are valid
    { file: 'public/logo-m.png', data: p512 },
    // src/app directory (App Router conventions)
    { file: 'src/app/favicon.ico', data: icoBuffer },
    { file: 'src/app/icon.png', data: p512 },
    { file: 'src/app/apple-icon.png', data: p180 },
  ];

  for (const t of targets) {
    const fullPath = path.join(process.cwd(), t.file);
    fs.writeFileSync(fullPath, t.data);
    console.log('Created:', t.file, `(${t.data.length} bytes)`);
  }

  console.log('All standard Google Search and browser favicons generated successfully!');
}

main().catch(console.error);
