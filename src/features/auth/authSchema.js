import { z } from 'zod';

export function loginSchema(t) {
    return z.object({
        login: z.string().min(1, t('validation.loginRequired')),
        password: z.string().min(1, t('validation.passwordRequired')),
    });
}

export function changeInitialPasswordSchema(t) {
    return z
        .object({
            login: z.string().min(1, t('validation.loginRequired')),
            initialPassword: z.string().min(1, t('validation.tempPasswordRequired')),
            newPassword: z.string().min(12, t('validation.passwordMin')),
            confirmPassword: z.string().min(1, t('validation.confirmRequired')),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t('validation.passwordsMismatch'),
            path: ['confirmPassword'],
        });
}
