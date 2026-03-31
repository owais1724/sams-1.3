# Fix Guard User - No Sidebar Issue

## Problem
Guard users (and other staff) cannot login because they don't have `employeeId` in their user record. The system now uses `employeeId` to determine if a user is staff or agency admin:

- Has `employeeId` → Staff member → Staff portal ✅
- No `employeeId` → Agency Admin → Agency portal ✅

## Solution
Run the fix script to link users to employee records.

## Steps

### 1. Run the Fix Script

```bash
cd security-agency-management-system-main/backend
npx ts-node scripts/fix-guard-user.ts
```

This script will:
1. Find all users without `employeeId` who have staff roles (Guard, HR, Supervisor, etc.)
2. Check if an employee record exists with the same email
3. If yes, link the user to that employee
4. If no, create a new employee record and link it

### 2. Verify the Fix

After running the script, check the output. You should see something like:

```
Found 1 users without employeeId:

User: guard@test.com
  Role: Guard
  Agency: Test Agency
  Full Name: Test Guard
  ✅ Employee record found: cm...
  Linking user to employee...
  ✅ User linked to employee successfully!

Done!
```

### 3. Test Login

1. Go to `https://happy-joy-production.up.railway.app/test/staff-login`
2. Login as guard
3. Check browser console for `STAFF DEBUG` log
4. You should see:
   ```
   STAFF DEBUG: {
     role: "Guard",
     employeeId: "cm...",  ← Should NOT be null
     isStaffUser: true
   }
   ```
5. Sidebar should now appear ✅

## Alternative: Manual Database Fix

If you prefer to fix it manually in the database:

```sql
-- Find the guard user
SELECT id, email, "employeeId", "roleId" FROM "User" WHERE email = 'guard@test.com';

-- Find the employee record
SELECT id, email FROM "Employee" WHERE email = 'guard@test.com';

-- Link them (replace IDs with actual values)
UPDATE "User" SET "employeeId" = 'employee-id-here' WHERE id = 'user-id-here';
```

## Prevention

Going forward, always create staff users through the Employees page in the system. This ensures:
1. Employee record is created first
2. User account is created with `employeeId` linked
3. User can login to staff portal immediately

Never manually create users in the database for staff members!
