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

mkdirSync(destDir, { recursive: true });

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log(`Synced ${dest}`);
} else if (existsSync(dest)) {
  console.log(`Flutter asset missing; keeping existing ${dest}`);
} else {
  console.error(
    `Missing map asset. Expected either:\n  ${src}\n  or ${dest}`,
  );
  process.exit(1);
}
