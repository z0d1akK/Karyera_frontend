import { canSeeAdminNav, canSeeAnalyticsNav, canSeeDevelopment, canSeeDirectory, canSeeOrganization, canSeeTalent } from '../../shared/lib/roles.js';

export function getNavItems(role) {
    const items = [
        { to: '/app/profile', icon: 'profile', labelKey: 'navigation.myProfile' },
    ];

    if (canSeeDirectory(role)) {
        items.push({ to: '/app/employees', icon: 'employees', labelKey: 'navigation.employees' });
    }

    if (canSeeOrganization(role)) {
        items.push({ to: '/app/organization', icon: 'organization', labelKey: 'navigation.organization' });
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
        items.push({ to: '/app/analytics', icon: 'analytics', labelKey: 'navigation.analytics', matchPrefix: '/app/analytics' });
    } else {
        items.push({ to: '/app/analytics/me', icon: 'analytics', labelKey: 'navigation.myStats' });
    }

    if (canSeeAdminNav(role)) {
        items.push({ to: '/app/admin/users', icon: 'admin', labelKey: 'navigation.admin', matchPrefix: '/app/admin' });
    }

    return items;
}
