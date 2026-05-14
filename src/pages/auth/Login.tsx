import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';

const loginBenefits = [
  { icon: ShieldCheck, text: 'Secure JWT access with backend-enforced permissions' },
  { icon: Users, text: 'Separate portals for Admin, HR, and Employees' },
  { icon: CalendarCheck, text: 'Payroll, attendance, and leave in one workflow' },
];

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user) {
    return <Navigate to={getRoleHome(primaryRole)} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const currentUser = await login(identifier, password);
      if (currentUser.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(destination && destination !== '/login' ? destination : getRoleHome(currentUser.roles.includes('admin') ? 'admin' : currentUser.roles.includes('hr') ? 'hr' : 'employee'), {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username/email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      icon={LockKeyhole}
      title="Sign in to PayrollPro"
      description="Access your payroll, HR operations, attendance, leave, and employee self-service workspace."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Need an account?{' '}
          <Link to="/request-access" className="font-medium text-primary hover:underline">
            Request access
          </Link>
        </p>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or username</Label>
          <Input
            id="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="mt-6 grid gap-2">
        {loginBenefits.map((benefit) => (
          <div key={benefit.text} className="flex items-center gap-3 rounded-md bg-muted/60 px-3 py-2 text-sm">
            <benefit.icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{benefit.text}</span>
          </div>
        ))}
      </div>
    </AuthCard>
  );
}
