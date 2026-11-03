import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthLogo } from '../AuthLogo/AuthLogo.jsx';
import { loginSchema } from '../../authSchema.js';
import { authApi } from '../../api/authApi.js';
import { PasswordChangeRequiredError, getApiError } from '../../../../shared/api/errors.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { PasswordInput } from '../../../../shared/ui/PasswordInput/PasswordInput.jsx';

import styles from './LoginForm.module.css';

export function LoginForm() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema(t)),
        mode: 'onBlur',
    });

    const onSubmit = async (credentials) => {
        setServerError('');

        try {
            const response = await authApi.login(credentials);
            setAuth(response);
            navigate('/app/profile', { replace: true });
        } catch (error) {
            if (error instanceof PasswordChangeRequiredError) {
                navigate('/change-initial-password', { state: { login: error.login } });
                return;
            }

            setServerError(getApiError(error).message || t('auth.loginFailed'));
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.logoWrapper}>
                <AuthLogo />
            </div>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('auth.welcome')}</h1>
                <p className={styles.subtitle}>{t('auth.loginSubtitle')}</p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="login">
                        {t('auth.loginField')}
                    </label>
                    <input
                        id="login"
                        type="text"
                        autoComplete="username"
                        className={`${styles.input} ${errors.login ? styles.inputError : ''}`}
                        placeholder="email@email.com"
                        {...register('login')}
                    />
                    {errors.login ? <span className={styles.error}>{errors.login.message}</span> : null}
                </div>
                <PasswordInput
                    label={t('auth.password')}
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password')}
                />
                {serverError ? <div className={styles.serverError}>{serverError}</div> : null}
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? t('common.loading') : t('auth.login')}
                </button>
            </form>
            <p className={styles.footerText}>{t('auth.footerText')}</p>
        </div>
    );
}
