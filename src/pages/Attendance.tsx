import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Search, Filter, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddAttendanceDrawer } from '@/components/attendance/AddAttendanceDrawer';
import { toast } from '@/hooks/use-toast';

type EmployeeRow = {
  id: number;
  fullname: string;
  job_title: string;
  daily_work_hours?: number;
};

type AttendanceTypeRow = {
  id: number;
  attendence_type: string;
};

type AttendanceRow = {
  id: number;
  exit_time: string | null;
  attendence_type: number;
  employee_id: number;
  entry_time: string | null;
  date: string;
};

type AttendanceViewRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeJobTitle: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  workedHours: number;
  type: string;
  isAuto: boolean;
};

const normalizeAttendanceType = (value: string) => {
  const lowered = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (lowered === 'over_time') return 'overtime';
  return lowered;
};

const toTimeDisplay = (time: string | null) => {
  if (!time) return null;
  return String(time).slice(0, 5);
};

const getWorkedHours = (entryTime: string | null, exitTime: string | null) => {
  if (!entryTime || !exitTime) return 0;

  const [eH, eM] = entryTime.slice(0, 5).split(':').map(Number);
  const [xH, xM] = exitTime.slice(0, 5).split(':').map(Number);
  const diff = (xH * 60 + xM) - (eH * 60 + eM);

  if (diff <= 0) return 0;
  return Math.round((diff / 60) * 100) / 100;
};

const Attendance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [attTypeMap, setAttTypeMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [markingAllPresent, setMarkingAllPresent] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchEmployeesAndTypes = async () => {
      try {
        const [employeesRes, typesRes] = await Promise.all([
          fetch('http://localhost:8000/employee'),
          fetch('http://localhost:8000/att_types/'),
        ]);

        const employeesJson = await employeesRes.json();
        const typesJson = await typesRes.json();

        const employeeRows: EmployeeRow[] = (employeesJson?.data || []).map((row: any) => row.Employees);
        const typeRows: AttendanceTypeRow[] = typesJson?.data || [];

        setEmployees(employeeRows);
        if (!selectedEmployeeId && employeeRows.length > 0) {
          setSelectedEmployeeId(String(employeeRows[0].id));
        }

        const map = typeRows.reduce((acc: Record<number, string>, typeRow) => {
          acc[typeRow.id] = normalizeAttendanceType(typeRow.attendence_type);
          return acc;
        }, {});
        setAttTypeMap(map);
      } catch {
        setEmployees([]);
        setAttTypeMap({});
      }
    };

    fetchEmployeesAndTypes();
  }, []);

  const loadAttendanceForDate = async (date: string) => {
    if (!date) {
      setAttendanceRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/attendance/emps/${date}`);
      const json = await res.json();
      setAttendanceRows(json?.data || []);
    } catch {
      setAttendanceRows([]);
      toast({
        title: 'Error',
        description: 'Failed to load attendance records.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceForDate(dateFilter);
  }, [dateFilter]);

  const rowsForView = useMemo<AttendanceViewRow[]>(() => {
    return attendanceRows.map((row) => {
      const employee = employees.find((emp) => Number(emp.id) === Number(row.employee_id));
      const type = attTypeMap[row.attendence_type] ?? String(row.attendence_type);
      const entryTime = toTimeDisplay(row.entry_time);
      const exitTime = toTimeDisplay(row.exit_time);

      return {
        id: String(row.id),
        employeeId: String(row.employee_id),
        employeeName: employee?.fullname ?? `Employee #${row.employee_id}`,
        employeeJobTitle: employee?.job_title ?? '-',
        date: row.date,
        entryTime,
        exitTime,
        workedHours: getWorkedHours(entryTime, exitTime),
        type,
        isAuto: false,
      };
    });
  }, [attendanceRows, employees, attTypeMap]);

  const filteredRecords = useMemo(() => {
    return rowsForView.filter((record) => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || record.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [rowsForView, searchQuery, typeFilter]);

  const todayStats = useMemo(() => {
    return {
      present: filteredRecords.filter((r) => r.type === 'present').length,
      late: filteredRecords.filter((r) => r.type === 'late').length,
      absent: filteredRecords.filter((r) => r.type === 'absent').length,
      vacation: filteredRecords.filter((r) => r.type === 'vacation').length,
    };
  }, [filteredRecords]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return undefined;
    const emp = employees.find((item) => String(item.id) === String(selectedEmployeeId));
    if (!emp) return undefined;

    return {
      id: String(emp.id),
      fullName: emp.fullname,
      jobTitle: emp.job_title,
      dailyWorkHours: emp.daily_work_hours ?? 8,
    };
  }, [selectedEmployeeId, employees]);

  const drawerEmployees = useMemo(
    () =>
      employees.map((emp) => ({
        id: String(emp.id),
        fullName: emp.fullname,
        jobTitle: emp.job_title,
        dailyWorkHours: emp.daily_work_hours ?? 8,
      })),
    [employees]
  );

  const handleMarkAllPresent = async () => {
    setMarkingAllPresent(true);
    try {
      let response = await fetch('http://localhost:8000/attendance/mark_all_present', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateFilter }),
      });

      if (!response.ok && (response.status === 404 || response.status === 405)) {
        response = await fetch('http://localhost:8000/attendance/mark_all_present', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateFilter }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to mark all present');
      }

      const json = await response.json();
      const created = Number(json?.data?.created || 0);
      const updated = Number(json?.data?.updated || 0);

      toast({
        title: 'Attendance Updated',
        description: `Created ${created}, updated ${updated} records.`,
      });

      await loadAttendanceForDate(dateFilter);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark all employees as present.',
        variant: 'destructive',
      });
    } finally {
      setMarkingAllPresent(false);
    }
  };

  const handleAddAttendance = () => {
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="page-title text-xl md:text-2xl">Attendance</h1>
          <p className="page-description text-sm md:text-base">Track and manage employee attendance records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={handleMarkAllPresent}
            disabled={markingAllPresent || !dateFilter}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Mark All </span>{markingAllPresent ? 'Saving...' : 'Present'}
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={handleAddAttendance}>
            <Plus className="mr-2 h-4 w-4" />
            Add<span className="hidden sm:inline"> Attendance</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 md:p-4 flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <span className="text-base md:text-lg font-bold text-success">{todayStats.present}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Present</p>
            <p className="font-semibold text-sm md:text-base">{dateFilter}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 md:p-4 flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <span className="text-base md:text-lg font-bold text-warning">{todayStats.late}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Late</p>
            <p className="font-semibold text-sm md:text-base">{dateFilter}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 md:p-4 flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <span className="text-base md:text-lg font-bold text-destructive">{todayStats.absent}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Absent</p>
            <p className="font-semibold text-sm md:text-base">{dateFilter}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 md:p-4 flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-info/10 flex items-center justify-center shrink-0">
            <span className="text-base md:text-lg font-bold text-info">{todayStats.vacation}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">Vacation</p>
            <p className="font-semibold text-sm md:text-base">{dateFilter}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 min-w-[120px] sm:w-36 sm:flex-none">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="vacation">Vacation</SelectItem>
              <SelectItem value="overtime">Overtime</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading attendance records...
        </div>
      ) : isMobile ? (
        <div className="grid gap-3">
          {filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No attendance records found
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div key={record.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{record.employeeName}</p>
                  <StatusBadge status={record.type} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{record.date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hours</p>
                    <p className="font-medium">{record.workedHours > 0 ? `${record.workedHours}h` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-medium">{record.entryTime || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exit</p>
                    <p className="font-medium">{record.exitTime || '-'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{record.employeeJobTitle}</Badge>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="data-table w-full table-fixed">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th className="hidden lg:table-cell">Entry Time</th>
                <th className="hidden lg:table-cell">Exit Time</th>
                <th>Worked Hours</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">No attendance records found</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="font-medium">{record.employeeName}</td>
                    <td>{record.date}</td>
                    <td className="hidden lg:table-cell">{record.entryTime || '-'}</td>
                    <td className="hidden lg:table-cell">{record.exitTime || '-'}</td>
                    <td>{record.workedHours > 0 ? `${record.workedHours}h` : '-'}</td>
                    <td>
                      <StatusBadge status={record.type} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddAttendanceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employee={selectedEmployee}
        employees={drawerEmployees}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={setSelectedEmployeeId}
        onSuccess={() => loadAttendanceForDate(dateFilter)}
      />
    </div>
  );
};

export default Attendance;
