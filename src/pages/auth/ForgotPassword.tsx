import { Link } from 'react-router-dom';
import { KeyRound, LockKeyhole, MailWarning, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/components/auth/AuthCard';

export default function ForgotPassword() {
  return (
    <AuthCard
      icon={KeyRound}
      title="Password reset"
      description="Password recovery is currently handled by administrators to protect payroll and employee records."
      centered
      footer={
        <Button asChild className="w-full">
          <Link to="/login">Back to login</Link>
        </Button>
      }
    >
      <div className="grid gap-3 text-left">
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Administrator reset</p>
            <p className="text-xs leading-5 text-muted-foreground">An admin can issue a temporary password from Users & Roles.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium">First-login password change</p>
            <p className="text-xs leading-5 text-muted-foreground">Users are guided to set a new password before accessing the platform.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md bg-warning/10 p-3">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-muted-foreground">Email reset delivery is prepared as a future backend integration.</p>
        </div>
      </div>
    </AuthCard>
  );
}
