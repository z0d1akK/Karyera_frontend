import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { StartAssessment } from '../../features/analytics/StartAssessment.jsx';
import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { formatDate, fullName } from '../../shared/lib/format.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

export function EmployeeAnalyticsPage() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employee = useQuery({ queryKey: ['employees', id], queryFn: () => employeeApi.getById(id) });
    const assessments = useQuery({ queryKey: ['analytics', 'assessments', id], queryFn: () => analyticsApi.assessments(id) });
    const dynamics = useQuery({ queryKey: ['analytics', 'dynamics', id], queryFn: () => analyticsApi.dynamics(id) });

    if (employee.isLoading) {
        return <Skeleton rows={4} />;
    }
    if (employee.isError) {
        return <PageState title={t('errors.loadFailed')} onAction={employee.refetch} actionLabel={t('common.retry')} />;
    }

    return (
        <section className={page.sections}>
            <BackLink to="/app/analytics/employees">{t('common.back')}</BackLink>
            <PageHeader
                title={fullName(employee.data)}
                description={t('analyticsUi.development')}
                actions={(
                    <Button variant="ghost" onClick={() => navigate(`/app/analytics/employees/${id}/career-options`)}>
                        {t('analyticsUi.careerOptions')}
                    </Button>
                )}
            />
            <AnalyticsNav />
            <StartAssessment employeeId={id} positionId={employee.data.position?.id || ''} gradeId={employee.data.grade?.id || ''} />
            <Card>
            <h2 className={page.sectionTitle}>{t('analyticsUi.score')}</h2>
            <DataTable
                rows={assessments.data || []}
                    columns={[
                    { key: 'date', header: t('time.date'), render: (row) => formatDate(row.calculatedAt) },
                    { key: 'score', header: t('analyticsUi.score'), render: (row) => row.totalScore ?? '—' },
                    { key: 'skills', header: t('analyticsUi.skillScore'), render: (row) => row.skillScore ?? '—' },
                    { key: 'open', header: '', render: (row) => <Link to={`/app/career/assessments/${row.id}`}>{t('analyticsUi.openAssessment')}</Link> },
                ]}
            />
            </Card>
            <Card>
            <h2 className={page.sectionTitle}>{t('analyticsUi.development')}</h2>
            {(dynamics.data?.points || []).length ? (
                <ul>
                    {dynamics.data.points.map((point) => (
                        <li key={point.assessmentId}>{formatDate(point.calculatedAt)} — {point.totalScore}</li>
                    ))}
                </ul>
            ) : <p>{t('common.noData')}</p>}
            </Card>
        </section>
    );
}
