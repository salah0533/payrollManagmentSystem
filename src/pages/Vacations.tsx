import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, Calendar, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddVacationDrawer } from '@/components/vacations/AddVacationDrawer';
import { toast } from '@/hooks/use-toast';

type EmployeeRow = {
  id: number;
  fullname: string;
  job_title: string;
};

type VacationTypeRow = {
  id: number;
  vacation_type: string;
};

type VacationStatusRow = {
  id: number;
  vacation_status: string;
};

type VacationRow = {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  vacation_type: number | string;
  vacation_status: number | string;
  reason?: string;
};

type VacationViewRow = {
  id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getDaysInclusive = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

const Vacations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [vacationTypes, setVacationTypes] = useState<VacationTypeRow[]>([]);
  const [vacationStatuses, setVacationStatuses] = useState<VacationStatusRow[]>([]);
  const [vacationRows, setVacationRows] = useState<VacationRow[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVacations, setLoadingVacations] = useState(false);
  const isMobile = useIsMobile();

  const vacationTypeMap = useMemo(
    () =>
      vacationTypes.reduce((acc: Record<number, string>, item) => {
        acc[item.id] = normalize(item.vacation_type);
        return acc;
      }, {}),
    [vacationTypes]
  );

  const vacationStatusMap = useMemo(
    () =>
      vacationStatuses.reduce((acc: Record<number, string>, item) => {
        acc[item.id] = normalize(item.vacation_status);
        return acc;
      }, {}),
    [vacationStatuses]
  );

  const selectedEmployee = useMemo(() => {
    const employee = employees.find((item) => String(item.id) === String(selectedEmployeeId));
    if (!employee) return undefined;

    return {
      id: String(employee.id),
      fullName: employee.fullname,
      jobTitle: employee.job_title,
    };
  }, [employees, selectedEmployeeId]);

  const vacationViewRows = useMemo<VacationViewRow[]>(() => {
    return vacationRows.map((vacation) => {
      const employee = employees.find((item) => Number(item.id) === Number(vacation.employee_id));
      const type = vacationTypeMap[Number(vacation.vacation_type)] ?? String(vacation.vacation_type);
      const status = vacationStatusMap[Number(vacation.vacation_status)] ?? String(vacation.vacation_status);
      const startDate = String(vacation.start_date).split('T')[0];
      const endDate = String(vacation.end_date).split('T')[0];

      return {
        id: String(vacation.id),
        employeeName: employee?.fullname ?? `Employee #${vacation.employee_id}`,
        employeeId: String(vacation.employee_id),
        type,
        status,
        startDate,
        endDate,
        days: getDaysInclusive(startDate, endDate),
        reason: vacation.reason ?? '-',
      };
    });
  }, [vacationRows, employees, vacationTypeMap, vacationStatusMap]);

  const filteredVacations = useMemo(() => {
    return vacationViewRows.filter((vacation) => {
      const matchesSearch = vacation.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || vacation.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || vacation.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vacationViewRows, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => ({
    pending: vacationViewRows.filter((v) => v.status === 'pending').length,
    approved: vacationViewRows.filter((v) => v.status === 'approved').length,
    rejected: vacationViewRows.filter((v) => v.status === 'rejected').length,
    totalDays: vacationViewRows.filter((v) => v.status === 'approved').reduce((sum, v) => sum + v.days, 0),
  }), [vacationViewRows]);

  useEffect(() => {
    const fetchLookups = async () => {
      setLoadingLookup(true);
      try {
        const [employeesRes, typesRes, statusesRes] = await Promise.all([
          fetch('http://localhost:8000/employee'),
          fetch('http://localhost:8000/vacation_types/'),
          fetch('http://localhost:8000/vacation_status/'),
        ]);

        const employeesJson = await employeesRes.json();
        const typesJson = await typesRes.json();
        const statusesJson = await statusesRes.json();

        const mappedEmployees: EmployeeRow[] = (employeesJson?.data || []).map((item: any) => item.Employees);
        const mappedTypes: VacationTypeRow[] = typesJson?.data || [];
        const mappedStatuses: VacationStatusRow[] = statusesJson?.data || [];

        setEmployees(mappedEmployees);
        setVacationTypes(mappedTypes);
        setVacationStatuses(mappedStatuses);

        if (!selectedEmployeeId && mappedEmployees.length > 0) {
          setSelectedEmployeeId(String(mappedEmployees[0].id));
        }
      } catch {
        setEmployees([]);
        setVacationTypes([]);
        setVacationStatuses([]);
        toast({
          title: 'Error',
          description: 'Failed to load employees and vacation lookups.',
          variant: 'destructive',
        });
      } finally {
        setLoadingLookup(false);
      }
    };

    fetchLookups();
  }, []);

  const loadVacations = async (targetYear: string) => {
    if (!targetYear) {
      setVacationRows([]);
      return;
    }

    setLoadingVacations(true);
    try {
      const response = await fetch(`http://localhost:8000/vacation/${targetYear}`);
      if (!response.ok) {
        throw new Error('Failed to load vacations');
      }

      const json = await response.json();
      setVacationRows((json?.data || []) as VacationRow[]);
    } catch {
      setVacationRows([]);
      toast({
        title: 'Error',
        description: 'Failed to load vacation records.',
        variant: 'destructive',
      });
    } finally {
      setLoadingVacations(false);
    }
  };

  useEffect(() => {
    loadVacations(year);
  }, [year]);

  const handleAddVacation = () => {
    setDrawerOpen(true);
  };

  const drawerEmployees = useMemo(
    () =>
      employees.map((employee) => ({
        id: String(employee.id),
        fullName: employee.fullname,
        jobTitle: employee.job_title,
      })),
    [employees]
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title text-xl md:text-2xl">Vacations</h1>
          <p className="page-description text-sm md:text-base">Manage employee vacation requests and time off.</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={handleAddVacation}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vacation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
              <p className="text-lg md:text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <Palmtree className="h-5 w-5 md:h-6 md:w-6 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Approved</p>
              <p className="text-lg md:text-2xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Rejected</p>
              <p className="text-lg md:text-2xl font-bold">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Total Days</p>
              <p className="text-lg md:text-2xl font-bold">{stats.totalDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="space-y-2 sm:max-w-[240px]">
          <Label htmlFor="yearFilter">Year</Label>
          <Input
            id="yearFilter"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min="2000"
            max="2100"
          />
        </div>
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 min-w-[120px] sm:w-36 sm:flex-none">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {vacationTypes.map((type) => {
                const normalizedType = normalize(type.vacation_type);
                return (
                  <SelectItem key={type.id} value={normalizedType}>
                    {formatLabel(type.vacation_type)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 min-w-[120px] sm:w-36 sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {vacationStatuses.map((status) => {
                const normalizedStatus = normalize(status.vacation_status);
                return (
                  <SelectItem key={status.id} value={normalizedStatus}>
                    {formatLabel(status.vacation_status)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile: Card View / Desktop: Table */}
      {loadingLookup || loadingVacations ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading vacations...
        </div>
      ) : isMobile ? (
        <div className="grid gap-3">
          {filteredVacations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No vacation records found
            </div>
          ) : filteredVacations.map((vacation) => (
            <div key={vacation.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{vacation.employeeName}</p>
                <StatusBadge status={vacation.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{formatLabel(vacation.type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-medium">{vacation.days}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start</p>
                  <p className="font-medium">{vacation.startDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End</p>
                  <p className="font-medium">{vacation.endDate}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground truncate">{vacation.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="data-table w-full table-fixed">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th className="hidden lg:table-cell">Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">No vacation records found</td>
                </tr>
              ) : filteredVacations.map((vacation) => (
                <tr key={vacation.id}>
                  <td className="font-medium">{vacation.employeeName}</td>
                  <td>{formatLabel(vacation.type)}</td>
                  <td>{vacation.startDate}</td>
                  <td>{vacation.endDate}</td>
                  <td>{vacation.days}</td>
                  <td className="text-muted-foreground max-w-xs truncate hidden lg:table-cell">{vacation.reason}</td>
                  <td>
                    <StatusBadge status={vacation.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Vacation Drawer */}
      <AddVacationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employee={selectedEmployee}
        employees={drawerEmployees}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={setSelectedEmployeeId}
        onSuccess={() => loadVacations(year)}
      />
    </div>
  );
};

export default Vacations;
