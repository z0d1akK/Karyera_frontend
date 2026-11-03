import styles from './StatTile.module.css';

export function StatTile({ label, value, tone = 'default' }) {
    return (
        <div className={styles.tile}>
            <span>{label}</span>
            <strong className={styles[tone]}>{value}</strong>
        </div>
    );
}

export function StatRow({ children }) {
    return <div className={styles.row}>{children}</div>;
}
