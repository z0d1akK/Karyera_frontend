import styles from './Badge.module.css';

export function Badge({ children, tone = 'neutral' }) {
    return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
