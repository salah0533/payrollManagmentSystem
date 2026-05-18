import { UserPlus, Clock, CreditCard, Palmtree } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";

const actions = [
  { icon: UserPlus, labelKey: "quickActions.addEmployee", route: 'employees', color: 'text-info' },
  { icon: Clock, labelKey: "quickActions.addAttendance", route: 'attendance', color: 'text-success' },
  { icon: CreditCard, labelKey: "quickActions.openPayroll", route: 'payroll', color: 'text-warning' },
  { icon: Palmtree, labelKey: "quickActions.addVacation", route: 'vacations', color: 'text-chart-4' },
];

export function QuickActions({ role }: { role: "admin" | "hr" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.labelKey}
          onClick={() => navigate(`/${role}/${action.route}`)}
          className="quick-action-btn group"
        >
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted flex items-center justify-center ${action.color}`}>
            <action.icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-foreground">{t(action.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
