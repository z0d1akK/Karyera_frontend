import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { enumLabel } from '../../../shared/lib/enums.js';
import { Input, Select } from '../../../shared/ui/Input/Input.jsx';
import { Button } from '../../../shared/ui/Button/Button.jsx';
import page from '../../../shared/styles/page.module.css';

const EMPLOYMENT = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];

export function EmployeeForm({
    values,
    onSubmit,
    catalogs,
    submitting,
    includeStatus = true,
    includeOrg = true,
    includeDepartment = false,
    requireAssignment = false,
    submitLabel,
    onCancel,
    errors = {},
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState(values || {});

    const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    return (
        <form
            className={page.stack}
            onSubmit={(event) => {
                event.preventDefault();
                const payload = Object.fromEntries(
                    Object.entries(form).filter(([, value]) => value !== '' && value !== undefined),
                );
                if (!includeStatus) {
                    delete payload.employmentStatus;
                }
                if (!includeOrg) {
                    delete payload.hireDate;
                    delete payload.positionId;
                    delete payload.gradeId;
                    if (!includeDepartment) {
                        delete payload.departmentId;
                    }
                    delete payload.specializationId;
                    delete payload.maxSubordinates;
                    delete payload.employmentStatus;
                }
                if (payload.maxSubordinates !== undefined) {
                    payload.maxSubordinates = Number(payload.maxSubordinates);
                }
                onSubmit(payload);
            }}
        >
            <div className={page.grid}>
                <Input label={t('form.lastName')} value={form.lastName || ''} onChange={set('lastName')} error={errors.lastName} required />
                <Input label={t('form.firstName')} value={form.firstName || ''} onChange={set('firstName')} error={errors.firstName} required />
                <Input label={t('form.middleName')} value={form.middleName || ''} onChange={set('middleName')} error={errors.middleName} />
                <Input label={t('form.email')} type="email" value={form.email || ''} onChange={set('email')} error={errors.email} required />
                <Input label={t('form.birthDate')} type="date" value={form.birthDate || ''} onChange={set('birthDate')} error={errors.birthDate} />
                {includeOrg ? (
                <>
                <Input label={t('form.hireDate')} type="date" value={form.hireDate || ''} onChange={set('hireDate')} error={errors.hireDate} required />
                <Select label={t('form.position')} value={form.positionId || ''} onChange={set('positionId')} error={errors.positionId} required={requireAssignment}>
                    <option value="">{t('common.notSelected')}</option>
                    {(catalogs.positions || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </Select>
                <Select label={t('form.grade')} value={form.gradeId || ''} onChange={set('gradeId')} error={errors.gradeId} required={requireAssignment}>
                    <option value="">{t('common.notSelected')}</option>
                    {(catalogs.grades || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </Select>
                </>
                ) : null}
                {includeOrg || includeDepartment ? (
                <Select label={t('form.department')} value={form.departmentId || ''} onChange={set('departmentId')} error={errors.departmentId}>
                    <option value="">{t('common.notSelected')}</option>
                    {(catalogs.departments || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </Select>
                ) : null}
                {includeOrg ? (
                <>
                <Select label={t('form.specialization')} value={form.specializationId || ''} onChange={set('specializationId')}>
                    <option value="">{t('common.notSelected')}</option>
                    {(catalogs.specializations || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </Select>
                {includeStatus ? (
                    <Select label={t('form.status')} value={form.employmentStatus || 'ACTIVE'} onChange={set('employmentStatus')}>
                        {EMPLOYMENT.map((status) => (
                            <option key={status} value={status}>{enumLabel(t, 'employmentStatus', status)}</option>
                        ))}
                    </Select>
                ) : null}
                <Input
                    type="number"
                    min="0"
                    max="1000"
                    label={t('form.maxSubordinates')}
                    value={form.maxSubordinates ?? ''}
                    onChange={set('maxSubordinates')}
                />
                </>
                ) : null}
            </div>
            <div className={page.row}>
                <Button type="submit" disabled={submitting}>{submitLabel || t('common.save')}</Button>
                {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button> : null}
            </div>
        </form>
    );
}
