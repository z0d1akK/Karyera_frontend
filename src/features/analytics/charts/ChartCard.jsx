import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '../../../shared/ui/Button/Button.jsx';
import { Card } from '../../../shared/ui/Card/Card.jsx';
import { PageState } from '../../../shared/ui/PageState/PageState.jsx';
import styles from './ChartCard.module.css';

export function ChartCard({ title, to, empty, emptyTitle, compact, donut, details, toolbar, caption, height, className = '', children }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <Card className={`${styles.shell} ${className}`}>
            <div className={styles.body}>
                <div className={styles.titleRow}>
                    <h2 className={styles.title}>{title}</h2>
                    {details || to ? (
                        <div className={styles.actions}>
                            {to ? <Link className={styles.more} to={to}>{t('common.more')}</Link> : null}
                            {details ? (
                                <Button variant="ghost" className={styles.tableBtn} onClick={() => setOpen((value) => !value)}>
                                    {open ? t('analyticsUi.hideTable') : t('analyticsUi.tableAndFilters')}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                {toolbar || null}
                {empty ? <PageState title={emptyTitle || t('analyticsUi.emptyChart')} /> : (
                    <div
                        className={`${styles.chart} ${compact ? styles.compact : ''} ${donut ? styles.donut : ''}`}
                        style={height ? { height, minHeight: height } : undefined}
                    >
                        {children}
                    </div>
                )}
                {caption ? <p className={styles.caption}>{caption}</p> : null}
                {open ? <div className={styles.details}>{details}</div> : null}
            </div>
        </Card>
    );
}
