import { useTranslation } from 'react-i18next';

import { formatDate } from '../../../shared/lib/format.js';
import inputStyles from '../../../shared/ui/Input/Input.module.css';
import { LAST_OPTIONS, TOP_OPTIONS } from './chartMappers.js';
import styles from './ChartCard.module.css';

export function DateChip({ value, onChange, min, max, emptyLabel, ariaLabel, label }) {
    const { i18n } = useTranslation();
    const mask = String(i18n.resolvedLanguage || i18n.language || '').startsWith('en') ? 'dd.mm.yyyy' : 'дд.мм.гггг';
    const shown = value ? formatDate(value) : (emptyLabel || (label ? mask : ''));
    const control = (
        <>
            <span className={value ? styles.dateValue : styles.datePlaceholder}>
                {shown}
            </span>
            <input
                className={styles.dateNative}
                type="date"
                aria-label={ariaLabel || label}
                value={value || ''}
                min={min || undefined}
                max={max || undefined}
                onChange={(event) => onChange(event.target.value)}
            />
        </>
    );

    if (label) {
        return (
            <label className={inputStyles.field}>
                <span className={inputStyles.label}>{label}</span>
                <span className={`${styles.dateWrap} ${styles.dateFieldControl}`}>
                    {control}
                </span>
            </label>
        );
    }

    return (
        <label className={styles.dateWrap}>
            {control}
        </label>
    );
}

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

export function ChartToolbar({ grains, grain, onGrain, top, onTop, last, onLast, from, to, onFrom, onTo }) {
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
            {onFrom || onTo ? (
                <div className={styles.period}>
                    <span className={styles.groupLabel}>{t('analyticsUi.period')}</span>
                    {onFrom ? (
                        <DateChip
                            value={from}
                            max={to}
                            emptyLabel={t('analyticsUi.periodStart')}
                            ariaLabel={t('analyticsUi.periodFrom')}
                            onChange={onFrom}
                        />
                    ) : null}
                    {onFrom && onTo ? <span className={styles.periodSep}>—</span> : null}
                    {onTo ? (
                        <DateChip
                            value={to}
                            min={from}
                            emptyLabel={t('analyticsUi.periodEnd')}
                            ariaLabel={t('analyticsUi.periodTo')}
                            onChange={onTo}
                        />
                    ) : null}
                    {from || to ? (
                        <button
                            type="button"
                            className={styles.periodClear}
                            onClick={() => {
                                onFrom?.('');
                                onTo?.('');
                            }}
                        >
                            {t('common.clear')}
                        </button>
                    ) : null}
                </div>
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
