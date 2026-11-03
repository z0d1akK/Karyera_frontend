import styles from './Alert.module.css';

export function Alert({ tone = 'warning', children }) {
    return <div className={`${styles.alert} ${styles[tone]}`}>{children}</div>;
}
