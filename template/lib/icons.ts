/**
 * icons.ts — the single icon import point.
 *
 * Use when: you need an icon anywhere. Import from `@/lib/icons`, never from
 * `lucide-react` directly, so the icon set is consistent and the library is
 * swappable in exactly one place. Add the icons a site uses to the re-export
 * below (tree-shaking keeps the bundle to only what's imported).
 */
export {
  Menu,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
  ExternalLink,
  Loader2,
  AlertCircle,
  // Jules-specific (spec calls for Tabler outline; lucide is what's already
  // wired into this template — same visual family, no new dependency added).
  Home,
  QrCode,
  ScanLine,
  Trophy,
  User,
  Zap,
  Flame,
  Award,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  KeyRound,
  Users,
  Settings,
  LogOut,
  Clock,
  Calendar,
  MapPinned,
  BarChart3,
  ShieldAlert,
  CircleCheck,
  CircleX,
  Sparkles,
} from 'lucide-react';

export type { LucideIcon } from 'lucide-react';
