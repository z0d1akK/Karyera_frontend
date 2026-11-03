import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../Button/Button.jsx';
import { Select } from '../Input/Input.jsx';
import styles from './ListFilters.module.css';

export function CollapsePanel({ label, children, open, onOpenChange, variant = 'form', align = 'start', overlay = false }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const controlled = open !== undefined;
    const shown = controlled ? open : internalOpen;

    const toggle = () => {
        const next = !shown;
        if (!controlled) {
            setInternalOpen(next);
        }
        onOpenChange?.(next);
    };

    const className = [
        styles.wrap,
        align === 'end' ? styles.wrapEnd : '',
        overlay ? styles.wrapOverlay : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={className}>
            <div className={styles.toggleRow}>
                <Button variant="secondary" onClick={toggle}>
                    {label}
                </Button>
            </div>
            {shown ? (
                <div className={variant === 'filters' ? styles.panel : styles.formPanel}>
                    {children}
                </div>
            ) : null}
        </div>
    );
}

export function ListFilters({ children, overlay = false }) {
    const { t } = useTranslation();
    return (
        <CollapsePanel label={t('common.filters')} variant="filters" align="end" overlay={overlay}>
            {children}
        </CollapsePanel>
    );
}

export function SortField({ value, direction = 'ASC', options, onChange }) {
    const { t } = useTranslation();

    return (
        <Select
            label={t('common.sort')}
            value={`${value}:${direction}`}
            onChange={(event) => {
                const [sortBy, sortDirection] = event.target.value.split(':');
                onChange(sortBy, sortDirection);
            }}
        >
            {options.map((option) => (
                <option key={`${option.value}:ASC`} value={`${option.value}:ASC`}>
                    {t('common.sortAsc', { field: option.label })}
                </option>
            ))}
            {options.map((option) => (
                <option key={`${option.value}:DESC`} value={`${option.value}:DESC`}>
                    {t('common.sortDesc', { field: option.label })}
                </option>
            ))}
        </Select>
    );
}

export function PageSizeField({ value, onChange }) {
    const { t } = useTranslation();

    return (
        <Select label={t('common.pageSize')} value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
            {[20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
            ))}
        </Select>
    );
}
