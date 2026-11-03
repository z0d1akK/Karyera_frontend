import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import authHero from '../../assets/auth/auth-hero.png';

import styles from './AuthLayout.module.css';

export function AuthLayout() {
    const { t, i18n } = useTranslation();
    const current = (i18n.resolvedLanguage || i18n.language || 'ru').startsWith('ru') ? 'ru' : 'en';

    return (
        <main className={styles.layout}>
            <section
                className={styles.hero}
                style={{
                    backgroundImage: `url(${authHero})`,
                }}
            >
                <div className={styles.heroOverlay} />

                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        {t('auth.heroTitle')}
                    </h1>

                    <p className={styles.heroSubtitle}>
                        {t('auth.heroSubtitle')}
                    </p>
                </div>
            </section>

            <section className={styles.formSection}>
                <button
                    type="button"
                    className={styles.lang}
                    onClick={() => i18n.changeLanguage(current === 'ru' ? 'en' : 'ru')}
                >
                    {current === 'ru' ? 'EN' : 'RU'}
                </button>
                <div className={styles.formContainer}>
                    <Outlet />
                </div>
            </section>
        </main>
    );
}