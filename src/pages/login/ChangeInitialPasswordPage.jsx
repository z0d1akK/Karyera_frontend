import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthLogo } from '../../features/auth/components/AuthLogo/AuthLogo.jsx';
import { changeInitialPasswordSchema } from '../../features/auth/authSchema.js';
import { authApi } from '../../features/auth/api/authApi.js';
import { getApiError } from '../../shared/api/errors.js';
import { PasswordInput } from '../../shared/ui/PasswordInput/PasswordInput.jsx';
import { Input } from '../../shared/ui/Input/Input.jsx';
import styles from '../../features/auth/components/LoginForm/LoginForm.module.css';

export function ChangeInitialPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(changeInitialPasswordSchema(t)),
        defaultValues: {
            login: location.state?.login || '',
        },
    });

    const onSubmit = async (values) => {
        setServerError('');
        try {
            await authApi.changeInitialPassword({
                login: values.login,
                initialPassword: values.initialPassword,
                newPassword: values.newPassword,
            });
            navigate('/login', { replace: true });
        } catch (error) {
            setServerError(getApiError(error).message);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.logoWrapper}>
                <AuthLogo />
            </div>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('auth.changePasswordTitle')}</h1>
                <p className={styles.subtitle}>{t('auth.changePasswordSubtitle')}</p>
            </div>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                <Input label={t('auth.loginField')} error={errors.login?.message} {...register('login')} />
                <PasswordInput
                    label={t('auth.initialPassword')}
                    error={errors.initialPassword?.message}
                    {...register('initialPassword')}
                />
                <PasswordInput
                    label={t('auth.newPassword')}
                    error={errors.newPassword?.message}
                    {...register('newPassword')}
                />
                <PasswordInput
                    label={t('auth.confirmPassword')}
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />
                {serverError ? <div className={styles.serverError}>{serverError}</div> : null}
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? t('common.loading') : t('common.save')}
                </button>
            </form>
        </div>
    );
}
