import styles from './Input.module.css';

export function Input({ label, error, className = '', id, ...props }) {
    const inputId = id || props.name;

    return (
        <label className={styles.field}>
            {label ? <span className={styles.label}>{label}</span> : null}
            <input
                id={inputId}
                className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
                {...props}
            />
            {error ? <span className={styles.error}>{error}</span> : null}
        </label>
    );
}

export function Textarea({ label, error, className = '', ...props }) {
    return (
        <label className={styles.field}>
            {label ? <span className={styles.label}>{label}</span> : null}
            <textarea
                className={`${styles.textarea} ${error ? styles.inputError : ''} ${className}`}
                {...props}
            />
            {error ? <span className={styles.error}>{error}</span> : null}
        </label>
    );
}

export function Select({ label, error, children, className = '', ...props }) {
    return (
        <label className={styles.field}>
            {label ? <span className={styles.label}>{label}</span> : null}
            <select
                className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
                {...props}
            >
                {children}
            </select>
            {error ? <span className={styles.error}>{error}</span> : null}
        </label>
    );
}
