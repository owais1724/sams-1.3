import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, LeaveType, LeaveRequest } from './leave.entity';
import { CreateLeaveRequestDto } from './dto/create-leave.dto';
import { LeaveApprovalDto } from './dto/approve-leave.dto';

type LeavePolicyConfig = {
  id: string | null;
  agencyId: string;
  roleId: string | null;
  roleName: string | null;
  workingDaysPerWeek: number;
  casualLeaveDays: number;
  sickLeaveDays: number;
  earnedLeaveDays: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) { }

  private readonly DEFAULT_LEAVE_POLICY = {
    workingDaysPerWeek: 5,
    casualLeaveDays: 12,
    sickLeaveDays: 7,
    earnedLeaveDays: 12,
  } as const;

  private readonly APPLY_ALLOWED_TYPES = [
    LeaveType.CASUAL,
    LeaveType.SICK,
    LeaveType.EARNED,
    LeaveType.LOSS_OF_PAY,
  ] as const;

  private readonly LEAVE_LIMIT_FIELDS = {
    [LeaveType.CASUAL]: 'casualLeaveDays',
    [LeaveType.SICK]: 'sickLeaveDays',
    [LeaveType.EARNED]: 'earnedLeaveDays',
  } as const;

  private readonly DEFAULT_POLICY_ROLE_ORDER: Record<string, number> = {
    hr: 1,
    supervisor: 2,
    guard: 3,
  };

  private mapLeavePolicy(
    policy: any | null,
    agencyId: string,
    roleId: string | null = null,
    roleName: string | null = null,
  ): LeavePolicyConfig {
    return {
      id: policy?.id ?? null,
      agencyId,
      roleId: policy?.roleId ?? roleId,
      roleName,
      workingDaysPerWeek:
        policy?.workingDaysPerWeek ?? this.DEFAULT_LEAVE_POLICY.workingDaysPerWeek,
      casualLeaveDays:
        policy?.casualLeaveDays ?? this.DEFAULT_LEAVE_POLICY.casualLeaveDays,
      sickLeaveDays:
        policy?.sickLeaveDays ?? this.DEFAULT_LEAVE_POLICY.sickLeaveDays,
      earnedLeaveDays:
        policy?.earnedLeaveDays ?? this.DEFAULT_LEAVE_POLICY.earnedLeaveDays,
      createdAt: policy?.createdAt ?? null,
      updatedAt: policy?.updatedAt ?? null,
    };
  }

  private getYearlyLeaveLimit(
    leaveType: LeaveType,
    leavePolicy: LeavePolicyConfig,
  ): number | null {
    const policyField = this.LEAVE_LIMIT_FIELDS[leaveType as keyof typeof this.LEAVE_LIMIT_FIELDS];

    if (!policyField) {
      return null;
    }

    return leavePolicy[policyField];
  }

  private ensurePolicyEditor(userRole?: string) {
    const normalizedRole = (userRole || '').toLowerCase();

    if (!normalizedRole.includes('admin')) {
      throw new ForbiddenException('Only Agency Admin can update leave policy');
    }
  }

  private normalizeRoleName(name?: string | null) {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getCanonicalPolicyRoleName(name?: string | null) {
    const normalized = this.normalizeRoleName(name);

    if (!normalized) return '';
    if (normalized.includes('human resource') || /(^|\s)hr(\s|$)/.test(normalized)) return 'hr';
    if (normalized.includes('supervisor')) return 'supervisor';
    if (normalized.includes('guard')) return 'guard';
    if (normalized.includes('agency') && normalized.includes('admin')) return 'agency admin';
    if (normalized === 'staff') return 'staff';
    if (normalized === 'cleaner') return 'cleaner';

    return normalized;
  }

  private async getAgencyRolesForPolicy(agencyId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        agencyId,
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    });

    return roles
      .filter((role) => {
        const canonical = this.getCanonicalPolicyRoleName(role.name);

        if (!role.isSystem) {
          return canonical !== 'agency admin' && canonical !== 'super admin';
        }

        return canonical === 'hr' || canonical === 'supervisor' || canonical === 'guard';
      })
      .sort((a, b) => {
        const canonicalA = this.getCanonicalPolicyRoleName(a.name);
        const canonicalB = this.getCanonicalPolicyRoleName(b.name);
        const orderA = this.DEFAULT_POLICY_ROLE_ORDER[canonicalA] ?? 100;
        const orderB = this.DEFAULT_POLICY_ROLE_ORDER[canonicalB] ?? 100;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      })
      .map((role) => ({
        id: role.id,
        name: role.name,
      }));
  }

  private async getResolvedLeavePolicyForRole(
    agencyId: string,
    roleId?: string | null,
    roleName?: string | null,
  ) {
    if (!roleId) {
      return this.mapLeavePolicy(null, agencyId, null, roleName ?? null);
    }

    const policy = await this.prisma.leavePolicy.findUnique({
      where: {
        agencyId_roleId: {
          agencyId,
          roleId,
        },
      },
    });

    return this.mapLeavePolicy(policy, agencyId, roleId, roleName ?? null);
  }

  private async getResolvedLeavePolicyForEmployee(agencyId: string, employeeId: string) {
    const userWithRole = await this.prisma.user.findFirst({
      where: {
        agencyId,
        employeeId,
      },
      select: {
        roleId: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.getResolvedLeavePolicyForRole(
      agencyId,
      userWithRole?.roleId ?? null,
      userWithRole?.role?.name ?? null,
    );
  }

  async getLeavePolicy(agencyId: string, userRole?: string) {
    this.ensurePolicyEditor(userRole);

    const roles = await this.getAgencyRolesForPolicy(agencyId);
    const policies = roles.length > 0
      ? await this.prisma.leavePolicy.findMany({
        where: {
          agencyId,
          roleId: {
            in: roles.map((role) => role.id),
          },
        },
      })
      : [];

    const policyMap = new Map(policies.map((policy) => [policy.roleId, policy]));

    return roles.map((role) => this.mapLeavePolicy(
      policyMap.get(role.id) ?? null,
      agencyId,
      role.id,
      role.name,
    ));
  }

  async updateLeavePolicy(
    agencyId: string,
    policyData: Array<{
      roleId?: string;
      workingDaysPerWeek?: number | string;
      casualLeaveDays?: number | string;
      sickLeaveDays?: number | string;
      earnedLeaveDays?: number | string;
    }>,
    userRole?: string,
  ) {
    this.ensurePolicyEditor(userRole);

    if (!Array.isArray(policyData)) {
      throw new BadRequestException('Leave policy payload must be an array');
    }

    const roles = await this.getAgencyRolesForPolicy(agencyId);
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const seenRoleIds = new Set<string>();

    for (const policy of policyData) {
      const roleId = String(policy?.roleId || '').trim();

      if (!roleId) {
        throw new BadRequestException('Each leave policy item must include a roleId');
      }

      if (seenRoleIds.has(roleId)) {
        throw new BadRequestException(`Duplicate roleId detected: ${roleId}`);
      }

      seenRoleIds.add(roleId);

      const role = roleMap.get(roleId);
      if (!role) {
        throw new BadRequestException(`Role does not belong to this agency: ${roleId}`);
      }

      const workingDaysPerWeek = Number(policy?.workingDaysPerWeek);
      const casualLeaveDays = Number(policy?.casualLeaveDays);
      const sickLeaveDays = Number(policy?.sickLeaveDays);
      const earnedLeaveDays = Number(policy?.earnedLeaveDays);

      if (![5, 6].includes(workingDaysPerWeek)) {
        throw new BadRequestException(`Working days per week must be 5 or 6 for role ${role.name}`);
      }

      for (const [label, value] of [
        ['Casual leave days', casualLeaveDays],
        ['Sick leave days', sickLeaveDays],
        ['Earned leave days', earnedLeaveDays],
      ] as const) {
        if (!Number.isInteger(value) || value < 1 || value > 60) {
          throw new BadRequestException(`${label} must be between 1 and 60 for role ${role.name}`);
        }
      }
    }

    await this.prisma.$transaction(
      policyData.map((policy) => {
        const roleId = String(policy.roleId);

        return this.prisma.leavePolicy.upsert({
          where: {
            agencyId_roleId: {
              agencyId,
              roleId,
            },
          },
          update: {
            workingDaysPerWeek: Number(policy.workingDaysPerWeek),
            casualLeaveDays: Number(policy.casualLeaveDays),
            sickLeaveDays: Number(policy.sickLeaveDays),
            earnedLeaveDays: Number(policy.earnedLeaveDays),
          },
          create: {
            agencyId,
            roleId,
            workingDaysPerWeek: Number(policy.workingDaysPerWeek),
            casualLeaveDays: Number(policy.casualLeaveDays),
            sickLeaveDays: Number(policy.sickLeaveDays),
            earnedLeaveDays: Number(policy.earnedLeaveDays),
          },
        });
      }),
    );

    return this.getLeavePolicy(agencyId, userRole);
  }

  private normalizeApplyLeaveType(leaveType: string): LeaveType {
    const normalized = (leaveType || '').toUpperCase().trim();

    // Legacy compatibility: keep old clients working while moving to new naming.
    if (normalized === LeaveType.ANNUAL) {
      return LeaveType.EARNED;
    }
    if (normalized === LeaveType.EMERGENCY) {
      return LeaveType.LOSS_OF_PAY;
    }

    return normalized as LeaveType;
  }

  private getDateRangeDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  private async resolveEmployeeForUser(agencyId: string, userId: string, employeeIdHint?: string | null) {
    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        agencyId: true,
        employeeId: true,
      },
    });

    if (!user || user.agencyId !== agencyId) {
      throw new ForbiddenException('Invalid user context for this agency');
    }

    const scopedEmployeeId = user.employeeId || employeeIdHint || null;
    if (!scopedEmployeeId) {
      throw new ForbiddenException('Only employees can apply for leave');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: scopedEmployeeId },
      select: { id: true, agencyId: true },
    });

    if (!employee || employee.agencyId !== agencyId) {
      throw new ForbiddenException('Employee profile not found in this agency');
    }

    return employee;
  }

  async createLeaveRequest(
    createLeaveDto: CreateLeaveRequestDto,
    agencyId: string,
    userRole?: string,
    userId?: string,
    employeeId?: string,
  ): Promise<LeaveRequest> {
    const startDate = new Date(createLeaveDto.startDate);
    const endDate = new Date(createLeaveDto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid leave date range');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const scopedEmployee = await this.resolveEmployeeForUser(agencyId, userId || '', employeeId);
    const leavePolicy = await this.getResolvedLeavePolicyForEmployee(agencyId, scopedEmployee.id);

    const leaveType = this.normalizeApplyLeaveType(String(createLeaveDto.leaveType));
    const isAllowedLeaveType = this.APPLY_ALLOWED_TYPES.some((type) => type === leaveType);
    if (!isAllowedLeaveType) {
      throw new BadRequestException(
        `leaveType must be one of: ${this.APPLY_ALLOWED_TYPES.join(', ')}`,
      );
    }

    // ── OVERLAP PROTECTION: Check if leave already exists for these dates ──────
    const overlappingLeave = await this.prisma.leave.findFirst({
      where: {
        agencyId,
        employeeId: scopedEmployee.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.SUPERVISOR_APPROVED, LeaveStatus.HR_APPROVED, LeaveStatus.AGENCY_APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException(
        'You already have a leave request for these dates.',
      );
    }

    if (leaveType !== LeaveType.LOSS_OF_PAY) {
      const yearlyLimit = this.getYearlyLeaveLimit(leaveType, leavePolicy) || 0;
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

      const approvedLeaves = await this.prisma.leave.findMany({
        where: {
          agencyId,
          employeeId: scopedEmployee.id,
          leaveType,
          status: LeaveStatus.AGENCY_APPROVED,
          startDate: { gte: yearStart, lte: yearEnd },
        },
        select: {
          startDate: true,
          endDate: true,
        },
      });

      const usedLeaveDays = approvedLeaves.reduce((sum, leave) => {
        return sum + this.getDateRangeDays(leave.startDate, leave.endDate);
      }, 0);

      const remaining = Math.max(0, yearlyLimit - usedLeaveDays);
      const requestedDays = this.getDateRangeDays(startDate, endDate);

      if (remaining <= 0 || requestedDays > remaining) {
        throw new BadRequestException(
          'Insufficient leave balance. This will be Loss of Pay — please select Loss of Pay as leave type.',
        );
      }
    }

    const leaveRequest = await this.prisma.leave.create({
      data: {
        employeeId: scopedEmployee.id,
        leaveType,
        startDate,
        endDate,
        reason: createLeaveDto.reason,
        status: LeaveStatus.PENDING,
        agencyId,
      },
      include: {
        employee: {
          include: {
            designation: true,
            user: { include: { role: true } },
          },
        },
      },
    });

    return this.formatLeaveRequest(leaveRequest);
  }

  async getMyLeaves(agencyId: string, userId: string, employeeId?: string): Promise<LeaveRequest[]> {
    const scopedEmployee = await this.resolveEmployeeForUser(agencyId, userId, employeeId);

    const leaveRequests = await this.prisma.leave.findMany({
      where: {
        agencyId,
        employeeId: scopedEmployee.id,
      },
      include: {
        employee: {
          include: {
            designation: true,
            user: { include: { role: true } },
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    return leaveRequests.map((leave) => this.formatLeaveRequest(leave));
  }

  async getLeaveBalance(agencyId: string, userId: string, employeeId?: string) {
    const scopedEmployee = await this.resolveEmployeeForUser(agencyId, userId, employeeId);
    const leavePolicy = await this.getResolvedLeavePolicyForEmployee(agencyId, scopedEmployee.id);
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const approvedLeaves = await this.prisma.leave.findMany({
      where: {
        agencyId,
        employeeId: scopedEmployee.id,
        status: LeaveStatus.AGENCY_APPROVED,
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: {
        leaveType: true,
        startDate: true,
        endDate: true,
      },
    });

    const usedByType = approvedLeaves.reduce<Record<string, number>>((acc, leave) => {
      const key = this.normalizeApplyLeaveType(String(leave.leaveType));
      acc[key] = (acc[key] || 0) + this.getDateRangeDays(leave.startDate, leave.endDate);
      return acc;
    }, {});

    return {
      CASUAL: {
        total: leavePolicy.casualLeaveDays,
        used: usedByType[LeaveType.CASUAL] || 0,
        remaining: Math.max(0, leavePolicy.casualLeaveDays - (usedByType[LeaveType.CASUAL] || 0)),
      },
      SICK: {
        total: leavePolicy.sickLeaveDays,
        used: usedByType[LeaveType.SICK] || 0,
        remaining: Math.max(0, leavePolicy.sickLeaveDays - (usedByType[LeaveType.SICK] || 0)),
      },
      EARNED: {
        total: leavePolicy.earnedLeaveDays,
        used: usedByType[LeaveType.EARNED] || 0,
        remaining: Math.max(0, leavePolicy.earnedLeaveDays - (usedByType[LeaveType.EARNED] || 0)),
      },
      LOSS_OF_PAY: {
        total: null,
        used: usedByType[LeaveType.LOSS_OF_PAY] || 0,
        remaining: null,
      },
    };
  }

  async getLeaveRequests(
    agencyId: string,
    userRole: string,
    userId: string,
  ): Promise<LeaveRequest[]> {
    if (!agencyId) return [];
    let whereClause: any = { agencyId };

    if (!userRole) return [];

    // Normalize role for comparison
    const role = userRole.toLowerCase();
    const isHR = role.includes('hr');
    const isSupervisor = role.includes('supervisor');
    const isAdmin = role.includes('admin');

    if (isAdmin) {
      whereClause = { agencyId };
    } else {
      const ownLeaves = { employee: { user: { id: userId } } };
      const conditions: any[] = [ownLeaves];

      // skipping logic checks
      const isSupervisorAvailable = await this.isRoleAvailable(
        agencyId,
        'supervisor',
      );
      const isHRAvailable = await this.isRoleAvailable(agencyId, 'hr');

      if (isHR) {
        // HR sees Supervisor-Approved leaves
        conditions.push({
          status: LeaveStatus.SUPERVISOR_APPROVED,
        });

        // HR sees Pending leaves if they are next in line (Supervisor absent/missing)
        if (!isSupervisorAvailable) {
          conditions.push({
            status: LeaveStatus.PENDING,
            employee: {
              user: {
                role: {
                  NOT: [
                    { name: { contains: 'admin', mode: 'insensitive' } },
                    { name: { contains: 'hr', mode: 'insensitive' } },
                  ],
                },
              },
            },
          });
        }

        // HR sees pending Supervisor leaves
        conditions.push({
          status: LeaveStatus.PENDING,
          employee: {
            user: {
              role: { name: { contains: 'supervisor', mode: 'insensitive' } },
            },
          },
        });

        // HR sees emergency leaves that need their acceptance (auto-approved but HR not yet signed)
        conditions.push({
          status: LeaveStatus.AGENCY_APPROVED,
          leaveType: LeaveType.EMERGENCY,
          hrApprovedAt: null,
          employee: {
            user: {
              role: {
                NOT: [
                  { name: { contains: 'admin', mode: 'insensitive' } },
                  { name: { contains: 'hr', mode: 'insensitive' } },
                ],
              },
            },
          },
        });

        // HR history
        conditions.push({ hrApprovedBy: userId });
      }

      if (isSupervisor) {
        // Supervisor sees Pending leaves from staff
        conditions.push({
          status: LeaveStatus.PENDING,
          employee: {
            NOT: { user: { id: userId } },
            user: {
              role: {
                NOT: [
                  { name: { contains: 'admin', mode: 'insensitive' } },
                  { name: { contains: 'hr', mode: 'insensitive' } },
                  { name: { contains: 'supervisor', mode: 'insensitive' } },
                ],
              },
            },
          },
        });

        // Supervisor sees emergency leaves for staff that need their acceptance
        conditions.push({
          status: LeaveStatus.AGENCY_APPROVED,
          leaveType: LeaveType.EMERGENCY,
          supervisorApprovedAt: null,
          employee: {
            user: {
              role: {
                NOT: [
                  { name: { contains: 'admin', mode: 'insensitive' } },
                  { name: { contains: 'hr', mode: 'insensitive' } },
                  { name: { contains: 'supervisor', mode: 'insensitive' } },
                ],
              },
            },
          },
        });

        // Supervisor history
        conditions.push({ supervisorApprovedBy: userId });
      }

      whereClause = {
        agencyId,
        OR: conditions,
      };
    }

    const leaveRequests = await this.prisma.leave.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            designation: true,
            user: { include: { role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return leaveRequests.map((lr) => this.formatLeaveRequest(lr));
  }

  async approveLeave(
    leaveId: string,
    approvalDto: LeaveApprovalDto,
    userRole: string,
    userId: string,
    agencyId: string,
  ): Promise<LeaveRequest> {
    const exists = await this.prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!exists) throw new NotFoundException('Leave request not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this leave request is forbidden');

    const leaveRequest = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: {
            user: {
              include: { role: true },
            },
          },
        },
      },
    });

    const updateData: any = {};

    // Cannot approve your own leave
    if (leaveRequest.employee.user?.id === userId) {
      throw new ForbiddenException('You cannot approve your own leave request');
    }

    // Rejection is similar for everyone
    if (approvalDto.status === LeaveStatus.REJECTED) {
      updateData.status = LeaveStatus.REJECTED;
      updateData.rejectionReason = approvalDto.rejectionReason;
    } else {
      const role = userRole.toLowerCase();
      const isHR = role.includes('hr');
      const isSupervisor = role.includes('supervisor');
      const isAdmin = role.includes('admin');

      const applicantRole = (
        leaveRequest.employee.user?.role?.name || 'Staff'
      ).toLowerCase();
      const isApplicantAdmin = applicantRole.includes('admin');
      const isApplicantHR = applicantRole.includes('hr');
      const isApplicantSupervisor = applicantRole.includes('supervisor');

      const isEmergency = leaveRequest.leaveType === LeaveType.EMERGENCY;

      // skipping logic checks
      const isSupervisorAvailable = await this.isRoleAvailable(
        agencyId,
        'supervisor',
      );
      const isHRAvailable = await this.isRoleAvailable(agencyId, 'hr');

      if (isAdmin) {
        // Admin approval is always final
        updateData.status = LeaveStatus.AGENCY_APPROVED;
        updateData.agencyApprovedAt = new Date();
        updateData.agencyApprovedBy = userId;

        if (!leaveRequest.supervisorApprovedBy) {
          updateData.supervisorApprovedAt = new Date();
          updateData.supervisorApprovedBy = userId;
        }
        if (!leaveRequest.hrApprovedBy) {
          updateData.hrApprovedAt = new Date();
          updateData.hrApprovedBy = userId;
        }
      } else if (isHR) {
        if (isApplicantAdmin || isApplicantHR) {
          throw new ForbiddenException(
            'HR leaves can only be approved by an Agency Admin',
          );
        }

        updateData.hrApprovedAt = new Date();
        updateData.hrApprovedBy = userId;

        // If it was already approved (Emergency), we just add HR's signature
        if (isEmergency) {
          // Status stays AGENCY_APPROVED
        } else {
          // For normal leaves, HR approval is final (Agency Admin is the fallback)
          updateData.status = LeaveStatus.AGENCY_APPROVED;
          updateData.agencyApprovedAt = new Date();
          updateData.agencyApprovedBy = userId;

          if (!leaveRequest.supervisorApprovedBy) {
            updateData.supervisorApprovedAt = new Date();
            updateData.supervisorApprovedBy = userId;
          }
        }
      } else if (isSupervisor) {
        if (isApplicantAdmin || isApplicantHR || isApplicantSupervisor) {
          throw new ForbiddenException(
            'Supervisors can only approve leaves for frontline staff',
          );
        }

        updateData.supervisorApprovedAt = new Date();
        updateData.supervisorApprovedBy = userId;

        if (isEmergency) {
          // Just adding signature
        } else {
          // If HR is absent/missing, skip to final
          if (!isHRAvailable) {
            updateData.status = LeaveStatus.AGENCY_APPROVED;
            updateData.agencyApprovedAt = new Date();
            updateData.agencyApprovedBy = userId;
            updateData.hrApprovedAt = new Date();
            updateData.hrApprovedBy = userId;
          } else {
            updateData.status = LeaveStatus.SUPERVISOR_APPROVED;
          }
        }
      } else {
        throw new ForbiddenException(
          'You are not authorized to perform this action',
        );
      }
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id: leaveId },
      data: updateData,
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    // Fetch the updated leave with user and role for formatting
    const finalLeave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: {
            designation: true,
            user: { include: { role: true } },
          },
        },
      },
    });

    return this.formatLeaveRequest(finalLeave);
  }

  private async isRoleAvailable(
    agencyId: string,
    roleNamePart: string,
  ): Promise<boolean> {
    const users = await this.prisma.user.findMany({
      where: {
        agencyId,
        role: { name: { contains: roleNamePart, mode: 'insensitive' } },
        isActive: true,
      },
      include: { employee: true },
    });

    if (users.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const user of users) {
      if (!user.employeeId) return true; // High-level users without employee records are available

      const activeLeave = await this.prisma.leave.findFirst({
        where: {
          employeeId: user.employeeId,
          status: LeaveStatus.AGENCY_APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
        },
      });
      if (!activeLeave) return true;
    }

    return false;
  }

  private formatLeaveRequest(leaveRequest: any): LeaveRequest {
    let pendingWith = '';
    const status = leaveRequest.status as LeaveStatus;
    const applicantRole = (
      leaveRequest.employee.user?.role?.name || 'Staff'
    ).toLowerCase();
    const isEmergency = leaveRequest.leaveType === LeaveType.EMERGENCY;

    if (status === LeaveStatus.PENDING) {
      if (applicantRole.includes('hr')) {
        pendingWith = 'Agency Admin';
      } else if (applicantRole.includes('supervisor')) {
        pendingWith = 'HR';
      } else {
        pendingWith = 'Supervisor';
      }
    } else if (status === LeaveStatus.SUPERVISOR_APPROVED) {
      pendingWith = 'HR';
    } else if (status === LeaveStatus.HR_APPROVED) {
      pendingWith = 'Agency Admin';
    } else if (status === LeaveStatus.AGENCY_APPROVED && isEmergency) {
      // For emergency leaves, track who still needs to "accept" it
      if (
        !leaveRequest.supervisorApprovedBy &&
        !applicantRole.includes('supervisor') &&
        !applicantRole.includes('hr') &&
        !applicantRole.includes('admin')
      ) {
        pendingWith = 'Supervisor (Post-Acceptance)';
      } else if (
        !leaveRequest.hrApprovedBy &&
        !applicantRole.includes('hr') &&
        !applicantRole.includes('admin')
      ) {
        pendingWith = 'HR (Post-Acceptance)';
      } else if (leaveRequest.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY') {
        pendingWith = 'Agency Admin (Post-Acceptance)';
      }
    }

    return {
      id: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      leaveType: leaveRequest.leaveType as LeaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      status: leaveRequest.status as LeaveStatus,
      appliedAt: leaveRequest.appliedAt,
      supervisorApprovedAt: leaveRequest.supervisorApprovedAt,
      supervisorApprovedBy: leaveRequest.supervisorApprovedBy,
      hrApprovedAt: leaveRequest.hrApprovedAt,
      hrApprovedBy: leaveRequest.hrApprovedBy,
      agencyApprovedAt: leaveRequest.agencyApprovedAt,
      agencyApprovedBy: leaveRequest.agencyApprovedBy,
      rejectionReason: leaveRequest.rejectionReason,
      pendingWith: pendingWith,
      employee: {
        id: leaveRequest.employee.id,
        fullName: leaveRequest.employee.fullName,
        employeeCode: leaveRequest.employee.employeeCode,
        email: leaveRequest.employee.email || '',
        role: leaveRequest.employee.user?.role?.name || 'Staff',
        designation: {
          name: leaveRequest.employee.designation?.name || '',
        },
      },
    };
  }
}
