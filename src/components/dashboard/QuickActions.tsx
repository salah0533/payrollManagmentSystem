import { UserPlus, Clock, CreditCard, Palmtree } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { icon: UserPlus, label: 'Add Employee', route: 'employees', color: 'text-info' },
  { icon: Clock, label: 'Add Attendance', route: 'attendance', color: 'text-success' },
  { icon: CreditCard, label: 'Open Payroll', route: 'payroll', color: 'text-warning' },
  { icon: Palmtree, label: 'Add Vacation', route: 'vacations', color: 'text-chart-4' },
];

export function QuickActions({ role }: { role: "admin" | "hr" }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(`/${role}/${action.route}`)}
          className="quick-action-btn group"
        >
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted flex items-center justify-center ${action.color}`}>
            <action.icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
