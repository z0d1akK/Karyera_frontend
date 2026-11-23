import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../api/employeeApi.js';
import { unwrapPage } from '../../../shared/lib/queryParams.js';
import { fullName } from '../../../shared/lib/format.js';
import { Input, Select } from '../../../shared/ui/Input/Input.jsx';
import inputStyles from '../../../shared/ui/Input/Input.module.css';
import page from '../../../shared/styles/page.module.css';
import styles from './EmployeePicker.module.css';

export function EmployeePicker({
    label,
    value,
    onChange,
    excludeIds = [],
    searchLabel,
    extraOptions = [],
    searchable = false,
}) {
    const { t } = useTranslation();
    const [lastName, setLastName] = useState('');
    const [pageNumber, setPageNumber] = useState(0);
    const [open, setOpen] = useState(false);
    const [pickedLabel, setPickedLabel] = useState('');
    const rootRef = useRef(null);
    const excluded = new Set(excludeIds.filter(Boolean));

    const query = useQuery({
        queryKey: ['employee-picker', lastName, pageNumber],
        queryFn: async () => unwrapPage(await employeeApi.list({
            page: pageNumber,
            size: 20,
            sortBy: 'lastName',
            lastName: lastName || undefined,
        })),
        enabled: !searchable || open,
    });

    const extraIds = new Set(extraOptions.map((item) => item.id));
    const term = lastName.trim().toLowerCase();
    const rows = (query.data?.content || []).filter((item) => {
        if ((excluded.has(item.id) && item.id !== value) || extraIds.has(item.id)) {
            return false;
        }
        if (!searchable || !term) {
            return true;
        }
        const name = fullName(item).toLowerCase();
        return name.includes(term)
            || String(item.lastName || '').toLowerCase().includes(term)
            || String(item.firstName || '').toLowerCase().includes(term);
    });

    const selectedExtra = extraOptions.find((item) => String(item.id) === String(value));
    const selectedRow = rows.find((item) => String(item.id) === String(value));
    const selectedLabel = selectedExtra?.label
        || (selectedRow ? fullName(selectedRow) : '')
        || pickedLabel
        || '';

    const extraMatches = extraOptions;

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
                setLastName('');
                setPageNumber(0);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const pick = (id, optionLabel) => {
        setPickedLabel(optionLabel);
        onChange({ target: { value: id } });
        setOpen(false);
        setLastName('');
        setPageNumber(0);
    };

    if (!searchable) {
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
                    {extraOptions.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
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

    return (
        <div className={styles.wrap} ref={rootRef}>
            {label ? <span className={inputStyles.label}>{label}</span> : null}
            <input
                className={inputStyles.input}
                value={open ? lastName : selectedLabel}
                placeholder={searchLabel || t('common.search')}
                onFocus={() => {
                    setOpen(true);
                    setLastName('');
                }}
                onChange={(event) => {
                    setOpen(true);
                    setLastName(event.target.value);
                    setPageNumber(0);
                }}
            />
            {open ? (
                <div className={styles.menu} role="listbox">
                    {extraMatches.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.option} ${String(item.id) === String(value) ? styles.active : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pick(item.id, item.label)}
                        >
                            {item.label}
                        </button>
                    ))}
                    {rows.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.option} ${String(item.id) === String(value) ? styles.active : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pick(item.id, fullName(item))}
                        >
                            {fullName(item)}
                        </button>
                    ))}
                    {query.isFetching && !rows.length ? (
                        <p className={styles.empty}>{t('common.loading')}</p>
                    ) : null}
                    {!query.isFetching && !extraMatches.length && !rows.length ? (
                        <p className={styles.empty}>{t('common.noData')}</p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
