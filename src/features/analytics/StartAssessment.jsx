import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';

import { analyticsApi } from './api/analyticsApi.js';
import { useCatalogs } from '../employees/hooks/useCatalogs.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import styles from './StartAssessment.module.css';

export function StartAssessment({ employeeId, positionId = '', gradeId = '' }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const catalogs = useCatalogs();
    const push = useToastStore((state) => state.push);
    const [form, setForm] = useState({ targetPositionId: positionId, targetGradeId: gradeId, mode: 'FULL' });
    const start = useMutation({
        mutationFn: () => analyticsApi.startAssessment({
            employeeId,
            targetPositionId: form.targetPositionId,
            targetGradeId: form.targetGradeId,
            mode: form.mode,
            generateRecommendations: true,
        }),
        onSuccess: (assessmentId) => navigate(`/app/career/assessments/${assessmentId}`),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const errorText = start.isError ? getApiError(start.error).message : '';

    return (
        <Card>
            <div className={styles.head}>
                <h2 className={styles.title}>{t('analyticsUi.start')}</h2>
                <p className={styles.hint}>{t('analyticsUi.startHint')}</p>
            </div>
            <div className={styles.fields}>
                <Select label={t('employees.position')} value={form.targetPositionId} onChange={(event) => setForm({ ...form, targetPositionId: event.target.value })}>
                    <option value="">{t('common.select')}</option>
                    {(catalogs.positions || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <Select label={t('employees.grade')} value={form.targetGradeId} onChange={(event) => setForm({ ...form, targetGradeId: event.target.value })}>
                    <option value="">{t('common.select')}</option>
                    {(catalogs.grades || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <Select label={t('analyticsUi.mode')} value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
                    <option value="SKILLS">{t('analyticsUi.modeSkills')}</option>
                    <option value="SKILLS_AND_EXPERIENCE">{t('analyticsUi.modeSkillsExperience')}</option>
                    <option value="FULL">{t('analyticsUi.modeFull')}</option>
                </Select>
                <Button disabled={!form.targetPositionId || !form.targetGradeId || start.isPending} onClick={() => start.mutate()}>
                    {start.isPending ? t('analyticsUi.waiting') : t('analyticsUi.start')}
                </Button>
            </div>
            {errorText ? <p className={styles.error}>{errorText}</p> : null}
        </Card>
    );
}
