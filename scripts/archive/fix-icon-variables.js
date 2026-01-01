#!/usr/bin/env node

/**
 * Fix variable references to icons (e.g., icon: PlusCircle -> icon: PlusCircleIcon)
 */

import fs from 'fs';

const ICON_MAPPING = {
  'PlusCircle': 'PlusCircleIcon',
  'Banknote': 'BanknoteIcon',
  'Users': 'UsersIcon',
  'UserPlus': 'UserPlusIcon',
  'TrendingDown': 'TrendingDownIcon',
  'TrendingUp': 'TrendingUpIcon',
  'Receipt': 'ReceiptIcon',
  'UserCircle': 'UserIcon', // Map UserCircle to UserIcon
  'Clock': 'CalendarIcon', // Map Clock to CalendarIcon (closest match)
  'InfoIcon': 'InfoIcon',
  'ListIcon': 'ListIcon',
  'ChevronLeftIcon': 'ChevronLeftIcon',
  'MoreHorizontalIcon': 'MoreHorizontalIcon',
  'ChevronDownIcon': 'ChevronDownIcon',
  'ChevronUpIcon': 'ChevronUpIcon',
  'FileIcon': 'FileIcon',
  'CalendarIcon': 'CalendarIcon',
  'UtensilsCrossed': 'UtensilsIcon',
  'Car': 'CarIcon',
  'Home': 'HomeIcon',
  'Tv': 'MonitorIcon',
  'ShoppingBag': 'ShoppingCartIcon',
  'Zap': 'ZapIcon',
  'Heart': 'HeartIcon',
  'GraduationCap': 'BriefcaseIcon', // Closest match
  'MoreHorizontal': 'MoreHorizontalIcon',
  'Edit': 'PencilIcon',
  'Trash2': 'Trash2Icon',
  'Shield': 'AlertCircleIcon', // Closest match
};

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    Object.entries(ICON_MAPPING).forEach(([oldName, newName]) => {
      // Replace variable references (but not in import statements or JSX)
      // Match: icon: OldName, icon = OldName, { icon: OldName }, OldName,
      const patterns = [
        // In object properties: icon: OldName
        new RegExp(`(icon:\\s*)${oldName}\\b`, 'g'),
        // In assignments: icon = OldName
        new RegExp(`(icon\\s*=\\s*)${oldName}\\b`, 'g'),
        // Standalone: OldName, (but not in JSX or imports)
        new RegExp(`\\b${oldName}\\b(?=\\s*[,;}\\)])`, 'g'),
      ];

      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match, prefix = '') => {
            // Don't replace if it's in JSX or import
            const matchIndex = content.indexOf(match);
            const before = content.substring(0, matchIndex);

            // Check if in JSX
            if (before.lastIndexOf('<') > before.lastIndexOf('>')) {
              return match; // In JSX, don't replace
            }

            // Check if in import
            const lastImport = before.lastIndexOf('import');
            const lastFrom = before.lastIndexOf('from');
            if (lastImport !== -1 && lastFrom !== -1 && lastImport < lastFrom) {
              const importSection = content.substring(lastImport, lastFrom);
              if (importSection.includes(oldName)) {
                return match; // In import, don't replace
              }
            }

            return prefix + newName;
          });
          modified = true;
        }
      });
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      return { modified: true };
    }
    return { modified: false };
  } catch (error) {
    return { modified: false, error: error.message };
  }
}

// Get files from command line or find all
const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node fix-icon-variables.js <file1> <file2> ...');
  process.exit(1);
}

let fixed = 0;
files.forEach(file => {
  const result = fixFile(file);
  if (result.modified) {
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  } else if (result.error) {
    console.error(`❌ Error in ${file}: ${result.error}`);
  }
});

console.log(`\n📊 Fixed ${fixed} files`);
