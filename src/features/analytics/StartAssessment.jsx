import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';

import { analyticsApi } from './api/analyticsApi.js';
import { useCatalogs } from '../employees/hooks/useCatalogs.js';
import { getApiError } from '../../shared/api/errors.js';
import { useToastStore } from '../../store/toastStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';

export function StartAssessment({ employeeId, positionId = '', gradeId = '' }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const catalogs = useCatalogs();
    const push = useToastStore((state) => state.push);
    const [form, setForm] = useState({ targetPositionId: positionId, targetGradeId: gradeId });
    const start = useMutation({
        mutationFn: () => analyticsApi.startAssessment({
            employeeId,
            targetPositionId: form.targetPositionId,
            targetGradeId: form.targetGradeId,
            mode: 'SKILLS_AND_EXPERIENCE',
            generateRecommendations: true,
        }),
        onSuccess: (assessmentId) => navigate(`/app/career/assessments/${assessmentId}`),
        onError: (error) => push({ type: 'error', message: getApiError(error).message || error.message }),
    });

    return (
        <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
            <Select label={t('employees.position')} value={form.targetPositionId} onChange={(event) => setForm({ ...form, targetPositionId: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {(catalogs.positions || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Select label={t('employees.grade')} value={form.targetGradeId} onChange={(event) => setForm({ ...form, targetGradeId: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {(catalogs.grades || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Button variant="coral" disabled={!form.targetPositionId || !form.targetGradeId || start.isPending} onClick={() => start.mutate()}>
                {start.isPending ? t('analyticsUi.waiting') : t('analyticsUi.start')}
            </Button>
        </div>
    );
}
