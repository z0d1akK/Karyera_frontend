import { useTranslation } from 'react-i18next';

import { SectionNav } from '../../features/sections/SectionNav.jsx';
import { canSeeAnalyticsNav } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';

export function AnalyticsNav({ includeCompany = true }) {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const items = [{ to: '/app/analytics/me', label: t('analyticsUi.me') }];
    if (includeCompany && canSeeAnalyticsNav(role)) {
        items.unshift(
            { to: '/app/analytics', label: t('analyticsUi.overview'), end: true },
            { to: '/app/analytics/employees', label: t('analyticsUi.employees') },
            { to: '/app/analytics/career', label: t('analyticsUi.career') },
        );
    }
    return <SectionNav items={items} />;
}
