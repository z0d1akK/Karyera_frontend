import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AuthLayout } from '../layouts/AuthLayout/AuthLayout.jsx';
import { MainLayout } from '../layouts/mainLayout/MainLayout.jsx';
import { GuestRoute, ProtectedRoute, RoleRoute } from './guards.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { ChangeInitialPasswordPage } from '../pages/login/ChangeInitialPasswordPage.jsx';
import { ForbiddenPage, NotFoundPage, StubPage } from '../pages/public/StatusPages.jsx';
import { ProfilePage, EmployeeDetailsPage } from '../pages/profile/ProfilePage.jsx';
import { EmployeesPage } from '../pages/employees/EmployeesPage.jsx';
import { OrganizationPage } from '../pages/organization/OrganizationPage.jsx';
import { ProjectsPage } from '../pages/projects/ProjectsPage.jsx';
import { ProjectDetailsPage } from '../pages/projects/ProjectDetailsPage.jsx';
import { ProjectBoardPage } from '../pages/projects/ProjectBoardPage.jsx';
import { TaskDetailsPage } from '../pages/projects/TaskDetailsPage.jsx';
import { CareerPage } from '../pages/career/CareerPage.jsx';
import { TracksPage } from '../pages/career/TracksPage.jsx';
import { TrackDetailsPage } from '../pages/career/TrackDetailsPage.jsx';
import { PositionRequirementsPage } from '../pages/career/PositionRequirementsPage.jsx';
import { DevelopmentPage } from '../pages/development/DevelopmentPage.jsx';
import { DevelopmentPlanPage } from '../pages/development/DevelopmentPlanPage.jsx';
import { TalentReservePage } from '../pages/talent/TalentReservePage.jsx';
import { TalentReserveDetailsPage } from '../pages/talent/TalentReserveDetailsPage.jsx';
import { CandidatePage } from '../pages/talent/CandidatePage.jsx';
import { UsersPage } from '../pages/admin/UsersPage.jsx';
import { CreateUserPage } from '../pages/admin/CreateUserPage.jsx';
import { UserDetailsPage } from '../pages/admin/UserDetailsPage.jsx';
import { DictionariesPage } from '../pages/admin/DictionariesPage.jsx';
import { ROLES } from '../shared/lib/roles.js';
import { EntriesPage } from '../pages/time/EntriesPage.jsx';
import { EntryPage } from '../pages/time/EntryPage.jsx';
import { CalendarPage } from '../pages/time/CalendarPage.jsx';
import { TimesheetsPage } from '../pages/time/TimesheetsPage.jsx';
import { TimesheetDetailsPage } from '../pages/time/TimesheetDetailsPage.jsx';
import { ApprovalsPage } from '../pages/time/ApprovalsPage.jsx';
import { AnalyticsOverviewPage } from '../pages/analytics/OverviewPage.jsx';
import { EmployeesAnalyticsPage } from '../pages/analytics/EmployeesAnalyticsPage.jsx';
import { EmployeeAnalyticsPage } from '../pages/analytics/EmployeeAnalyticsPage.jsx';
import { CareerAnalyticsPage } from '../pages/analytics/CareerAnalyticsPage.jsx';
import { AssessmentPage } from '../pages/analytics/AssessmentPage.jsx';
import { RecommendationsPage } from '../pages/analytics/RecommendationsPage.jsx';
import { MyStatsPage } from '../pages/analytics/MyStatsPage.jsx';
import { CareerOptionsPage } from '../pages/analytics/CareerOptionsPage.jsx';
import { ReportsPage } from '../pages/analytics/ReportsPage.jsx';

export const router = createBrowserRouter([
    {
        element: <GuestRoute />,
        children: [
            {
                element: <AuthLayout />,
                children: [
                    { path: '/', element: <LoginPage /> },
                    { path: '/login', element: <LoginPage /> },
                    { path: '/change-initial-password', element: <ChangeInitialPasswordPage /> },
                ],
            },
        ],
    },
    { path: '/403', element: <ForbiddenPage /> },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <MainLayout />,
                children: [
                    { path: '/app', element: <Navigate to="/app/profile" replace /> },
                    { path: '/app/profile', element: <ProfilePage /> },
                    { path: '/app/employees', element: <EmployeesPage /> },
                    {
                        element: <RoleRoute roles={[ROLES.HR, ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/employees/new', element: <CreateUserPage /> },
                        ],
                    },
                    { path: '/app/employees/:id', element: <EmployeeDetailsPage /> },
                    {
                        element: <RoleRoute roles={[ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/organization', element: <OrganizationPage /> },
                        ],
                    },
                    { path: '/app/projects', element: <ProjectsPage /> },
                    { path: '/app/projects/:id', element: <ProjectDetailsPage /> },
                    { path: '/app/projects/:id/board', element: <ProjectBoardPage /> },
                    { path: '/app/tasks/:id', element: <TaskDetailsPage /> },
                    { path: '/app/career', element: <CareerPage /> },
                    { path: '/app/career/tracks', element: <TracksPage /> },
                    { path: '/app/career/tracks/:id', element: <TrackDetailsPage /> },
                    { path: '/app/career/positions/:id', element: <PositionRequirementsPage /> },
                    { path: '/app/career/assessments/:id/recommendations', element: <RecommendationsPage /> },
                    { path: '/app/career/assessments/:id', element: <AssessmentPage /> },
                    {
                        element: <RoleRoute roles={[ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR]} />,
                        children: [
                            { path: '/app/development', element: <DevelopmentPage /> },
                            { path: '/app/development/plans/:id', element: <DevelopmentPlanPage /> },
                        ],
                    },
                    {
                        element: <RoleRoute roles={[ROLES.MANAGER, ROLES.HR]} />,
                        children: [
                            { path: '/app/talent-reserve', element: <TalentReservePage /> },
                            { path: '/app/talent-reserve/candidates/:id', element: <CandidatePage /> },
                            { path: '/app/talent-reserve/:id', element: <TalentReserveDetailsPage /> },
                        ],
                    },
                    { path: '/app/time/entries', element: <EntriesPage /> },
                    { path: '/app/time/entries/new', element: <EntryPage /> },
                    { path: '/app/time/entries/:id', element: <EntryPage /> },
                    { path: '/app/time/calendar', element: <CalendarPage /> },
                    { path: '/app/time/timesheets', element: <TimesheetsPage /> },
                    { path: '/app/time/timesheets/:id', element: <TimesheetDetailsPage /> },
                    {
                        element: <RoleRoute roles={[ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/time/approvals', element: <ApprovalsPage /> },
                        ],
                    },
                    { path: '/app/analytics/me', element: <MyStatsPage /> },
                    { path: '/app/analytics/me/career-options', element: <CareerOptionsPage /> },
                    { path: '/app/analytics/employees/:id/career-options', element: <CareerOptionsPage /> },
                    {
                        element: <RoleRoute roles={[ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/analytics/reports', element: <ReportsPage /> },
                        ],
                    },
                    {
                        element: <RoleRoute roles={[ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/analytics', element: <AnalyticsOverviewPage /> },
                            { path: '/app/analytics/employees', element: <EmployeesAnalyticsPage /> },
                            { path: '/app/analytics/employees/:id', element: <EmployeeAnalyticsPage /> },
                            { path: '/app/analytics/career', element: <CareerAnalyticsPage /> },
                        ],
                    },
                    {
                        element: <RoleRoute roles={[ROLES.ADMIN]} />,
                        children: [
                            { path: '/app/admin/users', element: <UsersPage /> },
                            { path: '/app/admin/users/new', element: <CreateUserPage /> },
                            { path: '/app/admin/users/:id', element: <UserDetailsPage /> },
                            { path: '/app/admin/dictionaries', element: <DictionariesPage /> },
                            { path: '/app/admin/settings', element: <StubPage titleKey="navigation.settings" textKey="stubs.settings" /> },
                        ],
                    },
                ],
            },
        ],
    },
    { path: '*', element: <NotFoundPage /> },
]);
