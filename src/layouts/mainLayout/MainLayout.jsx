import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthLogo } from '../../features/auth/components/AuthLogo/AuthLogo.jsx';
import { SidebarIcon } from '../../shared/ui/SidebarIcon/SidebarIcon.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { fullName } from '../../shared/lib/format.js';
import { authApi } from '../../features/auth/api/authApi.js';
import { authStorage } from '../../services/auth/authStorage.js';
import { getNavItems } from './navConfig.js';

import styles from './MainLayout.module.css';

export function MainLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const session = useAuthStore((state) => state.session);
    const employee = useAuthStore((state) => state.employee);
    const logout = useAuthStore((state) => state.logout);
    const [collapsed, setCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const items = getNavItems(session?.role);
    const displayName = fullName(employee) !== '—' ? fullName(employee) : (session?.email || '');
    const photoUrl = employee?.profilePhoto?.url;

    const handleLogout = async () => {
        try {
            await authApi.logout(authStorage.getRefreshToken());
        } catch {
            /* session is cleared locally anyway */
        }
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <AuthLogo inverted compact={collapsed} />
                </div>
                <nav className={styles.nav}>
                    {items.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `${styles.link} ${isActive || (item.matchPrefix && location.pathname.startsWith(item.matchPrefix)) ? styles.active : ''}`}
                        >
                            <SidebarIcon name={item.icon} label={t(item.labelKey)} />
                            {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                        </NavLink>
                    ))}
                </nav>
                <button
                    type="button"
                    className={styles.collapse}
                    onClick={() => setCollapsed((value) => !value)}
                >
                    <SidebarIcon name="collapse" label={t('navigation.collapse')} />
                    {!collapsed ? <span>{t('navigation.collapse')}</span> : null}
                </button>
                <div className={styles.sidebarFooter}>
                    <button
                        type="button"
                        className={styles.lang}
                        onClick={() => i18n.changeLanguage((i18n.resolvedLanguage || i18n.language).startsWith('ru') ? 'en' : 'ru')}
                    >
                        {(i18n.resolvedLanguage || i18n.language).startsWith('ru') ? 'EN' : 'RU'}
                    </button>
                    <div className={styles.account}>
                        <button type="button" className={styles.accountBtn} onClick={() => setMenuOpen((v) => !v)}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="" className={styles.avatar} />
                            ) : (
                                <span className={styles.avatarFallback} />
                            )}
                            {!collapsed ? (
                                <span className={styles.accountMeta}>
                                    <strong>{displayName}</strong>
                                    <em>{employee?.email || session?.email}</em>
                                </span>
                            ) : null}
                        </button>
                        {menuOpen ? (
                            <div className={styles.menu}>
                                <button type="button" onClick={() => { setMenuOpen(false); navigate('/app/profile'); }}>
                                    {t('navigation.myProfile')}
                                </button>
                                <button type="button" onClick={handleLogout}>
                                    {t('auth.logout')}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </aside>
            <div className={styles.main}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
