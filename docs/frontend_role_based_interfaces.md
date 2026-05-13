# Frontend Role-Based Interfaces

## Overview

The frontend now uses a centralized API client and role-based routing model for three interfaces:

- `admin`
- `hr`
- `employee`

The employee interface is intentionally simple and self-service oriented. It does not use the admin/HR dashboard pattern.

## Backend Response Format

The frontend API client expects the backend envelope:

```json
{
  "message": "string",
  "data": {},
  "status": true
}
```

Behavior:

- `message` is used for user-facing feedback where relevant.
- `data` is unwrapped automatically and returned to pages/services.
- `status: false` is treated as an application error even when the HTTP status code is `200`.
- `401` clears the session and redirects to `/login`.
- `403` redirects to `/forbidden`.
- FastAPI validation payloads are normalized into field error messages when possible.

## API Modules

The frontend now uses centralized service modules:

- `src/services/authApi.ts`
- `src/services/userApi.ts`
- `src/services/employeeApi.ts`
- `src/services/attendanceApi.ts`
- `src/services/payrollApi.ts`
- `src/services/vacationApi.ts`
- `src/services/notificationApi.ts`
- `src/services/settingsApi.ts`
- `src/services/auditApi.ts`
- `src/services/dashboardApi.ts`

Shared infrastructure:

- `src/lib/api-client.ts`
- `src/lib/auth-storage.ts`
- `src/lib/errors.ts`
- `src/providers/AuthProvider.tsx`

## Role-Based Routing

Public routes:

- `/login`
- `/change-password`
- `/forbidden`

Admin routes:

- `/admin/dashboard`
- `/admin/users`
- `/admin/employees`
- `/admin/attendance`
- `/admin/payroll`
- `/admin/vacations`
- `/admin/settings`
- `/admin/notifications`
- `/admin/audit-logs`

HR routes:

- `/hr/dashboard`
- `/hr/employees`
- `/hr/attendance`
- `/hr/payroll`
- `/hr/vacations`
- `/hr/notifications`

Employee routes:

- `/employee/home`
- `/employee/profile`
- `/employee/attendance`
- `/employee/payroll`
- `/employee/vacations`
- `/employee/notifications`

Routing behavior:

- Login redirects by role:
  - `admin -> /admin/dashboard`
  - `hr -> /hr/dashboard`
  - `employee -> /employee/home`
- Must-change-password users are redirected to `/change-password`.
- Protected routes block access when the current role is not allowed.
- Employee routes are isolated to the employee role.

## Layouts

Role-specific layouts:

- `src/components/layout/AdminLayout.tsx`
- `src/components/layout/HRLayout.tsx`
- `src/components/layout/EmployeeLayout.tsx`

Shared shell pieces:

- `src/components/layout/RoleLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/TopBar.tsx`

Each layout:

- hides links the current role should not see
- includes the notification bell
- includes logout and password change access
- uses current user info from auth state

## Auth and Session Flow

Implemented flow:

- Login uses `POST /auth/login`
- Current user is fetched with `GET /auth/me`
- Stored frontend auth state includes:
  - `token`
  - `refreshToken`
  - `currentUser`
  - `roles`
  - `permissions`
  - `unreadNotificationCount`
- Must-change-password is enforced at the route level

Current user shape used by the frontend:

- `id`
- `employee_id`
- `username`
- `email`
- `roles`
- `permissions`
- `must_change_password`
- `employee`

## Employee `/me` Endpoint Usage

Employee self-service pages intentionally avoid arbitrary `employee_id` usage.

Employee pages use:

- `GET /me/profile`
- `GET /me/attendance`
- `GET /me/payroll`
- `GET /me/vacations`
- `POST /me/vacations/request`
- `POST /me/attendance/check-in`
- `POST /me/attendance/break-start`
- `POST /me/attendance/break-end`
- `POST /me/attendance/check-out`
- `GET /me/notifications`
- `GET /me/notifications/unread-count`
- `POST /me/notifications/{notification_id}/read`
- `POST /me/notifications/read-all`
- `POST /me/notifications/{notification_id}/archive`

## Notification Flow

Notification UI is implemented in:

- `src/components/notifications/NotificationBell.tsx`
- `src/pages/Notifications.tsx`

Flow:

1. After successful login, unread count is fetched from `/me/notifications/unread-count`.
2. The bell dropdown loads preview items from `/me/notifications`.
3. Mark-as-read and archive actions refresh:
   - the bell preview
   - the notifications page query
   - the unread count
4. The notifications page supports:
   - unread filter
   - archived filter
   - include-expired filter
   - pagination via `limit` and `offset`
5. Priority is rendered visually for:
   - `low`
   - `normal`
   - `high`

Admin/HR notification page behavior:

- Personal notifications still use `/me/notifications`
- If the backend grants `notifications.read_all`, the page also shows `/notifications`
- If the backend grants `notifications.send`, the page also exposes a send form

## Pages Created or Updated

Main pages:

- `src/pages/Login.tsx`
- `src/pages/ChangePassword.tsx`
- `src/pages/Forbidden.tsx`
- `src/pages/Home.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Users.tsx`
- `src/pages/Employees.tsx`
- `src/pages/Attendance.tsx`
- `src/pages/Payments.tsx`
- `src/pages/Vacations.tsx`
- `src/pages/Notifications.tsx`
- `src/pages/Settings.tsx`
- `src/pages/AuditLogs.tsx`
- `src/pages/NotFound.tsx`

Supporting shared UI:

- `src/components/app/PageHeader.tsx`
- `src/components/app/MetricCard.tsx`
- `src/components/app/EmptyState.tsx`

Obsolete dashboard/profile drawer code from the previous architecture was removed to avoid duplicated flows and stale endpoint usage.

## Backend Endpoints Used

Auth:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/logout`

Users:

- `GET /users/`
- `POST /users/`
- `PUT /users/{user_id}`
- `POST /users/{user_id}/activate`
- `POST /users/{user_id}/deactivate`
- `POST /users/{user_id}/roles`
- `DELETE /users/{user_id}/roles/{role_id}`
- `POST /users/{user_id}/reset-password`

Employees:

- `GET /employee/`
- `GET /employee/{id}`
- `POST /employee/`
- `PUT /employee/{id}`
- `DELETE /employee/{id}`
- `GET /salary_types/`

Attendance:

- `GET /att_types/`
- `GET /attendance/emps/{date}`
- `POST /attendance/manual-correction`
- `POST /attendance/recalculate/{employee_id}/{start_date}/{end_date}`
- `PUT /attendance/mark_all_present`
- `GET /me/attendance`
- `POST /me/attendance/check-in`
- `POST /me/attendance/break-start`
- `POST /me/attendance/break-end`
- `POST /me/attendance/check-out`

Payroll:

- `GET /payroll/period/{period_id}`
- `POST /payroll/recalculate-period/{period_id}`
- `POST /payroll/recalculate/{employee_id}/{period_id}`
- `POST /payroll/approve/{employee_payroll_id}`
- `POST /payroll/mark-paid/{employee_payroll_id}`
- `GET /payroll/history/{employee_payroll_id}`
- `GET /payroll/discrepancies/{period_id}`
- `POST /payroll/discrepancy/{discrepancy_id}/resolve`
- `POST /payroll/adjustment`
- `GET /me/payroll`

Vacations:

- `GET /vacation/{year}`
- `GET /vacation/current`
- `PUT /vacation/`
- `POST /vacation/`
- `DELETE /vacation/{id}`
- `GET /vacation_types/`
- `GET /vacation_status/`
- `GET /me/vacations`
- `POST /me/vacations/request`

Notifications:

- `GET /me/notifications`
- `GET /me/notifications/unread-count`
- `POST /me/notifications/{notification_id}/read`
- `POST /me/notifications/read-all`
- `POST /me/notifications/{notification_id}/archive`
- `GET /notifications/`
- `POST /notifications/`

Settings and audit:

- `GET /settings/work-schedule`
- `PUT /settings/work-schedule`
- `GET /settings/payroll-policy`
- `PUT /settings/payroll-policy`
- `GET /audit/`
- `GET /stat/dashbord/cards`

## Backend Endpoints Expected But Missing

These gaps were not faked in the frontend:

- `GET /roles` or equivalent role catalog endpoint
  - Needed for clean role/permission management UI and reliable role assignment without inferring role ids from existing users.
- `GET /permissions` or equivalent permission catalog endpoint
  - Needed for permission management UI.
- `GET /payroll/periods` or equivalent payroll period list endpoint
  - The payroll screens require manual `period_id` entry because there is no frontend-friendly period discovery endpoint.
- `GET /me/payroll/latest` or equivalent current/latest self-payroll endpoint
  - Employee home cannot automatically show a latest payroll status without a period id.
- Vacation rejection reason support on update
  - Vacation update accepts `vacation_status`, but there is no rejection-reason field for the frontend to send when rejecting a request.

## How To Run

1. Set `VITE_API_BASE_URL` if your backend is not running on `http://localhost:8000`.
2. Install dependencies:

```bash
npm install
```

3. Start the frontend:

```bash
npm run dev
```

4. Optional verification:

```bash
npm run build
npm run lint
npm test
```

Current repo status:

- `build` passes
- `test` passes
- `lint` passes with warnings only

## Manual Test Checklist

1. Log in as an admin and confirm redirect to `/admin/dashboard`.
2. Log in as an HR user and confirm redirect to `/hr/dashboard`.
3. Log in as an employee and confirm redirect to `/employee/home`.
4. Attempt to open an admin route as an employee and confirm redirect to `/forbidden`.
5. Attempt to open admin-only routes as HR and confirm they are blocked.
6. Confirm employee home shows attendance action buttons.
7. Use employee check-in/check-out actions and confirm they succeed through `/me/attendance/*`.
8. Confirm employee payroll page only loads via `/me/payroll`.
9. Confirm employee vacations page submits requests through `/me/vacations/request`.
10. Confirm HR/Admin vacation actions update status through `/vacation/`.
11. Confirm the notification bell shows unread count after login.
12. Mark a notification as read and confirm unread count decreases.
13. Archive a notification and confirm it disappears from the default list.
14. Force a `401` and confirm the frontend redirects to `/login`.
15. Force a `403` and confirm the frontend redirects to `/forbidden`.
16. Use a `must_change_password` account and confirm protected pages redirect to `/change-password`.
17. Confirm backend envelope responses are unwrapped correctly and user-facing errors show backend messages.

## Assumptions

- The backend auth payloads match the route/service implementations inspected during integration.
- Role codes remain `admin`, `hr`, and `employee`.
- Employee self-service permissions are granted correctly by the backend for `/me` endpoints.
- The backend returns salary/vacation lookup ids that can be submitted back unchanged.
- The frontend remains a single SPA served by Vite/React Router.
