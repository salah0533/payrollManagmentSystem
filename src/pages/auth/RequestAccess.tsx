import { Link } from 'react-router-dom';
import { CheckCircle2, MailCheck, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/components/auth/AuthCard';

const accessSteps = [
  'Admin creates or links your employee profile',
  'Role is assigned: Admin, HR, or Employee',
  'You sign in and change the temporary password',
];

export default function RequestAccess() {
  return (
    <AuthCard
      icon={UserRoundPlus}
      title="Request employee access"
      description="Signup is admin-managed so payroll and employee data stays protected from the first step."
      centered
      footer={
        <Button asChild className="w-full">
          <Link to="/login">Back to login</Link>
        </Button>
      }
    >
      <div className="rounded-md border border-border bg-muted/40 p-4 text-left">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MailCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Invitation-style onboarding</p>
            <p className="text-xs text-muted-foreground">No public signup is exposed.</p>
          </div>
        </div>
        <div className="space-y-3">
          {accessSteps.map((step) => (
            <div key={step} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-md bg-info/10 p-3 text-left text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-muted-foreground">Ask your administrator to create your account from Users & Roles.</p>
      </div>
    </AuthCard>
  );
}
