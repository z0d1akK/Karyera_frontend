import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DndContext, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectApi } from '../../features/projects/api/projectApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { getApiError } from '../../shared/api/errors.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { isProjectEditor } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { CollapsePanel } from '../../shared/ui/ListFilters/ListFilters.jsx';
import page from '../../shared/styles/page.module.css';
import styles from './Board.module.css';

function BoardCard({ task, onOpen, label }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <button
            ref={setNodeRef}
            type="button"
            className={styles.card}
            style={style}
            onClick={() => onOpen(task.id)}
            {...listeners}
            {...attributes}
        >
            <small>{task.key}</small>
            <strong>{task.title}</strong>
            <span>{label}</span>
        </button>
    );
}

function BoardColumn({ column, children }) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    return (
        <div ref={setNodeRef} className={styles.column} data-column-id={column.id} id={column.id} style={isOver ? { outline: '2px solid var(--color-primary-accent)' } : undefined}>
            {children}
        </div>
    );
}

export function ProjectBoardPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const push = useToastStore((s) => s.push);
    const role = useAuthStore((s) => s.session?.role);
    const employeeId = useAuthStore((s) => s.employee?.id);
    const queryClient = useQueryClient();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: '', taskTypeId: '', columnId: '', priority: 'MEDIUM' });

    const [columnForm, setColumnForm] = useState({ code: '', name: '', isInitial: false, isTerminal: false });
    const [renaming, setRenaming] = useState(null);
    const project = useQuery({ queryKey: queryKeys.projects.one(id), queryFn: () => projectApi.getById(id) });
    const board = useQuery({ queryKey: queryKeys.projects.board(id), queryFn: () => projectApi.getBoard(id), retry: false });
    const types = useQuery({ queryKey: queryKeys.catalogs.taskTypes, queryFn: () => projectApi.listTaskTypes() });
    const typeList = Array.isArray(types.data) ? types.data : types.data?.content || [];

    const create = useMutation({
        mutationFn: () => projectApi.createTask(id, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) });
            setOpen(false);
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const createBoard = useMutation({
        mutationFn: () => projectApi.createBoard(id, { name: 'Board' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const addColumn = useMutation({
        mutationFn: () => projectApi.addColumn(id, {
            boardId: board.data?.id,
            code: columnForm.code,
            name: columnForm.name,
            position: (board.data?.columns || []).length,
            isInitial: columnForm.isInitial,
            isTerminal: columnForm.isTerminal,
        }),
        onSuccess: () => {
            setColumnForm({ code: '', name: '', isInitial: false, isTerminal: false });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) });
        },
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const moveColumn = useMutation({
        mutationFn: (columnIds) => projectApi.reorderColumns(id, { columnIds, expectedVersion: board.data?.version }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const removeColumn = useMutation({
        mutationFn: (columnId) => projectApi.deleteColumn(columnId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });
    const renameColumn = useMutation({
        mutationFn: ({ columnId, name }) => projectApi.updateColumn(columnId, { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) }),
        onError: (error) => push({ type: 'error', message: getApiError(error).message }),
    });

    const columns = board.data?.columns || [];
    const canEdit = isProjectEditor(role, project.data, employeeId);

    const onDragEnd = async (event) => {
        const taskId = event.active?.id;
        const overId = event.over?.id;
        if (!taskId || !overId) {
            return;
        }

        const column = columns.find((item) => item.id === overId || (item.tasks || []).some((task) => task.id === overId));
        if (!column) {
            return;
        }

        try {
            const task = await projectApi.getTask(taskId);
            const overTasks = column.tasks || [];
            const overIndex = overTasks.findIndex((item) => item.id === overId);
            await projectApi.moveTask(taskId, {
                targetColumnId: column.id,
                beforeTaskId: overIndex >= 0 ? overTasks[overIndex]?.id : null,
                afterTaskId: overIndex >= 0 ? overTasks[overIndex + 1]?.id : overTasks[0]?.id,
                expectedVersion: task.version,
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) });
        } catch (error) {
            push({ type: 'error', message: getApiError(error).message });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.board(id) });
        }
    };

    if (board.isLoading) {
        return <Skeleton rows={8} />;
    }

    if (board.isError) {
        return (
            <section>
                <BackLink to={`/app/projects/${id}`}>{t('projects.backToProject')}</BackLink>
                <PageHeader title={t('projects.openKanban')} />
                <p>{t('projects.boardMissing')}</p>
                {canEdit ? <Button onClick={() => createBoard.mutate()}>{t('projects.createBoard')}</Button> : null}
            </section>
        );
    }

    return (
        <section>
            <BackLink to={`/app/projects/${id}`}>{t('projects.backToProject')}</BackLink>
            <PageHeader
                title={board.data?.name || 'Kanban'}
                actions={<Button onClick={() => setOpen(true)}>{t('projects.createTask')}</Button>}
            />
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                <div className={styles.board}>
                    {columns.map((column) => (
                        <BoardColumn key={column.id} column={column}>
                            <header>
                                <h3>{column.name}</h3>
                                <span>{column.taskCount ?? column.tasks?.length ?? 0}</span>
                            </header>
                            {canEdit ? (
                                <div className={styles.columnActions}>
                                    {renaming?.id === column.id ? (
                                        <div className={page.row}>
                                            <Input label={t('projects.renameColumn')} value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} />
                                            <Button onClick={() => {
                                                renameColumn.mutate({ columnId: column.id, name: renaming.name });
                                                setRenaming(null);
                                            }}>{t('common.save')}</Button>
                                            <Button variant="ghost" onClick={() => setRenaming(null)}>{t('common.cancel')}</Button>
                                        </div>
                                    ) : (
                                        <Button variant="ghost" onClick={() => setRenaming({ id: column.id, name: column.name })}>{t('common.edit')}</Button>
                                    )}
                                    <Button variant="ghost" onClick={() => {
                                        const ids = columns.map((item) => item.id);
                                        const index = ids.indexOf(column.id);
                                        if (index > 0) {
                                            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                                            moveColumn.mutate(ids);
                                        }
                                    }}>{t('projects.moveUp')}</Button>
                                    <Button variant="ghost" onClick={() => {
                                        const ids = columns.map((item) => item.id);
                                        const index = ids.indexOf(column.id);
                                        if (index >= 0 && index < ids.length - 1) {
                                            [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                                            moveColumn.mutate(ids);
                                        }
                                    }}>{t('projects.moveDown')}</Button>
                                    <Button variant="danger" onClick={() => removeColumn.mutate(column.id)}>{t('common.delete')}</Button>
                                </div>
                            ) : null}
                            {(column.tasks || []).map((task) => (
                                <BoardCard
                                    key={task.id}
                                    task={task}
                                    label={enumLabel(t, 'priority', task.priority)}
                                    onOpen={(taskId) => navigate(`/app/tasks/${taskId}`)}
                                />
                            ))}
                        </BoardColumn>
                    ))}
                </div>
            </DndContext>
            {canEdit ? (
                <CollapsePanel label={t('projects.addColumn')}>
                <form className={page.stack} onSubmit={(event) => { event.preventDefault(); addColumn.mutate(); }}>
                    <div className={page.grid}>
                        <Input label={t('projects.columnCode')} value={columnForm.code} onChange={(e) => setColumnForm({ ...columnForm, code: e.target.value })} />
                        <Input label={t('projects.column')} value={columnForm.name} onChange={(e) => setColumnForm({ ...columnForm, name: e.target.value })} />
                        <label>
                            <input type="checkbox" checked={columnForm.isInitial} onChange={(e) => setColumnForm({ ...columnForm, isInitial: e.target.checked })} />
                            {' '}{t('projects.initialColumn')}
                        </label>
                        <label>
                            <input type="checkbox" checked={columnForm.isTerminal} onChange={(e) => setColumnForm({ ...columnForm, isTerminal: e.target.checked })} />
                            {' '}{t('projects.terminalColumn')}
                        </label>
                    </div>
                    <Button type="submit" disabled={!columnForm.code || !columnForm.name}>{t('projects.addColumn')}</Button>
                </form>
                </CollapsePanel>
            ) : null}
            <Modal open={open} title={t('projects.newTask')} onClose={() => setOpen(false)}>
                <div className={page.stack}>
                <div className={page.grid}>
                <Input label={t('projects.name')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Select label={t('projects.column')} value={form.columnId} onChange={(e) => setForm({ ...form, columnId: e.target.value })}>
                    <option value="">{t('common.select')}</option>
                    {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
                </Select>
                <Select label={t('projects.type')} value={form.taskTypeId} onChange={(e) => setForm({ ...form, taskTypeId: e.target.value })}>
                    <option value="">{t('common.select')}</option>
                    {typeList.map((item) => <option key={item.id} value={item.id}>{item.name || item.code}</option>)}
                </Select>
                <Select label={t('projects.priority')} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => (
                        <option key={item} value={item}>{enumLabel(t, 'priority', item)}</option>
                    ))}
                </Select>
                </div>
                <Button onClick={() => create.mutate()}>{t('common.create')}</Button>
                </div>
            </Modal>
        </section>
    );
}
