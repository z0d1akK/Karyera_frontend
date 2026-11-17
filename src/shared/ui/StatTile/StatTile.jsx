import styles from './StatTile.module.css';

export function StatTile({ label, value, hint, tone = 'default' }) {
    return (
        <div className={styles.tile}>
            <span>{label}</span>
            <div className={styles.valueRow}>
                <strong className={styles[tone]}>{value}</strong>
                {hint != null && hint !== '' ? <em className={styles.hint}>{hint}</em> : null}
            </div>
        </div>
    );
}

export function StatRow({ children, columns }) {
    const className = columns === 3 ? `${styles.row} ${styles.cols3}` : styles.row;
    return <div className={className}>{children}</div>;
}
