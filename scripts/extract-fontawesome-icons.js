#!/usr/bin/env node

/**
 * Extract Font Awesome SVG paths and generate React components
 * This extracts actual Font Awesome icon data (which SVG Awesome is based on)
 */

import fs from 'fs';
import path from 'path';

// Icon mappings: Our icon name -> Font Awesome icon name
const ICON_MAPPINGS = {
  'SearchIcon': 'faMagnifyingGlass',
  'UserIcon': 'faUser',
  'LogOutIcon': 'faArrowRightFromBracket',
  'BellIcon': 'faBell',
  'PlusIcon': 'faPlus',
  'XIcon': 'faXmark',
  'CheckIcon': 'faCheck',
  'ChevronLeftIcon': 'faChevronLeft',
  'ChevronRightIcon': 'faChevronRight',
  'ChevronUpIcon': 'faChevronUp',
  'ChevronDownIcon': 'faChevronDown',
  'ChevronsUpDownIcon': 'faArrowsUpDown',
  'ChevronsLeftIcon': 'faAnglesLeft',
  'ChevronsRightIcon': 'faAnglesRight',
  'CircleIcon': 'faCircle',
  'MinusIcon': 'faMinus',
  'MoreVerticalIcon': 'faEllipsisVertical',
  'MoreHorizontalIcon': 'faEllipsis',
  'Loader2Icon': 'faSpinner',
  'EyeIcon': 'faEye',
  'EyeOffIcon': 'faEyeSlash',
  'PencilIcon': 'faPen',
  'TrashIcon': 'faTrashCan',
  'Trash2Icon': 'faTrash',
  'RefreshCcwIcon': 'faArrowsRotate',
  'RefreshCwIcon': 'faRotateRight',
  'ListIcon': 'faList',
  'CopyIcon': 'faCopy',
  'ArrowLeftIcon': 'faArrowLeft',
  'ArrowRightIcon': 'faArrowRight',
  'ArrowUpIcon': 'faArrowUp',
  'ArrowDownIcon': 'faArrowDown',
  'ArrowUpRightIcon': 'faArrowUpRightFromSquare',
  'ArrowUpDownIcon': 'faArrowsUpDown',
  'TrendingUpIcon': 'faArrowTrendUp',
  'TrendingDownIcon': 'faArrowTrendDown',
  'WalletIcon': 'faWallet',
  'CreditCardIcon': 'faCreditCard',
  'ReceiptIcon': 'faReceipt',
  'BanknoteIcon': 'faMoneyBill',
  'HandCoinsIcon': 'faHandHoldingDollar',
  'UsersIcon': 'faUsers',
  'Users2Icon': 'faUserGroup',
  'UserPlusIcon': 'faUserPlus',
  'UserMinusIcon': 'faUserMinus',
  'HeartIcon': 'faHeart',
  'CalendarIcon': 'faCalendar',
  'RepeatIcon': 'faRepeat',
  'UploadIcon': 'faUpload',
  'DownloadIcon': 'faDownload',
  'ImageIcon': 'faImage',
  'FileIcon': 'faFile',
  'FileImageIcon': 'faFileImage',
  'FilePlusIcon': 'faFileCirclePlus',
  'InfoIcon': 'faCircleInfo',
  'AlertCircleIcon': 'faCircleExclamation',
  'AlertTriangleIcon': 'faTriangleExclamation',
  'CheckCircle2Icon': 'faCircleCheck',
  'XCircleIcon': 'faCircleXmark',
  'PlusCircleIcon': 'faCirclePlus',
  'PercentIcon': 'faPercent',
  'DollarSignIcon': 'faDollarSign',
  'SunIcon': 'faSun',
  'MoonIcon': 'faMoon',
  'MonitorIcon': 'faDisplay',
  'GlobeIcon': 'faGlobe',
  'ActivityIcon': 'faChartLine',
  'FilterIcon': 'faFilter',
  'ListFilterIcon': 'faFilter',
  'GripVerticalIcon': 'faGripVertical',
  'PanelLeftIcon': 'faBars',
  'PauseIcon': 'faPause',
  'PlayIcon': 'faPlay',
  'ZapIcon': 'faBolt',
  'HelpCircleIcon': 'faCircleQuestion',
  'ShoppingCartIcon': 'faCartShopping',
  'UtensilsIcon': 'faUtensils',
  'CarIcon': 'faCar',
  'BriefcaseIcon': 'faBriefcase',
  'CoffeeIcon': 'faMugHot',
  'SettingsIcon': 'faGear',
  'HomeIcon': 'faHouse',
};

function extractIconData(faIcon) {
  try {
    // Font Awesome icon structure:
    // icon.icon = [width, height, [...aliases], "unicode", "pathString"]
    if (faIcon && faIcon.icon && Array.isArray(faIcon.icon) && faIcon.icon.length >= 5) {
      const width = faIcon.icon[0];
      const height = faIcon.icon[1];
      const pathString = faIcon.icon[4]; // Last element is the SVG path

      if (typeof pathString === 'string' && pathString.length > 0) {
        return {
          viewBox: `0 0 ${width} ${height}`,
          paths: [pathString]
        };
      }
    }
  } catch (error) {
    console.error(`Error extracting icon data:`, error.message);
  }
  return null;
}

function generateIconComponent(iconName, viewBox, paths) {
  const pathElements = paths
    .filter(p => p && typeof p === 'string')
    .map(pathData => `    <path d="${pathData}"/>`)
    .join('\n');

  if (!pathElements) {
    return null;
  }

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

async function main() {
  console.log('🔍 Extracting Font Awesome SVG paths...\n');

  try {
    // Import Font Awesome icons
    const faIcons = await import('@fortawesome/free-solid-svg-icons');

    const iconComponents = [];
    const missingIcons = [];
    const errors = [];

    const faIconsModule = faIcons.default || faIcons;

    Object.entries(ICON_MAPPINGS).forEach(([ourIconName, faIconName]) => {
      try {
        const faIcon = faIconsModule[faIconName];

        if (!faIcon) {
          missingIcons.push({ ourIconName, faIconName });
          return;
        }

        const iconData = extractIconData(faIcon);

        if (!iconData || !iconData.paths || iconData.paths.length === 0) {
          errors.push({ ourIconName, faIconName, reason: 'No path data' });
          return;
        }

        const component = generateIconComponent(ourIconName, iconData.viewBox, iconData.paths);

        if (component) {
          iconComponents.push(component);
          console.log(`✓ ${ourIconName} (${faIconName})`);
        } else {
          errors.push({ ourIconName, faIconName, reason: 'Failed to generate component' });
        }
      } catch (error) {
        errors.push({ ourIconName, faIconName, reason: error.message });
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Extracted: ${iconComponents.length} icons`);
    console.log(`   ⚠️  Missing: ${missingIcons.length} icons`);
    console.log(`   ❌ Errors: ${errors.length} icons\n`);

    if (missingIcons.length > 0) {
      console.log(`⚠️  Missing icons:\n`);
      missingIcons.forEach(({ ourIconName, faIconName }) => {
        console.log(`   - ${ourIconName} → ${faIconName} (not found)`);
      });
      console.log('');
    }

    if (errors.length > 0) {
      console.log(`❌ Errors:\n`);
      errors.forEach(({ ourIconName, faIconName, reason }) => {
        console.log(`   - ${ourIconName} → ${faIconName}: ${reason}`);
      });
      console.log('');
    }

    // Generate output
    const output = `// Font Awesome Icon Components (Extracted from @fortawesome/free-solid-svg-icons)
// Generated: ${new Date().toISOString()}
// Total Icons: ${iconComponents.length}

${iconComponents.join('\n\n')}
`;

    // Save to file
    const outputFile = './temp-fontawesome-components.txt';
    fs.writeFileSync(outputFile, output);

    console.log(`💾 Generated components saved to: ${outputFile}\n`);
    console.log(`📝 Next step: Copy these components to src/components/ui/icons.tsx\n`);

    return iconComponents.length;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure @fortawesome/free-solid-svg-icons is installed:');
    console.error('  pnpm add -D @fortawesome/free-solid-svg-icons\n');
    process.exit(1);
  }
}

main().catch(console.error);
