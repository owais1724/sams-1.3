# SAMS - Security Agency Management System
## Feature Report by User Role

---

# Chapter 1: SUPER ADMIN (Platform Administrator)

• Dashboard: Displays platform-wide statistics, user engagement metrics, and overall performance summaries across all agencies.

• Agency Management: Create, view, edit, activate/deactivate, and delete security agencies with complete administrative control.

• System Administration: Monitor system health, view cross-agency audit logs, and manage platform-level configurations.

---

# Chapter 2: AGENCY ADMIN (Agency Owner/Manager)

• Dashboard: View agency metrics including today's deployments, attendance summary, open incidents, guards on duty, and recent activity.

• Client Management: Add, view, edit, and delete clients with contact information and relationship tracking.

• Project/Site Management: Create projects linked to clients, assign employees, view locations, and manage project lifecycle.

• Employee Management: Add employees with details, view/search list, edit info, promote/demote, suspend/activate, delete, and sync roles.

• Designation Management: Create job designations like Guard and Supervisor, view all positions, and delete as needed.

• Role & Permission Management: Create custom roles, assign granular permissions, edit/delete roles, and view all available permissions.

• Shift Management: Create shifts with start/end times, view all shifts, edit details, delete, and activate/deactivate shifts.

• Shift Assignment: Assign employees to shifts on dates, bulk assign, view with filters, track check-in/out, mark status, generate reports, and delete.

• Deployment Management: Create deployments linking guards to client sites with shifts, manage status, add/remove guards, and track lifecycle.

• Attendance Management: View records with filters, manual check-in/out, detect absent employees, and track by project/deployment with methods.

• Leave Management: View employee leave requests, approve/reject, filter by status/type/employee, and view approval chain details.

• Payroll Management: Generate individual/bulk payroll, view with filters, edit allowances/deductions, update status, delete, and track compensation.

• Incident Management: View all incidents, create reports, edit details, update status, add notes, filter, and track resolution.

• Admin User Management: Create admin users, assign roles, promote/demote staff, suspend/activate accounts, and delete users.

• Audit Logs: View all agency actions, track who did what and when, and filter by user/action/entity for compliance.


---

# Chapter 3: STAFF/GUARD (Field Personnel)

• Dashboard: View personal deployment schedule, assigned shifts, upcoming duties, and attendance summary.

• My Schedule: View personal deployment calendar with shift assignments, dates, times, client/site details, and deployment status.

• Attendance: Self check-in at deployment location, check-out after shift, view personal history, and track times.

• Leave Management: Apply for leave with dates/reason, select type, view status, track approval chain, and see rejection reasons.

• Incident Reporting: Report incidents during duty with details, link to deployment, view own/all incidents, and track resolution.

• Profile Management: View personal profile, update contact details, and change password.

---

# Chapter 4: PERMISSION-BASED FEATURES

• Employee Permissions: view_employees to see list, manage_employees to create/edit/delete.

• Attendance Permissions: view_attendance to see records, manage_attendance to check-in/out and mark absent.

• Leave Permissions: view_leaves to see requests, manage_leaves to approve/reject.

• Payroll Permissions: view_payroll to see records, manage_payroll to generate and edit.

• Shift Permissions: view_shifts to see schedules, manage_shifts to create/edit/delete.

• Deployment Permissions: view_deployments to see info, manage_deployments to create/edit/delete.

• Incident Permissions: view_incidents to see all, manage_incidents to edit/update status, report_incident to create.

• Client Permissions: view_clients to see list, manage_clients to create/edit/delete.

• Project Permissions: view_projects to see sites, manage_projects to create/edit/delete.

• System Permissions: view_audit_logs for compliance, manage_roles for access control, manage_agency for settings.

---

# Chapter 5: AUTHENTICATION & SECURITY

• Login System: Multi-portal login for Super Admin/Agency Admin/Staff with email/password, JWT tokens, HTTP-only cookies, CSRF protection, and session persistence.

• Security Features: Bcrypt password hashing, RBAC, permission-based authorization, agency isolation, audit logging, and secure cookie handling.

---

# Chapter 6: TECHNICAL ARCHITECTURE

• Backend: NestJS with RESTful API, PostgreSQL/Prisma ORM, Passport JWT, exception handling, validation, logging, CORS, Helmet, and cookie parser.

• Frontend: Next.js 16 with SSR, client hydration, Zustand state, TailwindCSS, Shadcn/ui, responsive design, API retry logic, and session sync.

• Database: Multi-tenant PostgreSQL with 18 entities, relational data, foreign keys, cascade delete, indexes, and audit trails.

• Deployment: Railway and Render hosting with PostgreSQL, environment config, GitHub auto-deploy, Prisma migrations, and seed data.

---

# Chapter 7: REPORTING & ANALYTICS

• Dashboard Metrics: Real-time view of today's deployments, attendance summary, open incidents, guards on duty, and recent activity.

• Available Reports: Shift assignments, attendance by date/employee/project, payroll by month/status, incidents by status/severity, and audit logs.

---

# Chapter 8: KEY WORKFLOWS

• Agency Onboarding: Super Admin creates agency → Admin account created → Admin sets up clients/projects/designations → Creates employees → Creates user accounts → Assigns roles/permissions.

• Guard Deployment: Admin creates shifts → Creates deployment for client → Assigns guards → Guards view schedule → Guards check-in/out → Admin monitors.

• Leave Management: Staff applies → Supervisor reviews → HR reviews → Admin decides → Staff notified.

• Incident Management: Guard reports → Supervisor reviews/notes → Admin resolves → Incident closed → Audit trail maintained.

---

Generated: April 2, 2026  
Version: 1.3  
Platform: SAMS - Security Agency Management System  
Deployment: Railway & Render  

Live URLs:  
- Railway Backend: https://sams-13-production-4f1f.up.railway.app  
- Railway Frontend: https://happy-joy-production.up.railway.app  
- Render Backend: https://sams-backendd.onrender.com  
- Render Frontend: https://sams-frontendd.onrender.com
