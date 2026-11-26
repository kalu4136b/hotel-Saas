import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../auth/permissions.guard';
import { HrmService } from './hrm.service';
import {
  LeaveRequestStatus,
  SalaryAdvanceStatus,
  PayrollStatus,
} from '../entities';

@Controller('api/hrm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(
  'hrm',
  'hrm_employees',
  'hrm_roster',
  'hrm_attendance',
  'hrm_leaves',
  'hrm_payroll',
)
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  // ================= 1. OVERVIEW & SEED DEFAULTS =================
  @Get('overview')
  getOverview(@Request() req: any) {
    return this.hrmService.getOverview(req.user.tenantId, (req.user.propertyId || req.user.property?.id));
  }

  @Post('seed-defaults')
  seedDefaults(@Request() req: any) {
    return this.hrmService.seedDefaults(req.user.tenantId, (req.user.propertyId || req.user.property?.id));
  }

  // ================= 2. DEPARTMENTS & DESIGNATIONS =================
  @Get('departments')
  getDepartments(@Request() req: any) {
    return this.hrmService.getDepartments(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Post('departments')
  @RequirePermissions('hrm', 'hrm_employees')
  createDepartment(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createDepartment(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  @Patch('departments/:id')
  @RequirePermissions('hrm', 'hrm_employees')
  updateDepartment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.hrmService.updateDepartment(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      id,
      dto,
    );
  }

  @Delete('departments/:id')
  @RequirePermissions('hrm', 'hrm_employees')
  deleteDepartment(@Request() req: any, @Param('id') id: string) {
    return this.hrmService.deleteDepartment(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      id,
    );
  }

  @Get('designations')
  getDesignations(@Request() req: any) {
    return this.hrmService.getDesignations(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Post('designations')
  @RequirePermissions('hrm', 'hrm_employees')
  createDesignation(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createDesignation(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  // ================= 3. EMPLOYEES & DOCUMENTS =================
  @Get('employees')
  getEmployees(
    @Request() req: any,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.hrmService.getEmployees(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      { departmentId, status, search },
    );
  }

  @Get('employees/:id')
  @RequirePermissions('hrm', 'hrm_employees', 'hrm_payroll')
  getEmployeeById(@Request() req: any, @Param('id') id: string) {
    return this.hrmService.getEmployeeById(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      id,
    );
  }

  @Post('employees')
  @RequirePermissions('hrm', 'hrm_employees')
  createEmployee(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createEmployee(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      dto,
    );
  }

  @Patch('employees/:id')
  @RequirePermissions('hrm', 'hrm_employees')
  updateEmployee(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.hrmService.updateEmployee(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto,
    );
  }

  @Post('employees/:id/documents')
  @RequirePermissions('hrm', 'hrm_employees')
  addEmployeeDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.hrmService.addEmployeeDocument(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto,
    );
  }

  // ================= 4. SHIFTS & DUTY ROSTER =================
  @Get('shifts')
  getShiftTemplates(@Request() req: any) {
    return this.hrmService.getShiftTemplates(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Post('shifts')
  @RequirePermissions('hrm', 'hrm_roster')
  createShiftTemplate(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createShiftTemplate(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  @Get('roster')
  getRoster(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.hrmService.getRoster(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      startDate,
      endDate,
      departmentId,
    );
  }

  @Post('roster')
  @RequirePermissions('hrm', 'hrm_roster')
  createRosterAssignment(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createRosterAssignment(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      dto,
    );
  }

  @Post('roster/publish')
  @RequirePermissions('hrm', 'hrm_roster')
  publishRoster(
    @Request() req: any,
    @Body() dto: { startDate: string; endDate: string },
  ) {
    return this.hrmService.publishRoster(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto.startDate,
      dto.endDate,
    );
  }

  @Delete('roster/:id')
  @RequirePermissions('hrm', 'hrm_roster')
  deleteRosterAssignment(@Request() req: any, @Param('id') id: string) {
    return this.hrmService.deleteRosterAssignment(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      id,
    );
  }

  // ================= 5. ATTENDANCE & TIMESHEETS =================
  @Get('attendance')
  getAttendance(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.hrmService.getAttendance(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      date,
      startDate,
      endDate,
      employeeId,
    );
  }

  @Post('attendance')
  @RequirePermissions('hrm', 'hrm_attendance')
  recordAttendance(@Request() req: any, @Body() dto: any) {
    return this.hrmService.recordAttendance(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      dto,
    );
  }

  @Patch('attendance/:id/regularize')
  @RequirePermissions('hrm', 'hrm_attendance')
  regularizeAttendance(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.hrmService.regularizeAttendance(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto,
    );
  }

  // ================= 6. LEAVE MANAGEMENT =================
  @Get('leave-types')
  getLeaveTypes(@Request() req: any) {
    return this.hrmService.getLeaveTypes(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Get('leave-balances')
  getLeaveBalances(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ) {
    return this.hrmService.getLeaveBalances(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      employeeId,
      year ? Number(year) : undefined,
    );
  }

  @Get('leave-requests')
  getLeaveRequests(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.hrmService.getLeaveRequests(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      status,
      employeeId,
    );
  }

  @Post('leave-requests')
  @RequirePermissions('hrm', 'hrm_leaves')
  createLeaveRequest(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createLeaveRequest(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      dto,
    );
  }

  @Patch('leave-requests/:id/status')
  @RequirePermissions('hrm', 'hrm_leaves')
  updateLeaveRequestStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { status: LeaveRequestStatus; rejectionReason?: string },
  ) {
    return this.hrmService.updateLeaveRequestStatus(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto,
    );
  }

  // ================= 7. SALARY ADVANCES & COMPONENTS =================
  @Get('salary-components')
  getSalaryComponents(@Request() req: any) {
    return this.hrmService.getSalaryComponents(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Post('employee-salary-components')
  @RequirePermissions('hrm', 'hrm_payroll')
  assignEmployeeSalaryComponent(@Request() req: any, @Body() dto: any) {
    return this.hrmService.assignEmployeeSalaryComponent(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  @Get('salary-advances')
  getSalaryAdvances(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.hrmService.getSalaryAdvances(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      status,
      employeeId,
    );
  }

  @Post('salary-advances')
  @RequirePermissions('hrm', 'hrm_payroll')
  createSalaryAdvance(@Request() req: any, @Body() dto: any) {
    return this.hrmService.createSalaryAdvance(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  @Patch('salary-advances/:id/status')
  @RequirePermissions('hrm', 'hrm_payroll')
  updateSalaryAdvanceStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      status: SalaryAdvanceStatus;
      approvedAmount?: number;
      repaymentAmount?: number;
    },
  ) {
    return this.hrmService.updateSalaryAdvanceStatus(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto,
    );
  }

  // ================= 8. PAYROLL SETTINGS, RUNS & PAYSLIPS =================
  @Get('payroll-settings')
  @RequirePermissions('hrm', 'hrm_payroll')
  getPayrollSettings(@Request() req: any) {
    return this.hrmService.getPayrollSettings(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Put('payroll-settings')
  @RequirePermissions('hrm', 'hrm_payroll')
  updatePayrollSettings(@Request() req: any, @Body() dto: any) {
    return this.hrmService.updatePayrollSettings(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      dto,
    );
  }

  @Get('payroll-runs')
  @RequirePermissions('hrm', 'hrm_payroll')
  getPayrollRuns(@Request() req: any) {
    return this.hrmService.getPayrollRuns(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
    );
  }

  @Post('payroll-runs')
  @RequirePermissions('hrm', 'hrm_payroll')
  generatePayrollRun(
    @Request() req: any,
    @Body()
    dto: {
      payPeriodMonth: number;
      payPeriodYear: number;
      manualServiceChargePool?: number;
      notes?: string;
    },
  ) {
    return this.hrmService.generatePayrollRun(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      dto,
    );
  }

  @Patch('payroll-runs/:id/status')
  @RequirePermissions('hrm', 'hrm_payroll')
  updatePayrollRunStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { status: PayrollStatus },
  ) {
    return this.hrmService.updatePayrollRunStatus(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      (req.user.id || req.user.userId),
      id,
      dto.status,
    );
  }

  @Get('payslips/:id')
  @RequirePermissions('hrm', 'hrm_payroll')
  getPayslipById(@Request() req: any, @Param('id') id: string) {
    return this.hrmService.getPayslipById(
      req.user.tenantId,
      (req.user.propertyId || req.user.property?.id),
      id,
    );
  }
}

