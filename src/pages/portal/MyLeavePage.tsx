import { FormEvent, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/common/DataTable';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { leaveService } from '@/services/leaveService';
import { lookupService } from '@/services/lookupService';
import { daysBetweenInclusive, todayIso } from '@/lib/format';

export default function MyLeavePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    start_date: todayIso(),
    end_date: todayIso(),
    vacation_type: '0',
    is_paid: 'true',
  });

  const leaveQuery = useQuery({ queryKey: ['my-leave'], queryFn: leaveService.own });
  const typesQuery = useQuery({ queryKey: ['vacation-types'], queryFn: lookupService.vacationTypes });
  const statusesQuery = useQuery({ queryKey: ['vacation-statuses'], queryFn: lookupService.vacationStatuses });

  const typeMap = useMemo(() => new Map((typesQuery.data ?? []).map((item) => [item.id, item.vacation_type || item.code || String(item.id)])), [typesQuery.data]);
  const statusMap = useMemo(() => new Map((statusesQuery.data ?? []).map((item) => [item.id, item.vacation_status || item.code || String(item.id)])), [statusesQuery.data]);

  const requestMutation = useMutation({
    mutationFn: leaveService.requestOwn,
    onSuccess: () => {
      toast.success('Leave request submitted');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-leave'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not submit leave request'),
  });

  if (leaveQuery.isLoading || typesQuery.isLoading || statusesQuery.isLoading) return <LoadingSkeleton rows={8} />;
  if (leaveQuery.error || typesQuery.error || statusesQuery.error) return <ErrorMessage />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    requestMutation.mutate({
      start_date: form.start_date,
      end_date: form.end_date,
      vacation_type: Number(form.vacation_type),
      is_paid: form.is_paid === 'true',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">My Leave</h1>
          <p className="page-description">Submit leave requests and track their status.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request leave
        </Button>
      </div>

      <DataTable
        data={leaveQuery.data ?? []}
        getRowKey={(vacation) => vacation.id}
        emptyTitle="No leave requests yet"
        columns={[
          { key: 'type', header: 'Type', render: (vacation) => typeMap.get(vacation.vacation_type) || vacation.vacation_type },
          { key: 'start', header: 'Start', render: (vacation) => vacation.start_date },
          { key: 'end', header: 'End', render: (vacation) => vacation.end_date },
          { key: 'days', header: 'Days', render: (vacation) => daysBetweenInclusive(vacation.start_date, vacation.end_date) },
          { key: 'paid', header: 'Paid', render: (vacation) => (vacation.is_paid ? 'Yes' : 'No') },
          { key: 'status', header: 'Status', render: (vacation) => <StatusBadge status={statusMap.get(vacation.vacation_status) || 'pending'} /> },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.vacation_type} onValueChange={(value) => setForm({ ...form, vacation_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(typesQuery.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.vacation_type || item.code || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paid</Label>
                <Select value={form.is_paid} onValueChange={(value) => setForm({ ...form, is_paid: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Paid</SelectItem>
                    <SelectItem value="false">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestMutation.isPending}>
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
