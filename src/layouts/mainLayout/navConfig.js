import { canSeeAdminNav, canSeeAnalyticsNav, canSeeDevelopment, canSeeDirectory, canSeeTalent } from '../../shared/lib/roles.js';

export function getNavItems(role) {
    const items = [
        { to: '/app/profile', icon: 'profile', labelKey: 'navigation.myProfile' },
    ];

    if (canSeeDirectory(role)) {
        items.push(
            { to: '/app/employees', icon: 'employees', labelKey: 'navigation.employees' },
            { to: '/app/organization', icon: 'organization', labelKey: 'navigation.organization' },
        );
    }

    items.push(
        { to: '/app/projects', icon: 'projects', labelKey: 'navigation.projects' },
        { to: '/app/career', icon: 'career', labelKey: 'navigation.career' },
    );

    if (canSeeDevelopment(role)) {
        items.push({ to: '/app/development', icon: 'development', labelKey: 'navigation.development' });
    }

    if (canSeeTalent(role)) {
        items.push({ to: '/app/talent-reserve', icon: 'talent', labelKey: 'navigation.talentReserve' });
    }

    items.push({ to: '/app/time/entries', icon: 'timesheet', labelKey: 'navigation.timesheet' });

    if (canSeeAnalyticsNav(role)) {
        items.push({ to: '/app/analytics', icon: 'analytics', labelKey: 'navigation.analytics' });
    }

    if (canSeeAdminNav(role)) {
        items.push({ to: '/app/admin/users', icon: 'admin', labelKey: 'navigation.admin' });
    }

    return items;
}
