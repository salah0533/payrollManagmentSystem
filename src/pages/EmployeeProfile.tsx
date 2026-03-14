import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CreditCard, Palmtree, Settings, Mail, Phone, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmployeeAttendanceTab } from '@/components/employee-profile/AttendanceTab';
import { EmployeePaymentsTab } from '@/components/employee-profile/PaymentsTab';
import { EmployeeVacationsTab } from '@/components/employee-profile/VacationsTab';
import { EmployeeSettingsTab } from '@/components/employee-profile/SettingsTab';
import { AddAttendanceDrawer } from '@/components/attendance/AddAttendanceDrawer';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { AddVacationDrawer } from '@/components/vacations/AddVacationDrawer';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);

  const [attendanceDrawerOpen, setAttendanceDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [vacationDrawerOpen, setVacationDrawerOpen] = useState(false);
  
  const [employee, setEmployee] = useState<any>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeePayments, setEmployeePayments] = useState<any[]>([]);
  const [employeeVacations, setEmployeeVacations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          empRes,
          attRes,
          attTypesRes,
          payRes,
          payTypesRes,
          vacRes,
          vacStatusRes,
          vacTypesRes,
        ] = await Promise.all([
          fetch('http://localhost:8000/employee'),
          fetch(`http://localhost:8000/attendance/emp/${id}/${startDate}/${endDate}`),
          fetch('http://localhost:8000/att_types/'),
          fetch(`http://localhost:8000/payment/${id}/${startDate}/${endDate}`),
          fetch('http://localhost:8000/payment_types/'),
          fetch(`http://localhost:8000/vacation/${id}/${startDate}/${endDate}`),
          fetch('http://localhost:8000/vacation_status/'),
          fetch('http://localhost:8000/vacation_types/'),
        ]);

        const [empJson, attJson, attTypesJson, payJson, payTypesJson, vacJson, vacStatusJson, vacTypesJson] =
          await Promise.all([
            empRes.json(),
            attRes.json(),
            attTypesRes.json(),
            payRes.json(),
            payTypesRes.json(),
            vacRes.json(),
            vacStatusRes.json(),
            vacTypesRes.json(),
          ]);

        const attTypeMap: Record<number, string> = (attTypesJson?.data || []).reduce((acc: any, t: any) => {
          acc[t.id] = t.attendence_type;
          return acc;
        }, {});
        const paymentTypeMap: Record<number, string> = (payTypesJson?.data || []).reduce((acc: any, t: any) => {
          acc[t.id] = t.payment_type ?? String(t.id);
          return acc;
        }, {});
        const vacationStatusMap: Record<number, string> = (vacStatusJson?.data || []).reduce((acc: any, t: any) => {
          acc[t.id] = t.vacation_status ?? String(t.id);
          return acc;
        }, {});
        const vacationTypeMap: Record<number, string> = (vacTypesJson?.data || []).reduce((acc: any, t: any) => {
          acc[t.id] = t.vacation_type ?? String(t.id);
          return acc;
        }, {});

        const rawEmp = (empJson?.data || [])
          .map((x: any) => x.Employees)
          .find((e: any) => String(e.id) === String(id));

        setEmployee(
          rawEmp
            ? {
                id: String(rawEmp.id),
                fullName: rawEmp.fullname,
                email: rawEmp.email,
                phone: rawEmp.phone,
                jobTitle: rawEmp.job_title,
                department: '-',
                role: 'employee',
                status: rawEmp.is_active ? 'active' : 'inactive',
                dues: rawEmp.dues,
                dailyWorkHours: rawEmp.daily_work_hours ?? rawEmp.daly_work_hours ?? 0,
                extraHoursPrice: rawEmp.extra_hours_price,
                hourPrice: rawEmp.hour_price,
                dayPrice: rawEmp.day_price,
                monthPrice: rawEmp.monthly_price ?? rawEmp.month_price ?? 0,
                vacationDays: rawEmp.vacation_days,
                salaryType: rawEmp.salary_type,
                isActive: rawEmp.is_active,
                allowedLate: rawEmp.allowed_late,
                minExtraTime: rawEmp.min_extraTime,
              }
            : null
        );

        setEmployeeAttendance(
          (attJson?.data || []).map((r: any) => {
            // r.attendence_type is an id, map it to the string label from attTypeMap
            const attTypeLabel = attTypeMap[r.attendence_type] ?? String(r.attendence_type);
            return {
              id: String(r.id),
              employeeId: String(r.employee_id),
              date: r.date,
              entry_time: r.entry_time,
              exit_time: r.exit_time,
              attendence_type: attTypeLabel,
            };
          })
        );

        setEmployeePayments(
          (payJson?.data || []).map((p: any) => ({
            id: String(p.id),
            employeeId: String(p.employee_id),
            date: String(p.date).split('T')[0],
            amount: p.amount,
            description: p.description,
            payment_type: paymentTypeMap[p.payment_type] ?? String(p.payment_type),
            start: p.start,
            end: p.end,
          }))
        );

        setEmployeeVacations(
          (vacJson?.data || []).map((v: any) => ({
            id: String(v.id),
            employeeId: String(v.employee_id),
            start_date: v.start_date,
            end_date: v.end_date,
            is_paid: v.is_paid,
            vacation_type: vacationTypeMap[v.vacation_type] ?? String(v.vacation_type),
            vacation_status: vacationStatusMap[v.vacation_status] ?? String(v.vacation_status),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, startDate, endDate]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading employee...</div>;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Employee not found</h2>
        <Button variant="link" onClick={() => navigate('/employees')}>
          Go back to employees
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/employees')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Button>

      {/* Profile Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{employee.fullName}</h1>
                <StatusBadge status={employee.status} />
              </div>
              <p className="text-muted-foreground">{employee.jobTitle}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {employee.department}
                </span>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">Role: </span>
                <span className="capitalize font-medium">{employee.role}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAttendanceDrawerOpen(true)}>
              <Clock className="mr-2 h-4 w-4" />
              Add Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVacationDrawerOpen(true)}>
              <Palmtree className="mr-2 h-4 w-4" />
              Add Vacation
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="vacations" className="gap-2">
            <Palmtree className="h-4 w-4" />
            <span className="hidden sm:inline">Vacations</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <EmployeeAttendanceTab records={employeeAttendance} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="payments">
          <EmployeePaymentsTab payments={employeePayments} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="vacations">
          <EmployeeVacationsTab vacations={employeeVacations} vacationDays={employee.vacationDays} startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="settings">
          <EmployeeSettingsTab
            employee={employee}
            onUpdated={(updatedEmployee) =>
              setEmployee((prev: any) => ({
                ...prev,
                ...updatedEmployee,
              }))
            }
          />
        </TabsContent>
      </Tabs>

      {/* Drawers & Modals */}
      <AddAttendanceDrawer
        open={attendanceDrawerOpen}
        onOpenChange={setAttendanceDrawerOpen}
        employee={employee}
      />
      <AddPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        employee={employee}
      />
      <AddVacationDrawer
        open={vacationDrawerOpen}
        onOpenChange={setVacationDrawerOpen}
        employee={employee}
      />
    </div>
  );
};

export default EmployeeProfile;
