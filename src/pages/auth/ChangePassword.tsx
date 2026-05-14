import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/lib/auth';
import { authService } from '@/services/authService';

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
          required
          minLength={id === 'current-password' ? undefined : 8}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-8 w-8"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { refreshMe, primaryRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      const user = await refreshMe();
      toast.success('Password changed');
      navigate(getRoleHome(user?.roles.includes('admin') ? 'admin' : user?.roles.includes('hr') ? 'hr' : primaryRole), {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.08fr_0.92fr]">
      <AuthVisualPanel />
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--accent))_0%,transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,hsl(var(--sidebar-accent))_0%,transparent_48%)]" />
        <div className="absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">P</div>
          <div>
            <p className="text-lg font-semibold">PayrollPro</p>
            <p className="text-xs text-muted-foreground">Secure payroll and HR operations</p>
          </div>
        </div>

        <AuthCard
          icon={LockKeyhole}
          title="Change your password"
          description="Your account requires a new password before you can access payroll, HR, and employee data."
        >
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <PasswordField id="new-password" label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <div className="flex items-start gap-3 rounded-md bg-success/10 p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-muted-foreground">Use at least 8 characters and avoid reusing the temporary password.</p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save password
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={logout}>
              Log out
            </Button>
          </form>
        </AuthCard>
      </main>
    </div>
  );
}
