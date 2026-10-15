/** Icon paths from the "GOAT Student App" design doc's ICONS map — home,
 * progress, board, profile, more. Kept as raw path strings so the shared tab
 * bar can drive them from one small data array. (The design's Box chat tab
 * is deferred; Profile takes that slot for now.) */
export const STUDENT_TAB_ICON_PATHS = [
  'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  'M3 3v18h18M7 15l4-5 3 3 5-7',
  'M7 4h10v5a5 5 0 0 1-10 0zM7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2M10 18h4M12 14v4M9 21h6',
  'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  'M4 6h16M4 12h16M4 18h16',
];

export const STUDENT_TABS = [
  { key: 'home', label: 'Home', icon: STUDENT_TAB_ICON_PATHS[0] },
  { key: 'progress', label: 'Progress', icon: STUDENT_TAB_ICON_PATHS[1] },
  { key: 'board', label: 'Board', icon: STUDENT_TAB_ICON_PATHS[2] },
  { key: 'profile', label: 'Profile', icon: STUDENT_TAB_ICON_PATHS[3] },
  { key: 'more', label: 'More', icon: STUDENT_TAB_ICON_PATHS[4] },
] as const;

export type StudentTabKey = (typeof STUDENT_TABS)[number]['key'];
