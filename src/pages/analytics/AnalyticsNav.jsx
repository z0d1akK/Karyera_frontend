import { useTranslation } from 'react-i18next';

import { SectionNav } from '../../features/sections/SectionNav.jsx';
import { canSeeAnalyticsNav } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';

export function AnalyticsNav({ includeCompany = true }) {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const company = includeCompany && canSeeAnalyticsNav(role);
    const items = [];
    if (company) {
        items.push(
            { to: '/app/analytics', label: t('analyticsUi.overview'), end: true },
            { to: '/app/analytics/dashboard', label: t('analyticsUi.dashboard') },
            { to: '/app/analytics/employees', label: t('analyticsUi.employees') },
            { to: '/app/analytics/career', label: t('analyticsUi.career') },
        );
    }
    items.push(
        { to: '/app/analytics/me', label: t('analyticsUi.me'), end: true },
        { to: '/app/analytics/me/recommendations', label: t('analyticsUi.recommendations') },
        { to: '/app/analytics/me/career-options', label: t('analyticsUi.careerOptions') },
        { to: '/app/analytics/reports', label: t('analyticsUi.reports') },
    );
    return <SectionNav items={items} />;
}
