import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getTodayDeployments(agencyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deployments = await this.prisma.deployment.findMany({
      where: {
        agencyId,
        status: 'active',
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        client: { select: { name: true } },
        shift: { select: { name: true, startTime: true, endTime: true } },
        _count: { select: { guards: true } },
      },
    });

    return {
      count: deployments.length,
      deployments,
    };
  }

  async getAttendanceSummary(agencyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceToday = await this.prisma.attendance.findMany({
      where: {
        agencyId,
        date: { gte: today, lt: tomorrow },
      },
    });

    // Compute attendance summary — deduplicate by employee
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

    return {
      present,
      late,
      absent,
      total: employeeStatusMap.size,
    };
  }

  async getOpenIncidents(agencyId: string) {
    const [count, incidents] = await Promise.all([
      this.prisma.incident.count({
        where: {
          agencyId,
          status: { in: ['open', 'under_review'] },
        },
      }),
      this.prisma.incident.findMany({
        where: {
          agencyId,
          status: { in: ['open', 'under_review'] },
        },
        include: {
          reporter: { select: { fullName: true } },
          deployment: {
            select: { client: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { count, incidents };
  }

  async getGuardsOnDuty(agencyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeAttendance = await this.prisma.attendance.findMany({
      where: {
        agencyId,
        date: { gte: today, lt: tomorrow },
        checkIn: { not: null },
        checkOut: null,
      },
      include: {
        employee: {
          include: {
            user: { select: { fullName: true } },
            designation: { select: { name: true } },
          },
        },
        deployment: {
          select: { client: { select: { name: true } } },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    // Deduplicate by employeeId to ensure we return distinct personnel
    const uniquePersonnel = new Map();
    for (const record of activeAttendance) {
      if (!uniquePersonnel.has(record.employeeId)) {
        uniquePersonnel.set(record.employeeId, {
          id: record.employeeId,
          name: record.employee.user?.fullName || 'Unknown',
          designation: record.employee.designation?.name,
          checkIn: record.checkIn,
          location: record.deployment?.client?.name || record.project?.name || 'Mobile/General',
        });
      }
    }

    const personnelList = Array.from(uniquePersonnel.values());

    return {
      count: personnelList.length,
      personnel: personnelList,
    };
  }

  async getRecentActivity(agencyId: string) {
    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: { agencyId },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { activities: recentAuditLogs };
  }
}
