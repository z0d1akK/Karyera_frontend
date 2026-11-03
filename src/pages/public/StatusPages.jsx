import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '../../shared/ui/Button/Button.jsx';
import styles from './PublicPages.module.css';

export function ForbiddenPage() {
    const { t } = useTranslation();
    return (
        <main className={styles.landing}>
            <h1>403</h1>
            <p>{t('errors.forbidden')}</p>
            <Link to="/app/profile"><Button>{t('common.back')}</Button></Link>
        </main>
    );
}

export function NotFoundPage() {
    const { t } = useTranslation();
    return (
        <main className={styles.landing}>
            <h1>404</h1>
            <p>{t('errors.notFound')}</p>
            <Link to="/"><Button>{t('common.back')}</Button></Link>
        </main>
    );
}

export function StubPage({ titleKey, textKey }) {
    const { t } = useTranslation();
    return (
        <section>
            <h1>{t(titleKey)}</h1>
            <p>{t(textKey)}</p>
        </section>
    );
}
