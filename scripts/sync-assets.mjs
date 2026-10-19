#!/usr/bin/env node
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(
  root,
  '..',
  'nepal_administrative_map',
  'assets',
  'maps',
  'nepal.topo.json',
);
const destDir = join(root, 'assets', 'maps');
const dest = join(destDir, 'nepal.topo.json');

if (!existsSync(src)) {
  console.error(`Missing Flutter map asset: ${src}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Synced ${dest}`);
