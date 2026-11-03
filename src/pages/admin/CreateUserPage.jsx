import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { authApi } from '../../features/auth/api/authApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { EmployeeForm } from '../../features/employees/components/EmployeeForm.jsx';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { getApiError } from '../../shared/api/errors.js';
import { fullName } from '../../shared/lib/format.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { useToastStore } from '../../store/toastStore.js';
import { canManageAdmin } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { AdminNav } from './AdminNav.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Tabs } from '../../shared/ui/Tabs/Tabs.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { toSpringSort, unwrapPage } from '../../shared/lib/queryParams.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { PasswordInput } from '../../shared/ui/PasswordInput/PasswordInput.jsx';
import page from '../../shared/styles/page.module.css';

export function CreateUserPage() {
    const { t } = useTranslation();
    const catalogs = useCatalogs();
    const sessionRole = useAuthStore((s) => s.session?.role);
    const accountRoles = canManageAdmin(sessionRole) ? ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] : ['EMPLOYEE', 'MANAGER'];
    const navigate = useNavigate();
    const push = useToastStore((s) => s.push);
    const [tab, setTab] = useState('employee');
    const [createdEmployee, setCreatedEmployee] = useState(null);
    const [account, setAccount] = useState({ employeeId: '', role: 'EMPLOYEE', initialPassword: '' });

    const takenIds = useQuery({
        queryKey: ['users', 'employee-ids'],
        queryFn: async () => {
            const first = unwrapPage(await authApi.getUsers({ page: 0, size: 100, sort: toSpringSort('email', 'ASC') }));
            const pages = [first];
            const last = Math.min(first.totalPages || 1, 5);
            for (let pageNumber = 1; pageNumber < last; pageNumber += 1) {
                pages.push(unwrapPage(await authApi.getUsers({ page: pageNumber, size: 100, sort: toSpringSort('email', 'ASC') })));
            }
            return pages.flatMap((pageData) => pageData.content.map((user) => user.employeeId).filter(Boolean));
        },
    });

    const createEmployee = useMutation({
        mutationFn: (payload) => employeeApi.create(payload),
        onSuccess: (data) => {
            setCreatedEmployee(data);
            setAccount((current) => ({ ...current, employeeId: data.id }));
            setTab('account');
            push({ type: 'success', message: t('admin.employeeCreated') });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const createUser = useMutation({
        mutationFn: () => authApi.createUser(account),
        onSuccess: (data) => {
            push({ type: 'success', message: t('admin.accountCreated') });
            navigate(`/app/admin/users/${data.id}`);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    return (
        <section>
            <BackLink to="/app/admin/users">{t('common.back')}</BackLink>
            <PageHeader title={t('admin.createTitle')} description={t('admin.createHint')} />
            <AdminNav />
            <Tabs
                items={[
                    { id: 'employee', label: t('admin.tabEmployee') },
                    { id: 'account', label: t('admin.tabAccount') },
                ]}
                value={tab}
                onChange={setTab}
            />
            <Card>
                {tab === 'employee' ? (
                    <EmployeeForm
                        catalogs={catalogs}
                        requireAssignment
                        submitting={createEmployee.isPending}
                        submitLabel={t('admin.createProfile')}
                        values={{ employmentStatus: 'ACTIVE' }}
                        onSubmit={(values) => {
                            const payload = { ...values };
                            delete payload.userId;
                            createEmployee.mutate(payload);
                        }}
                    />
                ) : (
                    <form
                        className={page.stack}
                        onSubmit={(event) => {
                            event.preventDefault();
                            createUser.mutate();
                        }}
                    >
                        {createdEmployee ? <p>{t('admin.createdProfile', { name: fullName(createdEmployee) })}</p> : null}
                        <EmployeePicker
                            label={t('admin.employeeWithoutAccount')}
                            value={account.employeeId}
                            excludeIds={(takenIds.data || []).filter((employeeId) => employeeId !== account.employeeId)}
                            onChange={(e) => setAccount({ ...account, employeeId: e.target.value })}
                        />
                        <Select label={t('admin.role')} value={account.role} onChange={(e) => setAccount({ ...account, role: e.target.value })}>
                            {accountRoles.map((role) => (
                                <option key={role} value={role}>{enumLabel(t, 'role', role)}</option>
                            ))}
                        </Select>
                        <PasswordInput
                            label={t('admin.initialPassword')}
                            value={account.initialPassword}
                            onChange={(e) => setAccount({ ...account, initialPassword: e.target.value })}
                        />
                        <p className={page.meta}>{t('admin.passwordHint')}</p>
                        <Button type="submit" disabled={createUser.isPending}>{t('admin.createAccount')}</Button>
                    </form>
                )}
            </Card>
        </section>
    );
}
