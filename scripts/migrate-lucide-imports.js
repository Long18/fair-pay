#!/usr/bin/env node

/**
 * Migrate lucide-react imports to @/components/ui/icons
 *
 * Maps lucide-react icon names to our icon component names
 * and updates both imports and JSX usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon name mapping: lucide-react name -> our icon component name
const ICON_MAPPING = {
  // Core icons
  'Search': 'SearchIcon',
  'User': 'UserIcon',
  'UserIcon': 'UserIcon',
  'LogOut': 'LogOutIcon',
  'LogOutIcon': 'LogOutIcon',
  'Settings': 'SettingsIcon',
  'Heart': 'HeartIcon',
  'Bell': 'BellIcon',
  'Plus': 'PlusIcon',
  'X': 'XIcon',
  'Check': 'CheckIcon',
  'CheckIcon': 'CheckIcon',
  'ChevronLeft': 'ChevronLeftIcon',
  'ChevronRight': 'ChevronRightIcon',
  'ChevronRightIcon': 'ChevronRightIcon',
  'ChevronUp': 'ChevronUpIcon',
  'ChevronDown': 'ChevronDownIcon',
  'ChevronsUpDown': 'ChevronsUpDownIcon',
  'ChevronsLeft': 'ChevronsLeftIcon',
  'ChevronsRight': 'ChevronsRightIcon',
  'Circle': 'CircleIcon',
  'CircleIcon': 'CircleIcon',
  'Minus': 'MinusIcon',
  'MoreVertical': 'MoreVerticalIcon',
  'MoreHorizontal': 'MoreHorizontalIcon',
  'Loader2': 'Loader2Icon',
  'Eye': 'EyeIcon',
  'EyeOff': 'EyeOffIcon',
  'Pencil': 'PencilIcon',
  'Trash': 'TrashIcon',
  'Trash2': 'Trash2Icon',
  'RefreshCcw': 'RefreshCcwIcon',
  'RefreshCw': 'RefreshCwIcon',
  'List': 'ListIcon',
  'Copy': 'CopyIcon',
  'ArrowLeft': 'ArrowLeftIcon',
  'ArrowRight': 'ArrowRightIcon',
  'ArrowUp': 'ArrowUpIcon',
  'ArrowDown': 'ArrowDownIcon',
  'ArrowUpRight': 'ArrowUpRightIcon',
  'ArrowUpDown': 'ArrowUpDownIcon',
  'TrendingUp': 'TrendingUpIcon',
  'TrendingDown': 'TrendingDownIcon',
  'Wallet': 'WalletIcon',
  'CreditCard': 'CreditCardIcon',
  'Receipt': 'ReceiptIcon',
  'Banknote': 'BanknoteIcon',
  'HandCoins': 'HandCoinsIcon',
  'Users': 'UsersIcon',
  'Users2': 'Users2Icon',
  'UserPlus': 'UserPlusIcon',
  'UserMinus': 'UserMinusIcon',
  'Calendar': 'CalendarIcon',
  'Repeat': 'RepeatIcon',
  'Upload': 'UploadIcon',
  'Download': 'DownloadIcon',
  'Image': 'ImageIcon',
  'File': 'FileIcon',
  'FileImage': 'FileImageIcon',
  'FilePlus': 'FilePlusIcon',
  'Info': 'InfoIcon',
  'AlertCircle': 'AlertCircleIcon',
  'AlertTriangle': 'AlertTriangleIcon',
  'CheckCircle2': 'CheckCircle2Icon',
  'XCircle': 'XCircleIcon',
  'PlusCircle': 'PlusCircleIcon',
  'Percent': 'PercentIcon',
  'DollarSign': 'DollarSignIcon',
  'Sun': 'SunIcon',
  'Moon': 'MoonIcon',
  'Monitor': 'MonitorIcon',
  'Globe': 'GlobeIcon',
  'Activity': 'ActivityIcon',
  'Filter': 'FilterIcon',
  'ListFilter': 'ListFilterIcon',
  'GripVertical': 'GripVerticalIcon',
  'PanelLeft': 'PanelLeftIcon',
  'Pause': 'PauseIcon',
  'Play': 'PlayIcon',
  'Zap': 'ZapIcon',
  'HelpCircle': 'HelpCircleIcon',
  'ShoppingCart': 'ShoppingCartIcon',
  'Utensils': 'UtensilsIcon',
  'Car': 'CarIcon',
  'Briefcase': 'BriefcaseIcon',
  'Coffee': 'CoffeeIcon',
  'Home': 'HomeIcon',
};

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file imports from lucide-react
    if (!content.includes("from 'lucide-react'") && !content.includes('from "lucide-react"')) {
      return { modified: false, skipped: true };
    }

    // Extract lucide-react imports
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]lucide-react['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Named imports: { Icon1, Icon2 }
        const iconNames = match[1]
          .split(',')
          .map(name => name.trim())
          .filter(Boolean);
        imports.push(...iconNames);
      } else if (match[2]) {
        // Default import (shouldn't happen, but handle it)
        imports.push(match[2]);
      }
    }

    if (imports.length === 0) {
      return { modified: false, skipped: true };
    }

    // Map to our icon names
    const mappedIcons = imports
      .map(icon => {
        const cleanIcon = icon.trim();
        const mapped = ICON_MAPPING[cleanIcon] || null;
        return { original: cleanIcon, mapped };
      })
      .filter(item => item.mapped !== null);

    if (mappedIcons.length === 0) {
      return { modified: false, skipped: true, reason: 'No mappable icons' };
    }

    // Replace imports
    const newImports = mappedIcons.map(item => item.mapped).join(', ');
    const newImportLine = `import { ${newImports} } from "@/components/ui/icons";`;

    // Remove old lucide-react import line
    content = content.replace(
      /import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"]lucide-react['"];?\s*\n?/g,
      ''
    );

    // Add new import (try to add after other imports)
    const lastImportMatch = content.match(/^import\s+.*from\s+['"].*['"];?\s*$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      content = content.slice(0, insertIndex) + '\n' + newImportLine + content.slice(insertIndex);
    } else {
      // No imports found, add at the top
      content = newImportLine + '\n' + content;
    }

    // Replace JSX usage: <IconName /> -> <MappedIconName />
    // Also replace variable references: icon: IconName -> icon: MappedIconName
    mappedIcons.forEach(({ original, mapped }) => {
      // Replace self-closing: <IconName />
      const selfClosingRegex = new RegExp(`<${original}\\s*/>`, 'g');
      content = content.replace(selfClosingRegex, `<${mapped} />`);

      // Replace opening: <IconName
      const openingRegex = new RegExp(`<${original}(\\s|>)`, 'g');
      content = content.replace(openingRegex, `<${mapped}$1`);

      // Replace closing: </IconName>
      const closingRegex = new RegExp(`</${original}>`, 'g');
      content = content.replace(closingRegex, `</${mapped}>`);

      // Replace variable references (standalone icon names used as values)
      // Match patterns like: icon: IconName, icon = IconName, { icon: IconName }, etc.
      // Use word boundaries to avoid partial matches
      const variableRegex = new RegExp(`\\b${original}\\b`, 'g');
      content = content.replace(variableRegex, (match, offset) => {
        // Check if this is in an import statement
        const beforeMatch = content.substring(0, offset);
        const lastImportIndex = beforeMatch.lastIndexOf('import');
        const lastFromIndex = beforeMatch.lastIndexOf('from');

        // If we're in an import statement (between import and from), don't replace
        if (lastImportIndex !== -1 && lastFromIndex !== -1 && lastImportIndex < lastFromIndex) {
          // Check if we're between import and from
          const importToFrom = content.substring(lastImportIndex, lastFromIndex);
          if (importToFrom.includes(match)) {
            return match; // Don't replace in import
          }
        }

        // Check if already replaced (starts with mapped name)
        const afterMatch = content.substring(offset);
        if (afterMatch.startsWith(mapped)) {
          return match; // Already replaced
        }

        return mapped;
      });
    });

    // Write file
    fs.writeFileSync(filePath, content);

    return {
      modified: true,
      icons: mappedIcons.map(i => `${i.original} -> ${i.mapped}`)
    };
  } catch (error) {
    return { modified: false, error: error.message };
  }
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function main() {
  const args = process.argv.slice(2);
  const targetFiles = args.length > 0 ? args : null;

  let files;
  if (targetFiles) {
    files = targetFiles;
  } else {
    const srcDir = path.join(__dirname, '..', 'src');
    files = findFiles(srcDir);
  }

  console.log(`🔍 Found ${files.length} files to check\n`);

  let modifiedCount = 0;
  let skippedCount = 0;
  const results = [];

  files.forEach(file => {
    const result = migrateFile(file);

    if (result.modified) {
      modifiedCount++;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`✅ ${relativePath}`);
      result.icons?.forEach(icon => console.log(`   ${icon}`));
      results.push({ file, ...result });
    } else if (result.skipped) {
      skippedCount++;
    } else if (result.error) {
      console.error(`❌ ${file}: ${result.error}`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Modified: ${modifiedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files`);
  console.log(`   📁 Total: ${files.length} files\n`);
}

main();
