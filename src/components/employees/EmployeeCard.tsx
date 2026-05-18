import { useTranslation } from "react-i18next";
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatLabel } from "@/lib/format";

interface EmployeeCardProps {
  employee: Employee;
  onDeactivate?: (id: string) => void;
}

export function EmployeeCard({ employee, onDeactivate }: EmployeeCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(employee.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{employee.fullName}</p>
            <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              {t("profile.title")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </DropdownMenuItem>
            {employee.status === 'active' && onDeactivate && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeactivate(employee.id)}
              >
                <UserX className="mr-2 h-4 w-4" />
                {t("employeesPage.deleteEmployee")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">{t("users.roles")}</p>
          <p className="font-medium capitalize">{formatLabel(employee.role)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("common.status")}</p>
          <StatusBadge status={employee.status} />
        </div>
        <div>
          <p className="text-muted-foreground">{t("common.phone")}</p>
          <p className="font-medium">{employee.phone}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("employeesPage.salaryType")}</p>
          <p className="font-medium">{formatLabel(employee.salaryType)}</p>
        </div>
      </div>

      {/* Actions */}
      <Button 
        className="w-full" 
        variant="outline"
        onClick={() => navigate(`/employees/${employee.id}`)}
      >
        <Eye className="mr-2 h-4 w-4" />
        {t("profile.title")}
      </Button>
    </div>
  );
}
