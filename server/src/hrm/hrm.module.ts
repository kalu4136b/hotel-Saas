import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
} from '../entities';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [HrmController],
  providers: [HrmService],
  exports: [HrmService],
})
export class HrmModule {}

