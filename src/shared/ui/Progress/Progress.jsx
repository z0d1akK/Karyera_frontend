import styles from './Progress.module.css';

export function ProgressBar({ value = 0, label }) {
    const percent = Math.max(0, Math.min(100, Number(value) || 0));

    return (
        <div>
            {label ? <div className={styles.label}><span>{label}</span><strong>{percent}%</strong></div> : null}
            <div className={styles.track} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

export function ProgressRing({ value = 0 }) {
    const percent = Math.max(0, Math.min(100, Number(value) || 0));
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className={styles.ringWrap}>
            <svg viewBox="0 0 72 72" className={styles.ring}>
                <circle cx="36" cy="36" r={radius} className={styles.ringTrack} />
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    className={styles.ringValue}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <strong>{percent}%</strong>
        </div>
    );
}
