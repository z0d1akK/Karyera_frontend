import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../api/employeeApi.js';
import { unwrapPage } from '../../../shared/lib/queryParams.js';
import { fullName } from '../../../shared/lib/format.js';
import { Input, Select } from '../../../shared/ui/Input/Input.jsx';
import page from '../../../shared/styles/page.module.css';

export function EmployeePicker({
    label,
    value,
    onChange,
    excludeIds = [],
    searchLabel,
}) {
    const { t } = useTranslation();
    const [lastName, setLastName] = useState('');
    const [pageNumber, setPageNumber] = useState(0);
    const excluded = new Set(excludeIds.filter(Boolean));

    const query = useQuery({
        queryKey: ['employee-picker', lastName, pageNumber],
        queryFn: async () => unwrapPage(await employeeApi.list({
            page: pageNumber,
            size: 20,
            sortBy: 'lastName',
            lastName: lastName || undefined,
        })),
    });

    const rows = (query.data?.content || []).filter((item) => !excluded.has(item.id) || item.id === value);

    return (
        <div className={page.stack}>
            <Input
                label={searchLabel || t('employees.lastName')}
                value={lastName}
                onChange={(event) => {
                    setLastName(event.target.value);
                    setPageNumber(0);
                }}
            />
            <Select label={label} value={value || ''} onChange={onChange}>
                <option value="">{t('common.select')}</option>
                {rows.map((item) => (
                    <option key={item.id} value={item.id}>{fullName(item)}</option>
                ))}
            </Select>
            {(query.data?.totalPages || 0) > 1 ? (
                <div className={page.row}>
                    <button type="button" disabled={pageNumber <= 0} onClick={() => setPageNumber((current) => current - 1)}>
                        {t('common.back')}
                    </button>
                    <span>{pageNumber + 1} / {query.data.totalPages}</span>
                    <button type="button" disabled={pageNumber + 1 >= query.data.totalPages} onClick={() => setPageNumber((current) => current + 1)}>
                        {t('common.next')}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
