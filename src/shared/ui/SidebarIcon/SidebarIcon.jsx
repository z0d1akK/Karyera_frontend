import {
    UserRound,
    Users,
    GitBranch,
    FolderKanban,
    Waypoints,
    GraduationCap,
    Trophy,
    ChartColumn,
    Clock3,
    Shield,
    PanelLeftClose,
    CircleUser,
} from 'lucide-react';

import styles from './SidebarIcon.module.css';

const ICONS = {
    profile: UserRound,
    employees: Users,
    organization: GitBranch,
    projects: FolderKanban,
    career: Waypoints,
    development: GraduationCap,
    talent: Trophy,
    analytics: ChartColumn,
    timesheet: Clock3,
    admin: Shield,
    collapse: PanelLeftClose,
    account: CircleUser,
};

export function SidebarIcon({ name, label }) {
    const Icon = ICONS[name];

    return (
        <span className={styles.icon} data-figma-slot={`sidebar-${name}`} title={label}>
            {Icon ? <Icon size={20} strokeWidth={1.75} aria-hidden /> : <span className={styles.placeholder} aria-hidden />}
        </span>
    );
}
