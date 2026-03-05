-- Fix FK constraints: drop old constraints and recreate with ON DELETE CASCADE
-- This runs on startup to ensure Railway's production DB has the correct constraints

-- Client → Agency
ALTER TABLE IF EXISTS "Client" DROP CONSTRAINT IF EXISTS "Client_agencyId_fkey";
ALTER TABLE IF EXISTS "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Project → Agency
ALTER TABLE IF EXISTS "Project" DROP CONSTRAINT IF EXISTS "Project_agencyId_fkey";
ALTER TABLE IF EXISTS "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Project → Client
ALTER TABLE IF EXISTS "Project" DROP CONSTRAINT IF EXISTS "Project_clientId_fkey";
ALTER TABLE IF EXISTS "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE;

-- Checkpoint → Project
ALTER TABLE IF EXISTS "Checkpoint" DROP CONSTRAINT IF EXISTS "Checkpoint_projectId_fkey";
ALTER TABLE IF EXISTS "Checkpoint" ADD CONSTRAINT "Checkpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE;

-- User → Agency
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_agencyId_fkey";
ALTER TABLE IF EXISTS "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- User → Role
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE IF EXISTS "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"(id) ON DELETE SET NULL;

-- User → Employee (CASCADE so deleting employee deletes user)
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_employeeId_fkey";
ALTER TABLE IF EXISTS "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;

-- Role → Agency
ALTER TABLE IF EXISTS "Role" DROP CONSTRAINT IF EXISTS "Role_agencyId_fkey";
ALTER TABLE IF EXISTS "Role" ADD CONSTRAINT "Role_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Employee → Agency
ALTER TABLE IF EXISTS "Employee" DROP CONSTRAINT IF EXISTS "Employee_agencyId_fkey";
ALTER TABLE IF EXISTS "Employee" ADD CONSTRAINT "Employee_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Employee → Designation
ALTER TABLE IF EXISTS "Employee" DROP CONSTRAINT IF EXISTS "Employee_designationId_fkey";
ALTER TABLE IF EXISTS "Employee" ADD CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"(id) ON DELETE SET NULL;

-- Designation → Agency
ALTER TABLE IF EXISTS "Designation" DROP CONSTRAINT IF EXISTS "Designation_agencyId_fkey";
ALTER TABLE IF EXISTS "Designation" ADD CONSTRAINT "Designation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Attendance → Agency
ALTER TABLE IF EXISTS "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_agencyId_fkey";
ALTER TABLE IF EXISTS "Attendance" ADD CONSTRAINT "Attendance_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Attendance → Employee
ALTER TABLE IF EXISTS "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_employeeId_fkey";
ALTER TABLE IF EXISTS "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;

-- Attendance → Project
ALTER TABLE IF EXISTS "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_projectId_fkey";
ALTER TABLE IF EXISTS "Attendance" ADD CONSTRAINT "Attendance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE;

-- Leave → Agency
ALTER TABLE IF EXISTS "Leave" DROP CONSTRAINT IF EXISTS "Leave_agencyId_fkey";
ALTER TABLE IF EXISTS "Leave" ADD CONSTRAINT "Leave_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Leave → Employee
ALTER TABLE IF EXISTS "Leave" DROP CONSTRAINT IF EXISTS "Leave_employeeId_fkey";
ALTER TABLE IF EXISTS "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;

-- Payroll → Agency
ALTER TABLE IF EXISTS "Payroll" DROP CONSTRAINT IF EXISTS "Payroll_agencyId_fkey";
ALTER TABLE IF EXISTS "Payroll" ADD CONSTRAINT "Payroll_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- Payroll → Employee
ALTER TABLE IF EXISTS "Payroll" DROP CONSTRAINT IF EXISTS "Payroll_employeeId_fkey";
ALTER TABLE IF EXISTS "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;

-- Visitor → Agency
ALTER TABLE IF EXISTS "Visitor" DROP CONSTRAINT IF EXISTS "Visitor_agencyId_fkey";
ALTER TABLE IF EXISTS "Visitor" ADD CONSTRAINT "Visitor_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- AuditLog → Agency
ALTER TABLE IF EXISTS "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_agencyId_fkey";
ALTER TABLE IF EXISTS "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"(id) ON DELETE CASCADE;

-- AuditLog → User
ALTER TABLE IF EXISTS "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE IF EXISTS "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
