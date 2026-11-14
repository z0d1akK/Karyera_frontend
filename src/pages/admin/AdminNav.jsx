import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import tabStyles from '../../shared/ui/Tabs/Tabs.module.css';

export function AdminNav() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const items = [
        { to: '/app/admin/users', prefix: '/app/admin/users', label: t('admin.usersTitle') },
        { to: '/app/admin/dictionaries', prefix: '/app/admin/dictionaries', label: t('admin.dictionaries') },
    ];

    return (
        <div className={tabStyles.row}>
            <div className={tabStyles.tabs}>
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={() => `${tabStyles.tab} ${pathname.startsWith(item.prefix) ? tabStyles.active : ''}`}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
