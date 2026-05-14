import { Mail, Phone, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { StatCard } from '@/components/common/StatCard';
import { selfService } from '@/services/selfService';
import { formatCurrency, formatDate } from '@/lib/format';

export default function MyProfilePage() {
  const { data: profile, isLoading, error } = useQuery({ queryKey: ['my-profile'], queryFn: selfService.profile });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !profile) return <ErrorMessage />;

  const initials = profile.full_name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-description">Your personal and employment information.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-xl text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{profile.full_name}</h2>
              <StatusBadge status={profile.status} />
            </div>
            <p className="mt-1 text-muted-foreground">{profile.position || 'Employee'}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {profile.email || 'No email'}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {profile.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Hire Date" value={formatDate(profile.hire_date)} icon={User} />
        <StatCard title="Vacation Days" value={profile.vacation_days} icon={User} tone="info" />
        <StatCard title="Daily Hours" value={profile.daily_work_hours} icon={User} tone="success" />
        <StatCard title="Salary" value={formatCurrency(profile.monthly_price)} icon={User} tone="success" />
      </div>
    </div>
  );
}
