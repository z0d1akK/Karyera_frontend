import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../Button/Button.jsx';
import { Select } from '../Input/Input.jsx';
import styles from './ListFilters.module.css';

export function ListFilters({ children }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <div className={styles.wrap}>
            <Button variant="secondary" onClick={() => setOpen((value) => !value)}>
                {t('common.filters')}
            </Button>
            {open ? <div className={styles.panel}>{children}</div> : null}
        </div>
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
