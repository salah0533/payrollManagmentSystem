import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Employee } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
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
import { formatLabel } from "@/lib/format";

interface EmployeeTableProps {
  employees: Employee[];
  onDeactivate?: (id: string) => void;
}

export function EmployeeTable({ employees, onDeactivate }: EmployeeTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
              <AlertDialogTitle>{t("employeesPage.deleteEmployee")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("employeesPage.deleteEmployeeDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogCancel className="mt-0">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("employeesPage.deleteEmployee")}
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
              <th>{t("common.employee")}</th>
              <th className="hidden lg:table-cell">{t("employeesPage.position")}</th>
              <th className="hidden md:table-cell">{t("common.phone")}</th>
              <th>{t("common.status")}</th>
              <th className="hidden lg:table-cell">{t("employeesPage.salaryType")}</th>
              <th className="w-[120px] overflow-hidden">{t("common.actions")}</th>
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
                <td className="hidden lg:table-cell">{formatLabel(employee.salaryType)}</td>
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
            <AlertDialogTitle>{t("employeesPage.deleteEmployee")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("employeesPage.deleteEmployeeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("employeesPage.deleteEmployee")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
