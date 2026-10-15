/** Icon paths mirror the web admin sidebar's lucide set (AdminLayout.tsx):
 * LayoutDashboard, Users, ClipboardList, Trophy, Menu. Kept as raw path
 * strings (not a component per icon) so AdminTabBar can drive them from
 * one small data array. */
export const ADMIN_TAB_ICON_PATHS = [
  'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1M8 11h8M8 16h5',
  'M7 4h10v5a5 5 0 0 1-10 0zM7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2M10 18h4M12 14v4M9 21h6',
  'M4 6h16M4 12h16M4 18h16',
];

export const ADMIN_TABS = [
  { key: 'home', label: 'Home', icon: ADMIN_TAB_ICON_PATHS[0] },
  { key: 'team', label: 'Team', icon: ADMIN_TAB_ICON_PATHS[1] },
  { key: 'score', label: 'Score', icon: ADMIN_TAB_ICON_PATHS[2] },
  { key: 'board', label: 'Board', icon: ADMIN_TAB_ICON_PATHS[3] },
  { key: 'more', label: 'More', icon: ADMIN_TAB_ICON_PATHS[4] },
] as const;

export type AdminTabKey = (typeof ADMIN_TABS)[number]['key'];
