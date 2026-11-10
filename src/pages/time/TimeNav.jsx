import { useTranslation } from 'react-i18next';

import { SectionNav } from '../../features/sections/SectionNav.jsx';
import { canApproveTimesheets } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';

export function TimeNav() {
    const { t } = useTranslation();
    const role = useAuthStore((state) => state.session?.role);
    const items = [
        { to: '/app/time/entries', label: t('time.journal'), end: true },
        { to: '/app/time/calendar', label: t('time.calendar') },
        { to: '/app/time/timesheets', label: t('time.timesheets') },
    ];
    if (canApproveTimesheets(role)) {
        items.push({ to: '/app/time/approvals', label: t('time.approvals') });
    }
    return <SectionNav items={items} />;
}
