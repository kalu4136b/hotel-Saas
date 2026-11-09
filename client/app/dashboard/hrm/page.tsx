'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { hrmApi } from '@/lib/api';
import {
  Users,
  Building2,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Pencil,
  Trash2,
  Printer,
  ShieldCheck,
  Sparkles,
  Briefcase,
  Award,
  Check,
  Ban,
  SlidersHorizontal,
  Upload,
  Wallet,
  Receipt,
} from 'lucide-react';

export type HrmTabType =
  | 'OVERVIEW'
  | 'EMPLOYEES'
  | 'DEPARTMENTS'
  | 'ROSTER'
  | 'ATTENDANCE'
  | 'LEAVES'
  | 'ADVANCES'
  | 'PAYROLL';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function HrmPayrollPage() {
  const [activeTab, setActiveTab] = useState<HrmTabType>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Core Data States
  const [overview, setOverview] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<any[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<any>(null);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);

  // Filters
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState('ALL');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Modals
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [desigModalOpen, setDesigModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [regularizeModalItem, setRegularizeModalItem] = useState<any | null>(
    null,
  );
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [payrollSettingsModalOpen, setPayrollSettingsModalOpen] =
    useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Forms
  const [empForm, setEmpForm] = useState<any>({
    employeeCode: '',
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    nicNumber: '',
    passportNumber: '',
    email: '',
    phone: '',
    address: '',
    city: 'Colombo',
    emergencyContactName: '',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '',
    departmentId: '',
    designationId: '',
    employmentType: 'FULL_TIME',
    employeeStatus: 'ACTIVE',
    joinDate: new Date().toISOString().slice(0, 10),
    basicSalary: '65000',
    payrollEligible: true,
    serviceChargeEligible: true,
    overtimeEligible: true,
    bankName: 'Commercial Bank of Ceylon',
    bankBranch: 'Colombo 03',
    bankAccountNumber: '',
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [desigForm, setDesigForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    description: '',
  });

  const [shiftForm, setShiftForm] = useState({
    name: '',
    shiftType: 'MORNING',
    startTime: '06:00',
    endTime: '14:00',
    breakDurationMinutes: 30,
    expectedWorkingMinutes: 450,
    color: '#00C48C',
    isOvernight: false,
  });

  const [rosterForm, setRosterForm] = useState({
    employeeId: '',
    shiftTemplateId: '',
    dutyDate: new Date().toISOString().slice(0, 10),
    publishImmediately: true,
    notes: '',
  });

  const [attForm, setAttForm] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().slice(0, 10),
    checkIn: `${new Date().toISOString().slice(0, 10)}T08:00`,
    checkOut: `${new Date().toISOString().slice(0, 10)}T17:00`,
    status: 'PRESENT',
    notes: '',
  });

  const [regForm, setRegForm] = useState({
    checkIn: '',
    checkOut: '',
    workedMinutes: 480,
    overtimeMinutes: 0,
    status: 'PRESENT',
    reason: '',
  });

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    isHalfDay: false,
    reason: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    requestedAmount: '15000',
    repaymentAmount: '15000',
    requestDate: new Date().toISOString().slice(0, 10),
    reason: 'Personal / Medical emergency',
  });

  const [payrollGenForm, setPayrollGenForm] = useState({
    payPeriodMonth: new Date().getMonth() + 1,
    payPeriodYear: new Date().getFullYear(),
    manualServiceChargePool: '',
    notes: '',
  });

  const [docForm, setDocForm] = useState({
    documentType: 'NIC',
    title: '',
    fileName: '',
    expiryDate: '',
  });

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Sync activeTab with ?tab= URL parameter & sidebar event
  useEffect(() => {
    const applyUrlTab = (searchStr?: string) => {
      const params = new URLSearchParams(searchStr ?? window.location.search);
      const tab = params.get('tab')?.toUpperCase() as HrmTabType | undefined;
      const validTabs: HrmTabType[] = [
        'OVERVIEW',
        'EMPLOYEES',
        'DEPARTMENTS',
        'ROSTER',
        'ATTENDANCE',
        'LEAVES',
        'ADVANCES',
        'PAYROLL',
      ];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    };
    applyUrlTab();
    const handleNavTab = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.href?.includes('?')) {
        applyUrlTab('?' + detail.href.split('?')[1]);
      }
    };
    window.addEventListener('hotel-nav-tab', handleNavTab);
    window.addEventListener('popstate', () => applyUrlTab());
    return () => {
      window.removeEventListener('hotel-nav-tab', handleNavTab);
    };
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        ovData,
        deptData,
        desigData,
        empData,
        shiftData,
        rosterData,
        attData,
        ltData,
        lbData,
        lrData,
        advData,
        psData,
        prData,
      ] = await Promise.all([
        hrmApi.getOverview(),
        hrmApi.getDepartments(),
        hrmApi.getDesignations(),
        hrmApi.getEmployees(),
        hrmApi.getShifts(),
        hrmApi.getRoster(),
        hrmApi.getAttendance(),
        hrmApi.getLeaveTypes(),
        hrmApi.getLeaveBalances(),
        hrmApi.getLeaveRequests(),
        hrmApi.getSalaryAdvances(),
        hrmApi.getPayrollSettings(),
        hrmApi.getPayrollRuns(),
      ]);

      setOverview(ovData);
      setDepartments(deptData || []);
      setDesignations(desigData || []);
      setEmployees(empData || []);
      setShifts(shiftData || []);
      setRoster(rosterData || []);
      setAttendance(attData || []);
      setLeaveTypes(ltData || []);
      setLeaveBalances(lbData || []);
      setLeaveRequests(lrData || []);
      setSalaryAdvances(advData || []);
      setPayrollSettings(psData);
      setPayrollRuns(prData || []);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load HRM data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filtered employees
  const filteredEmployees = employees.filter((e) => {
    if (empDeptFilter !== 'ALL' && e.departmentId !== empDeptFilter)
      return false;
    if (empStatusFilter !== 'ALL' && e.employeeStatus !== empStatusFilter)
      return false;
    if (empSearch.trim()) {
      const q = empSearch.toLowerCase();
      return (
        e.fullName?.toLowerCase().includes(q) ||
        e.employeeCode?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handlers
  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    setEmpForm({
      employeeCode: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      firstName: '',
      lastName: '',
      gender: 'MALE',
      dateOfBirth: '',
      nicNumber: '',
      passportNumber: '',
      email: '',
      phone: '',
      address: '',
      city: 'Colombo',
      emergencyContactName: '',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '',
      departmentId: departments[0]?.id || '',
      designationId: designations[0]?.id || '',
      employmentType: 'FULL_TIME',
      employeeStatus: 'ACTIVE',
      joinDate: new Date().toISOString().slice(0, 10),
      basicSalary: '65000',
      payrollEligible: true,
      serviceChargeEligible: true,
      overtimeEligible: true,
      bankName: 'Commercial Bank of Ceylon',
      bankBranch: 'Colombo 03',
      bankAccountNumber: '',
    });
    setEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = async (emp: any) => {
    try {
      const fullEmp = await hrmApi.getEmployeeById(emp.id);
      setEditingEmployee(fullEmp);
      setEmpForm({
        employeeCode: fullEmp.employeeCode || '',
        firstName: fullEmp.firstName || '',
        lastName: fullEmp.lastName || '',
        gender: fullEmp.gender || 'MALE',
        dateOfBirth: fullEmp.dateOfBirth || '',
        nicNumber: fullEmp.nicNumber || '',
        passportNumber: fullEmp.passportNumber || '',
        email: fullEmp.email || '',
        phone: fullEmp.phone || '',
        address: fullEmp.address || '',
        city: fullEmp.city || '',
        emergencyContactName: fullEmp.emergencyContactName || '',
        emergencyContactRelationship:
          fullEmp.emergencyContactRelationship || '',
        emergencyContactPhone: fullEmp.emergencyContactPhone || '',
        departmentId: fullEmp.departmentId || '',
        designationId: fullEmp.designationId || '',
        employmentType: fullEmp.employmentType || 'FULL_TIME',
        employeeStatus: fullEmp.employeeStatus || 'ACTIVE',
        joinDate: fullEmp.joinDate || '',
        basicSalary: String(fullEmp.basicSalary || 0),
        payrollEligible: fullEmp.payrollEligible !== false,
        serviceChargeEligible: fullEmp.serviceChargeEligible !== false,
        overtimeEligible: fullEmp.overtimeEligible !== false,
        bankName: fullEmp.bankName || '',
        bankBranch: fullEmp.bankBranch || '',
        bankAccountNumber: fullEmp.bankAccountNumber || '',
      });
      setEmployeeModalOpen(true);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load employee details');
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await hrmApi.updateEmployee(editingEmployee.id, {
          ...empForm,
          basicSalary: Number(empForm.basicSalary),
        });
        notify('success', `Updated employee ${empForm.firstName} ${empForm.lastName}`);
      } else {
        await hrmApi.createEmployee({
          ...empForm,
          basicSalary: Number(empForm.basicSalary),
        });
        notify('success', `Onboarded employee ${empForm.firstName} ${empForm.lastName}`);
      }
      setEmployeeModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to save employee');
    }
  };

  const handleViewEmployee = async (id: string) => {
    try {
      const detail = await hrmApi.getEmployeeById(id);
      setViewingEmployee(detail);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load employee profile');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingEmployee) return;
    try {
      await hrmApi.addEmployeeDocument(viewingEmployee.id, docForm);
      notify('success', 'Employee document added');
      setDocForm({
        documentType: 'NIC',
        title: '',
        fileName: '',
        expiryDate: '',
      });
      const updated = await hrmApi.getEmployeeById(viewingEmployee.id);
      setViewingEmployee(updated);
    } catch (err: any) {
      notify('error', err.message || 'Failed to add document');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createDepartment(deptForm);
      notify('success', `Department "${deptForm.name}" created`);
      setDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create department');
    }
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createDesignation(desigForm);
      notify('success', `Designation "${desigForm.name}" created`);
      setDesigModalOpen(false);
      setDesigForm({ name: '', code: '', departmentId: '', description: '' });
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create designation');
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createShift(shiftForm);
      notify('success', `Shift template "${shiftForm.name}" created`);
      setShiftModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create shift');
    }
  };

  const handleCreateRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createRosterAssignment(rosterForm);
      notify('success', 'Duty shift assigned to roster');
      setRosterModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to assign shift');
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.recordAttendance({
        ...attForm,
        checkIn: attForm.checkIn ? new Date(attForm.checkIn).toISOString() : null,
        checkOut: attForm.checkOut
          ? new Date(attForm.checkOut).toISOString()
          : null,
      });
      notify('success', 'Attendance recorded');
      setAttendanceModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to record attendance');
    }
  };

  const handleRegularizeAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regularizeModalItem) return;
    try {
      await hrmApi.regularizeAttendance(regularizeModalItem.id, {
        ...regForm,
        checkIn: regForm.checkIn
          ? new Date(regForm.checkIn).toISOString()
          : undefined,
        checkOut: regForm.checkOut
          ? new Date(regForm.checkOut).toISOString()
          : undefined,
      });
      notify('success', 'Attendance record regularized with audit log');
      setRegularizeModalItem(null);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to regularize attendance');
    }
  };

  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createLeaveRequest(leaveForm);
      notify('success', 'Leave request submitted');
      setLeaveModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to submit leave request');
    }
  };

  const handleLeaveStatus = async (
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      await hrmApi.updateLeaveRequestStatus(id, { status });
      notify('success', `Leave request ${status.toLowerCase()}`);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update leave request');
    }
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.createSalaryAdvance({
        ...advanceForm,
        requestedAmount: Number(advanceForm.requestedAmount),
        repaymentAmount: Number(advanceForm.repaymentAmount),
      });
      notify('success', 'Salary advance request recorded');
      setAdvanceModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to request salary advance');
    }
  };

  const handleAdvanceStatus = async (
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      await hrmApi.updateSalaryAdvanceStatus(id, { status });
      notify('success', `Salary advance ${status.toLowerCase()}`);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update salary advance');
    }
  };

  const handleGeneratePayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.generatePayrollRun({
        payPeriodMonth: Number(payrollGenForm.payPeriodMonth),
        payPeriodYear: Number(payrollGenForm.payPeriodYear),
        manualServiceChargePool:
          payrollGenForm.manualServiceChargePool !== ''
            ? Number(payrollGenForm.manualServiceChargePool)
            : undefined,
        notes: payrollGenForm.notes || undefined,
      });
      notify(
        'success',
        `Generated payroll run for ${MONTHS[Number(payrollGenForm.payPeriodMonth) - 1]} ${payrollGenForm.payPeriodYear}`,
      );
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to generate payroll run');
    }
  };

  const handlePayrollRunStatus = async (id: string, status: string) => {
    try {
      await hrmApi.updatePayrollRunStatus(id, status);
      notify('success', `Payroll run marked as ${status}`);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update payroll run status');
    }
  };

  const handleSavePayrollSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrmApi.updatePayrollSettings(payrollSettings);
      notify('success', 'Statutory EPF/ETF & Service Charge settings saved');
      setPayrollSettingsModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update payroll settings');
    }
  };

  const handleOpenPayslip = async (slipId: string) => {
    try {
      const detail = await hrmApi.getPayslipById(slipId);
      setSelectedPayslip(detail);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load payslip');
    }
  };

  return (
    <DashboardLayout>
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[10.5px] font-bold mb-1.5">
            <Users className="w-3 h-3 text-[#00C48C]" />
            <span>Hospitality Human Resource &amp; Payroll Suite</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            HRM, Duty Roster &amp; Monthly Payroll
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage hotel staff profiles, shift rosters, daily attendance, leave
            ledgers, 10% service charge pool, and EPF/ETF payslips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadAllData}
            className="py-2 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateEmployeeModal}
            className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard Staff</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-5 p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Module Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] mb-6 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'HRM Overview', icon: Users },
          { id: 'EMPLOYEES', label: 'Employees & Profiles', icon: Briefcase },
          { id: 'DEPARTMENTS', label: 'Departments & Roles', icon: Building2 },
          { id: 'ROSTER', label: 'Shift & Duty Roster', icon: Calendar },
          { id: 'ATTENDANCE', label: 'Attendance & Timesheets', icon: Clock },
          { id: 'LEAVES', label: 'Leave Management', icon: FileText },
          { id: 'ADVANCES', label: 'Salary Advances', icon: Wallet },
          { id: 'PAYROLL', label: 'Payroll & Payslips', icon: DollarSign },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as HrmTabType)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                active
                  ? 'bg-[#00C48C] text-white shadow-xs'
                  : 'text-[#64748B] hover:bg-white hover:text-[#0F172A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= 1. OVERVIEW TAB ================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Active Hotel Staff
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-1">
                {overview?.activeEmployees ?? 0}{' '}
                <span className="text-xs font-semibold text-[#64748B]">
                  / {overview?.totalEmployees ?? 0} total
                </span>
              </div>
              <div className="text-[11px] text-[#00C48C] font-semibold mt-1">
                Across {departments.length} hotel departments
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Today&apos;s Attendance
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-1">
                {overview?.presentTodayCount ?? 0}{' '}
                <span className="text-xs font-semibold text-[#64748B]">
                  present
                </span>
              </div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                {overview?.lateTodayCount ?? 0} late ·{' '}
                {overview?.scheduledTodayCount ?? 0} rostered today
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Pending Approvals
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-1">
                {(overview?.pendingLeaveRequests ?? 0) +
                  (overview?.pendingSalaryAdvances ?? 0)}
              </div>
              <div className="text-[11px] text-[#64748B] font-semibold mt-1">
                {overview?.pendingLeaveRequests ?? 0} leaves ·{' '}
                {overview?.pendingSalaryAdvances ?? 0} salary advances
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Monthly Base Payroll
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-1">
                LKR{' '}
                {Number(overview?.monthlyBasePayroll ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                Excludes 10% Service Charge &amp; OT
              </div>
            </div>
          </div>

          {/* Department Headcount & Payroll Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Department Headcount &amp; Base Payroll Breakdown
                </h2>
                <p className="text-xs text-[#64748B]">
                  Live distribution across Front Desk, Housekeeping, Kitchen,
                  F&amp;B, Bar, Engineering, Security &amp; Admin
                </p>
              </div>
              <button
                onClick={() => setActiveTab('DEPARTMENTS')}
                className="text-xs font-bold text-[#00C48C] hover:underline"
              >
                Manage Departments &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Active Staff</th>
                    <th className="py-2.5 px-3">Total Headcount</th>
                    <th className="py-2.5 px-3 text-right">
                      Monthly Base Salary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(overview?.departmentBreakdown || []).map((d: any) => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">
                        {d.code}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                        {d.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10.5px]">
                          {d.activeCount} active
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        {d.headcount} staff
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#0F172A]">
                        LKR {Number(d.monthlyBasicPayroll || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. EMPLOYEES TAB ================= */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee code, name, email, or phone..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs outline-none focus:bg-white focus:border-[#00C48C]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={empDeptFilter}
                onChange={(e) => setEmpDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={empStatusFilter}
                onChange={(e) => setEmpStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department &amp; Role</th>
                    <th className="py-3 px-4">Type &amp; Status</th>
                    <th className="py-3 px-4">NIC / Bank (Encrypted)</th>
                    <th className="py-3 px-4 text-right">Basic Salary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                        {emp.employeeCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {emp.phone || emp.email || 'No contact'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {emp.designation?.name || 'Staff'}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {emp.department?.name || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.employeeStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {emp.employeeStatus}
                        </span>
                        <div className="text-[10.5px] text-[#64748B] mt-0.5">
                          {emp.employmentType?.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#475569]">
                        <div>NIC: {emp.nicNumber || 'Not set'}</div>
                        <div className="text-[10px] text-[#94A3B8]">
                          Acct: {emp.bankAccountNumber || 'Cash'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-[#0F172A]">
                          LKR {Number(emp.basicSalary || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#00C48C] font-semibold">
                          {emp.serviceChargeEligible ? '10% SC Pool' : 'No SC'} ·{' '}
                          {emp.overtimeEligible ? 'OT Eligible' : 'Fixed'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleViewEmployee(emp.id)}
                            title="View Full Profile & Documents"
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditEmployeeModal(emp)}
                            title="Edit Employee"
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. DEPARTMENTS & ROLES TAB ================= */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A]">
              Hotel Departments &amp; Job Designations
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeptModalOpen(true)}
                className="py-2 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C48C]" />
                <span>Add Department</span>
              </button>
              <button
                onClick={() => {
                  setDesigForm({
                    name: '',
                    code: '',
                    departmentId: departments[0]?.id || '',
                    description: '',
                  });
                  setDesigModalOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Job Designation</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] font-mono text-[10.5px] font-bold text-[#0F172A]">
                      {d.code}
                    </span>
                    <span className="text-[11px] font-bold text-[#00C48C]">
                      {d.employeeCount || 0} Staff
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{d.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1 mb-3">
                    {d.description || 'Hotel operational department'}
                  </p>

                  <div className="border-t border-[#F1F5F9] pt-2.5">
                    <div className="text-[10px] font-bold uppercase text-[#94A3B8] mb-1.5">
                      Designations ({(d.designations || []).length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(d.designations || []).map((des: any) => (
                        <span
                          key={des.id}
                          className="px-2 py-0.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[10.5px] font-semibold text-[#334155]"
                        >
                          {des.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 4. SHIFT & DUTY ROSTER TAB ================= */}
      {activeTab === 'ROSTER' && (
        <div className="space-y-6">
          {/* Shift Templates */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Hotel Shift Templates (Morning, Evening, Night &amp; Split)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Standardized hospitality shifts with break durations and
                  overnight crossover support
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShiftModalOpen(true)}
                  className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C48C]" />
                  <span>New Shift Template</span>
                </button>
                <button
                  onClick={() => {
                    setRosterForm({
                      employeeId: employees[0]?.id || '',
                      shiftTemplateId: shifts[0]?.id || '',
                      dutyDate: new Date().toISOString().slice(0, 10),
                      publishImmediately: true,
                      notes: '',
                    });
                    setRosterModalOpen(true);
                  }}
                  className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Assign Duty Shift</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: s.color || '#00C48C' }}
                    >
                      {s.shiftType}
                    </span>
                    <span className="text-[10.5px] font-semibold text-[#64748B]">
                      {s.breakDurationMinutes}m break
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#0F172A] mt-1">
                    {s.name}
                  </div>
                  <div className="text-[11px] font-mono text-[#475569] mt-0.5">
                    {s.startTime} &rarr; {s.endTime}{' '}
                    {s.isOvernight ? '(+1d)' : ''}
                  </div>
                  {s.segments?.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-amber-700 font-semibold">
                      Split Segments:{' '}
                      {s.segments
                        .map((seg: any) => `${seg.startTime}-${seg.endTime}`)
                        .join(' & ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Duty Roster */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">
              Scheduled Duty Roster Assignments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">Duty Date</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Shift</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {roster.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-[#94A3B8]"
                      >
                        No duty shifts assigned yet. Click &ldquo;Assign Duty
                        Shift&rdquo; above to schedule staff.
                      </td>
                    </tr>
                  ) : (
                    roster.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">
                          {r.dutyDate}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                          {r.employee?.fullName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748B]">
                          {r.department?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#0F172A]">
                            {r.shiftTemplate?.name || 'Shift'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={async () => {
                              await hrmApi.deleteRosterAssignment(r.id);
                              loadAllData();
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. ATTENDANCE & TIMESHEETS TAB ================= */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#0F172A]">
                Attendance Date:
              </label>
              <input
                type="date"
                value={attendanceDateFilter}
                onChange={(e) => setAttendanceDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold"
              />
            </div>

            <button
              onClick={() => {
                setAttForm({
                  employeeId: employees[0]?.id || '',
                  attendanceDate: attendanceDateFilter,
                  checkIn: `${attendanceDateFilter}T08:00`,
                  checkOut: `${attendanceDateFilter}T17:00`,
                  status: 'PRESENT',
                  notes: '',
                });
                setAttendanceModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Log Check-In / Attendance</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Worked</th>
                    <th className="py-3 px-4">Late / OT</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Regularize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {attendance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-[#94A3B8]"
                      >
                        No attendance logs recorded yet. Click &ldquo;Log
                        Check-In / Attendance&rdquo; to record daily timesheets.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-bold">
                          {a.attendanceDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172A]">
                            {a.employee?.fullName || '-'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B]">
                            {a.employee?.department?.name || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {a.checkIn
                            ? new Date(a.checkIn).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {a.checkOut
                            ? new Date(a.checkOut).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Active'}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {(Number(a.workedMinutes || 0) / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-4">
                          {a.lateMinutes > 0 && (
                            <span className="text-amber-600 font-bold mr-2">
                              Late {a.lateMinutes}m
                            </span>
                          )}
                          {a.overtimeMinutes > 0 && (
                            <span className="text-emerald-600 font-bold">
                              OT {(a.overtimeMinutes / 60).toFixed(1)}h
                            </span>
                          )}
                          {!a.lateMinutes && !a.overtimeMinutes && '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            {a.status}
                          </span>
                          {a.isRegularized && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9.5px] font-bold">
                              Regularized
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setRegularizeModalItem(a);
                              setRegForm({
                                checkIn: a.checkIn
                                  ? new Date(a.checkIn)
                                      .toISOString()
                                      .slice(0, 16)
                                  : `${a.attendanceDate}T08:00`,
                                checkOut: a.checkOut
                                  ? new Date(a.checkOut)
                                      .toISOString()
                                      .slice(0, 16)
                                  : `${a.attendanceDate}T17:00`,
                                workedMinutes: a.workedMinutes || 480,
                                overtimeMinutes: a.overtimeMinutes || 0,
                                status: a.status || 'PRESENT',
                                reason: a.regularizationReason || '',
                              });
                            }}
                            className="text-xs font-bold text-[#00C48C] hover:underline"
                          >
                            Regularize
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. LEAVE MANAGEMENT TAB ================= */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Employee Leave Requests &amp; Balance Ledger
              </h2>
              <p className="text-xs text-[#64748B]">
                Annual, Casual, Sick, Compensatory, and No-Pay leave tracking
              </p>
            </div>
            <button
              onClick={() => {
                setLeaveForm({
                  employeeId: employees[0]?.id || '',
                  leaveTypeId: leaveTypes[0]?.id || '',
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: new Date().toISOString().slice(0, 10),
                  isHalfDay: false,
                  reason: '',
                });
                setLeaveModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Leave Request</span>
            </button>
          </div>

          {/* Leave Requests Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-[#94A3B8]"
                      >
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((lr) => (
                      <tr key={lr.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-bold text-[#0F172A]">
                          {lr.employee?.fullName || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {lr.leaveType?.name || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {lr.startDate} &rarr; {lr.endDate}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {lr.totalDays} {lr.isHalfDay ? '(Half Day)' : 'd'}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {lr.reason || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lr.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : lr.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {lr.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {lr.status === 'PENDING' && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() =>
                                  handleLeaveStatus(lr.id, 'APPROVED')
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10.5px] font-bold hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleLeaveStatus(lr.id, 'REJECTED')
                                }
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10.5px] font-bold hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. SALARY ADVANCES TAB ================= */}
      {activeTab === 'ADVANCES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Staff Salary Advances &amp; Payroll Recovery Ledger
              </h2>
              <p className="text-xs text-[#64748B]">
                Approved advances are automatically deducted during monthly
                payroll runs
              </p>
            </div>
            <button
              onClick={() => {
                setAdvanceForm({
                  employeeId: employees[0]?.id || '',
                  requestedAmount: '15000',
                  repaymentAmount: '15000',
                  requestDate: new Date().toISOString().slice(0, 10),
                  reason: 'Personal advance',
                });
                setAdvanceModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request Salary Advance</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase text-[10.5px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Requested</th>
                    <th className="py-3 px-4">Monthly Deduction</th>
                    <th className="py-3 px-4">Remaining Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {salaryAdvances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-[#94A3B8]"
                      >
                        No salary advances recorded.
                      </td>
                    </tr>
                  ) : (
                    salaryAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono">
                          {adv.requestDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0F172A]">
                          {adv.employee?.fullName || '-'}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          LKR {Number(adv.requestedAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#475569]">
                          LKR {Number(adv.repaymentAmount).toLocaleString()} /
                          mo
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-700">
                          LKR {Number(adv.remainingAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#0F172A] text-[10px] font-bold">
                            {adv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {adv.status === 'PENDING' && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() =>
                                  handleAdvanceStatus(adv.id, 'APPROVED')
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10.5px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleAdvanceStatus(adv.id, 'REJECTED')
                                }
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10.5px] font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. PAYROLL, SERVICE CHARGE & EPF/ETF TAB ================= */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
          {/* Generator & Statutory Rules Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Monthly Hotel Payroll, 10% Service Charge Pool &amp; Statutory
                  EPF/ETF Engine
                </h2>
                <p className="text-xs text-[#64748B]">
                  Active Statutory Rules: Employee EPF{' '}
                  <b>{payrollSettings?.employeeEpfPercentage ?? 8}%</b> ·
                  Employer EPF{' '}
                  <b>{payrollSettings?.employerEpfPercentage ?? 12}%</b> ·
                  Employer ETF{' '}
                  <b>{payrollSettings?.employerEtfPercentage ?? 3}%</b> ·
                  Service Charge Pool{' '}
                  <b>{payrollSettings?.serviceChargePoolPercentage ?? 10}%</b> (
                  {payrollSettings?.serviceChargeDistributionMethod || 'EQUAL'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayrollSettingsModalOpen(true)}
                className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] flex items-center gap-1.5 self-start"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#00C48C]" />
                <span>Configure EPF / ETF &amp; Service Charge Rules</span>
              </button>
            </div>

            <form
              onSubmit={handleGeneratePayrollRun}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#F1F5F9]"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Pay Period Month
                </label>
                <select
                  value={payrollGenForm.payPeriodMonth}
                  onChange={(e) =>
                    setPayrollGenForm({
                      ...payrollGenForm,
                      payPeriodMonth: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Pay Period Year
                </label>
                <input
                  type="number"
                  value={payrollGenForm.payPeriodYear}
                  onChange={(e) =>
                    setPayrollGenForm({
                      ...payrollGenForm,
                      payPeriodYear: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Service Charge Pool Override (Optional LKR)
                </label>
                <input
                  type="number"
                  placeholder="Auto from POS bills / 10% pool"
                  value={payrollGenForm.manualServiceChargePool}
                  onChange={(e) =>
                    setPayrollGenForm({
                      ...payrollGenForm,
                      manualServiceChargePool: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition shadow-xs"
                >
                  Generate Monthly Payroll Run
                </button>
              </div>
            </form>
          </div>

          {/* Generated Payroll Runs */}
          {payrollRuns.map((run) => (
            <div
              key={run.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#0F172A]">
                      {run.runCode}
                    </span>
                    <span className="text-sm font-extrabold text-[#0F172A]">
                      — {MONTHS[(run.payPeriodMonth || 1) - 1]}{' '}
                      {run.payPeriodYear}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        run.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : run.status === 'APPROVED'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {run.employeeCount} Staff · Gross:{' '}
                    <b>LKR {Number(run.totalGrossPay).toLocaleString()}</b> ·
                    10% Service Charge Pool:{' '}
                    <b>
                      LKR {Number(run.serviceChargePoolTotal).toLocaleString()}
                    </b>{' '}
                    · Emp EPF (8%):{' '}
                    <b>LKR {Number(run.totalEmployeeEpf).toLocaleString()}</b> ·
                    Employer EPF (12%):{' '}
                    <b>LKR {Number(run.totalEmployerEpf).toLocaleString()}</b> ·
                    Employer ETF (3%):{' '}
                    <b>LKR {Number(run.totalEmployerEtf).toLocaleString()}</b> ·
                    Net Take-Home:{' '}
                    <b className="text-[#00C48C]">
                      LKR {Number(run.totalNetPay).toLocaleString()}
                    </b>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {run.status === 'DRAFT' && (
                    <button
                      onClick={() =>
                        handlePayrollRunStatus(run.id, 'APPROVED')
                      }
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                    >
                      Approve Payroll
                    </button>
                  )}
                  {run.status !== 'PAID' && (
                    <button
                      onClick={() => handlePayrollRunStatus(run.id, 'PAID')}
                      className="px-3 py-1.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold"
                    >
                      Mark Paid &amp; Deduct Advances
                    </button>
                  )}
                </div>
              </div>

              {/* Payslips Table inside Run */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px]">
                      <th className="py-2 px-3">Payslip #</th>
                      <th className="py-2 px-3">Employee</th>
                      <th className="py-2 px-3 text-right">Basic</th>
                      <th className="py-2 px-3 text-right">Service Charge</th>
                      <th className="py-2 px-3 text-right">OT &amp; Allow.</th>
                      <th className="py-2 px-3 text-right">Gross Pay</th>
                      <th className="py-2 px-3 text-right">Emp EPF (8%)</th>
                      <th className="py-2 px-3 text-right">Adv. / No-Pay</th>
                      <th className="py-2 px-3 text-right">Net Pay</th>
                      <th className="py-2 px-3 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {(run.payslips || []).map((slip: any) => (
                      <tr key={slip.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {slip.payslipNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[#0F172A]">
                            {slip.employee?.fullName || '-'}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {slip.employee?.department?.name} ·{' '}
                            {slip.employee?.designation?.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {Number(slip.basicSalary).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{Number(slip.serviceChargeShare).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          +
                          {(
                            Number(slip.overtimeAmount || 0) +
                            Number(slip.allowancesTotal || 0)
                          ).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {Number(slip.grossPay).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-600">
                          -{Number(slip.employeeEpfAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-600">
                          -
                          {(
                            Number(slip.salaryAdvanceDeduction || 0) +
                            Number(slip.noPayDeduction || 0)
                          ).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-[#0F172A]">
                          LKR {Number(slip.netPay).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleOpenPayslip(slip.id)}
                            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[11px] font-bold text-[#0F172A] inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3 text-[#00C48C]" />
                            <span>Slip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. ONBOARD / EDIT EMPLOYEE MODAL */}
      {employeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                {editingEmployee
                  ? `Edit Staff Profile — ${editingEmployee.fullName}`
                  : 'Onboard New Hotel Staff Member'}
              </h3>
              <button onClick={() => setEmployeeModalOpen(false)}>
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={empForm.employeeCode}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, employeeCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={empForm.firstName}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={empForm.lastName}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Department *</label>
                  <select
                    required
                    value={empForm.departmentId}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Designation *</label>
                  <select
                    required
                    value={empForm.designationId}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, designationId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <option value="">Select Designation</option>
                    {designations.map((des) => (
                      <option key={des.id} value={des.id}>
                        {des.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Employment Type
                  </label>
                  <select
                    value={empForm.employmentType}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, employmentType: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="CASUAL">Casual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Basic Monthly Salary (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={empForm.basicSalary}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, basicSalary: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    NIC Number (Encrypted)
                  </label>
                  <input
                    type="text"
                    value={empForm.nicNumber}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, nicNumber: e.target.value })
                    }
                    placeholder="199512345678"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Join Date</label>
                  <input
                    type="date"
                    value={empForm.joinDate}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, joinDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={empForm.employeeStatus}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, employeeStatus: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F1F5F9]">
                <div>
                  <label className="block font-bold mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={empForm.bankName}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, bankName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Bank Branch</label>
                  <input
                    type="text"
                    value={empForm.bankBranch}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, bankBranch: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Bank Account # (Encrypted)
                  </label>
                  <input
                    type="text"
                    value={empForm.bankAccountNumber}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        bankAccountNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={empForm.payrollEligible}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        payrollEligible: e.target.checked,
                      })
                    }
                    className="accent-[#00C48C]"
                  />
                  <span>Payroll &amp; EPF/ETF Eligible</span>
                </label>
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={empForm.serviceChargeEligible}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        serviceChargeEligible: e.target.checked,
                      })
                    }
                    className="accent-[#00C48C]"
                  />
                  <span>10% Service Charge Pool Eligible</span>
                </label>
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={empForm.overtimeEligible}
                    onChange={(e) =>
                      setEmpForm({
                        ...empForm,
                        overtimeEligible: e.target.checked,
                      })
                    }
                    className="accent-[#00C48C]"
                  />
                  <span>Overtime (1.5x) Eligible</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white font-bold"
                >
                  {editingEmployee ? 'Save Changes' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW EMPLOYEE PROFILE & DOCUMENTS MODAL */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="font-mono text-[11px] font-bold text-[#00C48C]">
                  {viewingEmployee.employeeCode}
                </span>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  {viewingEmployee.fullName}
                </h3>
                <p className="text-[#64748B]">
                  {viewingEmployee.designation?.name} ·{' '}
                  {viewingEmployee.department?.name}
                </p>
              </div>
              <button onClick={() => setViewingEmployee(null)}>
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">Decrypted NIC</div>
                <div className="font-mono font-bold text-[#0F172A]">
                  {viewingEmployee.nicNumber || 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Bank Account</div>
                <div className="font-mono font-bold text-[#0F172A]">
                  {viewingEmployee.bankName} —{' '}
                  {viewingEmployee.bankAccountNumber || 'Cash'}
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Basic Salary</div>
                <div className="font-bold text-[#0F172A]">
                  LKR {Number(viewingEmployee.basicSalary).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Leave Balances */}
            <div>
              <h4 className="font-bold text-[#0F172A] mb-2">
                Leave Balances ({new Date().getFullYear()})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(viewingEmployee.leaveBalances || []).map((lb: any) => (
                  <div
                    key={lb.id}
                    className="p-2.5 rounded-xl border border-[#E2E8F0]"
                  >
                    <div className="font-bold text-[#0F172A]">
                      {lb.leaveType?.name}
                    </div>
                    <div className="text-[11px] text-[#00C48C] font-bold">
                      {lb.availableDays} available
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Used: {lb.usedDays} / Alloc: {lb.allocatedDays}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Documents */}
            <div className="border-t border-[#E2E8F0] pt-3">
              <h4 className="font-bold text-[#0F172A] mb-2">
                Employee Documents ({(viewingEmployee.documents || []).length})
              </h4>
              <div className="space-y-1.5 mb-3">
                {(viewingEmployee.documents || []).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <div>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] font-bold text-[10px] mr-2">
                        {doc.documentType}
                      </span>
                      <span className="font-semibold text-[#0F172A]">
                        {doc.title}
                      </span>
                      <span className="text-[#64748B] ml-2">
                        ({doc.fileName})
                      </span>
                    </div>
                    {doc.expiryDate && (
                      <span className="text-[10.5px] text-[#64748B]">
                        Exp: {doc.expiryDate}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddDocument}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2"
              >
                <select
                  value={docForm.documentType}
                  onChange={(e) =>
                    setDocForm({ ...docForm, documentType: e.target.value })
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  <option value="NIC">NIC Copy</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="CONTRACT">Employment Contract</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Document Title"
                  value={docForm.title}
                  onChange={(e) =>
                    setDocForm({ ...docForm, title: e.target.value })
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
                <input
                  type="text"
                  required
                  placeholder="File Name (e.g. nic-scan.pdf)"
                  value={docForm.fileName}
                  onChange={(e) =>
                    setDocForm({ ...docForm, fileName: e.target.value })
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Attach Record
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADD DEPARTMENT MODAL */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Create Hotel Department
              </h3>
              <button onClick={() => setDeptModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="SPA"
                  value={deptForm.code}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="Spa & Wellness"
                  value={deptForm.name}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={deptForm.description}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD DESIGNATION MODAL */}
      {desigModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Create Job Designation
              </h3>
              <button onClick={() => setDesigModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDesignation} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Department</label>
                <select
                  required
                  value={desigForm.departmentId}
                  onChange={(e) =>
                    setDesigForm({ ...desigForm, departmentId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Designation Code</label>
                <input
                  type="text"
                  required
                  placeholder="CONC"
                  value={desigForm.code}
                  onChange={(e) =>
                    setDesigForm({ ...desigForm, code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Designation Title</label>
                <input
                  type="text"
                  required
                  placeholder="Head Concierge"
                  value={desigForm.name}
                  onChange={(e) =>
                    setDesigForm({ ...desigForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDesigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Create Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE SHIFT TEMPLATE MODAL */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Create Shift Template
              </h3>
              <button onClick={() => setShiftModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="Banquet Late Shift"
                  value={shiftForm.name}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Save Shift Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ASSIGN ROSTER MODAL */}
      {rosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Assign Staff Duty Shift
              </h3>
              <button onClick={() => setRosterModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRoster} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Employee</label>
                <select
                  required
                  value={rosterForm.employeeId}
                  onChange={(e) =>
                    setRosterForm({ ...rosterForm, employeeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shift Template</label>
                <select
                  required
                  value={rosterForm.shiftTemplateId}
                  onChange={(e) =>
                    setRosterForm({
                      ...rosterForm,
                      shiftTemplateId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Duty Date</label>
                <input
                  type="date"
                  required
                  value={rosterForm.dutyDate}
                  onChange={(e) =>
                    setRosterForm({ ...rosterForm, dutyDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRosterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. RECORD ATTENDANCE MODAL */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Log Daily Attendance / Timesheet
              </h3>
              <button onClick={() => setAttendanceModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordAttendance} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Employee</label>
                <select
                  required
                  value={attForm.employeeId}
                  onChange={(e) =>
                    setAttForm({ ...attForm, employeeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Attendance Date</label>
                <input
                  type="date"
                  required
                  value={attForm.attendanceDate}
                  onChange={(e) =>
                    setAttForm({ ...attForm, attendanceDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Check-In</label>
                  <input
                    type="datetime-local"
                    value={attForm.checkIn}
                    onChange={(e) =>
                      setAttForm({ ...attForm, checkIn: e.target.value })
                    }
                    className="w-full px-2.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Check-Out</label>
                  <input
                    type="datetime-local"
                    value={attForm.checkOut}
                    onChange={(e) =>
                      setAttForm({ ...attForm, checkOut: e.target.value })
                    }
                    className="w-full px-2.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. REGULARIZE ATTENDANCE MODAL */}
      {regularizeModalItem && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Regularize Attendance —{' '}
                {regularizeModalItem.employee?.fullName}
              </h3>
              <button onClick={() => setRegularizeModalItem(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegularizeAttendance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Worked Minutes
                  </label>
                  <input
                    type="number"
                    value={regForm.workedMinutes}
                    onChange={(e) =>
                      setRegForm({
                        ...regForm,
                        workedMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Overtime Minutes
                  </label>
                  <input
                    type="number"
                    value={regForm.overtimeMinutes}
                    onChange={(e) =>
                      setRegForm({
                        ...regForm,
                        overtimeMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">
                  Audit Reason for Regularization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Forgot biometric punch at end of banquet shift"
                  value={regForm.reason}
                  onChange={(e) =>
                    setRegForm({ ...regForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegularizeModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Confirm Regularization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. SUBMIT LEAVE REQUEST MODAL */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Submit Leave Request
              </h3>
              <button onClick={() => setLeaveModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLeaveRequest} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Employee</label>
                <select
                  required
                  value={leaveForm.employeeId}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, employeeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Leave Type</label>
                <select
                  required
                  value={leaveForm.leaveTypeId}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={leaveForm.isHalfDay}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, isHalfDay: e.target.checked })
                  }
                  className="accent-[#00C48C]"
                />
                <span>Half-Day Leave (0.5 day)</span>
              </label>
              <div>
                <label className="block font-bold mb-1">Reason</label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. REQUEST SALARY ADVANCE MODAL */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Request Staff Salary Advance
              </h3>
              <button onClick={() => setAdvanceModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAdvance} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Employee</label>
                <select
                  required
                  value={advanceForm.employeeId}
                  onChange={(e) =>
                    setAdvanceForm({
                      ...advanceForm,
                      employeeId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Advance Amount (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    value={advanceForm.requestedAmount}
                    onChange={(e) =>
                      setAdvanceForm({
                        ...advanceForm,
                        requestedAmount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Monthly Deduction (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    value={advanceForm.repaymentAmount}
                    onChange={(e) =>
                      setAdvanceForm({
                        ...advanceForm,
                        repaymentAmount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Reason</label>
                <input
                  type="text"
                  value={advanceForm.reason}
                  onChange={(e) =>
                    setAdvanceForm({ ...advanceForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Submit Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. PAYROLL STATUTORY SETTINGS MODAL */}
      {payrollSettingsModalOpen && payrollSettings && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                Statutory EPF / ETF &amp; Service Charge Configuration
              </h3>
              <button onClick={() => setPayrollSettingsModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePayrollSettings} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Employee EPF (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={payrollSettings.employeeEpfPercentage}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        employeeEpfPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Employer EPF (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={payrollSettings.employerEpfPercentage}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        employerEpfPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Employer ETF (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={payrollSettings.employerEtfPercentage}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        employerEtfPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Service Charge Pool (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={payrollSettings.serviceChargePoolPercentage}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        serviceChargePoolPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    SC Distribution Method
                  </label>
                  <select
                    value={payrollSettings.serviceChargeDistributionMethod}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        serviceChargeDistributionMethod: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <option value="EQUAL">Equal Share Across Eligible</option>
                    <option value="WEIGHTED">Weighted by Basic Salary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">
                    Working Days / Month
                  </label>
                  <input
                    type="number"
                    value={payrollSettings.standardWorkingDaysPerMonth}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        standardWorkingDaysPerMonth: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Overtime Multiplier (x)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={payrollSettings.overtimeMultiplier}
                    onChange={(e) =>
                      setPayrollSettings({
                        ...payrollSettings,
                        overtimeMultiplier: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayrollSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00C48C] text-white font-bold"
                >
                  Save Statutory Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. PRINTABLE PAYSLIP MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl text-xs space-y-4 printable-statement">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#00C48C]">
                  ninth.hotel Hospitality Payroll Statement
                </div>
                <h3 className="text-base font-black text-[#0F172A]">
                  Employee Payslip — {selectedPayslip.payslipNumber}
                </h3>
                <div className="text-[11px] text-[#64748B]">
                  Period: {MONTHS[(selectedPayslip.payPeriodMonth || 1) - 1]}{' '}
                  {selectedPayslip.payPeriodYear}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#00C48C] text-white font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setSelectedPayslip(null)}>
                  <X className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">Employee</div>
                <div className="font-bold text-[#0F172A]">
                  {selectedPayslip.employee?.fullName} (
                  {selectedPayslip.employee?.employeeCode})
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {selectedPayslip.employee?.designation?.name} ·{' '}
                  {selectedPayslip.employee?.department?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#64748B]">Attendance &amp; Payment</div>
                <div className="font-bold text-[#0F172A]">
                  Present: {selectedPayslip.presentDays} /{' '}
                  {selectedPayslip.workingDays} days
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Method: {selectedPayslip.paymentMethod}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-[#0F172A] uppercase text-[10.5px] border-b border-[#E2E8F0] pb-1">
                Itemized Earnings &amp; Deductions
              </div>
              {(selectedPayslip.items || []).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1 border-b border-[#F8FAFC]"
                >
                  <span className="font-medium text-[#334155]">
                    {item.label}
                    {item.isEmployerContribution && (
                      <span className="ml-1.5 text-[10px] text-sky-700 font-bold">
                        (Employer Statutory)
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      item.isDeduction
                        ? 'text-red-600'
                        : item.isEmployerContribution
                          ? 'text-sky-700'
                          : 'text-[#0F172A]'
                    }`}
                  >
                    {item.isDeduction ? '-' : ''}LKR{' '}
                    {Number(item.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-bold uppercase text-[#065F46]">
                  Net Take-Home Salary
                </div>
                <div className="text-[11px] text-[#047857]">
                  Gross LKR {Number(selectedPayslip.grossPay).toLocaleString()}{' '}
                  less Deductions LKR{' '}
                  {Number(selectedPayslip.totalDeductions).toLocaleString()}
                </div>
              </div>
              <div className="text-lg font-black text-[#065F46] font-mono">
                LKR {Number(selectedPayslip.netPay).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

