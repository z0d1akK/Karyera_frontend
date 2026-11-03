import { useTranslation } from 'react-i18next';

import { Button } from '../Button/Button.jsx';
import styles from './DataTable.module.css';

export function DataTable({ columns, rows, empty, onRowClick }) {
    const { t } = useTranslation();
    const emptyText = empty || t('common.noData');
    if (!rows?.length) {
        return <p className={styles.empty}>{emptyText}</p>;
    }

    return (
        <div className={styles.wrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.id}
                            className={onRowClick ? styles.clickable : undefined}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((column) => (
                                <td key={column.key} className={column.wrap ? styles.wrapCell : undefined}>
                                    {column.render ? column.render(row) : row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({ page, totalPages, onChange }) {
    const { t } = useTranslation();
    if (!totalPages || totalPages <= 1) {
        return null;
    }

    return (
        <div className={styles.pagination}>
            <Button variant="ghost" disabled={page <= 0} onClick={() => onChange(page - 1)}>
                {t('common.back')}
            </Button>
            <span>
                {page + 1} / {totalPages}
            </span>
            <Button variant="ghost" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
                {t('common.next')}
            </Button>
        </div>
    );
}
