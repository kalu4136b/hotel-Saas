import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, Between, In, IsNull } from 'typeorm';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';
import {
  HrmDepartment,
  HrmDesignation,
  HrmEmployee,
  HrmEmployeeDocument,
  HrmShiftTemplate,
  HrmShiftSegment,
  HrmRosterAssignment,
  HrmAttendance,
  HrmLeaveType,
  HrmLeaveBalance,
  HrmLeaveBalanceTransaction,
  HrmLeaveRequest,
  HrmSalaryComponent,
  HrmEmployeeSalaryComponent,
  HrmSalaryAdvance,
  HrmPayrollSettings,
  HrmPayrollRun,
  HrmPayslip,
  HrmPayslipItem,
  User,
  Bill,
  AuditLog,
  DepartmentStatus,
  EmploymentType,
  EmployeeStatus,
  ShiftType,
  AttendanceStatus,
  AttendanceSource,
  LeaveType,
  LeaveRequestStatus,
  LeaveBalanceTransactionType,
  PayrollStatus,
  PayrollItemType,
  SalaryAdvanceStatus,
  ServiceChargeDistributionMethod,
  PayrollPaymentMethod,
  EmployeeDocumentType,
} from '../entities';
import {
  encryptSensitiveField,
  decryptSensitiveField,
  maskSensitiveField,
  roundMoney,
  percentageOfMoney,
  toCents,
  fromCents,
} from './hrm-crypto.util';

@Injectable()
export class HrmService {
  constructor(private readonly tenantConn: TenantConnectionManager) {}

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Resolves the tenant-isolated DataSource (dedicated DB for DEDICATED tenants, shared DB for SHARED)
   * and validates non-empty tenantId & propertyId for strict DB, table, and column isolation.
   */
  private async getRepos(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return {
      ds,
      tenantId,
      propertyId,
      deptRepo: ds.getRepository(HrmDepartment),
      desigRepo: ds.getRepository(HrmDesignation),
      empRepo: ds.getRepository(HrmEmployee),
      docRepo: ds.getRepository(HrmEmployeeDocument),
      shiftRepo: ds.getRepository(HrmShiftTemplate),
      segmentRepo: ds.getRepository(HrmShiftSegment),
      rosterRepo: ds.getRepository(HrmRosterAssignment),
      attendanceRepo: ds.getRepository(HrmAttendance),
      leaveTypeRepo: ds.getRepository(HrmLeaveType),
      leaveBalanceRepo: ds.getRepository(HrmLeaveBalance),
      leaveTxRepo: ds.getRepository(HrmLeaveBalanceTransaction),
      leaveRequestRepo: ds.getRepository(HrmLeaveRequest),
      salaryCompRepo: ds.getRepository(HrmSalaryComponent),
      empSalaryCompRepo: ds.getRepository(HrmEmployeeSalaryComponent),
      advanceRepo: ds.getRepository(HrmSalaryAdvance),
      payrollSettingsRepo: ds.getRepository(HrmPayrollSettings),
      payrollRunRepo: ds.getRepository(HrmPayrollRun),
      payslipRepo: ds.getRepository(HrmPayslip),
      payslipItemRepo: ds.getRepository(HrmPayslipItem),
      userRepo: ds.getRepository(User),
      billRepo: ds.getRepository(Bill),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  private async logAudit(
    rawTenantId: string,
    rawPropertyId: string,
    actorUserId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
  ) {
    try {
      const r = await this.getRepos(rawTenantId, rawPropertyId);
      const log = r.auditRepo.create({
        tenantId: r.tenantId,
        propertyId: r.propertyId,
        userId: actorUserId || undefined,
        action,
        entity: entityType,
        entityId,
        details: JSON.stringify({
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
        }),
      });
      await r.auditRepo.save(log);
    } catch {
      // Non-blocking audit log write
    }
  }

  // ============================================================================
  // 1. DEFAULT REFERENCE CONFIGURATION & OVERVIEW DASHBOARD
  // ============================================================================

  async ensurePropertyInitialized(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const deptCount = await r.deptRepo.count({
      where: { tenantId: r.tenantId, propertyId: r.propertyId },
    });
    if (deptCount === 0) {
      await this.seedDefaults(r.tenantId, r.propertyId);
    }
  }

  /**
   * Initializes standard hospitality structural metadata (departments, designations,
   * shifts, leave types, salary components, payroll settings) strictly inside the
   * tenant's own database. NEVER seeds fake or demo employees into tenant accounts.
   */
  async seedDefaults(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;

    // 1. Default Departments
    const defaultDepts = [
      { code: 'FD', name: 'Front Desk', description: 'Guest check-in, concierge, and reception operations' },
      { code: 'HK', name: 'Housekeeping', description: 'Room turnaround, laundry, and public area cleanliness' },
      { code: 'KIT', name: 'Kitchen', description: 'Culinary preparation, pastry, and stewarding' },
      { code: 'FNB', name: 'F&B Service', description: 'Restaurant dining, banquet service, and room service' },
      { code: 'BAR', name: 'Bar & Beverage', description: 'Mixology, speed rail, and lounge beverage service' },
      { code: 'MNT', name: 'Maintenance', description: 'HVAC, electrical, plumbing, and facility engineering' },
      { code: 'SEC', name: 'Security', description: 'Premises safety, gate control, and night patrol' },
      { code: 'ADM', name: 'Administration', description: 'Finance, HR, procurement, and executive management' },
    ];

    const savedDepts: Record<string, HrmDepartment> = {};
    for (const d of defaultDepts) {
      let existing = await r.deptRepo.findOne({
        where: { tenantId, propertyId, code: d.code },
      });
      if (!existing) {
        existing = await r.deptRepo.save(
          r.deptRepo.create({
            tenantId,
            propertyId,
            code: d.code,
            name: d.name,
            description: d.description,
            status: DepartmentStatus.ACTIVE,
          }),
        );
      }
      savedDepts[d.code] = existing;
    }

    // 2. Default Designations
    const defaultDesignations = [
      { dept: 'ADM', code: 'GM', name: 'General Manager' },
      { dept: 'ADM', code: 'HM', name: 'Hotel Manager' },
      { dept: 'ADM', code: 'ACC', name: 'Accountant' },
      { dept: 'ADM', code: 'STR', name: 'Storekeeper' },
      { dept: 'FD', code: 'FOS', name: 'Front Office Supervisor' },
      { dept: 'FD', code: 'REC', name: 'Receptionist' },
      { dept: 'HK', code: 'HKS', name: 'Housekeeping Supervisor' },
      { dept: 'HK', code: 'RMA', name: 'Room Attendant' },
      { dept: 'KIT', code: 'EXCH', name: 'Executive Chef' },
      { dept: 'KIT', code: 'SCHF', name: 'Sous Chef' },
      { dept: 'KIT', code: 'COOK', name: 'Line Cook' },
      { dept: 'FNB', code: 'WTR', name: 'Senior Waiter / Steward' },
      { dept: 'BAR', code: 'BRT', name: 'Head Bartender' },
      { dept: 'MNT', code: 'MTECH', name: 'Maintenance Technician' },
      { dept: 'SEC', code: 'SECO', name: 'Security Officer' },
    ];

    for (const des of defaultDesignations) {
      const dept = savedDepts[des.dept];
      if (!dept) continue;
      const existing = await r.desigRepo.findOne({
        where: { tenantId, propertyId, code: des.code },
      });
      if (!existing) {
        await r.desigRepo.save(
          r.desigRepo.create({
            tenantId,
            propertyId,
            departmentId: dept.id,
            code: des.code,
            name: des.name,
            status: DepartmentStatus.ACTIVE,
          }),
        );
      }
    }

    // 3. Default Shift Templates & Split Shift Segments
    const shiftCount = await r.shiftRepo.count({
      where: { tenantId, propertyId },
    });
    if (shiftCount === 0) {
      await r.shiftRepo.save(
        r.shiftRepo.create({
          tenantId,
          propertyId,
          name: 'Morning Shift (06:00 - 14:00)',
          shiftType: ShiftType.MORNING,
          startTime: '06:00',
          endTime: '14:00',
          breakDurationMinutes: 30,
          expectedWorkingMinutes: 450,
          color: '#00C48C',
          isOvernight: false,
          isActive: true,
          description: 'Standard morning hotel & breakfast shift',
        }),
      );
      await r.shiftRepo.save(
        r.shiftRepo.create({
          tenantId,
          propertyId,
          name: 'Evening Shift (14:00 - 22:00)',
          shiftType: ShiftType.EVENING,
          startTime: '14:00',
          endTime: '22:00',
          breakDurationMinutes: 30,
          expectedWorkingMinutes: 450,
          color: '#0284C7',
          isOvernight: false,
          isActive: true,
          description: 'Afternoon check-in and dinner service shift',
        }),
      );
      await r.shiftRepo.save(
        r.shiftRepo.create({
          tenantId,
          propertyId,
          name: 'Night Audit Shift (22:00 - 06:00)',
          shiftType: ShiftType.NIGHT,
          startTime: '22:00',
          endTime: '06:00',
          breakDurationMinutes: 30,
          expectedWorkingMinutes: 450,
          color: '#7C3AED',
          isOvernight: true,
          isActive: true,
          description: 'Overnight front desk audit and security shift',
        }),
      );
      const splitShift = await r.shiftRepo.save(
        r.shiftRepo.create({
          tenantId,
          propertyId,
          name: 'F&B Split Shift (07:00-11:00 & 17:00-21:00)',
          shiftType: ShiftType.SPLIT,
          startTime: '07:00',
          endTime: '21:00',
          breakDurationMinutes: 0,
          expectedWorkingMinutes: 480,
          color: '#D97706',
          isOvernight: false,
          isActive: true,
          description: 'Split dining shift covering breakfast and dinner peak hours',
        }),
      );
      await r.segmentRepo.save([
        r.segmentRepo.create({
          tenantId,
          propertyId,
          shiftTemplateId: splitShift.id,
          sequence: 1,
          startTime: '07:00',
          endTime: '11:00',
          breakDurationMinutes: 0,
        }),
        r.segmentRepo.create({
          tenantId,
          propertyId,
          shiftTemplateId: splitShift.id,
          sequence: 2,
          startTime: '17:00',
          endTime: '21:00',
          breakDurationMinutes: 0,
        }),
      ]);
    }

    // 4. Default Leave Types
    const leaveTypes = [
      { code: 'AL', name: 'Annual Leave', leaveType: LeaveType.ANNUAL, annualAllocation: 14, carryForwardAllowed: true, maximumCarryForward: 7, paidLeave: true },
      { code: 'CL', name: 'Casual Leave', leaveType: LeaveType.CASUAL, annualAllocation: 7, carryForwardAllowed: false, maximumCarryForward: 0, paidLeave: true },
      { code: 'SL', name: 'Sick / Medical Leave', leaveType: LeaveType.SICK, annualAllocation: 7, carryForwardAllowed: false, maximumCarryForward: 0, paidLeave: true },
      { code: 'NPL', name: 'No-Pay Leave', leaveType: LeaveType.NO_PAY, annualAllocation: 0, carryForwardAllowed: false, maximumCarryForward: 0, paidLeave: false },
      { code: 'COMP', name: 'Compensatory Off (Poya / Public Holiday)', leaveType: LeaveType.COMPENSATORY, annualAllocation: 12, carryForwardAllowed: true, maximumCarryForward: 5, paidLeave: true },
    ];
    for (const lt of leaveTypes) {
      const exists = await r.leaveTypeRepo.findOne({
        where: { tenantId, propertyId, code: lt.code },
      });
      if (!exists) {
        await r.leaveTypeRepo.save(
          r.leaveTypeRepo.create({
            tenantId,
            propertyId,
            ...lt,
            requiresApproval: true,
            requiresDocument: lt.code === 'SL',
            isActive: true,
          }),
        );
      }
    }

    // 5. Default Salary Components
    const defaultComponents = [
      { code: 'ALW_TRANS', name: 'Transport & Fuel Allowance', itemType: PayrollItemType.ALLOWANCE, defaultAmount: 7500, isTaxable: true, isRecurring: true },
      { code: 'ALW_MEAL', name: 'Duty Meal Allowance', itemType: PayrollItemType.ALLOWANCE, defaultAmount: 5000, isTaxable: false, isRecurring: true },
      { code: 'ALW_ACCOM', name: 'Staff Accommodation Allowance', itemType: PayrollItemType.ALLOWANCE, defaultAmount: 10000, isTaxable: true, isRecurring: true },
      { code: 'BON_PERF', name: 'Hospitality Performance Bonus', itemType: PayrollItemType.BONUS, defaultAmount: 5000, isTaxable: true, isRecurring: false },
      { code: 'DED_UNIFORM', name: 'Uniform / Locker Deduction', itemType: PayrollItemType.OTHER_DEDUCTION, defaultAmount: 1000, isTaxable: false, isRecurring: false },
    ];
    for (const comp of defaultComponents) {
      const exists = await r.salaryCompRepo.findOne({
        where: { tenantId, propertyId, code: comp.code },
      });
      if (!exists) {
        await r.salaryCompRepo.save(
          r.salaryCompRepo.create({
            tenantId,
            propertyId,
            ...comp,
            calculationMethod: 'FIXED',
            isActive: true,
          }),
        );
      }
    }

    // 6. Default Payroll Settings
    const settings = await r.payrollSettingsRepo.findOne({
      where: { tenantId, propertyId },
    });
    if (!settings) {
      await r.payrollSettingsRepo.save(
        r.payrollSettingsRepo.create({
          tenantId,
          propertyId,
          currency: 'LKR',
          payrollFrequency: 'MONTHLY',
          payrollCutoffDay: 25,
          payrollPaymentDay: 28,
          standardWorkingDaysPerMonth: 26,
          standardWorkingHoursPerDay: 8,
          overtimeMultiplier: 1.5,
          holidayOvertimeMultiplier: 2.0,
          lateGracePeriodMinutes: 15,
          lateDeductionEnabled: false,
          noPayDeductionMethod: 'WORKING_DAYS',
          serviceChargeEnabled: true,
          serviceChargePoolPercentage: 10.0,
          serviceChargeDistributionMethod: ServiceChargeDistributionMethod.EQUAL,
          employeeEpfPercentage: 8.0,
          employerEpfPercentage: 12.0,
          employerEtfPercentage: 3.0,
          roundingPrecision: 2,
        }),
      );
    }

    return { initialized: true };
  }

  async getOverview(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const today = this.todayStr();

    const [
      employees,
      departments,
      todayAttendance,
      todayRoster,
      pendingLeaves,
      pendingAdvances,
      recentPayrollRuns,
    ] = await Promise.all([
      r.empRepo.find({
        where: { tenantId, propertyId, deletedAt: IsNull() },
        relations: { department: true, designation: true },
      }),
      r.deptRepo.find({
        where: { tenantId, propertyId },
        order: { name: 'ASC' },
      }),
      r.attendanceRepo.find({
        where: { tenantId, propertyId, attendanceDate: today },
      }),
      r.rosterRepo.find({
        where: { tenantId, propertyId, dutyDate: today },
        relations: { employee: true, shiftTemplate: true, department: true },
      }),
      r.leaveRequestRepo.count({
        where: { tenantId, propertyId, status: LeaveRequestStatus.PENDING },
      }),
      r.advanceRepo.count({
        where: { tenantId, propertyId, status: SalaryAdvanceStatus.PENDING },
      }),
      r.payrollRunRepo.find({
        where: { tenantId, propertyId },
        order: { payPeriodYear: 'DESC', payPeriodMonth: 'DESC' },
        take: 3,
      }),
    ]);

    const activeEmployees = employees.filter(
      (e) => e.employeeStatus === EmployeeStatus.ACTIVE,
    );
    const onLeaveEmployees = employees.filter(
      (e) => e.employeeStatus === EmployeeStatus.ON_LEAVE,
    );
    const presentToday = todayAttendance.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.HALF_DAY].includes(
        a.status,
      ),
    ).length;
    const lateToday = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.LATE || a.lateMinutes > 0,
    ).length;

    const departmentBreakdown = departments.map((dept) => {
      const deptEmps = employees.filter((e) => e.departmentId === dept.id);
      const monthlyBasicPayroll = deptEmps.reduce(
        (sum, e) => sum + Number(e.basicSalary || 0),
        0,
      );
      return {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        status: dept.status,
        headcount: deptEmps.length,
        activeCount: deptEmps.filter((e) => e.employeeStatus === EmployeeStatus.ACTIVE).length,
        monthlyBasicPayroll: roundMoney(monthlyBasicPayroll),
      };
    });

    const monthlyBasePayroll = activeEmployees.reduce(
      (sum, e) => sum + Number(e.basicSalary || 0),
      0,
    );

    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      onLeaveCount: onLeaveEmployees.length,
      scheduledTodayCount: todayRoster.length,
      presentTodayCount: presentToday,
      lateTodayCount: lateToday,
      pendingLeaveRequests: pendingLeaves,
      pendingSalaryAdvances: pendingAdvances,
      monthlyBasePayroll: roundMoney(monthlyBasePayroll),
      departmentBreakdown,
      todayRoster: todayRoster.slice(0, 10),
      recentPayrollRuns,
    };
  }

  // ============================================================================
  // 2. DEPARTMENTS & DESIGNATIONS
  // ============================================================================

  async getDepartments(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const [depts, employees, designations] = await Promise.all([
      r.deptRepo.find({
        where: { tenantId, propertyId },
        order: { name: 'ASC' },
      }),
      r.empRepo.find({
        where: { tenantId, propertyId, deletedAt: IsNull() },
      }),
      r.desigRepo.find({
        where: { tenantId, propertyId },
        order: { name: 'ASC' },
      }),
    ]);

    return depts.map((d) => ({
      ...d,
      employeeCount: employees.filter((e) => e.departmentId === d.id).length,
      designations: designations.filter((des) => des.departmentId === d.id),
    }));
  }

  async createDepartment(rawTenantId: string, rawPropertyId: string, dto: any) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const code = (dto.code || '').trim().toUpperCase();
    if (!code || !dto.name?.trim()) {
      throw new BadRequestException('Department name and code are required');
    }
    const existing = await r.deptRepo.findOne({
      where: { tenantId, propertyId, code },
    });
    if (existing) {
      throw new ConflictException(`Department code "${code}" already exists`);
    }
    const dept = r.deptRepo.create({
      tenantId,
      propertyId,
      name: dto.name.trim(),
      code,
      description: dto.description || null,
      status: dto.status || DepartmentStatus.ACTIVE,
      managerEmployeeId: dto.managerEmployeeId || null,
    });
    return r.deptRepo.save(dept);
  }

  async updateDepartment(
    rawTenantId: string, rawPropertyId: string,
    id: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const dept = await r.deptRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    if (dto.name !== undefined) dept.name = dto.name.trim();
    if (dto.code !== undefined) dept.code = dto.code.trim().toUpperCase();
    if (dto.description !== undefined) dept.description = dto.description;
    if (dto.status !== undefined) dept.status = dto.status;
    if (dto.managerEmployeeId !== undefined) {
      dept.managerEmployeeId = dto.managerEmployeeId || null;
    }
    return r.deptRepo.save(dept);
  }

  async deleteDepartment(rawTenantId: string, rawPropertyId: string, id: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const dept = await r.deptRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    const empCount = await r.empRepo.count({
      where: { tenantId, propertyId, departmentId: id },
    });
    if (empCount > 0) {
      throw new BadRequestException(
        `Cannot delete department "${dept.name}" because ${empCount} employee record(s) reference it. Mark it INACTIVE instead.`,
      );
    }
    await r.desigRepo.delete({ tenantId, propertyId, departmentId: id });
    await r.deptRepo.remove(dept);
    return { deleted: true };
  }

  async getDesignations(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    return r.desigRepo.find({
      where: { tenantId, propertyId },
      relations: { department: true },
      order: { name: 'ASC' },
    });
  }

  async createDesignation(rawTenantId: string, rawPropertyId: string, dto: any) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const code = (dto.code || '').trim().toUpperCase();
    if (!code || !dto.name?.trim() || !dto.departmentId) {
      throw new BadRequestException(
        'Designation name, code, and departmentId are required',
      );
    }
    const dept = await r.deptRepo.findOne({
      where: { id: dto.departmentId, tenantId, propertyId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    const existing = await r.desigRepo.findOne({
      where: { tenantId, propertyId, code },
    });
    if (existing) {
      throw new ConflictException(`Designation code "${code}" already exists`);
    }
    return r.desigRepo.save(
      r.desigRepo.create({
        tenantId,
        propertyId,
        departmentId: dept.id,
        name: dto.name.trim(),
        code,
        description: dto.description || null,
        status: dto.status || DepartmentStatus.ACTIVE,
      }),
    );
  }

  // ============================================================================
  // 3. EMPLOYEES & DOCUMENTS (WITH AES-256-GCM ENCRYPTION)
  // ============================================================================

  private sanitizeEmployeeForList(emp: HrmEmployee) {
    return {
      ...emp,
      nicNumber: maskSensitiveField(emp.nicNumber),
      passportNumber: maskSensitiveField(emp.passportNumber),
      bankAccountNumber: maskSensitiveField(emp.bankAccountNumber),
    };
  }

  private decryptEmployeeForAuthorizedDetail(emp: HrmEmployee) {
    return {
      ...emp,
      nicNumber: decryptSensitiveField(emp.nicNumber),
      passportNumber: decryptSensitiveField(emp.passportNumber),
      bankAccountNumber: decryptSensitiveField(emp.bankAccountNumber),
      nicNumberMasked: maskSensitiveField(emp.nicNumber),
      passportNumberMasked: maskSensitiveField(emp.passportNumber),
      bankAccountNumberMasked: maskSensitiveField(emp.bankAccountNumber),
    };
  }

  async getEmployees(
    rawTenantId: string,
    rawPropertyId: string,
    filters?: { departmentId?: string; status?: string; search?: string },
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const whereClause: any = {
      tenantId,
      propertyId,
      deletedAt: IsNull(),
    };
    if (filters?.departmentId && filters.departmentId !== 'ALL') {
      whereClause.departmentId = filters.departmentId;
    }
    if (filters?.status && filters.status !== 'ALL') {
      whereClause.employeeStatus = filters.status;
    }

    const employees = await r.empRepo.find({
      where: whereClause,
      relations: { department: true, designation: true },
      order: { employeeCode: 'ASC' },
    });

    const search = filters?.search?.trim().toLowerCase();
    const filtered = search
      ? employees.filter(
          (e) =>
            e.fullName.toLowerCase().includes(search) ||
            e.employeeCode.toLowerCase().includes(search) ||
            (e.email || '').toLowerCase().includes(search) ||
            (e.phone || '').toLowerCase().includes(search),
        )
      : employees;

    return filtered.map((emp) => this.sanitizeEmployeeForList(emp));
  }

  async getEmployeeById(rawTenantId: string, rawPropertyId: string, id: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const emp = await r.empRepo.findOne({
      where: { id, tenantId, propertyId, deletedAt: IsNull() },
      relations: { department: true, designation: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const [documents, leaveBalances, salaryComponents, salaryAdvances] =
      await Promise.all([
        r.docRepo.find({
          where: { tenantId, propertyId, employeeId: id },
          order: { createdAt: 'DESC' },
        }),
        r.leaveBalanceRepo.find({
          where: {
            tenantId,
            propertyId,
            employeeId: id,
            leaveYear: new Date().getFullYear(),
          },
          relations: { leaveType: true },
        }),
        r.empSalaryCompRepo.find({
          where: { tenantId, propertyId, employeeId: id },
          relations: { salaryComponent: true },
        }),
        r.advanceRepo.find({
          where: { tenantId, propertyId, employeeId: id },
          order: { createdAt: 'DESC' },
        }),
      ]);

    return {
      ...this.decryptEmployeeForAuthorizedDetail(emp),
      documents,
      leaveBalances,
      salaryComponents,
      salaryAdvances,
    };
  }

  async createEmployee(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }
    if (!dto.departmentId || !dto.designationId) {
      throw new BadRequestException('Department and designation are required');
    }

    // Validate department and designation ownership
    const [dept, desig] = await Promise.all([
      r.deptRepo.findOne({
        where: { id: dto.departmentId, tenantId, propertyId },
      }),
      r.desigRepo.findOne({
        where: { id: dto.designationId, tenantId, propertyId },
      }),
    ]);
    if (!dept) throw new NotFoundException('Selected department not found');
    if (!desig) throw new NotFoundException('Selected designation not found');

    // Optional User link check
    if (dto.userId) {
      const user = await r.userRepo.findOne({
        where: { id: dto.userId, tenantId },
      });
      if (!user) {
        throw new BadRequestException(
          'Linked system user does not belong to this hotel tenant',
        );
      }
    }

    // Generate or validate employee code
    let employeeCode = (dto.employeeCode || '').trim().toUpperCase();
    if (!employeeCode) {
      const count = await r.empRepo.count({ where: { tenantId, propertyId } });
      employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    const duplicate = await r.empRepo.findOne({
      where: { tenantId, propertyId, employeeCode },
    });
    if (duplicate) {
      throw new ConflictException(
        `Employee code "${employeeCode}" already exists in this property`,
      );
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const emp = r.empRepo.create({
      tenantId,
      propertyId,
      employeeCode,
      userId: dto.userId || null,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      profileImage: dto.profileImage || null,
      dateOfBirth: dto.dateOfBirth || null,
      gender: dto.gender || null,
      nationality: dto.nationality || 'Sri Lankan',
      nicNumber: encryptSensitiveField(dto.nicNumber),
      passportNumber: encryptSensitiveField(dto.passportNumber),
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      alternativePhone: dto.alternativePhone?.trim() || null,
      address: dto.address || null,
      city: dto.city || null,
      emergencyContactName: dto.emergencyContactName || null,
      emergencyContactRelationship: dto.emergencyContactRelationship || null,
      emergencyContactPhone: dto.emergencyContactPhone || null,
      departmentId: dept.id,
      designationId: desig.id,
      employmentType: dto.employmentType || EmploymentType.FULL_TIME,
      employeeStatus: dto.employeeStatus || EmployeeStatus.ACTIVE,
      joinDate: dto.joinDate || this.todayStr(),
      probationEndDate: dto.probationEndDate || null,
      confirmationDate: dto.confirmationDate || null,
      reportingManagerId: dto.reportingManagerId || null,
      basicSalary: roundMoney(dto.basicSalary || 0),
      salaryCurrency: dto.salaryCurrency || 'LKR',
      payrollEligible: dto.payrollEligible !== false,
      serviceChargeEligible: dto.serviceChargeEligible !== false,
      overtimeEligible: dto.overtimeEligible !== false,
      bankName: dto.bankName || null,
      bankBranch: dto.bankBranch || null,
      bankAccountName: dto.bankAccountName || `${firstName} ${lastName}`,
      bankAccountNumber: encryptSensitiveField(dto.bankAccountNumber),
      bankCode: dto.bankCode || null,
      branchCode: dto.branchCode || null,
      notes: dto.notes || null,
    });

    const saved = await r.empRepo.save(emp);
    await this.initializeEmployeeLeaveBalances(tenantId, propertyId, saved.id);
    await this.logAudit(
      tenantId,
      propertyId,
      actorUserId,
      'HRM_EMPLOYEE_CREATED',
      'HrmEmployee',
      saved.id,
      null,
      { employeeCode: saved.employeeCode, fullName: saved.fullName },
    );

    return this.sanitizeEmployeeForList(saved);
  }

  async updateEmployee(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    id: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const emp = await r.empRepo.findOne({
      where: { id, tenantId, propertyId, deletedAt: IsNull() },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    if (dto.userId) {
      const user = await r.userRepo.findOne({
        where: { id: dto.userId, tenantId },
      });
      if (!user) {
        throw new BadRequestException(
          'Linked system user does not belong to this hotel tenant',
        );
      }
      emp.userId = dto.userId;
    } else if (dto.userId === null || dto.userId === '') {
      emp.userId = null;
    }

    if (dto.firstName !== undefined) emp.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) emp.lastName = dto.lastName.trim();
    emp.fullName = `${emp.firstName} ${emp.lastName}`;

    if (dto.dateOfBirth !== undefined) emp.dateOfBirth = dto.dateOfBirth || null;
    if (dto.gender !== undefined) emp.gender = dto.gender || null;
    if (dto.nationality !== undefined) emp.nationality = dto.nationality || null;
    if (dto.nicNumber !== undefined && !String(dto.nicNumber).includes('*')) {
      emp.nicNumber = encryptSensitiveField(dto.nicNumber);
    }
    if (
      dto.passportNumber !== undefined &&
      !String(dto.passportNumber).includes('*')
    ) {
      emp.passportNumber = encryptSensitiveField(dto.passportNumber);
    }
    if (
      dto.bankAccountNumber !== undefined &&
      !String(dto.bankAccountNumber).includes('*')
    ) {
      emp.bankAccountNumber = encryptSensitiveField(dto.bankAccountNumber);
    }

    const simpleFields = [
      'email',
      'phone',
      'alternativePhone',
      'address',
      'city',
      'emergencyContactName',
      'emergencyContactRelationship',
      'emergencyContactPhone',
      'departmentId',
      'designationId',
      'employmentType',
      'employeeStatus',
      'joinDate',
      'probationEndDate',
      'confirmationDate',
      'terminationDate',
      'resignationDate',
      'reportingManagerId',
      'salaryCurrency',
      'payrollEligible',
      'serviceChargeEligible',
      'overtimeEligible',
      'bankName',
      'bankBranch',
      'bankAccountName',
      'bankCode',
      'branchCode',
      'notes',
    ];
    for (const f of simpleFields) {
      if (dto[f] !== undefined) {
        (emp as any)[f] = dto[f] === '' ? null : dto[f];
      }
    }
    if (dto.basicSalary !== undefined) {
      emp.basicSalary = roundMoney(dto.basicSalary);
    }

    const saved = await r.empRepo.save(emp);
    await this.logAudit(
      tenantId,
      propertyId,
      actorUserId,
      'HRM_EMPLOYEE_UPDATED',
      'HrmEmployee',
      saved.id,
      null,
      { employeeCode: saved.employeeCode, status: saved.employeeStatus },
    );

    return this.sanitizeEmployeeForList(saved);
  }

  async addEmployeeDocument(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    employeeId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const emp = await r.empRepo.findOne({
      where: { id: employeeId, tenantId, propertyId, deletedAt: IsNull() },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    if (!dto.title?.trim() || !dto.fileName?.trim()) {
      throw new BadRequestException('Document title and file name are required');
    }

    const doc = r.docRepo.create({
      tenantId,
      propertyId,
      employeeId,
      documentType: dto.documentType || EmployeeDocumentType.OTHER,
      title: dto.title.trim(),
      fileName: dto.fileName.trim(),
      fileUrl: dto.fileUrl || `/uploads/hrm/${employeeId}/${dto.fileName.trim()}`,
      mimeType: dto.mimeType || 'application/pdf',
      fileSize: Number(dto.fileSize || 0),
      expiryDate: dto.expiryDate || null,
      notes: dto.notes || null,
      uploadedBy: actorUserId,
    });
    return r.docRepo.save(doc);
  }

  // ============================================================================
  // 4. SHIFT TEMPLATES & DUTY ROSTER SCHEDULING
  // ============================================================================

  async getShiftTemplates(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const [shifts, segments] = await Promise.all([
      r.shiftRepo.find({
        where: { tenantId, propertyId },
        order: { startTime: 'ASC' },
      }),
      r.segmentRepo.find({
        where: { tenantId, propertyId },
        order: { sequence: 'ASC' },
      }),
    ]);

    return shifts.map((s) => ({
      ...s,
      segments: segments.filter((seg) => seg.shiftTemplateId === s.id),
    }));
  }

  async createShiftTemplate(rawTenantId: string, rawPropertyId: string, dto: any) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    if (!dto.name?.trim() || !dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'Shift name, startTime, and endTime are required',
      );
    }
    const shift = await r.shiftRepo.save(
      r.shiftRepo.create({
        tenantId,
        propertyId,
        name: dto.name.trim(),
        shiftType: dto.shiftType || ShiftType.MORNING,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakDurationMinutes: Number(dto.breakDurationMinutes ?? 30),
        expectedWorkingMinutes: Number(dto.expectedWorkingMinutes ?? 450),
        color: dto.color || '#00C48C',
        isOvernight: Boolean(dto.isOvernight),
        isActive: dto.isActive !== false,
        description: dto.description || null,
      }),
    );

    if (Array.isArray(dto.segments) && dto.segments.length > 0) {
      const segs = dto.segments.map((seg: any, idx: number) =>
        r.segmentRepo.create({
          tenantId,
          propertyId,
          shiftTemplateId: shift.id,
          sequence: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          breakDurationMinutes: Number(seg.breakDurationMinutes || 0),
        }),
      );
      await r.segmentRepo.save(segs);
    }

    return shift;
  }

  private computeShiftDateTimes(
    dutyDate: string,
    startTime: string,
    endTime: string,
    isOvernight: boolean,
  ): { startDateTime: Date; endDateTime: Date } {
    const startDateTime = new Date(`${dutyDate}T${startTime}:00`);
    const endDateTime = new Date(`${dutyDate}T${endTime}:00`);
    if (isOvernight || endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    return { startDateTime, endDateTime };
  }

  async getRoster(
    rawTenantId: string, rawPropertyId: string,
    startDate?: string,
    endDate?: string,
    departmentId?: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const whereClause: any = { tenantId, propertyId };
    if (startDate && endDate) {
      whereClause.dutyDate = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.dutyDate = startDate;
    }
    if (departmentId && departmentId !== 'ALL') {
      whereClause.departmentId = departmentId;
    }

    return r.rosterRepo.find({
      where: whereClause,
      relations: { employee: true, department: true, shiftTemplate: true },
      order: { dutyDate: 'ASC', startDateTime: 'ASC' },
    });
  }

  async createRosterAssignment(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const { employeeId, shiftTemplateId, dutyDate } = dto;
    if (!employeeId || !shiftTemplateId || !dutyDate) {
      throw new BadRequestException(
        'employeeId, shiftTemplateId, and dutyDate are required',
      );
    }

    const [emp, shift] = await Promise.all([
      r.empRepo.findOne({
        where: { id: employeeId, tenantId, propertyId, deletedAt: IsNull() },
      }),
      r.shiftRepo.findOne({
        where: { id: shiftTemplateId, tenantId, propertyId },
      }),
    ]);
    if (!emp) throw new NotFoundException('Employee not found');
    if (!shift) throw new NotFoundException('Shift template not found');

    const { startDateTime, endDateTime } = this.computeShiftDateTimes(
      dutyDate,
      shift.startTime,
      shift.endTime,
      shift.isOvernight,
    );

    // Check for overlapping shifts for this employee
    const existingAssignments = await r.rosterRepo.find({
      where: { tenantId, propertyId, employeeId },
    });

    for (const existing of existingAssignments) {
      const exStart = new Date(existing.startDateTime).getTime();
      const exEnd = new Date(existing.endDateTime).getTime();
      const newStart = startDateTime.getTime();
      const newEnd = endDateTime.getTime();

      if (newStart < exEnd && newEnd > exStart) {
        throw new ConflictException(
          `Shift overlaps with an existing roster assignment on ${existing.dutyDate}`,
        );
      }
    }

    const assignment = r.rosterRepo.create({
      tenantId,
      propertyId,
      employeeId: emp.id,
      departmentId: emp.departmentId,
      shiftTemplateId: shift.id,
      dutyDate,
      startDateTime,
      endDateTime,
      status: dto.publishImmediately ? 'PUBLISHED' : 'DRAFT',
      notes: dto.notes || null,
      assignedBy: actorUserId,
      publishedAt: dto.publishImmediately ? new Date() : null,
    });

    return r.rosterRepo.save(assignment);
  }

  async publishRoster(
    rawTenantId: string, rawPropertyId: string,
    startDate: string,
    endDate: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const drafts = await r.rosterRepo.find({
      where: {
        tenantId,
        propertyId,
        dutyDate: Between(startDate, endDate),
      },
    });
    const now = new Date();
    for (const r of drafts) {
      r.status = 'PUBLISHED';
      r.publishedAt = now;
    }
    await r.rosterRepo.save(drafts);
    return { publishedCount: drafts.length };
  }

  async deleteRosterAssignment(
    rawTenantId: string, rawPropertyId: string,
    id: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const assignment = await r.rosterRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!assignment) throw new NotFoundException('Roster assignment not found');
    await r.rosterRepo.remove(assignment);
    return { deleted: true };
  }

  // ============================================================================
  // 5. ATTENDANCE & TIMESHEET MANAGEMENT
  // ============================================================================

  async getAttendance(
    rawTenantId: string, rawPropertyId: string,
    date?: string,
    startDate?: string,
    endDate?: string,
    employeeId?: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const whereClause: any = { tenantId, propertyId };
    if (startDate && endDate) {
      whereClause.attendanceDate = Between(startDate, endDate);
    } else if (date) {
      whereClause.attendanceDate = date;
    }
    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }

    return r.attendanceRepo.find({
      where: whereClause,
      relations: {
        employee: {
          department: true,
          designation: true,
        },
      },
      order: { attendanceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private calculateAttendanceMetrics(
    checkIn: Date | null,
    checkOut: Date | null,
    scheduledStart: Date | null,
    scheduledEnd: Date | null,
    breakMinutes = 30,
    graceMinutes = 15,
    expectedWorkingMinutes = 480,
  ) {
    let workedMinutes = 0;
    let lateMinutes = 0;
    let overtimeMinutes = 0;
    let status = AttendanceStatus.PRESENT;

    if (checkIn && scheduledStart) {
      const diffLate = Math.floor(
        (checkIn.getTime() - scheduledStart.getTime()) / 60000,
      );
      if (diffLate > graceMinutes) {
        lateMinutes = diffLate;
        status = AttendanceStatus.LATE;
      }
    }

    if (checkIn && checkOut) {
      const totalSpan = Math.max(
        0,
        Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000),
      );
      workedMinutes = Math.max(
        0,
        totalSpan - (totalSpan > 240 ? breakMinutes : 0),
      );
      if (workedMinutes > expectedWorkingMinutes) {
        overtimeMinutes = workedMinutes - expectedWorkingMinutes;
      } else if (workedMinutes > 0 && workedMinutes < expectedWorkingMinutes / 2) {
        status = AttendanceStatus.HALF_DAY;
      }
    }

    return { workedMinutes, lateMinutes, overtimeMinutes, status };
  }

  async recordAttendance(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const { employeeId, attendanceDate } = dto;
    const targetDate = attendanceDate || this.todayStr();
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }

    const emp = await r.empRepo.findOne({
      where: { id: employeeId, tenantId, propertyId, deletedAt: IsNull() },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    // Find matching roster assignment for targetDate
    const roster = await r.rosterRepo.findOne({
      where: { tenantId, propertyId, employeeId, dutyDate: targetDate },
      relations: { shiftTemplate: true },
    });

    const settings = await r.payrollSettingsRepo.findOne({
      where: { tenantId, propertyId },
    });
    const graceMinutes = settings?.lateGracePeriodMinutes ?? 15;
    const expectedMins =
      roster?.shiftTemplate?.expectedWorkingMinutes ??
      (settings?.standardWorkingHoursPerDay ?? 8) * 60;
    const breakMins = roster?.shiftTemplate?.breakDurationMinutes ?? 30;

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : new Date();
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : null;
    const scheduledStart = roster?.startDateTime
      ? new Date(roster.startDateTime)
      : new Date(`${targetDate}T08:00:00`);
    const scheduledEnd = roster?.endDateTime
      ? new Date(roster.endDateTime)
      : new Date(`${targetDate}T17:00:00`);

    // Prevent duplicate active check-in session on the same day
    const existingOpen = await r.attendanceRepo.findOne({
      where: {
        tenantId,
        propertyId,
        employeeId,
        attendanceDate: targetDate,
      },
    });

    if (existingOpen && !dto.allowMultipleSessions) {
      // Update existing session (e.g., recording check-out)
      if (dto.checkOut) {
        existingOpen.checkOut = new Date(dto.checkOut);
      }
      if (dto.status) {
        existingOpen.status = dto.status;
      }
      const metrics = this.calculateAttendanceMetrics(
        existingOpen.checkIn,
        existingOpen.checkOut,
        existingOpen.scheduledStart,
        existingOpen.scheduledEnd,
        breakMins,
        graceMinutes,
        expectedMins,
      );
      existingOpen.workedMinutes = metrics.workedMinutes;
      existingOpen.lateMinutes = metrics.lateMinutes;
      existingOpen.overtimeMinutes = emp.overtimeEligible
        ? metrics.overtimeMinutes
        : 0;
      if (!dto.status) existingOpen.status = metrics.status;
      if (dto.notes !== undefined) existingOpen.notes = dto.notes;
      return r.attendanceRepo.save(existingOpen);
    }

    const metrics = this.calculateAttendanceMetrics(
      checkIn,
      checkOut,
      scheduledStart,
      scheduledEnd,
      breakMins,
      graceMinutes,
      expectedMins,
    );

    const record = r.attendanceRepo.create({
      tenantId,
      propertyId,
      employeeId,
      rosterAssignmentId: roster?.id || null,
      attendanceDate: targetDate,
      checkIn:
        dto.status === AttendanceStatus.ABSENT ||
        dto.status === AttendanceStatus.ON_LEAVE
          ? null
          : checkIn,
      checkOut,
      scheduledStart,
      scheduledEnd,
      workedMinutes: metrics.workedMinutes,
      breakMinutes: breakMins,
      lateMinutes: metrics.lateMinutes,
      overtimeMinutes: emp.overtimeEligible ? metrics.overtimeMinutes : 0,
      status: dto.status || metrics.status,
      source: dto.source || AttendanceSource.ADMIN,
      notes: dto.notes || null,
    });

    return r.attendanceRepo.save(record);
  }

  async regularizeAttendance(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    id: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const record = await r.attendanceRepo.findOne({
      where: { id, tenantId, propertyId },
      relations: { employee: true },
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Regularization reason is required');
    }

    const oldSnapshot = {
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      workedMinutes: record.workedMinutes,
      overtimeMinutes: record.overtimeMinutes,
      status: record.status,
    };

    if (dto.checkIn) record.checkIn = new Date(dto.checkIn);
    if (dto.checkOut) record.checkOut = new Date(dto.checkOut);
    if (dto.status) record.status = dto.status;

    const metrics = this.calculateAttendanceMetrics(
      record.checkIn,
      record.checkOut,
      record.scheduledStart,
      record.scheduledEnd,
      record.breakMinutes,
      15,
      480,
    );

    record.workedMinutes =
      dto.workedMinutes !== undefined
        ? Number(dto.workedMinutes)
        : metrics.workedMinutes;
    record.lateMinutes =
      dto.lateMinutes !== undefined
        ? Number(dto.lateMinutes)
        : metrics.lateMinutes;
    record.overtimeMinutes =
      dto.overtimeMinutes !== undefined
        ? Number(dto.overtimeMinutes)
        : metrics.overtimeMinutes;
    record.isRegularized = true;
    record.regularizationReason = dto.reason.trim();
    record.regularizedBy = actorUserId;
    record.regularizedAt = new Date();

    const saved = await r.attendanceRepo.save(record);
    await this.logAudit(
      tenantId,
      propertyId,
      actorUserId,
      'HRM_ATTENDANCE_REGULARIZED',
      'HrmAttendance',
      saved.id,
      oldSnapshot,
      {
        checkIn: saved.checkIn,
        checkOut: saved.checkOut,
        workedMinutes: saved.workedMinutes,
        overtimeMinutes: saved.overtimeMinutes,
        status: saved.status,
        reason: saved.regularizationReason,
      },
    );

    return saved;
  }

  // ============================================================================
  // 6. LEAVE TYPES, LEAVE BALANCES & LEAVE REQUEST WORKFLOW
  // ============================================================================

  async getLeaveTypes(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    return r.leaveTypeRepo.find({
      where: { tenantId, propertyId },
      order: { name: 'ASC' },
    });
  }

  private recomputeAvailableLeaveDays(bal: HrmLeaveBalance): number {
    const available =
      Number(bal.allocatedDays || 0) +
      Number(bal.carriedForwardDays || 0) +
      Number(bal.accruedDays || 0) +
      Number(bal.adjustedDays || 0) -
      Number(bal.usedDays || 0) -
      Number(bal.pendingDays || 0);
    return Number(available.toFixed(2));
  }

  async initializeEmployeeLeaveBalances(
    rawTenantId: string, rawPropertyId: string,
    employeeId: string,
    year = new Date().getFullYear(),
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const leaveTypes = await r.leaveTypeRepo.find({
      where: { tenantId, propertyId, isActive: true },
    });

    for (const lt of leaveTypes) {
      let bal = await r.leaveBalanceRepo.findOne({
        where: {
          tenantId,
          propertyId,
          employeeId,
          leaveTypeId: lt.id,
          leaveYear: year,
        },
      });
      if (!bal) {
        bal = r.leaveBalanceRepo.create({
          tenantId,
          propertyId,
          employeeId,
          leaveTypeId: lt.id,
          leaveYear: year,
          allocatedDays: Number(lt.annualAllocation || 0),
          carriedForwardDays: 0,
          accruedDays: 0,
          usedDays: 0,
          pendingDays: 0,
          adjustedDays: 0,
          availableDays: Number(lt.annualAllocation || 0),
        });
        const savedBal = await r.leaveBalanceRepo.save(bal);
        await r.leaveTxRepo.save(
          r.leaveTxRepo.create({
            tenantId,
            propertyId,
            employeeId,
            leaveBalanceId: savedBal.id,
            transactionType: LeaveBalanceTransactionType.ALLOCATION,
            days: Number(lt.annualAllocation || 0),
            description: `Initial annual ${lt.name} entitlement for ${year}`,
          }),
        );
      }
    }
  }

  async getLeaveBalances(
    rawTenantId: string, rawPropertyId: string,
    employeeId?: string,
    year = new Date().getFullYear(),
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const whereClause: any = { tenantId, propertyId, leaveYear: year };
    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }
    return r.leaveBalanceRepo.find({
      where: whereClause,
      relations: { employee: true, leaveType: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getLeaveRequests(
    rawTenantId: string, rawPropertyId: string,
    status?: string,
    employeeId?: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const whereClause: any = { tenantId, propertyId };
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }
    return r.leaveRequestRepo.find({
      where: whereClause,
      relations: {
        employee: { department: true },
        leaveType: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async createLeaveRequest(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const { employeeId, leaveTypeId, startDate, endDate, isHalfDay } = dto;
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      throw new BadRequestException(
        'employeeId, leaveTypeId, startDate, and endDate are required',
      );
    }

    const [emp, leaveType] = await Promise.all([
      r.empRepo.findOne({
        where: { id: employeeId, tenantId, propertyId, deletedAt: IsNull() },
      }),
      r.leaveTypeRepo.findOne({
        where: { id: leaveTypeId, tenantId, propertyId },
      }),
    ]);
    if (!emp) throw new NotFoundException('Employee not found');
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw new BadRequestException('End date cannot be earlier than start date');
    }

    let totalDays = isHalfDay
      ? 0.5
      : Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (dto.totalDays !== undefined && Number(dto.totalDays) > 0) {
      totalDays = Number(dto.totalDays);
    }

    // Check overlapping approved/pending leave
    const existingLeaves = await r.leaveRequestRepo.find({
      where: {
        tenantId,
        propertyId,
        employeeId,
        status: In([LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED]),
      },
    });
    for (const ex of existingLeaves) {
      if (startDate <= ex.endDate && endDate >= ex.startDate) {
        throw new ConflictException(
          `Employee already has an overlapping leave request (${ex.startDate} to ${ex.endDate})`,
        );
      }
    }

    const leaveYear = start.getFullYear();
    await this.initializeEmployeeLeaveBalances(
      tenantId,
      propertyId,
      employeeId,
      leaveYear,
    );

    const balance = await r.leaveBalanceRepo.findOne({
      where: {
        tenantId,
        propertyId,
        employeeId,
        leaveTypeId,
        leaveYear,
      },
    });

    if (
      leaveType.paidLeave &&
      leaveType.leaveType !== LeaveType.NO_PAY &&
      balance &&
      Number(balance.availableDays) < totalDays
    ) {
      throw new BadRequestException(
        `Insufficient ${leaveType.name} balance. Available: ${balance.availableDays} day(s), Requested: ${totalDays} day(s).`,
      );
    }

    const reqRecord = await r.leaveRequestRepo.save(
      r.leaveRequestRepo.create({
        tenantId,
        propertyId,
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        isHalfDay: Boolean(isHalfDay),
        reason: dto.reason || null,
        attachmentUrl: dto.attachmentUrl || null,
        status: LeaveRequestStatus.PENDING,
        requestedAt: new Date(),
      }),
    );

    if (balance) {
      balance.pendingDays = Number(
        (Number(balance.pendingDays || 0) + totalDays).toFixed(2),
      );
      balance.availableDays = this.recomputeAvailableLeaveDays(balance);
      await r.leaveBalanceRepo.save(balance);
    }

    return reqRecord;
  }

  async updateLeaveRequestStatus(
    rawTenantId: string,
    rawPropertyId: string,
    actorUserId: string,
    id: string,
    dto: { status: LeaveRequestStatus; rejectionReason?: string },
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const leaveReq = await r.leaveRequestRepo.findOne({
      where: { id, tenantId, propertyId },
      relations: { leaveType: true, employee: true },
    });
    if (!leaveReq) throw new NotFoundException('Leave request not found');
    if (leaveReq.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request is already ${leaveReq.status}`,
      );
    }

    const leaveYear = new Date(leaveReq.startDate).getFullYear();
    const balance = await r.leaveBalanceRepo.findOne({
      where: {
        tenantId,
        propertyId,
        employeeId: leaveReq.employeeId,
        leaveTypeId: leaveReq.leaveTypeId,
        leaveYear,
      },
    });

    const days = Number(leaveReq.totalDays || 0);

    if (dto.status === LeaveRequestStatus.APPROVED) {
      leaveReq.status = LeaveRequestStatus.APPROVED;
      leaveReq.approvedBy = actorUserId;
      leaveReq.approvedAt = new Date();

      if (balance) {
        balance.pendingDays = Math.max(
          0,
          Number((Number(balance.pendingDays || 0) - days).toFixed(2)),
        );
        balance.usedDays = Number(
          (Number(balance.usedDays || 0) + days).toFixed(2),
        );
        balance.availableDays = this.recomputeAvailableLeaveDays(balance);
        await r.leaveBalanceRepo.save(balance);

        await r.leaveTxRepo.save(
          r.leaveTxRepo.create({
            tenantId,
            propertyId,
            employeeId: leaveReq.employeeId,
            leaveBalanceId: balance.id,
            leaveRequestId: leaveReq.id,
            transactionType: LeaveBalanceTransactionType.LEAVE_TAKEN,
            days: -days,
            description: `Approved ${leaveReq.leaveType?.name || 'Leave'} (${leaveReq.startDate} to ${leaveReq.endDate})`,
            createdBy: actorUserId,
          }),
        );
      }
    } else if (
      dto.status === LeaveRequestStatus.REJECTED ||
      dto.status === LeaveRequestStatus.CANCELLED
    ) {
      leaveReq.status = dto.status;
      leaveReq.rejectionReason = dto.rejectionReason || null;
      if (dto.status === LeaveRequestStatus.CANCELLED) {
        leaveReq.cancelledAt = new Date();
      }
      if (balance) {
        balance.pendingDays = Math.max(
          0,
          Number((Number(balance.pendingDays || 0) - days).toFixed(2)),
        );
        balance.availableDays = this.recomputeAvailableLeaveDays(balance);
        await r.leaveBalanceRepo.save(balance);
      }
    }

    return r.leaveRequestRepo.save(leaveReq);
  }

  // ============================================================================
  // 7. SALARY ADVANCES & RECURRING ALLOWANCES
  // ============================================================================

  async getSalaryComponents(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    return r.salaryCompRepo.find({
      where: { tenantId, propertyId },
      order: { name: 'ASC' },
    });
  }

  async assignEmployeeSalaryComponent(
    rawTenantId: string, rawPropertyId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const [emp, comp] = await Promise.all([
      r.empRepo.findOne({
        where: { id: dto.employeeId, tenantId, propertyId },
      }),
      r.salaryCompRepo.findOne({
        where: { id: dto.salaryComponentId, tenantId, propertyId },
      }),
    ]);
    if (!emp) throw new NotFoundException('Employee not found');
    if (!comp) throw new NotFoundException('Salary component not found');

    const record = r.empSalaryCompRepo.create({
      tenantId,
      propertyId,
      employeeId: emp.id,
      salaryComponentId: comp.id,
      amount: roundMoney(dto.amount ?? comp.defaultAmount),
      calculationMethod: dto.calculationMethod || comp.calculationMethod,
      effectiveFrom: dto.effectiveFrom || this.todayStr(),
      effectiveTo: dto.effectiveTo || null,
    });
    return r.empSalaryCompRepo.save(record);
  }

  async getSalaryAdvances(
    rawTenantId: string, rawPropertyId: string,
    status?: string,
    employeeId?: string,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const whereClause: any = { tenantId, propertyId };
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }
    return r.advanceRepo.find({
      where: whereClause,
      relations: {
        employee: { department: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async createSalaryAdvance(
    rawTenantId: string, rawPropertyId: string,
    dto: any,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const emp = await r.empRepo.findOne({
      where: { id: dto.employeeId, tenantId, propertyId, deletedAt: IsNull() },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const requestedAmount = roundMoney(dto.requestedAmount);
    if (requestedAmount <= 0) {
      throw new BadRequestException('Requested advance amount must be greater than 0');
    }
    const repaymentAmount = roundMoney(dto.repaymentAmount || requestedAmount);

    return r.advanceRepo.save(
      r.advanceRepo.create({
        tenantId,
        propertyId,
        employeeId: emp.id,
        requestedAmount,
        approvedAmount: requestedAmount,
        remainingAmount: requestedAmount,
        repaymentAmount,
        requestDate: dto.requestDate || this.todayStr(),
        reason: dto.reason || null,
        status: SalaryAdvanceStatus.PENDING,
      }),
    );
  }

  async updateSalaryAdvanceStatus(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    id: string,
    dto: {
      status: SalaryAdvanceStatus;
      approvedAmount?: number;
      repaymentAmount?: number;
    },
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const adv = await r.advanceRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!adv) throw new NotFoundException('Salary advance not found');
    if (adv.status !== SalaryAdvanceStatus.PENDING) {
      throw new BadRequestException(`Salary advance is already ${adv.status}`);
    }

    if (dto.status === SalaryAdvanceStatus.APPROVED) {
      const approved = roundMoney(dto.approvedAmount ?? adv.requestedAmount);
      const repayment = roundMoney(dto.repaymentAmount ?? adv.repaymentAmount);
      adv.status = SalaryAdvanceStatus.APPROVED;
      adv.approvedAmount = approved;
      adv.remainingAmount = approved;
      adv.repaymentAmount = Math.min(approved, repayment);
      adv.approvalDate = this.todayStr();
      adv.approvedBy = actorUserId;
    } else if (
      dto.status === SalaryAdvanceStatus.REJECTED ||
      dto.status === SalaryAdvanceStatus.CANCELLED
    ) {
      adv.status = dto.status;
      adv.remainingAmount = 0;
    }

    return r.advanceRepo.save(adv);
  }

  // ============================================================================
  // 8. PAYROLL SETTINGS, SERVICE CHARGE POOL & MONTHLY PAYROLL ENGINE
  // ============================================================================

  async getPayrollSettings(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    return r.payrollSettingsRepo.findOne({
      where: { tenantId, propertyId },
    });
  }

  async updatePayrollSettings(rawTenantId: string, rawPropertyId: string, dto: any) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const settings = await r.payrollSettingsRepo.findOne({
      where: { tenantId, propertyId },
    });
    if (!settings) throw new NotFoundException('Payroll settings not found');

    const fields = [
      'currency',
      'payrollFrequency',
      'payrollCutoffDay',
      'payrollPaymentDay',
      'standardWorkingDaysPerMonth',
      'standardWorkingHoursPerDay',
      'overtimeMultiplier',
      'holidayOvertimeMultiplier',
      'lateGracePeriodMinutes',
      'lateDeductionEnabled',
      'noPayDeductionMethod',
      'serviceChargeEnabled',
      'serviceChargePoolPercentage',
      'serviceChargeDistributionMethod',
      'employeeEpfPercentage',
      'employerEpfPercentage',
      'employerEtfPercentage',
      'roundingPrecision',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) {
        (settings as any)[f] = dto[f];
      }
    }
    return r.payrollSettingsRepo.save(settings);
  }

  async getPayrollRuns(rawTenantId: string, rawPropertyId: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    return r.payrollRunRepo.find({
      where: { tenantId, propertyId },
      relations: {
        payslips: {
          employee: {
            department: true,
            designation: true,
          },
        },
      },
      order: { payPeriodYear: 'DESC', payPeriodMonth: 'DESC' },
    });
  }

  async getPayslipById(rawTenantId: string, rawPropertyId: string, id: string) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const slip = await r.payslipRepo.findOne({
      where: { id, tenantId, propertyId },
      relations: {
        employee: {
          department: true,
          designation: true,
        },
        payrollRun: true,
        items: true,
      },
    });
    if (!slip) throw new NotFoundException('Payslip not found');

    return {
      ...slip,
      employee: slip.employee
        ? this.sanitizeEmployeeForList(slip.employee)
        : null,
    };
  }

  async generatePayrollRun(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    dto: {
      payPeriodMonth: number;
      payPeriodYear: number;
      manualServiceChargePool?: number;
      notes?: string;
    },
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    await this.ensurePropertyInitialized(tenantId, propertyId);
    const month = Number(dto.payPeriodMonth);
    const year = Number(dto.payPeriodYear);
    if (!month || month < 1 || month > 12 || !year || year < 2020) {
      throw new BadRequestException('Valid payPeriodMonth (1-12) and payPeriodYear are required');
    }

    // Check if an APPROVED or PAID payroll run already exists for this month
    const existingRun = await r.payrollRunRepo.findOne({
      where: {
        tenantId,
        propertyId,
        payPeriodMonth: month,
        payPeriodYear: year,
      },
    });
    if (
      existingRun &&
      [PayrollStatus.APPROVED, PayrollStatus.PAID].includes(existingRun.status)
    ) {
      throw new ConflictException(
        `Payroll for ${year}-${String(month).padStart(2, '0')} is already ${existingRun.status} and cannot be overwritten.`,
      );
    }

    // If a DRAFT run exists for this month, remove it before regenerating
    if (existingRun) {
      await r.payrollRunRepo.remove(existingRun);
    }

    const settings = await this.getPayrollSettings(tenantId, propertyId);
    const workingDaysPerMonth = Number(settings?.standardWorkingDaysPerMonth || 26);
    const hoursPerDay = Number(settings?.standardWorkingHoursPerDay || 8);
    const otMultiplier = Number(settings?.overtimeMultiplier || 1.5);
    const empEpfPct = Number(settings?.employeeEpfPercentage || 8.0);
    const employerEpfPct = Number(settings?.employerEpfPercentage || 12.0);
    const employerEtfPct = Number(settings?.employerEtfPercentage || 3.0);

    const periodStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEndDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const employees = await r.empRepo.find({
      where: {
        tenantId,
        propertyId,
        employeeStatus: EmployeeStatus.ACTIVE,
        payrollEligible: true,
        deletedAt: IsNull(),
      },
      relations: { department: true, designation: true },
      order: { employeeCode: 'ASC' },
    });

    if (employees.length === 0) {
      throw new BadRequestException(
        'No active payroll-eligible employees found for this property',
      );
    }

    // Calculate Hotel Service Charge Pool for the month
    let serviceChargePoolTotal = 0;
    if (
      dto.manualServiceChargePool !== undefined &&
      Number(dto.manualServiceChargePool) >= 0
    ) {
      serviceChargePoolTotal = roundMoney(dto.manualServiceChargePool);
    } else if (settings?.serviceChargeEnabled) {
      // Aggregate settled POS bills in period
      const bills = await r.billRepo.find({
        where: { tenantId, propertyId },
      });
      const periodStartMs = new Date(`${periodStartDate}T00:00:00`).getTime();
      const periodEndMs = new Date(`${periodEndDate}T23:59:59`).getTime();
      const periodBills = bills.filter((b) => {
        const t = new Date(b.createdAt).getTime();
        return t >= periodStartMs && t <= periodEndMs;
      });
      const collectedServiceCharge = periodBills.reduce(
        (sum, b) => sum + Number(b.serviceChargeAmount || 0),
        0,
      );
      if (collectedServiceCharge > 0) {
        serviceChargePoolTotal = roundMoney(collectedServiceCharge);
      } else {
        // Fallback: 10% of total basic payroll if no bills had explicit serviceCharge yet
        const totalBase = employees.reduce(
          (s, e) => s + Number(e.basicSalary || 0),
          0,
        );
        serviceChargePoolTotal = percentageOfMoney(
          totalBase,
          settings.serviceChargePoolPercentage || 10,
        );
      }
    }

    const scEligibleEmps = employees.filter((e) => e.serviceChargeEligible);
    const totalEligibleBaseCents = scEligibleEmps.reduce(
      (s, e) => s + toCents(e.basicSalary),
      0,
    );

    const [monthAttendances, monthLeaves, empComponents, activeAdvances] =
      await Promise.all([
        r.attendanceRepo.find({
          where: {
            tenantId,
            propertyId,
            attendanceDate: Between(periodStartDate, periodEndDate),
          },
        }),
        r.leaveRequestRepo.find({
          where: {
            tenantId,
            propertyId,
            status: LeaveRequestStatus.APPROVED,
          },
          relations: { leaveType: true },
        }),
        r.empSalaryCompRepo.find({
          where: { tenantId, propertyId },
          relations: { salaryComponent: true },
        }),
        r.advanceRepo.find({
          where: {
            tenantId,
            propertyId,
            status: In([
              SalaryAdvanceStatus.APPROVED,
              SalaryAdvanceStatus.PARTIALLY_DEDUCTED,
            ]),
          },
        }),
      ]);

    const runCode = `PR-${year}${String(month).padStart(2, '0')}`;
    const run = await r.payrollRunRepo.save(
      r.payrollRunRepo.create({
        tenantId,
        propertyId,
        runCode,
        payPeriodMonth: month,
        payPeriodYear: year,
        periodStartDate,
        periodEndDate,
        status: PayrollStatus.DRAFT,
        employeeCount: employees.length,
        serviceChargePoolTotal,
        generatedBy: actorUserId,
        notes: dto.notes || null,
      }),
    );

    let sumBasicCents = 0;
    let sumAllowancesCents = 0;
    let sumOvertimeCents = 0;
    let sumGrossCents = 0;
    let sumDeductionsCents = 0;
    let sumEmpEpfCents = 0;
    let sumEmployerEpfCents = 0;
    let sumEmployerEtfCents = 0;
    let sumNetCents = 0;

    for (const emp of employees) {
      const basicSalary = roundMoney(emp.basicSalary);
      const empAtt = monthAttendances.filter((a) => a.employeeId === emp.id);

      // Overtime hours from attendance
      const totalOvertimeMinutes = emp.overtimeEligible
        ? empAtt.reduce((s, a) => s + Number(a.overtimeMinutes || 0), 0)
        : 0;
      const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));
      const hourlyRate = basicSalary / (workingDaysPerMonth * hoursPerDay);
      const overtimeAmount = roundMoney(
        overtimeHours * hourlyRate * otMultiplier,
      );

      // No-Pay days from approved NO_PAY leaves in period + ABSENT attendance
      const empNoPayLeaves = monthLeaves.filter(
        (l) =>
          l.employeeId === emp.id &&
          l.leaveType?.leaveType === LeaveType.NO_PAY &&
          l.startDate <= periodEndDate &&
          l.endDate >= periodStartDate,
      );
      const noPayLeaveDays = empNoPayLeaves.reduce(
        (s, l) => s + Number(l.totalDays || 0),
        0,
      );
      const absentDays = empAtt.filter(
        (a) => a.status === AttendanceStatus.ABSENT,
      ).length;
      const noPayDays = Number((noPayLeaveDays + absentDays).toFixed(2));
      const dailyRate = basicSalary / workingDaysPerMonth;
      const noPayDeduction = roundMoney(noPayDays * dailyRate);

      // Recurring allowances & deductions
      const assignedComps = empComponents.filter(
        (c) => c.employeeId === emp.id,
      );
      let allowancesTotalCents = 0;
      let otherDeductionsCents = 0;
      const slipItems: Partial<HrmPayslipItem>[] = [
        {
          tenantId,
          propertyId,
          itemType: PayrollItemType.BASIC_SALARY,
          label: 'Basic Monthly Salary',
          amount: basicSalary,
          isDeduction: false,
          isEmployerContribution: false,
        },
      ];

      for (const ac of assignedComps) {
        const amt = roundMoney(ac.amount);
        if (amt <= 0) continue;
        const type = ac.salaryComponent?.itemType || PayrollItemType.ALLOWANCE;
        const isDed = [
          PayrollItemType.OTHER_DEDUCTION,
          PayrollItemType.NO_PAY_DEDUCTION,
          PayrollItemType.LATE_DEDUCTION,
        ].includes(type);
        if (isDed) {
          otherDeductionsCents += toCents(amt);
        } else {
          allowancesTotalCents += toCents(amt);
        }
        slipItems.push({
          tenantId,
          propertyId,
          itemType: type,
          label: ac.salaryComponent?.name || 'Recurring Component',
          amount: amt,
          isDeduction: isDed,
          isEmployerContribution: false,
        });
      }

      const allowancesTotal = fromCents(allowancesTotalCents);
      const otherDeductions = fromCents(otherDeductionsCents);

      // Service charge share
      let serviceChargeShare = 0;
      if (
        emp.serviceChargeEligible &&
        scEligibleEmps.length > 0 &&
        serviceChargePoolTotal > 0
      ) {
        if (
          settings?.serviceChargeDistributionMethod ===
            ServiceChargeDistributionMethod.WEIGHTED &&
          totalEligibleBaseCents > 0
        ) {
          serviceChargeShare = fromCents(
            Math.round(
              (toCents(serviceChargePoolTotal) * toCents(basicSalary)) /
                totalEligibleBaseCents,
            ),
          );
        } else {
          serviceChargeShare = fromCents(
            Math.round(toCents(serviceChargePoolTotal) / scEligibleEmps.length),
          );
        }
      }

      if (overtimeAmount > 0) {
        slipItems.push({
          tenantId,
          propertyId,
          itemType: PayrollItemType.OVERTIME,
          label: `Overtime (${overtimeHours} hrs @ ${otMultiplier}x)`,
          amount: overtimeAmount,
          isDeduction: false,
          isEmployerContribution: false,
        });
      }

      if (serviceChargeShare > 0) {
        slipItems.push({
          tenantId,
          propertyId,
          itemType: PayrollItemType.SERVICE_CHARGE,
          label: 'Hotel Service Charge Pool Share',
          amount: serviceChargeShare,
          isDeduction: false,
          isEmployerContribution: false,
        });
      }

      // Salary Advance Installment Deduction
      const empAdvances = activeAdvances.filter(
        (adv) => adv.employeeId === emp.id && Number(adv.remainingAmount) > 0,
      );
      let salaryAdvanceDeductionCents = 0;
      for (const adv of empAdvances) {
        const deduct = Math.min(
          toCents(adv.remainingAmount),
          toCents(adv.repaymentAmount || adv.remainingAmount),
        );
        salaryAdvanceDeductionCents += deduct;
      }
      const salaryAdvanceDeduction = fromCents(salaryAdvanceDeductionCents);

      // Statutory EPF & ETF (calculated on Basic Salary less No-Pay)
      const epfBase = Math.max(0, roundMoney(basicSalary - noPayDeduction));
      const employeeEpfAmount = percentageOfMoney(epfBase, empEpfPct);
      const employerEpfAmount = percentageOfMoney(epfBase, employerEpfPct);
      const employerEtfAmount = percentageOfMoney(epfBase, employerEtfPct);

      if (noPayDeduction > 0) {
        slipItems.push({
          tenantId,
          propertyId,
          itemType: PayrollItemType.NO_PAY_DEDUCTION,
          label: `No-Pay Leave Deduction (${noPayDays} days)`,
          amount: noPayDeduction,
          isDeduction: true,
          isEmployerContribution: false,
        });
      }

      if (salaryAdvanceDeduction > 0) {
        slipItems.push({
          tenantId,
          propertyId,
          itemType: PayrollItemType.SALARY_ADVANCE,
          label: 'Salary Advance Recovery',
          amount: salaryAdvanceDeduction,
          isDeduction: true,
          isEmployerContribution: false,
        });
      }

      slipItems.push(
        {
          tenantId,
          propertyId,
          itemType: PayrollItemType.EMPLOYEE_EPF,
          label: `Employee EPF (${empEpfPct}%)`,
          amount: employeeEpfAmount,
          isDeduction: true,
          isEmployerContribution: false,
        },
        {
          tenantId,
          propertyId,
          itemType: PayrollItemType.EMPLOYER_EPF,
          label: `Employer EPF Contribution (${employerEpfPct}%)`,
          amount: employerEpfAmount,
          isDeduction: false,
          isEmployerContribution: true,
        },
        {
          tenantId,
          propertyId,
          itemType: PayrollItemType.EMPLOYER_ETF,
          label: `Employer ETF Contribution (${employerEtfPct}%)`,
          amount: employerEtfAmount,
          isDeduction: false,
          isEmployerContribution: true,
        },
      );

      const grossPayCents =
        toCents(basicSalary) +
        toCents(allowancesTotal) +
        toCents(overtimeAmount) +
        toCents(serviceChargeShare);
      const totalDeductionsCents =
        toCents(noPayDeduction) +
        toCents(salaryAdvanceDeduction) +
        toCents(employeeEpfAmount) +
        toCents(otherDeductions);
      const netPayCents = Math.max(0, grossPayCents - totalDeductionsCents);

      const grossPay = fromCents(grossPayCents);
      const totalDeductions = fromCents(totalDeductionsCents);
      const netPay = fromCents(netPayCents);

      const payslip = await r.payslipRepo.save(
        r.payslipRepo.create({
          tenantId,
          propertyId,
          payrollRunId: run.id,
          employeeId: emp.id,
          payslipNumber: `PS-${year}${String(month).padStart(2, '0')}-${emp.employeeCode}`,
          payPeriodMonth: month,
          payPeriodYear: year,
          workingDays: workingDaysPerMonth,
          presentDays: Math.max(0, workingDaysPerMonth - noPayDays),
          noPayDays,
          overtimeHours,
          basicSalary,
          allowancesTotal,
          overtimeAmount,
          serviceChargeShare,
          grossPay,
          noPayDeduction,
          salaryAdvanceDeduction,
          employeeEpfAmount,
          otherDeductions,
          totalDeductions,
          employerEpfAmount,
          employerEtfAmount,
          netPay,
          paymentMethod: emp.bankAccountNumber
            ? PayrollPaymentMethod.BANK_TRANSFER
            : PayrollPaymentMethod.CASH,
          status: PayrollStatus.DRAFT,
        }),
      );

      await r.payslipItemRepo.save(
        slipItems.map((si) =>
          r.payslipItemRepo.create({
            ...si,
            payslipId: payslip.id,
          }),
        ),
      );

      sumBasicCents += toCents(basicSalary);
      sumAllowancesCents += toCents(allowancesTotal);
      sumOvertimeCents += toCents(overtimeAmount);
      sumGrossCents += grossPayCents;
      sumDeductionsCents += totalDeductionsCents;
      sumEmpEpfCents += toCents(employeeEpfAmount);
      sumEmployerEpfCents += toCents(employerEpfAmount);
      sumEmployerEtfCents += toCents(employerEtfAmount);
      sumNetCents += netPayCents;
    }

    run.totalBasicSalary = fromCents(sumBasicCents);
    run.totalAllowances = fromCents(sumAllowancesCents);
    run.totalOvertime = fromCents(sumOvertimeCents);
    run.totalGrossPay = fromCents(sumGrossCents);
    run.totalDeductions = fromCents(sumDeductionsCents);
    run.totalEmployeeEpf = fromCents(sumEmpEpfCents);
    run.totalEmployerEpf = fromCents(sumEmployerEpfCents);
    run.totalEmployerEtf = fromCents(sumEmployerEtfCents);
    run.totalNetPay = fromCents(sumNetCents);

    await r.payrollRunRepo.save(run);
    return r.payrollRunRepo.findOne({
      where: { id: run.id, tenantId, propertyId },
      relations: {
        payslips: {
          employee: {
            department: true,
            designation: true,
          },
        },
      },
    });
  }

  async updatePayrollRunStatus(
    rawTenantId: string, rawPropertyId: string,
    actorUserId: string,
    id: string,
    status: PayrollStatus,
  ) {
    const r = await this.getRepos(rawTenantId, rawPropertyId);
    const { tenantId, propertyId } = r;
    const run = await r.payrollRunRepo.findOne({
      where: { id, tenantId, propertyId },
      relations: { payslips: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    if (run.status === PayrollStatus.PAID) {
      throw new BadRequestException('Paid payroll run is locked and cannot be modified');
    }

    return r.ds.transaction(async (manager) => {
      run.status = status;
      if (status === PayrollStatus.APPROVED) {
        run.approvedBy = actorUserId;
        run.approvedAt = new Date();
      } else if (status === PayrollStatus.PAID) {
        run.paidAt = new Date();
        if (!run.approvedBy) {
          run.approvedBy = actorUserId;
          run.approvedAt = new Date();
        }

        // Deduct salary advance balances once when payroll is marked PAID
        for (const slip of run.payslips || []) {
          slip.status = PayrollStatus.PAID;
          await manager.save(HrmPayslip, slip);

          let toDeductCents = toCents(slip.salaryAdvanceDeduction);
          if (toDeductCents > 0) {
            const empAdvances = await manager.find(HrmSalaryAdvance, {
              where: {
                tenantId,
                propertyId,
                employeeId: slip.employeeId,
                status: In([
                  SalaryAdvanceStatus.APPROVED,
                  SalaryAdvanceStatus.PARTIALLY_DEDUCTED,
                ]),
              },
              order: { createdAt: 'ASC' },
            });

            for (const adv of empAdvances) {
              if (toDeductCents <= 0) break;
              const remCents = toCents(adv.remainingAmount);
              const appliedCents = Math.min(remCents, toDeductCents);
              const nextRemCents = remCents - appliedCents;
              adv.remainingAmount = fromCents(nextRemCents);
              adv.status =
                nextRemCents <= 0
                  ? SalaryAdvanceStatus.FULLY_DEDUCTED
                  : SalaryAdvanceStatus.PARTIALLY_DEDUCTED;
              toDeductCents -= appliedCents;
              await manager.save(HrmSalaryAdvance, adv);
            }
          }
        }
      }

      return manager.save(HrmPayrollRun, run);
    });
  }
}

