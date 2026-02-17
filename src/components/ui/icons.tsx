import React from "react";
import {
  Home,
  User,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Minus,
  MoreVertical,
  MoreHorizontal,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  Trash,
  Trash2,
  RefreshCcw,
  RefreshCw,
  List,
  Copy,
  Scale,
  Sparkles,
  Share2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  Banknote,
  HandCoins,
  Users,
  Users2,
  UserPlus,
  UserMinus,
  Heart,
  Calendar,
  Clock,
  Repeat,
  Upload,
  Download,
  Image,
  File,
  FileImage,
  FilePlus,
  Info,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Percent,
  DollarSign,
  Sun,
  Moon,
  Monitor,
  Globe,
  Activity,
  Filter,
  ListFilter,
  GripVertical,
  PanelLeft,
  Pause,
  Play,
  Zap,
  HelpCircle,
  ShoppingCart,
  Utensils,
  Car,
  Briefcase,
  Coffee,
  CheckSquare,
  Trophy,
  PieChart,
  Inbox,
  FileText,
  History,
  Camera,
  Palette,
  Settings,
  Bell,
  Plus,
  LogOut,
  Film,
  MessageSquare,
  Bold,
  Italic,
  Link,
  Code,
  Mail,
  Lock,
  Flame,
  Star,
  QrCode,
  ExternalLink,
  Archive,
  ArchiveRestore,
  LayoutDashboard,
  HeartHandshake,
  ScrollText,
  PartyPopper,
  LogIn,
  Clock3,
  UserCheck,
  SmilePlus,
  Smile,
  Send,
  CornerDownRight,
  AtSign,
} from "lucide-react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

interface ImageIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

// ============ Navigation/Menu Icons ============

export const HomeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Home size={size} fill="currentColor" {...props} />
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Settings size={size} fill="currentColor" {...props} />
);

export const ListIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <List size={size} fill="currentColor" {...props} />
);

// ============ Custom Brand Icons (Keep as-is) ============

export const FairPayIcon: React.FC<ImageIconProps> = ({ className, size = 24, ...props }) => (
  <img
    src="/favicon.ico"
    alt="FairPay"
    width={size}
    height={size}
    className={className}
    {...props}
  />
);

export const TransactionsIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="2"
      y="3"
      width="16"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 19H18C19.1046 19 20 18.1046 20 17V7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8H14M6 12H12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const CustomersIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="8"
      cy="8"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1 19C1 15.134 4.13401 12 8 12C11.866 12 15 15.134 15 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="16"
      cy="8"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 19C17 16.2386 18.7909 13.8783 21.25 12.75"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PayoutsIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="1"
      y="4"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="10"
      cy="10"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M4 18H21C22.1046 18 23 17.1046 23 16V7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BalancesIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="13"
      y="7"
      width="9"
      height="10"
      rx="1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="16"
      cy="12"
      r="1.5"
      fill="currentColor"
    />
  </svg>
);

export const SubscriptionsIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7V12L16 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ReferralsIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="18"
      cy="5"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="6"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="18"
      cy="19"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8.5 10.5L15.5 6.5M8.5 13.5L15.5 17.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const AuditLogsIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export const PaymentPlansIcon: React.FC<IconProps> = ({ className, size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ============ Common UI Icons ============

export const SearchIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Search size={size} fill="currentColor" {...props} />
);

export const UserIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <User size={size} fill="currentColor" {...props} />
);

export const LogOutIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <LogOut size={size} fill="currentColor" {...props} />
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Bell size={size} fill="currentColor" {...props} />
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Plus size={size} fill="currentColor" {...props} />
);

export const XIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <X size={size} fill="currentColor" {...props} />
);

export const CheckIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Check size={size} fill="currentColor" {...props} />
);

// ============ Chevron Icons ============

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronLeft size={size} fill="currentColor" {...props} />
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronRight size={size} fill="currentColor" {...props} />
);

export const ChevronUpIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronUp size={size} fill="currentColor" {...props} />
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronDown size={size} fill="currentColor" {...props} />
);

export const ChevronsUpDownIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronsUpDown size={size} fill="currentColor" {...props} />
);

export const ChevronsLeftIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronsLeft size={size} fill="currentColor" {...props} />
);

export const ChevronsRightIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ChevronsRight size={size} fill="currentColor" {...props} />
);

// ============ Shape Icons ============

export const CircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Circle size={size} fill="currentColor" {...props} />
);

export const MinusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Minus size={size} fill="currentColor" {...props} />
);

// ============ More/Menu Icons ============

export const MoreVerticalIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <MoreVertical size={size} fill="currentColor" {...props} />
);

export const MoreHorizontalIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <MoreHorizontal size={size} fill="currentColor" {...props} />
);

// ============ Loading/Spinner Icons ============

export const Loader2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Loader2 size={size} fill="currentColor" {...props} />
);

// ============ Action Icons ============

export const EyeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Eye size={size} fill="currentColor" {...props} />
);

export const EyeOffIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <EyeOff size={size} fill="currentColor" {...props} />
);

export const PencilIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Pencil size={size} fill="currentColor" {...props} />
);

export const TrashIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Trash size={size} fill="currentColor" {...props} />
);

export const Trash2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Trash2 size={size} fill="currentColor" {...props} />
);

export const RefreshCcwIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <RefreshCcw size={size} fill="currentColor" {...props} />
);

export const RefreshCwIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <RefreshCw size={size} fill="currentColor" {...props} />
);

export const CopyIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Copy size={size} fill="currentColor" {...props} />
);

export const ShareIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Share2 size={size} fill="currentColor" {...props} />
);

// ============ Arrow Icons ============

export const ArrowLeftIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowLeft size={size} fill="currentColor" {...props} />
);

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowRight size={size} fill="currentColor" {...props} />
);

export const ArrowUpIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowUp size={size} fill="currentColor" {...props} />
);

export const ArrowDownIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowDown size={size} fill="currentColor" {...props} />
);

export const ArrowUpRightIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowUpRight size={size} fill="currentColor" {...props} />
);

export const ArrowUpDownIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArrowUpDown size={size} fill="currentColor" {...props} />
);

export const TrendingUpIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <TrendingUp size={size} fill="currentColor" {...props} />
);

export const TrendingDownIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <TrendingDown size={size} fill="currentColor" {...props} />
);

// ============ Financial Icons ============

export const WalletIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Wallet size={size} fill="currentColor" {...props} />
);

export const CreditCardIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <CreditCard size={size} fill="currentColor" {...props} />
);

export const ReceiptIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Receipt size={size} fill="currentColor" {...props} />
);

export const BanknoteIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Banknote size={size} fill="currentColor" {...props} />
);

export const HandCoinsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <HandCoins size={size} fill="currentColor" {...props} />
);

// ============ User/Social Icons ============

export const UsersIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Users size={size} fill="currentColor" {...props} />
);

export const Users2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Users2 size={size} fill="currentColor" {...props} />
);

export const GroupIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Users2 size={size} fill="currentColor" {...props} />
);

export const UserPlusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <UserPlus size={size} fill="currentColor" {...props} />
);

export const UserMinusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <UserMinus size={size} fill="currentColor" {...props} />
);

export const HeartIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Heart size={size} fill="currentColor" {...props} />
);

// ============ Date/Time Icons ============

export const CalendarIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Calendar size={size} fill="currentColor" {...props} />
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Clock size={size} fill="currentColor" {...props} />
);

export const RepeatIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Repeat size={size} fill="currentColor" {...props} />
);

// ============ File Icons ============

export const UploadIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Upload size={size} fill="currentColor" {...props} />
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Download size={size} fill="currentColor" {...props} />
);

export const ImageIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Image size={size} fill="currentColor" {...props} />
);

export const FileIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <File size={size} fill="currentColor" {...props} />
);

export const FileImageIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <FileImage size={size} fill="currentColor" {...props} />
);

export const FilePlusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <FilePlus size={size} fill="currentColor" {...props} />
);

// ============ Alert/Status Icons ============

export const InfoIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Info size={size} fill="currentColor" {...props} />
);

export const AlertCircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <AlertCircle size={size} fill="currentColor" {...props} />
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <AlertTriangle size={size} fill="currentColor" {...props} />
);

export const CheckCircle2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <CheckCircle2 size={size} fill="currentColor" {...props} />
);

export const XCircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <XCircle size={size} fill="currentColor" {...props} />
);

export const PlusCircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <PlusCircle size={size} fill="currentColor" {...props} />
);

export const FlameIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Flame size={size} {...props} />
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <CheckCircle2 size={size} {...props} />
);

export const StarIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Star size={size} {...props} />
);

// ============ Math/Currency Icons ============

export const PercentIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Percent size={size} fill="currentColor" {...props} />
);

export const DollarSignIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <DollarSign size={size} fill="currentColor" {...props} />
);

// ============ Theme Icons ============

export const SunIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Sun size={size} fill="currentColor" {...props} />
);

export const MoonIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Moon size={size} fill="currentColor" {...props} />
);

export const MonitorIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Monitor size={size} fill="currentColor" {...props} />
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Globe size={size} fill="currentColor" {...props} />
);

// ============ Activity/Filter Icons ============

export const ActivityIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Activity size={size} fill="currentColor" {...props} />
);

export const FilterIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Filter size={size} fill="currentColor" {...props} />
);

export const ListFilterIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ListFilter size={size} fill="currentColor" {...props} />
);

// ============ UI Control Icons ============

export const GripVerticalIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <GripVertical size={size} fill="currentColor" {...props} />
);

export const PanelLeftIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <PanelLeft size={size} fill="currentColor" {...props} />
);

export const PauseIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Pause size={size} fill="currentColor" {...props} />
);

export const PlayIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Play size={size} fill="currentColor" {...props} />
);

// ============ Category Icons (for expenses) ============

export const ZapIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Zap size={size} fill="currentColor" {...props} />
);

export const HelpCircleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <HelpCircle size={size} fill="currentColor" {...props} />
);

export const ShoppingCartIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ShoppingCart size={size} fill="currentColor" {...props} />
);

export const UtensilsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Utensils size={size} fill="currentColor" {...props} />
);

export const CarIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Car size={size} fill="currentColor" {...props} />
);

export const BriefcaseIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Briefcase size={size} fill="currentColor" {...props} />
);

export const CoffeeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Coffee size={size} fill="currentColor" {...props} />
);

export const FilmIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Film size={size} fill="currentColor" {...props} />
);

export const MessageSquareIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <MessageSquare size={size} fill="currentColor" {...props} />
);

export const BoldIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Bold size={size} fill="currentColor" {...props} />
);

export const ItalicIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Italic size={size} fill="currentColor" {...props} />
);

export const LinkIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Link size={size} fill="currentColor" {...props} />
);

export const CodeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Code size={size} fill="currentColor" {...props} />
);

export const MailIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Mail size={size} fill="currentColor" {...props} />
);

export const LockIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Lock size={size} fill="currentColor" {...props} />
);

// ============ Additional Icons ============

export const CheckSquareIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <CheckSquare size={size} fill="currentColor" {...props} />
);

export const TrophyIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Trophy size={size} fill="currentColor" {...props} />
);

export const PieChartIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <PieChart size={size} fill="currentColor" {...props} />
);

export const ScaleIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Scale size={size} fill="currentColor" {...props} />
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Sparkles size={size} fill="currentColor" {...props} />
);

export const InboxIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Inbox size={size} fill="currentColor" {...props} />
);

export const FileTextIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <FileText size={size} fill="currentColor" {...props} />
);

export const HistoryIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <History size={size} fill="currentColor" {...props} />
);

export const CameraIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Camera size={size} fill="currentColor" {...props} />
);

export const PaletteIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Palette size={size} fill="currentColor" {...props} />
);

export const QrCodeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <QrCode size={size} {...props} />
);

export const ExternalLinkIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ExternalLink size={size} {...props} />
);

export const ArchiveIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Archive size={size} {...props} />
);

export const ArchiveRestoreIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ArchiveRestore size={size} {...props} />
);

export const LayoutDashboardIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <LayoutDashboard size={size} {...props} />
);

export const HeartHandshakeIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <HeartHandshake size={size} {...props} />
);

export const PartyPopperIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <PartyPopper size={size} {...props} />
);

export const ScrollTextIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <ScrollText size={size} {...props} />
);

export const LogInIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <LogIn size={size} {...props} />
);

export const Clock3Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Clock3 size={size} {...props} />
);

export const UserCheckIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <UserCheck size={size} {...props} />
);

// ============ Comment & Reaction Icons ============

export const SmilePlusIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <SmilePlus size={size} {...props} />
);

export const SmileIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Smile size={size} {...props} />
);

export const SendIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <Send size={size} {...props} />
);

export const CornerDownRightIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <CornerDownRight size={size} {...props} />
);

export const AtSignIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <AtSign size={size} {...props} />
);
