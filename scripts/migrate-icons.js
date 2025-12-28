#!/usr/bin/env node

/**
 * SVG Awesome Icon Migration Helper
 * 
 * This script helps migrate icons from Lucide-style to SVG Awesome icons.
 * 
 * Usage:
 * 1. Download SVG files from https://svgawesome.com/ to ./temp-svg-awesome/
 * 2. Run: node scripts/migrate-icons.js
 * 3. Review the output and manually update src/components/ui/icons.tsx
 */

const fs = require('fs');
const path = require('path');

const SVG_DIR = './temp-svg-awesome';
const ICONS_FILE = './src/components/ui/icons.tsx';

// Icon name mappings: Lucide name -> SVG Awesome name
const ICON_MAPPINGS = {
  'SearchIcon': 'magnifying-glass',
  'UserIcon': 'user',
  'LogOutIcon': 'arrow-right-from-bracket',
  'BellIcon': 'bell',
  'PlusIcon': 'plus',
  'XIcon': 'xmark',
  'CheckIcon': 'check',
  'ChevronLeftIcon': 'chevron-left',
  'ChevronRightIcon': 'chevron-right',
  'ChevronUpIcon': 'chevron-up',
  'ChevronDownIcon': 'chevron-down',
  'ChevronsUpDownIcon': 'angles-up-down',
  'ChevronsLeftIcon': 'angles-left',
  'ChevronsRightIcon': 'angles-right',
  'CircleIcon': 'circle',
  'MinusIcon': 'minus',
  'MoreVerticalIcon': 'ellipsis-vertical',
  'MoreHorizontalIcon': 'ellipsis',
  'Loader2Icon': 'spinner',
  'EyeIcon': 'eye',
  'EyeOffIcon': 'eye-slash',
  'PencilIcon': 'pen',
  'TrashIcon': 'trash-can',
  'Trash2Icon': 'trash',
  'RefreshCcwIcon': 'arrows-rotate',
  'RefreshCwIcon': 'rotate-right',
  'ListIcon': 'list',
  'CopyIcon': 'copy',
  'ArrowLeftIcon': 'arrow-left',
  'ArrowRightIcon': 'arrow-right',
  'ArrowUpIcon': 'arrow-up',
  'ArrowDownIcon': 'arrow-down',
  'ArrowUpRightIcon': 'arrow-up-right',
  'ArrowUpDownIcon': 'arrows-up-down',
  'TrendingUpIcon': 'arrow-trend-up',
  'TrendingDownIcon': 'arrow-trend-down',
  'WalletIcon': 'wallet',
  'CreditCardIcon': 'credit-card',
  'ReceiptIcon': 'receipt',
  'BanknoteIcon': 'money-bill',
  'HandCoinsIcon': 'hand-holding-dollar',
  'UsersIcon': 'users',
  'Users2Icon': 'user-group',
  'UserPlusIcon': 'user-plus',
  'UserMinusIcon': 'user-minus',
  'HeartIcon': 'heart',
  'CalendarIcon': 'calendar',
  'RepeatIcon': 'repeat',
  'UploadIcon': 'upload',
  'DownloadIcon': 'download',
  'ImageIcon': 'image',
  'FileIcon': 'file',
  'FileImageIcon': 'file-image',
  'FilePlusIcon': 'file-plus',
  'InfoIcon': 'circle-info',
  'AlertCircleIcon': 'circle-exclamation',
  'AlertTriangleIcon': 'triangle-exclamation',
  'CheckCircle2Icon': 'circle-check',
  'XCircleIcon': 'circle-xmark',
  'PlusCircleIcon': 'circle-plus',
  'PercentIcon': 'percent',
  'DollarSignIcon': 'dollar-sign',
  'SunIcon': 'sun',
  'MoonIcon': 'moon',
  'MonitorIcon': 'display',
  'GlobeIcon': 'globe',
  'ActivityIcon': 'chart-line',
  'FilterIcon': 'filter',
  'ListFilterIcon': 'filter-list',
  'GripVerticalIcon': 'grip-vertical',
  'PanelLeftIcon': 'sidebar',
  'PauseIcon': 'pause',
  'PlayIcon': 'play',
  'ZapIcon': 'bolt',
  'HelpCircleIcon': 'circle-question',
  'ShoppingCartIcon': 'cart-shopping',
  'UtensilsIcon': 'utensils',
  'CarIcon': 'car',
  'BriefcaseIcon': 'briefcase',
  'CoffeeIcon': 'mug-hot',
};

function extractSVGData(svgContent) {
  // Extract viewBox
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 512 512';
  
  // Extract all path d attributes
  const pathMatches = [...svgContent.matchAll(/d="([^"]+)"/g)];
  const paths = pathMatches.map(match => match[1]);
  
  return { viewBox, paths };
}

function generateIconComponent(iconName, viewBox, paths) {
  const pathElements = paths.map(pathData => 
    `    <path d="${pathData}"/>`
  ).join('\n');
  
  return `export const ${iconName}: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="${viewBox}"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
${pathElements}
  </svg>
);`;
}

function main() {
  console.log('🔍 SVG Awesome Icon Migration Helper\n');
  
  // Check if SVG directory exists
  if (!fs.existsSync(SVG_DIR)) {
    console.log(`❌ Directory ${SVG_DIR} not found.`);
    console.log(`\n📝 Instructions:`);
    console.log(`1. Create directory: mkdir ${SVG_DIR}`);
    console.log(`2. Download SVG files from https://svgawesome.com/`);
    console.log(`3. Save them to ${SVG_DIR}/`);
    console.log(`4. Run this script again\n`);
    return;
  }
  
  const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
  
  if (files.length === 0) {
    console.log(`❌ No SVG files found in ${SVG_DIR}`);
    console.log(`\nDownload SVG files from https://svgawesome.com/ first.\n`);
    return;
  }
  
  console.log(`✅ Found ${files.length} SVG files\n`);
  
  const iconData = {};
  const processedIcons = [];
  
  // Process each SVG file
  files.forEach(file => {
    const svgPath = path.join(SVG_DIR, file);
    const content = fs.readFileSync(svgPath, 'utf8');
    const { viewBox, paths } = extractSVGData(content);
    
    // Find matching icon name
    const baseName = path.basename(file, '.svg');
    const iconEntry = Object.entries(ICON_MAPPINGS).find(
      ([_, svgAwesomeName]) => svgAwesomeName === baseName
    );
    
    if (iconEntry) {
      const [iconName] = iconEntry;
      iconData[iconName] = { viewBox, paths };
      processedIcons.push(iconName);
      console.log(`✓ ${iconName} (${baseName})`);
    } else {
      console.log(`⚠️  No mapping found for: ${baseName}`);
    }
  });
  
  console.log(`\n📊 Processed ${processedIcons.length} icons\n`);
  
  // Generate icon components
  console.log(`📝 Generated Icon Components:\n`);
  console.log(`${'='.repeat(80)}\n`);
  
  Object.entries(iconData).forEach(([iconName, data]) => {
    const component = generateIconComponent(iconName, data.viewBox, data.paths);
    console.log(component);
    console.log('');
  });
  
  console.log(`${'='.repeat(80)}\n`);
  
  // Show missing icons
  const missingIcons = Object.keys(ICON_MAPPINGS).filter(
    icon => !processedIcons.includes(icon)
  );
  
  if (missingIcons.length > 0) {
    console.log(`\n⚠️  Missing ${missingIcons.length} icons:\n`);
    missingIcons.forEach(icon => {
      const svgName = ICON_MAPPINGS[icon];
      console.log(`   - ${icon} → Download: ${svgName}.svg`);
    });
    console.log('');
  } else {
    console.log(`\n✅ All icons processed! Ready to update ${ICONS_FILE}\n`);
  }
  
  // Save output to file
  const outputFile = './temp-icon-components.txt';
  let output = '// Generated Icon Components\n\n';
  
  Object.entries(iconData).forEach(([iconName, data]) => {
    output += generateIconComponent(iconName, data.viewBox, data.paths);
    output += '\n\n';
  });
  
  fs.writeFileSync(outputFile, output);
  console.log(`💾 Saved to: ${outputFile}\n`);
}

main();

