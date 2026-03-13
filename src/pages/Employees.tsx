import { useState, useMemo, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
// import { employees as initialEmployees } from '@/data/mockData';

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [employeesResponse, salaryTypesResponse] = await Promise.all([
        fetch('http://localhost:8000/employee'),
        fetch('http://localhost:8000/salary_types'),
      ]);

      const employeesJson = await employeesResponse.json();
      const salaryTypesJson = await salaryTypesResponse.json();

      const salaryTypeMap: Record<number, string> = (salaryTypesJson?.data || []).reduce(
        (acc: Record<number, string>, item: any) => {
          acc[item.id] = item.salary_type;
          return acc;
        },
        {}
      );

      const mapped = (employeesJson?.data || []).map((item: any) => {
        const emp = item.Employees;
        const salaryTypeLabel = salaryTypeMap[emp.salary_type] ?? `type-${emp.salary_type}`;

        return {
          id: String(emp.id),
          fullName: emp.fullname,
          email: emp.email,
          phone: emp.phone,
          salaryType: salaryTypeLabel,
          jobTitle: `${emp.job_title} (${salaryTypeLabel})`, // show salary type in existing table column
          status: emp.is_active ? 'active' : 'inactive',
          hireDate: '',
          settings: {
            dailyWorkHours: emp.daily_work_hours,
            hourPrice: emp.hour_price,
            dayPrice: emp.day_price,
            monthPrice: emp.monthly_price ?? emp.month_price,
            extraHoursPrice: emp.extra_hours_price,
            autoAttendance: false,
          },
        };
      });

      setEmployees(mapped);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.includes(searchQuery) ||
        (emp.salaryType || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const handleDeactivate = (id: string) => {
    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, status: 'inactive' as const } : emp
    ));
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title text-xl md:text-2xl">Employees</h1>
          <p className="page-description text-sm md:text-base">Manage your team members and their information.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 min-w-[120px] sm:w-36 sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filteredEmployees.length}</strong> of{' '}
              <strong className="text-foreground">{employees.length}</strong> employees
            </span>
          </div>

          {/* Table */}
          <EmployeeTable employees={filteredEmployees} onDeactivate={handleDeactivate} />
        </>
      )}

      {/* Add Modal */}
      <AddEmployeeModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={() => fetchEmployees()}
      />
    </div>
  );
};

export default Employees;
