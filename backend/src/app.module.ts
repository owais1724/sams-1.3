import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgenciesModule } from './agencies/agencies.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { EmployeesModule } from './employees/employees.module';
import { DesignationsModule } from './designations/designations.module';
import { RolesModule } from './roles/roles.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollModule } from './payroll/payroll.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PermissionsSeedModule } from './permissions-seed/permissions-seed.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ShiftAssignmentsModule } from './shift-assignments/shift-assignments.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { IncidentsModule } from './incidents/incidents.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AgenciesModule,
    ClientsModule,
    ProjectsModule,
    EmployeesModule,
    DesignationsModule,
    RolesModule,
    LeavesModule,
    PayrollModule,
    AttendanceModule,
    AuditLogsModule,
    PermissionsSeedModule,
    ShiftsModule,
    ShiftAssignmentsModule,
    DeploymentsModule,
    IncidentsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
