import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { payrollCycles, workWeekOptions } from "@/components/layout/navigation";
import { currencyOptions, isAllowedCurrency } from "@/lib/currencies";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, setDefaultCurrency } from "@/lib/format";
import { timezoneOptions } from "@/lib/timezones";
import { hasPermission } from "@/lib/roles";
import { settingsApi } from "@/services/settingsApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const canUpdateSettings = hasPermission(currentUser, "settings.update");
  const workScheduleQuery = useQuery({
    queryKey: ["settings", "work-schedule"],
    queryFn: () => settingsApi.getWorkSchedule(),
  });

  const payrollPolicyQuery = useQuery({
    queryKey: ["settings", "payroll-policy"],
    queryFn: () => settingsApi.getPayrollPolicy(),
  });

  const [workSchedule, setWorkSchedule] = useState({
    name: "Default Schedule",
    start_time: "08:00:00",
    end_time: "17:00:00",
    break_minutes: 60,
    weekly_off_days: ["friday", "saturday"],
    timezone: "Africa/Algiers",
    is_default: true,
  });

  const [payrollPolicy, setPayrollPolicy] = useState({
    name: "default",
    payroll_cycle: "monthly",
    minimum_overtime_minutes: 30,
    allowed_late_minutes: 0,
    default_currency: "DZD",
    significant_change_threshold: 1,
    paid_vacation_counts_for_daily: true,
    overtime_enabled: true,
    late_makeup_enabled: true,
    late_deduction_enabled: true,
    auto_recalculate_draft_payroll: true,
    lock_payroll_after_payment: true,
    holidays_json: [] as string[],
  });

  useEffect(() => {
    if (workScheduleQuery.data) {
      setWorkSchedule({
        name: workScheduleQuery.data.name,
        start_time: workScheduleQuery.data.start_time,
        end_time: workScheduleQuery.data.end_time,
        break_minutes: workScheduleQuery.data.break_minutes,
        weekly_off_days: workScheduleQuery.data.weekly_off_days,
        timezone: workScheduleQuery.data.timezone,
        is_default: workScheduleQuery.data.is_default,
      });
    }
  }, [workScheduleQuery.data]);

  useEffect(() => {
    if (payrollPolicyQuery.data) {
      setPayrollPolicy({
        name: payrollPolicyQuery.data.name,
        payroll_cycle: payrollPolicyQuery.data.payroll_cycle,
        minimum_overtime_minutes: payrollPolicyQuery.data.minimum_overtime_minutes,
        allowed_late_minutes: payrollPolicyQuery.data.allowed_late_minutes,
        default_currency: payrollPolicyQuery.data.default_currency,
        significant_change_threshold: Number(payrollPolicyQuery.data.significant_change_threshold),
        paid_vacation_counts_for_daily: payrollPolicyQuery.data.paid_vacation_counts_for_daily,
        overtime_enabled: payrollPolicyQuery.data.overtime_enabled,
        late_makeup_enabled: payrollPolicyQuery.data.late_makeup_enabled,
        late_deduction_enabled: payrollPolicyQuery.data.late_deduction_enabled,
        auto_recalculate_draft_payroll: payrollPolicyQuery.data.auto_recalculate_draft_payroll,
        lock_payroll_after_payment: payrollPolicyQuery.data.lock_payroll_after_payment,
        holidays_json: payrollPolicyQuery.data.holidays_json,
      });
    }
  }, [payrollPolicyQuery.data]);

  const saveWorkSchedule = useMutation({
    mutationFn: () => settingsApi.updateWorkSchedule(workSchedule),
    onSuccess: () => {
      toast({ title: "Work schedule updated", description: "The default work schedule has been saved." });
    },
    onError: (error) => {
      toast({
        title: "Unable to save work schedule",
        description: getErrorMessage(error, "Please review the submitted values."),
        variant: "destructive",
      });
    },
  });

  const savePayrollPolicy = useMutation({
    mutationFn: () => settingsApi.updatePayrollPolicy(payrollPolicy),
    onSuccess: async (policy) => {
      setDefaultCurrency(policy.default_currency);
      queryClient.setQueryData(["settings", "payroll-policy"], policy);
      queryClient.setQueryData(["settings", "payroll-currency"], { default_currency: policy.default_currency });
      await queryClient.invalidateQueries({ queryKey: ["settings", "payroll-currency"] });
      toast({ title: "Payroll policy updated", description: "The payroll policy has been saved." });
    },
    onError: (error) => {
      toast({
        title: "Unable to save payroll policy",
        description: getErrorMessage(error, "Please review the submitted values."),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings and Policies"
        description="Admin-only configuration for work schedules and payroll policy settings."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="filter-card">
          <CardHeader>
            <CardTitle>Default work schedule</CardTitle>
            <CardDescription>Backed by `/settings/work-schedule`.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleName">Schedule name</Label>
              <Input id="scheduleName" value={workSchedule.name} onChange={(event) => setWorkSchedule((value) => ({ ...value, name: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" value={workSchedule.start_time.slice(0, 5)} onChange={(event) => setWorkSchedule((value) => ({ ...value, start_time: `${event.target.value}:00` }))} type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <Input id="endTime" value={workSchedule.end_time.slice(0, 5)} onChange={(event) => setWorkSchedule((value) => ({ ...value, end_time: `${event.target.value}:00` }))} type="time" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">Break minutes</Label>
                <Input id="breakMinutes" type="number" value={workSchedule.break_minutes} onChange={(event) => setWorkSchedule((value) => ({ ...value, break_minutes: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTimezone">Timezone</Label>
                <Select
                  value={workSchedule.timezone}
                  onValueChange={(timezone) => setWorkSchedule((value) => ({ ...value, timezone }))}
                >
                  <SelectTrigger id="scheduleTimezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timezoneOptions.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weekly off days</Label>
              <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                {workWeekOptions.map((day) => (
                  <label key={day} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={workSchedule.weekly_off_days.includes(day)}
                      onCheckedChange={(checked) =>
                        setWorkSchedule((value) => ({
                          ...value,
                          weekly_off_days: Boolean(checked)
                            ? workWeekOptions.filter((option) => option === day || value.weekly_off_days.includes(option))
                            : value.weekly_off_days.filter((option) => option !== day),
                        }))
                      }
                    />
                    <span className="capitalize">{day}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select one or more days that count as the weekly off schedule.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">Default schedule</p>
                <p className="text-sm text-muted-foreground">Keep this schedule as the system default.</p>
              </div>
              <Switch checked={workSchedule.is_default} onCheckedChange={(checked) => setWorkSchedule((value) => ({ ...value, is_default: checked }))} />
            </div>
            <Button onClick={() => saveWorkSchedule.mutate()} disabled={!canUpdateSettings || saveWorkSchedule.isPending}>
              {saveWorkSchedule.isPending ? "Saving..." : "Save work schedule"}
            </Button>
          </CardContent>
        </Card>

        <Card className="filter-card">
          <CardHeader>
            <CardTitle>Payroll policy</CardTitle>
            <CardDescription>Backed by `/settings/payroll-policy`.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policyName">Policy name</Label>
                <Input id="policyName" value={payrollPolicy.name} onChange={(event) => setPayrollPolicy((value) => ({ ...value, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyCycle">Payroll cycle</Label>
                <Input
                  id="policyCycle"
                  value={payrollPolicy.payroll_cycle}
                  onChange={(event) => setPayrollPolicy((value) => ({ ...value, payroll_cycle: event.target.value }))}
                  list="payroll-cycles"
                />
                <datalist id="payroll-cycles">
                  {payrollCycles.map((cycle) => (
                    <option key={cycle} value={cycle} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overtimeMinutes">Minimum overtime minutes</Label>
                <Input id="overtimeMinutes" type="number" value={payrollPolicy.minimum_overtime_minutes} onChange={(event) => setPayrollPolicy((value) => ({ ...value, minimum_overtime_minutes: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedLateMinutes">Allowed late minutes</Label>
                <Input id="allowedLateMinutes" type="number" value={payrollPolicy.allowed_late_minutes} onChange={(event) => setPayrollPolicy((value) => ({ ...value, allowed_late_minutes: Number(event.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={isAllowedCurrency(payrollPolicy.default_currency) ? payrollPolicy.default_currency : "DZD"}
                  onValueChange={(currency) => setPayrollPolicy((value) => ({ ...value, default_currency: currency }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Preview: {formatCurrency(1234.56, payrollPolicy.default_currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="changeThreshold">Significant change threshold</Label>
                <Input id="changeThreshold" type="number" step="0.01" value={payrollPolicy.significant_change_threshold} onChange={(event) => setPayrollPolicy((value) => ({ ...value, significant_change_threshold: Number(event.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ["paid_vacation_counts_for_daily", "Count paid vacation for daily payroll"],
                ["overtime_enabled", "Enable overtime"],
                ["late_makeup_enabled", "Enable late makeup"],
                ["late_deduction_enabled", "Enable late deductions"],
                ["auto_recalculate_draft_payroll", "Auto recalculate draft payroll"],
                ["lock_payroll_after_payment", "Lock payroll after payment"],
              ].map(([field, label]) => (
                <div key={field} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={Boolean(payrollPolicy[field as keyof typeof payrollPolicy])}
                    onCheckedChange={(checked) => setPayrollPolicy((value) => ({ ...value, [field]: checked }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="holidays">Holidays</Label>
              <Textarea
                id="holidays"
                value={payrollPolicy.holidays_json.join("\n")}
                onChange={(event) =>
                  setPayrollPolicy((value) => ({
                    ...value,
                    holidays_json: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>

            <Button onClick={() => savePayrollPolicy.mutate()} disabled={!canUpdateSettings || savePayrollPolicy.isPending}>
              {savePayrollPolicy.isPending ? "Saving..." : "Save payroll policy"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
