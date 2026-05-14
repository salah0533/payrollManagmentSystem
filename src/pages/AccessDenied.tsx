import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/lib/auth';

export default function AccessDenied() {
  const { primaryRole } = useAuth();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role does not have permission to open this area.</p>
        <Button asChild className="mt-6">
          <Link to={getRoleHome(primaryRole)}>Go to my dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
