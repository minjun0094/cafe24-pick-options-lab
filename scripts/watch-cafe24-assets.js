#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const cafe24Root = path.join(projectRoot, 'cafe24');
const commonRoot = path.join(cafe24Root, 'common');
const pcSourceRoot = path.join(cafe24Root, 'skin1');
const mobileSourceRoot = path.join(cafe24Root, 'mobile');
const distRoot = path.join(projectRoot, '.cafe24-dist');

const commonMappings = [
  ['pick-options-config.js', 'js/pick-options-config.js'],
  ['pick-options.js', 'js/pick-options.js'],
  ['pick-options.css', 'css/pick-options.css'],
];

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copyFile(source, destination) {
  ensureDirectory(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function copyTree(sourceRoot, destinationRoot) {
  if (!fs.existsSync(sourceRoot)) return;
  fs.readdirSync(sourceRoot, { withFileTypes: true }).forEach(function copyEntry(entry) {
    if (entry.name === '.DS_Store') return;
    const source = path.join(sourceRoot, entry.name);
    const destination = path.join(destinationRoot, entry.name);
    if (entry.isDirectory()) {
      copyTree(source, destination);
    } else if (entry.isFile()) {
      copyFile(source, destination);
    }
  });
}

function syncAll() {
  copyTree(pcSourceRoot, path.join(distRoot, 'skin1'));
  copyTree(mobileSourceRoot, path.join(distRoot, 'mobile'));

  commonMappings.forEach(function copyCommon(mapping) {
    const source = path.join(commonRoot, mapping[0]);
    copyFile(source, path.join(distRoot, 'skin1', mapping[1]));
    copyFile(source, path.join(distRoot, 'mobile', mapping[1]));
  });

  console.log('[cafe24-sync] ready');
}

syncAll();

if (process.argv.includes('--once')) process.exit(0);

let debounceTimer = null;
function scheduleSync() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(function runScheduledSync() {
    try {
      syncAll();
    } catch (error) {
      console.error('[cafe24-sync] failed:', error.message);
    }
  }, 120);
}

[commonRoot, pcSourceRoot, mobileSourceRoot].forEach(function watchSource(sourceRoot) {
  fs.watch(sourceRoot, { recursive: true }, scheduleSync);
});

console.log('[cafe24-sync] watching cafe24/common, cafe24/skin1 and cafe24/mobile');

