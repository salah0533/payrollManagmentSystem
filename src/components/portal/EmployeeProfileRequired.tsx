import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export function EmployeeProfileRequired() {
  const { primaryRole } = useAuth();
  const home = primaryRole === 'admin' ? '/admin/users' : primaryRole === 'hr' ? '/hr/employees' : '/login';

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-6">
      <div className="dashboard-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Employee profile not linked</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This account can sign in, but the employee self-service portal needs a linked employee profile before it can
          load payroll, attendance, leave, and profile data.
        </p>
        <Button asChild className="mt-5">
          <Link to={home}>Go back</Link>
        </Button>
      </div>
    </div>
  );
}
