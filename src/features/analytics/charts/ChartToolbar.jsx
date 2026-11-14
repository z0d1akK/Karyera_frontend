import { useTranslation } from 'react-i18next';

import { LAST_OPTIONS, TOP_OPTIONS } from './chartMappers.js';
import styles from './ChartCard.module.css';

function Segmented({ label, value, onChange, options }) {
    return (
        <div className={styles.group} role="radiogroup" aria-label={label}>
            <span className={styles.groupLabel}>{label}</span>
            <div className={styles.segments}>
                {options.map((option) => {
                    const selected = String(option.value) === String(value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`${styles.segment} ${selected ? styles.segmentActive : ''}`}
                            onClick={() => onChange(option.value)}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function ChartToolbar({ grains, grain, onGrain, top, onTop, last, onLast }) {
    const { t } = useTranslation();
    return (
        <div className={styles.toolbar}>
            {Array.isArray(grains) && grains.length > 0 && onGrain ? (
                <Segmented
                    label={t('analyticsUi.grain.label')}
                    value={grain}
                    onChange={onGrain}
                    options={grains.map((item) => ({
                        value: item,
                        label: t(`analyticsUi.grain.${item.toLowerCase()}`),
                    }))}
                />
            ) : null}
            {onTop ? (
                <Segmented
                    label={t('analyticsUi.topLimit')}
                    value={top}
                    onChange={(value) => onTop(Number(value))}
                    options={TOP_OPTIONS.map((item) => ({ value: item, label: String(item) }))}
                />
            ) : null}
            {onLast ? (
                <Segmented
                    label={t('analyticsUi.pointsLimit')}
                    value={last}
                    onChange={(value) => onLast(Number(value))}
                    options={LAST_OPTIONS.map((item) => ({
                        value: item,
                        label: item ? String(item) : t('analyticsUi.allPoints'),
                    }))}
                />
            ) : null}
        </div>
    );
}
