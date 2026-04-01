import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, UserX, MoreHorizontal } from 'lucide-react';
import { Employee } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmployeeCard } from './EmployeeCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface EmployeeTableProps {
  employees: Employee[];
  onDeactivate?: (id: string) => void;
}

export function EmployeeTable({ employees, onDeactivate }: EmployeeTableProps) {
  const navigate = useNavigate();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleDeactivate = () => {
    if (deactivateId && onDeactivate) {
      onDeactivate(deactivateId);
    }
    setDeactivateId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatSalaryType = (type: string) => {
    const labels: Record<string, string> = {
      hour: 'Hourly',
      day: 'Daily',
      month: 'Monthly',
    };
    return labels[type] || type;
  };

  // Mobile: Card layout
  if (isMobile) {
    return (
      <>
        <div className="grid gap-4">
          {employees.map((employee) => (
            <EmployeeCard 
              key={employee.id} 
              employee={employee} 
              onDeactivate={(id) => setDeactivateId(id)} 
            />
          ))}
        </div>

        <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate this employee?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop/Tablet: Table layout
  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="data-table w-full table-fixed">
          <thead>
            <tr>
              <th>Employee</th>
              <th className="hidden lg:table-cell">Job Title</th>
              <th className="hidden md:table-cell">Phone</th>
              <th>Status</th>
              <th className="hidden lg:table-cell">Salary Type</th>
              <th className="w-[120px] overflow-hidden">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="animate-fade-in">
                <td className="w-[120px]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(employee.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{employee.fullName}</p>
                      <p className="text-sm text-muted-foreground lg:hidden">{employee.jobTitle}</p>
                    </div>
                  </div>      
                </td>
                <td className="hidden lg:table-cell">{employee.jobTitle}</td>
                <td className="hidden md:table-cell">{employee.phone}</td>
                <td>
                  <StatusBadge status={employee.status} />
                </td>
                <td className="hidden lg:table-cell">{formatSalaryType(employee.salaryType)}</td>
                <td>
                  <div className="flex items-center justify-start gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this employee? They will no longer appear in active employee lists and cannot log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
