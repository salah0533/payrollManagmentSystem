import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ErrorMessage({ title = 'Something went wrong', message }: { title?: string; message?: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message || 'Please try again or contact an administrator.'}</AlertDescription>
    </Alert>
  );
}
