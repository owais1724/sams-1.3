import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftAssignmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(agencyId: string, filters?: { date?: string; employeeId?: string; shiftId?: string; status?: string }) {
    if (!agencyId) return [];

    const where: any = { agencyId };

    if (filters?.date) {
      const d = new Date(filters.date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.shiftId) where.shiftId = filters.shiftId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.shiftAssignment.findMany({
      where,
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(agencyId: string, data: {
    shiftId: string;
    employeeId: string;
    date: string;
    projectId?: string;
    notes?: string;
  }) {
    if (!data.shiftId || !data.employeeId || !data.date) {
      throw new BadRequestException('Shift, employee, and date are required');
    }

    // Verify shift belongs to agency
    const shift = await this.prisma.shift.findFirst({
      where: { id: data.shiftId, agencyId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    // Verify employee belongs to agency
    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, agencyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Check for duplicate assignment (same employee, same shift, same date)
    const assignDate = new Date(data.date);
    const startOfDay = new Date(assignDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(assignDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    if (existing) {
      throw new ConflictException('Guard is already assigned to this shift on this date');
    }

    return this.prisma.shiftAssignment.create({
      data: {
        date: assignDate,
        agencyId,
        shiftId: data.shiftId,
        employeeId: data.employeeId,
        projectId: data.projectId || null,
        notes: data.notes || null,
        status: 'SCHEDULED',
      },
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
    });
  }

  async bulkCreate(agencyId: string, data: {
    shiftId: string;
    employeeIds: string[];
    date: string;
    projectId?: string;
  }) {
    if (!data.shiftId || !data.employeeIds?.length || !data.date) {
      throw new BadRequestException('Shift, at least one employee, and date are required');
    }

    const results = [];
    for (const employeeId of data.employeeIds) {
      try {
        const assignment = await this.create(agencyId, {
          shiftId: data.shiftId,
          employeeId,
          date: data.date,
          projectId: data.projectId,
        });
        results.push({ employeeId, success: true, assignment });
      } catch (error) {
        results.push({ employeeId, success: false, error: error.message });
      }
    }
    return results;
  }

  async checkIn(agencyId: string, assignmentId: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id: assignmentId, agencyId },
      include: { shift: true },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');

    const now = new Date();
    const status = this.detectLateArrival(assignment.shift.startTime, now)
      ? 'LATE'
      : 'SCHEDULED';

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: { checkIn: now, status },
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
    });
  }

  async checkOut(agencyId: string, assignmentId: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id: assignmentId, agencyId },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: { checkOut: new Date(), status: assignment.status === 'LATE' ? 'LATE' : 'COMPLETED' },
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
    });
  }

  async detectMissedShifts(agencyId: string) {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(cutoff.getHours() - 1); // 1 hour grace after shift start

    // Find all SCHEDULED assignments with a date before now that have no check-in
    const missedAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        agencyId,
        status: 'SCHEDULED',
        checkIn: null,
        date: { lt: cutoff },
      },
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
    });

    // Mark them as MISSED
    if (missedAssignments.length > 0) {
      await this.prisma.shiftAssignment.updateMany({
        where: {
          id: { in: missedAssignments.map((a) => a.id) },
        },
        data: { status: 'MISSED' },
      });
    }

    return {
      markedMissed: missedAssignments.length,
      assignments: missedAssignments,
    };
  }

  async getShiftReport(agencyId: string, date?: string) {
    const where: any = { agencyId };

    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const assignments = await this.prisma.shiftAssignment.findMany({
      where,
      include: {
        shift: true,
        employee: { include: { designation: true } },
        project: true,
      },
    });

    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === 'COMPLETED').length;
    const late = assignments.filter((a) => a.status === 'LATE').length;
    const missed = assignments.filter((a) => a.status === 'MISSED').length;
    const scheduled = assignments.filter((a) => a.status === 'SCHEDULED').length;

    return { total, completed, late, missed, scheduled, assignments };
  }

  async remove(agencyId: string, id: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id, agencyId },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');

    return this.prisma.shiftAssignment.delete({ where: { id } });
  }

  /**
   * Compare shift start time (HH:mm) with actual check-in time.
   * Returns true if the guard arrived more than 15 minutes late.
   */
  private detectLateArrival(shiftStartTime: string, checkInTime: Date): boolean {
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(checkInTime);
    shiftStart.setHours(hours, minutes, 0, 0);

    const gracePeriodMs = 15 * 60 * 1000; // 15 minutes grace
    return checkInTime.getTime() > shiftStart.getTime() + gracePeriodMs;
  }
}
