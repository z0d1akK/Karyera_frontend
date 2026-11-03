import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../../features/auth/api/authApi.js';
import { formatDateTime } from '../../shared/lib/format.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { canManageAdmin } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { AdminNav } from './AdminNav.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { PasswordInput } from '../../shared/ui/PasswordInput/PasswordInput.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import page from '../../shared/styles/page.module.css';

export function UserDetailsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const role = useAuthStore((s) => s.session?.role);
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [temporaryPassword, setTemporaryPassword] = useState('');
    const [roleDraft, setRoleDraft] = useState('');

    const query = useQuery({
        queryKey: ['users', id],
        queryFn: () => authApi.getUser(id),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users', id] });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });

    const activate = useMutation({ mutationFn: () => authApi.activateUser(id), onSuccess: invalidate, onError });
    const deactivate = useMutation({ mutationFn: () => authApi.deactivateUser(id), onSuccess: invalidate, onError });
    const reset = useMutation({
        mutationFn: () => authApi.resetUserPassword(id, temporaryPassword),
        onSuccess: () => {
            setTemporaryPassword('');
            push({ type: 'success', message: t('admin.tempPasswordSet') });
        },
        onError,
    });
    const update = useMutation({
        mutationFn: (payload) => authApi.updateUser(id, payload),
        onSuccess: invalidate,
        onError,
    });
    const remove = useMutation({
        mutationFn: () => authApi.deleteUser(id),
        onSuccess: () => {
            push({ type: 'success', message: t('admin.userDeleted') });
            navigate('/app/admin/users');
        },
        onError,
    });

    if (query.isLoading) {
        return <Skeleton />;
    }

    const user = query.data;

    return (
        <section>
            <BackLink to="/app/admin/users">{t('common.back')}</BackLink>
            <PageHeader title={user.email} description={t('admin.passwordHidden')} />
            <AdminNav />
            <Card>
                <div className={page.stack}>
                    <div>{t('admin.role')}: {enumLabel(t, 'role', user.role)}</div>
                    <div>{t('admin.status')}: <Badge tone={user.active ? 'success' : 'danger'}>{user.active ? t('admin.active') : t('admin.blocked')}</Badge></div>
                    <div>{t('admin.employee')}: {user.employeeId ? <Link to={`/app/employees/${user.employeeId}`}>{user.employeeId}</Link> : '—'}</div>
                    <div>{t('admin.createdAt')}: {formatDateTime(user.createdAt)}</div>
                    {canManageAdmin(role) ? (
                        <>
                            <Select
                                label={t('admin.role')}
                                value={roleDraft || user.role}
                                onChange={(e) => setRoleDraft(e.target.value)}
                            >
                                {['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'].map((item) => (
                                    <option key={item} value={item}>{enumLabel(t, 'role', item)}</option>
                                ))}
                            </Select>
                            <Button
                                onClick={() => update.mutate({ role: roleDraft || user.role, active: user.active })}
                                disabled={!roleDraft || roleDraft === user.role}
                            >
                                {t('common.save')}
                            </Button>
                            {roleDraft && roleDraft !== user.role ? (
                                <Button variant="ghost" onClick={() => setRoleDraft('')}>{t('common.cancel')}</Button>
                            ) : null}
                            <div className={page.row}>
                                <Button onClick={() => activate.mutate()}>{t('admin.activate')}</Button>
                                <Button variant="danger" onClick={() => deactivate.mutate()}>{t('admin.deactivate')}</Button>
                            </div>
                            <PasswordInput
                                label={t('admin.newTempPassword')}
                                value={temporaryPassword}
                                onChange={(e) => setTemporaryPassword(e.target.value)}
                            />
                            <Button onClick={() => reset.mutate()} disabled={temporaryPassword.length < 12}>
                                {t('admin.resetPassword')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => remove.mutate()}
                            >
                                {t('admin.deleteUser')}
                            </Button>
                        </>
                    ) : null}
                </div>
            </Card>
        </section>
    );
}
