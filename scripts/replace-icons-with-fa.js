#!/usr/bin/env node

/**
 * Replace icons in icons.tsx with Font Awesome versions
 */

import fs from 'fs';

const ICONS_FILE = './src/components/ui/icons.tsx';
const GENERATED_FILE = './temp-fontawesome-components.txt';

// Read both files
const iconsContent = fs.readFileSync(ICONS_FILE, 'utf8');
const generatedContent = fs.readFileSync(GENERATED_FILE, 'utf8');

// Extract icon components from generated file
const iconComponents = {};
const iconMatches = generatedContent.matchAll(/export const (\w+): React\.FC<IconProps> = \([\s\S]*?\);/g);

for (const match of iconMatches) {
  const iconName = match[1];
  const fullComponent = match[0];
  iconComponents[iconName] = fullComponent;
}

console.log(`Found ${Object.keys(iconComponents).length} Font Awesome icons to replace\n`);

// Replace each icon in the original file
let updatedContent = iconsContent;
let replacedCount = 0;

Object.entries(iconComponents).forEach(([iconName, newComponent]) => {
  // Pattern to match the entire icon component (from export to closing );
  const pattern = new RegExp(
    `export const ${iconName}: React\\.FC<IconProps> = \\([\\s\\S]*?\\);`,
    'g'
  );

  if (pattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(pattern, newComponent);
    replacedCount++;
    console.log(`✓ Replaced ${iconName}`);
  } else {
    console.log(`⚠️  ${iconName} not found in original file`);
  }
});

// Write updated file
fs.writeFileSync(ICONS_FILE, updatedContent);

console.log(`\n✅ Replaced ${replacedCount} icons with Font Awesome versions`);
console.log(`📝 Updated: ${ICONS_FILE}`);
