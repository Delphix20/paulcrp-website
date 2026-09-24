import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const icoPath = path.join(repositoryDirectory, 'favicon.ico');
const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map(size =>
  readFile(path.join(repositoryDirectory, 'images', `favicon-${size}.png`))
));

const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const png = images[index];
  if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) {
    throw new Error(`favicon-${size}.png must be ${size} × ${size} pixels`);
  }
  const entry = 6 + index * 16;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}

await writeFile(icoPath, Buffer.concat([header, ...images]));
console.log(`Created ${icoPath}`);
