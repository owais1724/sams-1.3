# Week 2 Database Schema - Operational Module ER Diagram

## Entity Relationships

```
Agency (1) ─────────────────── (∞) Shift
  │                                 │
  │                                 │
  │ (1)                             │ (∞)
  │                                 │
  └────────────────── (∞) Deployment ────────── (∞) DeploymentGuard ── (1) User
        │                                 │
        │                                 │
        │ (1)                             │ (∞)
        │                                 │
        └────────────────── (∞) Incident
        │                                 │
        │ (1)                             │ (∞)
        │                                 │
        └────────────────── (∞) Attendance
```

## Week 2 Tables

### 1. Shift
```sql
Shift {
  id          String      @id @default(cuid())
  name        String      -- "Morning Shift", "Afternoon Shift", "Night Shift"
  startTime   String      -- "06:00", "14:00", "22:00"
  endTime     String      -- "14:00", "22:00", "06:00"
  isActive    Boolean     @default(true)
  agencyId    String      -- FK to Agency
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([agencyId])
}
```

### 2. Deployment
```sql
Deployment {
  id          String      @id @default(cuid())
  agencyId    String      -- FK to Agency
  clientId    String      -- FK to Client
  shiftId     String      -- FK to Shift
  startDate   DateTime
  endDate     DateTime
  status      String      @default("planned") -- planned, active, completed, cancelled
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([agencyId])
  @@index([clientId])
  @@index([status])
}
```

### 3. DeploymentGuard (Junction Table)
```sql
DeploymentGuard {
  id           String     @id @default(cuid())
  deploymentId String     -- FK to Deployment
  userId       String     -- FK to User
  agencyId     String     -- FK to Agency
  createdAt    DateTime   @default(now())
  
  @@unique([deploymentId, userId])
  @@index([userId])
}
```

### 4. Attendance
```sql
Attendance {
  id           String      @id @default(cuid())
  agencyId     String      -- FK to Agency
  employeeId   String      -- FK to Employee
  projectId    String?     -- FK to Project
  deploymentId String?     -- FK to Deployment
  date         DateTime
  checkIn      DateTime?
  checkOut     DateTime?
  status       String      -- PRESENT, LATE, ABSENT
  method       String?     -- WEB, QR, PHOTO
  photo        String?
  latitude     Float?
  longitude    Float?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  @@index([agencyId])
  @@index([date])
  @@index([employeeId])
  @@index([deploymentId])
}
```

### 5. Incident
```sql
Incident {
  id           String     @id @default(cuid())
  agencyId     String     -- FK to Agency
  deploymentId String?    -- FK to Deployment
  reportedBy   String     -- FK to User
  title        String
  description  String?
  type         String?    -- theft, trespassing, medical, fire, vandalism, other
  severity     Int        @default(1) -- 1=low, 2=medium, 3=high, 4=critical
  status       String     @default("open") -- open, under_review, resolved, closed
  reviewNotes  String?    -- Supervisor review notes
  resolution   String?    -- Admin final remarks
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  @@index([agencyId])
  @@index([status])
  @@index([reportedBy])
}
```

## Key Design Decisions

### 1. Multi-Tenant Isolation
- Every operational table includes `agencyId` for strict tenant isolation
- All queries filter by `agencyId` from authenticated session
- Cross-tenant access returns 403 Forbidden, not 404

### 2. Deployment Architecture
- **Deployment**: Central operational record linking guards to client sites
- **DeploymentGuard**: Junction table enabling many-to-many guard assignments
- **Conflict Prevention**: Database constraints and service logic prevent overlapping assignments

### 3. Attendance Design
- Supports both deployment-based and project-based check-ins
- Automatic status calculation (Present/Late/Absent) based on shift timing
- Duplicate prevention via unique constraints and validation logic

### 4. Incident Lifecycle
- Clear status flow: Open → Under Review → Resolved/Closed
- Severity levels for prioritization (1-4)
- Automatic linking to deployment when reported by guard

### 5. Performance & Security
- Strategic indexes on frequently queried fields
- Cascade deletes maintain referential integrity
- All foreign key relationships ensure data consistency

## Security Constraints

```sql
-- Prevent duplicate guard assignments to same deployment
ALTER TABLE DeploymentGuard ADD CONSTRAINT unique_deployment_guard 
UNIQUE (deploymentId, userId);

-- Ensure attendance records belong to correct agency
ALTER TABLE Attendance ADD CONSTRAINT attendance_agency_check 
CHECK (agencyId IS NOT NULL);

-- Incident severity validation
ALTER TABLE Incident ADD CONSTRAINT valid_severity 
CHECK (severity BETWEEN 1 AND 4);
```

This schema supports all Week 2 operational requirements while maintaining strict security and performance standards.
