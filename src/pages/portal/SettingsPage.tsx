import { FormEvent, useEffect, useState } from 'react';
import { Clock, Settings as SettingsIcon, WalletCards } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { lookupService } from '@/services/lookupService';
import { settingsService } from '@/services/settingsService';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const scheduleQuery = useQuery({ queryKey: ['settings', 'work-schedule'], queryFn: settingsService.workSchedule });
  const policyQuery = useQuery({ queryKey: ['settings', 'payroll-policy'], queryFn: settingsService.payrollPolicy });
  const attendanceTypesQuery = useQuery({ queryKey: ['attendance-types'], queryFn: lookupService.attendanceTypes });
  const paymentTypesQuery = useQuery({ queryKey: ['payment-types'], queryFn: lookupService.paymentTypes });
  const vacationTypesQuery = useQuery({ queryKey: ['vacation-types'], queryFn: lookupService.vacationTypes });

  const [schedule, setSchedule] = useState({
    name: 'Default Schedule',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    weekly_off_days: ['friday', 'saturday'],
    timezone: 'Africa/Algiers',
    is_default: true,
  });
  const [policy, setPolicy] = useState({
    name: 'default',
    payroll_cycle: 'monthly',
    minimum_overtime_minutes: 30,
    allowed_late_minutes: 0,
    default_currency: 'USD',
    significant_change_threshold: '1.00',
    paid_vacation_counts_for_daily: true,
    overtime_enabled: true,
    late_makeup_enabled: true,
    late_deduction_enabled: true,
    auto_recalculate_draft_payroll: true,
    lock_payroll_after_payment: true,
    holidays_json: [],
  });

  useEffect(() => {
    if (scheduleQuery.data) {
      setSchedule({
        name: scheduleQuery.data.name,
        start_time: scheduleQuery.data.start_time,
        end_time: scheduleQuery.data.end_time,
        break_minutes: scheduleQuery.data.break_minutes,
        weekly_off_days: scheduleQuery.data.weekly_off_days,
        timezone: scheduleQuery.data.timezone,
        is_default: scheduleQuery.data.is_default,
      });
    }
  }, [scheduleQuery.data]);

  useEffect(() => {
    if (policyQuery.data) {
      setPolicy({
        name: policyQuery.data.name,
        payroll_cycle: policyQuery.data.payroll_cycle,
        minimum_overtime_minutes: policyQuery.data.minimum_overtime_minutes,
        allowed_late_minutes: policyQuery.data.allowed_late_minutes,
        default_currency: policyQuery.data.default_currency,
        significant_change_threshold: String(policyQuery.data.significant_change_threshold),
        paid_vacation_counts_for_daily: policyQuery.data.paid_vacation_counts_for_daily,
        overtime_enabled: policyQuery.data.overtime_enabled,
        late_makeup_enabled: policyQuery.data.late_makeup_enabled,
        late_deduction_enabled: policyQuery.data.late_deduction_enabled,
        auto_recalculate_draft_payroll: policyQuery.data.auto_recalculate_draft_payroll,
        lock_payroll_after_payment: policyQuery.data.lock_payroll_after_payment,
        holidays_json: policyQuery.data.holidays_json,
      });
    }
  }, [policyQuery.data]);

  const updateScheduleMutation = useMutation({
    mutationFn: () => settingsService.updateWorkSchedule(schedule),
    onSuccess: () => {
      toast.success('Work schedule updated');
      queryClient.invalidateQueries({ queryKey: ['settings', 'work-schedule'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update work schedule'),
  });

  const updatePolicyMutation = useMutation({
    mutationFn: () => settingsService.updatePayrollPolicy({ ...policy, significant_change_threshold: Number(policy.significant_change_threshold) }),
    onSuccess: () => {
      toast.success('Payroll policy updated');
      queryClient.invalidateQueries({ queryKey: ['settings', 'payroll-policy'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update payroll policy'),
  });

  if (scheduleQuery.isLoading || policyQuery.isLoading) return <LoadingSkeleton rows={6} />;
  if (scheduleQuery.error || policyQuery.error) return <ErrorMessage />;

  const handleScheduleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateScheduleMutation.mutate();
  };

  const handlePolicySubmit = (event: FormEvent) => {
    event.preventDefault();
    updatePolicyMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Company work hours, payroll policy, and reference data.</p>
      </div>

      <Tabs defaultValue="work-hours" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="work-hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Work hours
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <WalletCards className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="lookups" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Lookups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-hours">
          <form className="rounded-lg border border-border bg-card p-5" onSubmit={handleScheduleSubmit}>
            <h2 className="text-lg font-semibold">Default Work Schedule</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input type="time" value={schedule.start_time.slice(0, 5)} onChange={(event) => setSchedule({ ...schedule, start_time: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <Input type="time" value={schedule.end_time.slice(0, 5)} onChange={(event) => setSchedule({ ...schedule, end_time: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Break minutes</Label>
                <Input type="number" min="0" value={schedule.break_minutes} onChange={(event) => setSchedule({ ...schedule, break_minutes: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={schedule.timezone} onChange={(event) => setSchedule({ ...schedule, timezone: event.target.value })} />
              </div>
            </div>
            <Button className="mt-5" type="submit" disabled={updateScheduleMutation.isPending}>
              Save work hours
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="payroll">
          <form className="rounded-lg border border-border bg-card p-5" onSubmit={handlePolicySubmit}>
            <h2 className="text-lg font-semibold">Payroll Policy</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Payroll cycle</Label>
                <Input value={policy.payroll_cycle} onChange={(event) => setPolicy({ ...policy, payroll_cycle: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Minimum overtime minutes</Label>
                <Input type="number" min="0" value={policy.minimum_overtime_minutes} onChange={(event) => setPolicy({ ...policy, minimum_overtime_minutes: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={policy.default_currency} onChange={(event) => setPolicy({ ...policy, default_currency: event.target.value })} />
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['overtime_enabled', 'Overtime enabled'],
                ['late_deduction_enabled', 'Late deduction enabled'],
                ['auto_recalculate_draft_payroll', 'Auto recalculate draft payroll'],
                ['lock_payroll_after_payment', 'Lock payroll after payment'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <Switch checked={Boolean(policy[key as keyof typeof policy])} onCheckedChange={(checked) => setPolicy({ ...policy, [key]: checked })} />
                </label>
              ))}
            </div>
            <Button className="mt-5" type="submit" disabled={updatePolicyMutation.isPending}>
              Save payroll policy
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="lookups">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ['Attendance Types', attendanceTypesQuery.data ?? [], 'attendence_type'],
              ['Payment Types', paymentTypesQuery.data ?? [], 'payment_type'],
              ['Vacation Types', vacationTypesQuery.data ?? [], 'vacation_type'],
            ].map(([title, items, field]) => (
              <div key={String(title)} className="rounded-lg border border-border bg-card p-5">
                <h2 className="font-semibold">{String(title)}</h2>
                <div className="mt-4 space-y-2">
                  {(items as Array<Record<string, string | number>>).map((item) => (
                    <div key={String(item.id)} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span>{String(item[field as string] ?? item.code ?? item.id)}</span>
                      <span className="text-muted-foreground">#{String(item.id)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
