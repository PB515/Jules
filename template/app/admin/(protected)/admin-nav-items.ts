/**
 * Single source of truth for the admin nav — both the sidebar
 * (admin-nav-client.tsx) and the home screen's task tiles (page.tsx) render
 * from this same array, grouped the same way, so they can never drift apart
 * into two different mental models of "what's in the admin panel."
 *
 * Grouped into 5 task clusters (not a flat 13-item list) after the user
 * flagged the admin panel as too complex for the 1-2 committee members +
 * professor who actually run it day to day — grouping, not a step-locked
 * wizard, since every item still needs to stay reachable in one click for
 * a one-off task.
 */
import {
  ScanLine,
  Calendar,
  Zap,
  BarChart3,
  Users,
  UserPlus,
  Settings,
  MonitorPlay,
  BookOpen,
  ImageIcon,
  Smartphone,
  ShieldAlert,
  Bell,
  FileText,
  type LucideIcon,
} from '@/lib/icons';

export type AdminNavGroup = 'Events' | 'Quizzes' | 'Reports & Data' | 'Admin' | 'App';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly string[];
  group: AdminNavGroup;
  blurb: string;
}

export const GROUP_ORDER: readonly AdminNavGroup[] = ['Events', 'Quizzes', 'Reports & Data', 'Admin', 'App'];

export const NAV: readonly AdminNavItem[] = [
  {
    href: '/admin/grid',
    label: 'Event Creation',
    icon: Calendar,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Events',
    blurb: 'Create and edit events',
  },
  {
    href: '/admin/attendance',
    label: 'Attendance',
    icon: ScanLine,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Events',
    blurb: "Start attendance, share the link with whoever's running it",
  },
  {
    href: '/admin/updates',
    label: 'Updates',
    icon: Bell,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Events',
    blurb: 'Message students registered for an event',
  },
  {
    href: '/admin/surges',
    label: 'Quiz Builder',
    icon: Zap,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Quizzes',
    blurb: 'Write questions for a Live Round',
  },
  {
    href: '/admin/live/new',
    label: 'Live Round',
    icon: MonitorPlay,
    // Professor/Super Admin only — Committee Member's job is event creation
    // + Event Report writing, not running a live activity (same reasoning
    // as the QR/scanner restriction).
    roles: ['professor', 'super_admin'],
    group: 'Quizzes',
    blurb: 'Host a live quiz session',
  },
  {
    href: '/admin/ledger',
    label: 'Attendance & Points',
    icon: BarChart3,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Reports & Data',
    blurb: 'Attendance and Synergy Points, by event',
  },
  {
    href: '/admin/event-reports',
    label: 'Event Reports',
    icon: BookOpen,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Reports & Data',
    blurb: 'Write up what happened at an event',
  },
  {
    href: '/admin/gallery',
    label: 'Gallery',
    icon: ImageIcon,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Reports & Data',
    blurb: 'Upload photos from an event',
  },
  {
    href: '/admin/reports',
    label: 'Data Exports',
    icon: FileText,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'Reports & Data',
    blurb: 'Download CSVs for students, events, attendance',
  },
  {
    href: '/admin/vault',
    label: 'Student Vault',
    icon: Users,
    roles: ['super_admin'],
    group: 'Admin',
    blurb: 'Search students, adjust points, reset passwords',
  },
  {
    href: '/admin/students',
    label: 'Students',
    icon: UserPlus,
    roles: ['super_admin'],
    group: 'Admin',
    blurb: 'Bulk-create student accounts',
  },
  {
    href: '/admin/audit',
    label: 'Audit Log',
    icon: ShieldAlert,
    roles: ['super_admin'],
    group: 'Admin',
    blurb: 'A trace of every admin action',
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['super_admin'],
    group: 'Admin',
    blurb: 'Clubs, seasons, email domains, admin roster',
  },
  {
    href: '/admin/get-app',
    label: 'Get the App',
    icon: Smartphone,
    roles: ['professor', 'committee_member', 'super_admin'],
    group: 'App',
    blurb: 'Install the admin app on your phone',
  },
];
