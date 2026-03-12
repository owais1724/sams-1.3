import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAgencyDashboard(agencyId: string) {
    if (!agencyId) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayDeployments,
      allActiveDeployments,
      attendanceToday,
      openIncidents,
      totalGuards,
      recentIncidents,
      recentAuditLogs,
    ] = await Promise.all([
      // Deployments active today
      this.prisma.deployment.findMany({
        where: {
          agencyId,
          status: { in: ['active', 'planned'] },
          startDate: { lte: tomorrow },
          endDate: { gte: today },
        },
        include: {
          client: { select: { name: true } },
          shift: { select: { name: true, startTime: true, endTime: true } },
          _count: { select: { guards: true } },
        },
      }),
      // All active deployments count
      this.prisma.deployment.count({
        where: { agencyId, status: 'active' },
      }),
      // Today's attendance
      this.prisma.attendance.findMany({
        where: {
          agencyId,
          date: { gte: today, lt: tomorrow },
        },
      }),
      // Open incidents
      this.prisma.incident.count({
        where: {
          agencyId,
          status: { in: ['open', 'under_review'] },
        },
      }),
      // Total active guards (users with guard-like roles)
      this.prisma.user.count({
        where: { agencyId, isActive: true },
      }),
      // Recent incidents
      this.prisma.incident.findMany({
        where: { agencyId },
        include: {
          reporter: { select: { fullName: true } },
          deployment: {
            select: { client: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Recent audit log activity
      this.prisma.auditLog.findMany({
        where: { agencyId },
        include: {
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Compute attendance summary — deduplicate by employee
    // If an employee has multiple records, use the "worst" status priority: ABSENT > LATE > PRESENT
    const employeeStatusMap = new Map<string, string>();
    const statusPriority: Record<string, number> = { ABSENT: 3, absent: 3, LATE: 2, late: 2, PRESENT: 1, present: 1 };

    for (const a of attendanceToday) {
      const current = employeeStatusMap.get(a.employeeId);
      const currentPriority = current ? (statusPriority[current] || 0) : 0;
      const newPriority = statusPriority[a.status] || 0;
      if (newPriority >= currentPriority) {
        employeeStatusMap.set(a.employeeId, a.status.toUpperCase());
      }
    }

    const uniqueStatuses = Array.from(employeeStatusMap.values());
    const present = uniqueStatuses.filter(s => s === 'PRESENT').length;
    const late = uniqueStatuses.filter(s => s === 'LATE').length;
    const absent = uniqueStatuses.filter(s => s === 'ABSENT').length;

    // Guards currently on duty (checked in but not yet checked out today) — deduplicate by employee
    const onDutyEmployees = new Set(
      attendanceToday.filter(a => a.checkIn && !a.checkOut).map(a => a.employeeId),
    );
    const guardsOnDuty = onDutyEmployees.size;

    return {
      todayDeployments: todayDeployments.length,
      activeDeployments: allActiveDeployments,
      attendanceSummary: {
        present,
        late,
        absent,
        total: employeeStatusMap.size,
      },
      openIncidents,
      guardsOnDuty,
      totalGuards,
      todayDeploymentsList: todayDeployments,
      recentIncidents,
      recentActivity: recentAuditLogs,
    };
  }
}
