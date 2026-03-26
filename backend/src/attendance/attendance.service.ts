import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// How many minutes before shift start a guard is allowed to check in
const EARLY_WINDOW_MINUTES = 30;
// Grace period after shift start before marking as LATE
const LATE_GRACE_MINUTES = 15;

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) { }

  /**
   * Validates check-in time against shift window.
   * Returns 'PRESENT' or 'LATE', or throws if outside the allowed window.
   */
  private validateShiftTiming(startTime: string, endTime: string, shiftName?: string): string {
    // Use agency timezone (TZ env var) — fallback to Asia/Kolkata
    const tz = process.env.TZ || 'Asia/Kolkata';
    const nowUTC = new Date();
    // Get current time in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(nowUTC);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
    const localNow = new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const shiftStart = new Date(localNow);
    shiftStart.setHours(sh, sm, 0, 0);

    const shiftEnd = new Date(localNow);
    shiftEnd.setHours(eh, em, 0, 0);

    // Handle overnight shifts (e.g. 22:00 - 06:00)
    if (shiftEnd <= shiftStart) {
      if (localNow.getHours() < 12) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      } else {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }
    }

    const label = shiftName ? ` (${shiftName})` : '';
    const earlyOpen = new Date(shiftStart.getTime() - EARLY_WINDOW_MINUTES * 60000);

    if (localNow < earlyOpen) {
      throw new ForbiddenException(
        `Too early to check in. Your shift${label} starts at ${startTime}. Check-in opens 30 minutes before.`,
      );
    }

    if (localNow > shiftEnd) {
      throw new ForbiddenException(
        `Too late to check in. Your shift${label} (${startTime} – ${endTime}) has already ended. Check-in is no longer available.`,
      );
    }

    // Within window — determine PRESENT vs LATE
    const lateThreshold = new Date(shiftStart.getTime() + LATE_GRACE_MINUTES * 60000);
    return localNow > lateThreshold ? 'LATE' : 'PRESENT';
  }

  async findAll(agencyId: string, todayOnly: boolean, employeeId?: string, page?: number, limit?: number) {
    if (!agencyId) return [];
    const where: any = { agencyId };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (todayOnly) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const skip = page && limit ? (page - 1) * limit : undefined;
    
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          employee: {
            include: {
              designation: true,
              user: { select: { fullName: true } },
            },
          },
          project: true,
          deployment: {
            select: {
              id: true,
              clientId: true,
              client: { select: { name: true } },
              shift: { select: { name: true, startTime: true, endTime: true } },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(skip && limit ? { skip, take: limit } : {}),
      }),
      this.prisma.attendance.count({ where })
    ]);

    // Deduplicate: per employee per site, keep only the latest record.
    // Site key = deploymentId or projectId (whichever is set).
    // If both point to the same client, they're the same site.
    const seen = new Map<string, typeof records[0]>();
    for (const r of records) {
      // Build a unique key per employee per site
      const siteKey = r.deploymentId || r.projectId || 'general';
      const key = `${r.employeeId}::${siteKey}`;

      if (!seen.has(key)) {
        seen.set(key, r);
      } else {
        // If existing record has no deploymentId but this one does, prefer the one with deploymentId
        const existing = seen.get(key)!;
        if (!existing.deploymentId && r.deploymentId) {
          seen.set(key, r);
        }
      }
    }

    // Also merge records where employee has separate project-only and deployment-only records at the same client
    const byEmployeeClient = new Map<string, typeof records[0]>();
    for (const [key, r] of seen) {
      const clientId = (r as any).deployment?.clientId || (r as any).project?.clientId;
      if (clientId) {
        const ecKey = `${r.employeeId}::client::${clientId}`;
        if (byEmployeeClient.has(ecKey)) {
          const existing = byEmployeeClient.get(ecKey)!;
          // Keep the one with deploymentId, or the latest
          if (r.deploymentId && !existing.deploymentId) {
            byEmployeeClient.set(ecKey, r);
            seen.delete(`${existing.employeeId}::${existing.deploymentId || existing.projectId || 'general'}`);
          } else {
            seen.delete(key);
          }
        } else {
          byEmployeeClient.set(ecKey, r);
        }
      }
    }

    const finalRecords = Array.from(seen.values());
    
    // Return paginated result
    if (page && limit) {
      return {
        data: finalRecords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    }
    
    return finalRecords;
  }

  async checkIn(agencyId: string, userId: string, data: any) {
    // Find employee associated with user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user || !user.employee) {
      throw new NotFoundException('User is not associated with an employee record');
    }

    // Require either deployment or project
    if (!data.projectId && !data.deploymentId) {
      throw new ForbiddenException('Deployment or project selection is required for check-in');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ── PRIORITY 1: Deployment-based check-in (guards with active deployments) ──
    if (data.deploymentId) {
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: data.deploymentId },
        include: { 
          guards: { where: { userId } },
          shift: true,
          client: { select: { name: true } }
        },
      });

      if (!deployment) {
        throw new NotFoundException('Deployment not found');
      }

      if (deployment.agencyId !== agencyId) {
        throw new ForbiddenException('Access to this deployment is forbidden');
      }

      // Verify guard is assigned to this deployment
      if (deployment.guards.length === 0) {
        throw new ForbiddenException('You are not assigned to this deployment');
      }

      // Verify deployment is active
      if (deployment.status !== 'active') {
        throw new ForbiddenException(
          `Cannot check in — deployment is currently "${deployment.status}". Only active deployments allow check-in.`,
        );
      }

      // Verify deployment date range includes today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deploymentStart = new Date(deployment.startDate);
      deploymentStart.setHours(0, 0, 0, 0);
      const deploymentEnd = new Date(deployment.endDate);
      deploymentEnd.setHours(23, 59, 59, 999);

      // For overnight shifts, allow check-in on both start and end dates
      // Check if shift crosses midnight
      const isOvernightShift = deployment.shift?.startTime && deployment.shift?.endTime && 
        (() => {
          const [sh, sm] = deployment.shift.startTime.split(':').map(Number);
          const [eh, em] = deployment.shift.endTime.split(':').map(Number);
          const startMinutes = sh * 60 + sm;
          const endMinutes = eh * 60 + em;
          return endMinutes <= startMinutes;
        })();

      if (isOvernightShift) {
        // For overnight shifts, allow check-in from start date to end date (inclusive)
        if (today < deploymentStart) {
          throw new ForbiddenException(
            `Too early to check in. This deployment starts on ${deploymentStart.toLocaleDateString()}. Check-in will be available from that date.`,
          );
        }
        if (today > deploymentEnd) {
          throw new ForbiddenException(
            `Too late to check in. This deployment ended on ${deploymentEnd.toLocaleDateString()}. Check-in is no longer available.`,
          );
        }
      } else {
        // For regular shifts, only allow check-in on dates within the range
        if (today < deploymentStart) {
          throw new ForbiddenException(
            `Too early to check in. This deployment starts on ${deploymentStart.toLocaleDateString()}. Check-in will be available from that date.`,
          );
        }
        if (today > deploymentEnd) {
          throw new ForbiddenException(
            `Too late to check in. This deployment ended on ${deploymentEnd.toLocaleDateString()}. Check-in is no longer available.`,
          );
        }
      }

      // Check for duplicate check-in today
      const existing = await this.prisma.attendance.findFirst({
        where: {
          employeeId: user.employee.id,
          deploymentId: data.deploymentId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Already checked in for this deployment today at ${new Date(existing.checkIn!).toLocaleTimeString()}`,
        );
      }

      // Validate check-in timing against shift window
      let status = 'PRESENT';
      if (deployment.shift?.startTime && deployment.shift?.endTime) {
        status = this.validateShiftTiming(
          deployment.shift.startTime, 
          deployment.shift.endTime, 
          deployment.shift.name
        );
      }

      // Auto-link projectId if employee is assigned to a project at this client
      let linkedProjectId: string | null = null;
      const assignedProject = await this.prisma.project.findFirst({
        where: {
          clientId: deployment.clientId,
          agencyId,
          assignedEmployees: { some: { id: user.employee.id } },
        },
        select: { id: true },
      });
      if (assignedProject) {
        linkedProjectId = assignedProject.id;
      }

      return this.prisma.attendance.create({
        data: {
          date: new Date(),
          checkIn: new Date(),
          status,
          method: data.method || 'WEB',
          photo: data.photo || null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          agencyId,
          employeeId: user.employee.id,
          deploymentId: data.deploymentId,
          projectId: linkedProjectId,
        },
      });
    }

    // ── PRIORITY 2: Check if guard has active deployments today ──
    const activeDeployments = await this.prisma.deploymentGuard.findMany({
      where: {
        userId,
        agencyId,
        deployment: {
          status: 'active',
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
      },
      include: {
        deployment: {
          include: {
            client: { select: { id: true, name: true } },
            shift: { select: { name: true, startTime: true, endTime: true } },
          },
        },
      },
    });

    // If guard has active deployments, they MUST check in via deployment
    if (activeDeployments.length > 0) {
      const deploymentNames = activeDeployments
        .map(dg => `"${dg.deployment.client.name}" (${dg.deployment.shift.name})`)
        .join(', ');
      
      throw new ForbiddenException(
        `No active deployment found for today. You have deployments at ${deploymentNames}. Please select your deployment to check in.`,
      );
    }

    // ── PRIORITY 3: Project-based check-in (for non-deployed staff) ──
    if (!data.projectId) {
      throw new ForbiddenException('No active deployment found for today. Please contact your supervisor.');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        assignedEmployees: {
          where: { id: user.employee.id },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.agencyId !== agencyId) {
      throw new ForbiddenException('Access to this project is forbidden');
    }

    // Verify employee is assigned to this project
    if (project.assignedEmployees.length === 0) {
      throw new ForbiddenException('You are not assigned to this project site');
    }

    // Check for duplicate check-in today
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId: user.employee.id,
        projectId: data.projectId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingAttendance) {
      throw new ConflictException(
        `Already checked in for this project today at ${new Date(existingAttendance.checkIn!).toLocaleTimeString()}`,
      );
    }

    // Validate shift timing if employee has a shift assignment
    let projectStatus = 'PRESENT';
    const shiftAssignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId: user.employee.id,
        projectId: data.projectId,
        agencyId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { shift: true },
    });

    if (shiftAssignment?.shift?.startTime && shiftAssignment?.shift?.endTime) {
      projectStatus = this.validateShiftTiming(
        shiftAssignment.shift.startTime,
        shiftAssignment.shift.endTime,
        shiftAssignment.shift.name,
      );
    }

    return this.prisma.attendance.create({
      data: {
        date: new Date(),
        checkIn: new Date(),
        status: projectStatus,
        method: data.method || 'WEB',
        photo: data.photo || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        agencyId,
        employeeId: user.employee.id,
        projectId: data.projectId,
      },
    });
  }

  async checkOut(agencyId: string, userId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user || !user.employee) {
      throw new NotFoundException('User is not associated with an employee record');
    }

    // Find today's check-in
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = {
      employeeId: user.employee.id,
      agencyId,
      date: { gte: today },
      checkOut: null,
    };

    if (data.deploymentId) {
      whereClause.deploymentId = data.deploymentId;
    } else if (data.projectId) {
      whereClause.projectId = data.projectId;
    }

    const attendance = await this.prisma.attendance.findFirst({
      where: whereClause,
    });

    if (!attendance) {
      throw new NotFoundException('No active check-in found for today');
    }

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: new Date() },
    });
  }

  /**
   * Detect absent guards: for each active/planned deployment today,
   * find assigned guards who have no attendance record and create ABSENT entries.
   */
  async detectAbsent(agencyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all deployments active today
    const deployments = await this.prisma.deployment.findMany({
      where: {
        agencyId,
        status: { in: ['active', 'planned'] },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        guards: {
          include: {
            user: { select: { id: true, employee: { select: { id: true } } } },
          },
        },
      },
    });

    let created = 0;
    for (const dep of deployments) {
      for (const guard of dep.guards) {
        if (!guard.user.employee) continue;

        // Check if attendance record already exists today for this deployment
        const existing = await this.prisma.attendance.findFirst({
          where: {
            employeeId: guard.user.employee.id,
            deploymentId: dep.id,
            date: { gte: today, lt: tomorrow },
          },
        });

        if (!existing) {
          await this.prisma.attendance.create({
            data: {
              date: today,
              status: 'ABSENT',
              method: 'SYSTEM',
              agencyId,
              employeeId: guard.user.employee.id,
              deploymentId: dep.id,
            },
          });
          created++;
        }
      }
    }

    return { message: `Detected ${created} absent record(s)`, created };
  }
}
