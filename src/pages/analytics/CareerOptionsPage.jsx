import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { catalogName, formatScorePercent, scoreToPercent } from '../../shared/lib/format.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Select } from '../../shared/ui/Input/Input.jsx';
import { PageState, Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { ProgressBar, ProgressRing } from '../../shared/ui/Progress/Progress.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';
import styles from './CareerOptionsPage.module.css';

export function CareerOptionsPage() {
    const { id: routeId } = useParams();
    const location = useLocation();
    const { t } = useTranslation();
    const self = useAuthStore((state) => state.employee);
    const catalogs = useCatalogs();
    const push = useToastStore((state) => state.push);
    const employeeId = routeId || self?.id;
    const isSelf = Boolean(self?.id) && (!routeId || routeId === self.id);
    const [trackId, setTrackId] = useState('');
    const tracks = useQuery({
        queryKey: ['career', 'tracks', 'options'],
        queryFn: async () => unwrapPage(await careerApi.listTracks({ page: 0, size: 50, sortBy: 'name', sortDirection: 'ASC' })),
    });
    const start = useMutation({
        mutationFn: () => analyticsApi.startCareerOptions(employeeId, { trackId, maxOptions: 5 }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    useEffect(() => {
        const first = tracks.data?.content?.[0]?.id;
        if (!trackId && first) {
            setTrackId(first);
        }
    }, [trackId, tracks.data]);

    const options = start.data?.options || [];
    const selectedTrack = (tracks.data?.content || []).find((item) => String(item.id) === String(trackId));
    const positionName = (row) => (
        row.targetPositionName
        || row.positionName
        || catalogName((catalogs.positions || []).find((item) => String(item.id) === String(row.targetPositionId)))
        || t('analyticsUi.noPositionName')
    );
    const gradeName = (row) => (
        row.targetGradeName
        || catalogName((catalogs.grades || []).find((item) => String(item.id) === String(row.targetGradeId)))
        || t('analyticsUi.noGradeName')
    );
    const errorText = start.isError ? getApiError(start.error).message : '';
    const from = typeof location.state?.from === 'string' ? location.state.from : null;
    const backTo = from || (isSelf ? '/app/career' : `/app/analytics/employees/${employeeId}`);
    const renderOption = (row, index, ready) => {
        const total = scoreToPercent(row.totalScore) ?? 0;
        const skills = scoreToPercent(row.skillScore) ?? 0;
        return (
            <Card key={row.assessmentId || `${row.targetPositionId}-${ready ? 'r' : 'u'}-${index}`}>
                <div className={styles.optionHead}>
                    <div className={styles.optionTitle}>
                        <Badge>{ready ? t('analyticsUi.optionRank', { rank: index + 1 }) : t('analyticsUi.optionUnranked')}</Badge>
                        <h2>{positionName(row)}</h2>
                        <p className={styles.optionMeta}>{gradeName(row)}</p>
                    </div>
                    <ProgressRing value={total} />
                </div>
                <div className={styles.scores}>
                    <div className={styles.bars}>
                        <ProgressBar value={total} label={t('analyticsUi.score')} />
                        <ProgressBar value={skills} label={t('analyticsUi.skillScore')} />
                    </div>
                    <div className={styles.facts}>
                        <Badge tone={ready ? 'success' : 'danger'}>
                            {ready ? t('analyticsUi.mandatoryMet') : t('analyticsUi.mandatoryNotMet')}
                        </Badge>
                        <Badge tone={Number(row.missingSkillsCount) > 0 ? 'warning' : 'success'}>
                            {t('analyticsUi.missingSkillsCount')}: {row.missingSkillsCount ?? 0}
                        </Badge>
                    </div>
                </div>
                {row.assessmentId ? (
                    <div className={page.row}>
                        <Link to={`/app/career/assessments/${row.assessmentId}`}>{t('analyticsUi.openAssessment')}</Link>
                    </div>
                ) : null}
            </Card>
        );
    };
    const ranked = options.filter((row) => row.mandatoryRequirementsMet);
    const unranked = options.filter((row) => !row.mandatoryRequirementsMet);
    const readyCount = ranked.length;
    const bestScore = ranked.reduce((best, row) => {
        const value = scoreToPercent(row.totalScore);
        if (value == null) {
            return best;
        }
        return best == null ? value : Math.max(best, value);
    }, null);

    return (
        <section className={page.sections}>
            {backTo ? <BackLink to={backTo}>{t('common.back')}</BackLink> : null}
            <div className={page.pageHead}>
                <PageHeader title={t('analyticsUi.careerOptions')} description={t('analyticsUi.careerOptionsHint')} />
                {isSelf ? <AnalyticsNav /> : null}
            </div>
            <Card>
                <div className={styles.formRow}>
                    <div className={styles.trackField}>
                        <Select label={t('career.tracks')} value={trackId} onChange={(event) => setTrackId(event.target.value)}>
                            {(tracks.data?.content || []).map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </Select>
                    </div>
                    <Button disabled={!employeeId || !trackId || start.isPending} onClick={() => start.mutate()}>
                        {start.isPending ? t('analyticsUi.waiting') : t('analyticsUi.startOptions')}
                    </Button>
                </div>
                {selectedTrack ? (
                    <p className={styles.trackMeta}>
                        {[
                            selectedTrack.description,
                            selectedTrack.type ? enumLabel(t, 'trackType', selectedTrack.type) : null,
                            selectedTrack.status ? enumLabel(t, 'trackStatus', selectedTrack.status) : null,
                        ].filter(Boolean).join(' · ') || null}
                        {selectedTrack.description || selectedTrack.type || selectedTrack.status ? ' · ' : null}
                        <Link to={`/app/career/tracks/${selectedTrack.id}`}>{t('analyticsUi.openTrack')}</Link>
                    </p>
                ) : null}
            </Card>
            {start.isError ? <PageState title={t('errors.loadFailed')} description={errorText} /> : null}
            {start.isPending ? <Skeleton rows={5} /> : null}
            {!start.isPending && !start.isError && !start.data ? (
                <PageState
                    title={tracks.data?.content?.length ? t('analyticsUi.optionsEmpty') : t('analyticsUi.optionsEmptyTracks')}
                    description={t('analyticsUi.careerOptionsHint')}
                />
            ) : null}
            {start.data ? (
                <>
                    <StatRow columns={3}>
                        <StatTile label={t('analyticsUi.compared')} value={options.length} />
                        <StatTile label={t('analyticsUi.readyOptions')} value={readyCount} tone="success" />
                        <StatTile
                            label={t('analyticsUi.bestScore')}
                            value={bestScore == null ? '—' : `${Math.round(bestScore)}%`}
                            tone="accent"
                        />
                    </StatRow>
                    {start.data.interpretationSummary ? (
                        <Card>
                            <h2 className={page.sectionTitle}>{t('analyticsUi.interpretation')}</h2>
                            <p className={styles.trackMeta}>{start.data.interpretationSummary}</p>
                        </Card>
                    ) : null}
                    {options.length ? (
                        <>
                            {ranked.map((row, index) => renderOption(row, index, true))}
                            {unranked.map((row, index) => renderOption(row, index, false))}
                        </>
                    ) : (
                        <PageState title={t('common.noData')} description={t('analyticsUi.optionsEmpty')} />
                    )}
                </>
            ) : null}
        </section>
    );
}
