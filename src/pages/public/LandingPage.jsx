import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthLogo } from '../../features/auth/components/AuthLogo/AuthLogo.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import styles from './PublicPages.module.css';

export function LandingPage() {
    const { t } = useTranslation();

    return (
        <main className={styles.landing}>
            <AuthLogo />
            <h1>{t('landing.title')}</h1>
            <p>{t('landing.subtitle')}</p>
            <Link to="/login">
                <Button>{t('auth.login')}</Button>
            </Link>
        </main>
    );
}
