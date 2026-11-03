import { Button } from '../Button/Button.jsx';
import styles from './PageState.module.css';

export function PageState({ title, description, actionLabel, onAction }) {
    return (
        <div className={styles.state}>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
            {onAction ? (
                <Button onClick={onAction}>{actionLabel}</Button>
            ) : null}
        </div>
    );
}

export function Skeleton({ rows = 4 }) {
    return (
        <div className={styles.skeleton}>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className={styles.line} />
            ))}
        </div>
    );
}
