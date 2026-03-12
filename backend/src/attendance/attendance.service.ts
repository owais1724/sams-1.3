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
    const now = new Date();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const shiftStart = new Date();
    shiftStart.setHours(sh, sm, 0, 0);

    const shiftEnd = new Date();
    shiftEnd.setHours(eh, em, 0, 0);

    // Handle overnight shifts (e.g. 22:00 - 06:00)
    if (shiftEnd <= shiftStart) {
      // If current time is after midnight, shift started yesterday → shiftStart goes back a day
      // If current time is before midnight, shift ends tomorrow → shiftEnd goes forward a day
      if (now.getHours() < 12) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      } else {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }
    }

    const label = shiftName ? ` (${shiftName})` : '';
    const earlyOpen = new Date(shiftStart.getTime() - EARLY_WINDOW_MINUTES * 60000);

    if (now < earlyOpen) {
      const startFormatted = startTime;
      throw new ForbiddenException(
        `Too early to check in. Your shift${label} starts at ${startFormatted}. Check-in opens 30 minutes before.`,
      );
    }

    if (now > shiftEnd) {
      throw new ForbiddenException(
        `Your shift${label} (${startTime} – ${endTime}) has already ended. Check-in is no longer available.`,
      );
    }

    // Within window — determine PRESENT vs LATE
    const lateThreshold = new Date(shiftStart.getTime() + LATE_GRACE_MINUTES * 60000);
    return now > lateThreshold ? 'LATE' : 'PRESENT';
  }

  async findAll(agencyId: string, todayOnly: boolean, employeeId?: string) {
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

    const records = await this.prisma.attendance.findMany({
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
    });

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

    return Array.from(seen.values());
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

    // Allow check-in via deployment OR project
    if (!data.projectId && !data.deploymentId) {
      throw new ForbiddenException('Project or deployment selection is required for check-in');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ── Deployment-based check-in ──
    if (data.deploymentId) {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: data.deploymentId, agencyId },
        include: { guards: { where: { userId } } },
      });

      if (!deployment) {
        throw new ForbiddenException('Deployment not found');
      }
      if (deployment.guards.length === 0) {
        throw new ForbiddenException('You are not assigned to this deployment');
      }
      if (deployment.status !== 'active') {
        throw new ForbiddenException(
          `Cannot check in — deployment is currently "${deployment.status}". Only active deployments allow check-in.`,
        );
      }

      // Duplicate check for this deployment today
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

      // Cross-check: if a project-only record exists at the same client, upgrade it
      const projectAtClient = await this.prisma.project.findFirst({
        where: {
          clientId: deployment.clientId,
          agencyId,
          assignedEmployees: { some: { id: user.employee.id } },
        },
        select: { id: true },
      });
      if (projectAtClient) {
        const existingProjectRecord = await this.prisma.attendance.findFirst({
          where: {
            employeeId: user.employee.id,
            projectId: projectAtClient.id,
            deploymentId: null,
            date: { gte: startOfDay, lte: endOfDay },
          },
        });
        if (existingProjectRecord) {
          // Upgrade the existing project record to include this deployment
          return this.prisma.attendance.update({
            where: { id: existingProjectRecord.id },
            data: {
              deploymentId: data.deploymentId,
              photo: data.photo || existingProjectRecord.photo,
              latitude: data.latitude || existingProjectRecord.latitude,
              longitude: data.longitude || existingProjectRecord.longitude,
            },
          });
        }
      }

      // Validate check-in timing against shift window
      const shiftData = await this.prisma.shift.findUnique({ where: { id: deployment.shiftId } });
      let status = 'PRESENT';
      if (shiftData?.startTime && shiftData?.endTime) {
        status = this.validateShiftTiming(shiftData.startTime, shiftData.endTime, shiftData.name);
      }

      // Auto-link the projectId — find a project at this client that the employee is assigned to
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
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          agencyId,
          employeeId: user.employee.id,
          deploymentId: data.deploymentId,
          projectId: linkedProjectId,
        },
      });
    }

    // ── Project-based check-in ──

    // If guard has active deployments today, auto-convert to deployment check-in
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
            shift: { select: { name: true } },
          },
        },
      },
    });

    if (activeDeployments.length > 0 && data.projectId) {
      // Find which client this project belongs to
      const targetProject = await this.prisma.project.findFirst({
        where: { id: data.projectId, agencyId },
        select: { clientId: true, name: true },
      });

      if (targetProject) {
        // Find matching deployment for this client
        const matchingDeployment = activeDeployments.find(
          dg => dg.deployment.clientId === targetProject.clientId,
        );

        if (matchingDeployment) {
          // Auto-convert: check in via deployment path instead
          const existingDep = await this.prisma.attendance.findFirst({
            where: {
              employeeId: user.employee.id,
              deploymentId: matchingDeployment.deploymentId,
              date: { gte: startOfDay, lte: endOfDay },
            },
          });
          if (existingDep) {
            throw new ConflictException(
              `Already checked in for this deployment today at ${new Date(existingDep.checkIn!).toLocaleTimeString()}`,
            );
          }

          // Validate timing against deployment shift
          let depStatus = 'PRESENT';
          const shiftData = await this.prisma.shift.findUnique({ where: { id: matchingDeployment.deployment.shiftId } });
          if (shiftData?.startTime && shiftData?.endTime) {
            depStatus = this.validateShiftTiming(shiftData.startTime, shiftData.endTime, shiftData.name);
          }

          return this.prisma.attendance.create({
            data: {
              date: new Date(),
              checkIn: new Date(),
              status: depStatus,
              method: data.method || 'WEB',
              photo: data.photo || null,
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              agencyId,
              employeeId: user.employee.id,
              deploymentId: matchingDeployment.deploymentId,
              projectId: data.projectId,
            },
          });
        }

        // Project doesn't match any active deployment — block it
        const deploymentNames = activeDeployments
          .map(dg => `"${dg.deployment.client.name}" (${dg.deployment.shift.name})`)
          .join(', ');
        throw new ForbiddenException(
          `You have active deployments today at ${deploymentNames}. You can only check in at your deployed sites.`,
        );
      }
    }

    // Validate that the project belongs to this agency
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, agencyId },
      include: {
        assignedEmployees: {
          where: { id: user.employee.id },
        },
      },
    });
    
    if (!project) {
      throw new ForbiddenException('Unauthorized project selection');
    }

    // If checking in via QR, validate employee is assigned to this project
    if (data.method === 'QR' && project.assignedEmployees.length === 0) {
      throw new ForbiddenException('You are not assigned to this project site');
    }

    // ── DUPLICATE PROTECTION: Check if already checked in today for THIS PROJECT ────────────────
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId: user.employee.id,
        projectId: data.projectId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException(`Already checked in for this project today at ${new Date(existingAttendance.checkIn!).toLocaleTimeString()}`);
    }

    // Cross-check: if a deployment-based record exists at the same client, upgrade it
    if (project.clientId) {
      const existingDeploymentRecord = await this.prisma.attendance.findFirst({
        where: {
          employeeId: user.employee.id,
          projectId: null,
          deployment: { clientId: project.clientId },
          date: { gte: startOfDay, lte: endOfDay },
        },
      });
      if (existingDeploymentRecord) {
        // Upgrade the existing deployment record to also include projectId
        return this.prisma.attendance.update({
          where: { id: existingDeploymentRecord.id },
          data: {
            projectId: data.projectId,
            photo: data.photo || existingDeploymentRecord.photo,
            latitude: data.latitude || existingDeploymentRecord.latitude,
            longitude: data.longitude || existingDeploymentRecord.longitude,
          },
        });
      }
    }

    // Validate shift timing if employee has a shift assignment for today at this project
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
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        agencyId: agencyId,
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
