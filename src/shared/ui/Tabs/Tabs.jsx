import styles from './Tabs.module.css';

export function Tabs({ items, value, onChange, actions }) {
    return (
        <div className={styles.row}>
            <div className={styles.tabs}>
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`${styles.tab} ${value === item.id ? styles.active : ''}`}
                        onClick={() => onChange(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
    );
}
