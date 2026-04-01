import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Search, Filter, Download, DollarSign, Calendar } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { toast } from '@/hooks/use-toast';

type EmployeeRow = {
  id: number;
  fullname: string;
  job_title: string;
  dues?: number;
};

type PaymentTypeRow = {
  id: number;
  payment_type: string;
};

type PaymentRow = {
  id: number;
  employee_id: number;
  date: string;
  amount: number;
  description: string;
  payment_type: number | string;
  status?: string;
};

type PaymentViewRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeJobTitle: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  status: string;
};

const normalizePaymentType = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

const normalizePaymentStatus = (value: string | undefined) => {
  const normalized = String(value ?? 'paid').trim().toLowerCase();
  if (normalized === 'done') return 'paid';
  return normalized;
};

const Payments = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeRow[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const isMobile = useIsMobile();

  const paymentTypeMap = useMemo(
    () =>
      paymentTypes.reduce((acc: Record<number, string>, type) => {
        acc[type.id] = normalizePaymentType(type.payment_type);
        return acc;
      }, {}),
    [paymentTypes]
  );

  const selectedEmployee = useMemo(() => {
    const match = employees.find((employee) => String(employee.id) === String(selectedEmployeeId));
    if (!match) return undefined;

    return {
      id: String(match.id),
      fullName: match.fullname,
      jobTitle: match.job_title,
      dues: match.dues,
    };
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    const fetchLookups = async () => {
      setLoadingLookup(true);
      try {
        const [employeesResponse, paymentTypesResponse] = await Promise.all([
          fetch('http://localhost:8000/employee'),
          fetch('http://localhost:8000/payment_types/'),
        ]);

        const employeesJson = await employeesResponse.json();
        const paymentTypesJson = await paymentTypesResponse.json();

        const mappedEmployees: EmployeeRow[] = (employeesJson?.data || []).map((item: any) => item.Employees);
        const mappedPaymentTypes: PaymentTypeRow[] = paymentTypesJson?.data || [];

        setEmployees(mappedEmployees);
        setPaymentTypes(mappedPaymentTypes);

        if (!selectedEmployeeId && mappedEmployees.length > 0) {
          setSelectedEmployeeId(String(mappedEmployees[0].id));
        }
      } catch {
        setEmployees([]);
        setPaymentTypes([]);
        toast({
          title: 'Error',
          description: 'Failed to load employees or payment types.',
          variant: 'destructive',
        });
      } finally {
        setLoadingLookup(false);
      }
    };

    fetchLookups();
  }, []);

  const loadPayments = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setPaymentRows([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/payment/get_all_payment/${startDate}/${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to load payments');
      }

      const json = await response.json();
      setPaymentRows((json?.data || []) as PaymentRow[]);
    } catch {
      setPaymentRows([]);
      toast({
        title: 'Error',
        description: 'Failed to load payment records.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [startDate, endDate]);

  const paymentViewRows = useMemo<PaymentViewRow[]>(() => {
    return paymentRows.map((payment) => {
      const employee = employees.find((item) => Number(item.id) === Number(payment.employee_id));
      const typeLabel = paymentTypeMap[Number(payment.payment_type)] ?? String(payment.payment_type);

      return {
        id: String(payment.id),
        employeeId: String(payment.employee_id),
        employeeName: employee?.fullname ?? `Employee #${payment.employee_id}`,
        employeeJobTitle: employee?.job_title ?? '-',
        date: String(payment.date).split('T')[0],
        amount: Number(payment.amount ?? 0),
        type: typeLabel,
        description: payment.description ?? '',
        status: normalizePaymentStatus(payment.status),
      };
    });
  }, [paymentRows, employees, paymentTypeMap]);

  const filteredPayments = useMemo(() => {
    return paymentViewRows.filter((payment) => {
      const matchesSearch = payment.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [paymentViewRows, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const rangePayments = paymentViewRows;
    return {
      totalSalaries: rangePayments.filter((p) => p.type === 'salary').reduce((sum, p) => sum + p.amount, 0),
      totalBonuses: rangePayments.filter((p) => p.type === 'bonus').reduce((sum, p) => sum + p.amount, 0),
      totalDeductions: rangePayments.filter((p) => p.type === 'deduction').reduce((sum, p) => sum + Math.abs(p.amount), 0),
      pendingAmount: rangePayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    };
  }, [paymentViewRows]);

  const handleAddPayment = () => {
    setModalOpen(true);
  };

  const drawerEmployees = useMemo(
    () =>
      employees.map((employee) => ({
        id: String(employee.id),
        fullName: employee.fullname,
        jobTitle: employee.job_title,
        dues: employee.dues,
      })),
    [employees]
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="page-title text-xl md:text-2xl">Payments</h1>
          <p className="page-description text-sm md:text-base">Manage payroll, bonuses, and deductions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={handleAddPayment}>
            <Plus className="mr-2 h-4 w-4" />
            Add<span className="hidden sm:inline"> Payment</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Salaries</p>
              <p className="text-lg md:text-2xl font-bold truncate">{stats.totalSalaries.toLocaleString()} DA</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Bonuses</p>
              <p className="text-lg md:text-2xl font-bold truncate">{stats.totalBonuses.toLocaleString()} DA</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Deductions</p>
              <p className="text-lg md:text-2xl font-bold truncate">{stats.totalDeductions.toLocaleString()} DA</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
              <p className="text-lg md:text-2xl font-bold truncate">{stats.pendingAmount.toLocaleString()} DA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        {startDate && endDate && startDate > endDate && (
          <p className="text-sm text-destructive">Start date must be before end date.</p>
        )}
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
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
              <SelectItem value="deduction">Deduction</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 min-w-[120px] sm:w-36 sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || loadingLookup ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading payments...
        </div>
      ) : isMobile ? (
        <div className="grid gap-3">
          {filteredPayments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No payment records found
            </div>
          ) : filteredPayments.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{payment.employeeName}</p>
                <StatusBadge status={payment.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{payment.type}</span>
                <span className={cn(
                  'text-lg font-bold',
                  payment.type === 'deduction' ? 'text-destructive' : 'text-success'
                )}>
                  {payment.type === 'deduction' ? '-' : '+'}{Math.abs(payment.amount).toLocaleString()} DA
                </span>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">{payment.date}</p>
                <p className="text-muted-foreground truncate">{payment.description}</p>
              </div>
              <p className="text-xs text-muted-foreground">{payment.employeeJobTitle}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="data-table w-full table-fixed">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Type</th>
                <th className="hidden lg:table-cell">Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">No payment records found</td>
                </tr>
              ) : filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-medium">{payment.employeeName}</td>
                  <td>{payment.date}</td>
                  <td className={cn(
                    'font-semibold',
                    payment.type === 'deduction' ? 'text-destructive' : 'text-success'
                  )}>
                    {payment.type === 'deduction' ? '-' : '+'}{Math.abs(payment.amount).toLocaleString()} DA
                  </td>
                  <td className="capitalize">{payment.type}</td>
                  <td className="text-muted-foreground hidden lg:table-cell">{payment.description}</td>
                  <td>
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      <AddPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        employee={selectedEmployee}
        employees={drawerEmployees}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={setSelectedEmployeeId}
        onSuccess={loadPayments}
      />
    </div>
  );
};

export default Payments;
