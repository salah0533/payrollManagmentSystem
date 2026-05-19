import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { payrollCycles, workWeekOptions } from "@/components/layout/navigation";
import { currencyOptions, isAllowedCurrency } from "@/lib/currencies";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, setDefaultCurrency } from "@/lib/format";
import { timezoneOptions } from "@/lib/timezones";
import { hasPermission } from "@/lib/roles";
import { settingsApi } from "@/services/settingsApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

function toTimeInputValue(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function toTimePayloadValue(value: string) {
  return value ? `${value}:00` : null;
}

function getBreakMinutesFromWindow(breakStartTime?: string | null, breakEndTime?: string | null, fallback = 0) {
  if (!breakStartTime || !breakEndTime) {
    return fallback;
  }

  const [startHours, startMinutes] = breakStartTime.slice(0, 5).split(":").map(Number);
  const [endHours, endMinutes] = breakEndTime.slice(0, 5).split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return Math.max(0, endTotal - startTotal);
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
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
    break_start_time: "12:00:00" as string | null,
    break_end_time: "13:00:00" as string | null,
    break_minutes: 60,
    weekly_off_days: ["friday", "saturday"],
    timezone: "Africa/Algiers",
    is_default: true,
  });

  const [payrollPolicy, setPayrollPolicy] = useState({
    name: "default",
    payroll_cycle: "monthly",
    minimum_overtime_minutes: 30,
    minimum_auto_pay_minutes: 0,
    allowed_late_minutes: 0,
    default_currency: "DZD",
    significant_change_threshold: 1,
    paid_vacation_counts_for_daily: true,
    overtime_enabled: true,
    late_makeup_enabled: true,
    late_deduction_enabled: false,
    auto_recalculate_draft_payroll: true,
    lock_payroll_after_payment: true,
    allow_vacation_carryover: true,
    max_vacation_carryover_days: null as number | null,
    carryover_expiry_month: null as number | null,
    carryover_expiry_day: null as number | null,
    reserve_vacation_days_on_pending: false,
  });

  useEffect(() => {
    if (workScheduleQuery.data) {
      setWorkSchedule({
        name: workScheduleQuery.data.name,
        start_time: workScheduleQuery.data.start_time,
        end_time: workScheduleQuery.data.end_time,
        break_start_time: workScheduleQuery.data.break_start_time ?? null,
        break_end_time: workScheduleQuery.data.break_end_time ?? null,
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
        minimum_auto_pay_minutes: payrollPolicyQuery.data.minimum_auto_pay_minutes,
        allowed_late_minutes: payrollPolicyQuery.data.allowed_late_minutes,
        default_currency: payrollPolicyQuery.data.default_currency,
        significant_change_threshold: Number(payrollPolicyQuery.data.significant_change_threshold),
        paid_vacation_counts_for_daily: payrollPolicyQuery.data.paid_vacation_counts_for_daily,
        overtime_enabled: payrollPolicyQuery.data.overtime_enabled,
        late_makeup_enabled: payrollPolicyQuery.data.late_makeup_enabled,
        late_deduction_enabled: payrollPolicyQuery.data.late_deduction_enabled,
        auto_recalculate_draft_payroll: payrollPolicyQuery.data.auto_recalculate_draft_payroll,
        lock_payroll_after_payment: payrollPolicyQuery.data.lock_payroll_after_payment,
        allow_vacation_carryover: payrollPolicyQuery.data.allow_vacation_carryover,
        max_vacation_carryover_days: payrollPolicyQuery.data.max_vacation_carryover_days ?? null,
        carryover_expiry_month: payrollPolicyQuery.data.carryover_expiry_month ?? null,
        carryover_expiry_day: payrollPolicyQuery.data.carryover_expiry_day ?? null,
        reserve_vacation_days_on_pending: payrollPolicyQuery.data.reserve_vacation_days_on_pending,
      });
    }
  }, [payrollPolicyQuery.data]);

  const saveWorkSchedule = useMutation({
    mutationFn: () =>
      settingsApi.updateWorkSchedule({
        ...workSchedule,
        break_minutes: getBreakMinutesFromWindow(
          workSchedule.break_start_time,
          workSchedule.break_end_time,
          workSchedule.break_minutes,
        ),
      }),
    onSuccess: () => {
      toast({ title: t("settings.saveWorkScheduleSuccess"), description: t("settings.saveWorkScheduleSuccessDescription") });
    },
    onError: (error) => {
      toast({
        title: t("settings.saveWorkScheduleError"),
        description: getErrorMessage(error, t("settings.saveWorkScheduleErrorDescription")),
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
      toast({ title: t("settings.savePayrollPolicySuccess"), description: t("settings.savePayrollPolicySuccessDescription") });
    },
    onError: (error) => {
      toast({
        title: t("settings.savePayrollPolicyError"),
        description: getErrorMessage(error, t("settings.savePayrollPolicyErrorDescription")),
        variant: "destructive",
      });
    },
  });

  const displayedBreakMinutes = getBreakMinutesFromWindow(
    workSchedule.break_start_time,
    workSchedule.break_end_time,
    workSchedule.break_minutes,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="filter-card">
          <CardHeader>
            <CardTitle>{t("settings.workSchedule")}</CardTitle>
            <CardDescription>{t("settings.workScheduleDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleName">{t("settings.scheduleName")}</Label>
              <Input id="scheduleName" value={workSchedule.name} onChange={(event) => setWorkSchedule((value) => ({ ...value, name: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">{t("settings.startTime")}</Label>
                <Input id="startTime" value={toTimeInputValue(workSchedule.start_time)} onChange={(event) => setWorkSchedule((value) => ({ ...value, start_time: `${event.target.value}:00` }))} type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t("settings.endTime")}</Label>
                <Input id="endTime" value={toTimeInputValue(workSchedule.end_time)} onChange={(event) => setWorkSchedule((value) => ({ ...value, end_time: `${event.target.value}:00` }))} type="time" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="breakStartTime">{t("settings.breakStartTime")}</Label>
                <Input
                  id="breakStartTime"
                  value={toTimeInputValue(workSchedule.break_start_time)}
                  onChange={(event) =>
                    setWorkSchedule((value) => ({
                      ...value,
                      break_start_time: toTimePayloadValue(event.target.value),
                    }))
                  }
                  type="time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakEndTime">{t("settings.breakEndTime")}</Label>
                <Input
                  id="breakEndTime"
                  value={toTimeInputValue(workSchedule.break_end_time)}
                  onChange={(event) =>
                    setWorkSchedule((value) => ({
                      ...value,
                      break_end_time: toTimePayloadValue(event.target.value),
                    }))
                  }
                  type="time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">{t("settings.breakMinutes")}</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  value={displayedBreakMinutes}
                  onChange={(event) => setWorkSchedule((value) => ({ ...value, break_minutes: Number(event.target.value) }))}
                  disabled={Boolean(workSchedule.break_start_time && workSchedule.break_end_time)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduleTimezone">{t("settings.timezone")}</Label>
                <Select
                  value={workSchedule.timezone}
                  onValueChange={(timezone) => setWorkSchedule((value) => ({ ...value, timezone }))}
                >
                  <SelectTrigger id="scheduleTimezone">
                    <SelectValue placeholder={t("settings.selectTimezone")} />
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
              <Label>{t("settings.weeklyOffDays")}</Label>
              <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                {workWeekOptions.map((day) => (
                  <label key={day} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={workSchedule.weekly_off_days.includes(day)}
                      onCheckedChange={(checked) =>
                        setWorkSchedule((value) => ({
                          ...value,
                          weekly_off_days: checked === true
                            ? workWeekOptions.filter((option) => option === day || value.weekly_off_days.includes(option))
                            : value.weekly_off_days.filter((option) => option !== day),
                        }))
                      }
                    />
                    <span>{t(`settings.days.${day}`)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.weeklyOffDaysHint")}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{t("settings.defaultSchedule")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.defaultScheduleDescription")}</p>
              </div>
              <Switch checked={workSchedule.is_default} onCheckedChange={(checked) => setWorkSchedule((value) => ({ ...value, is_default: checked }))} />
            </div>
            <Button onClick={() => saveWorkSchedule.mutate()} disabled={!canUpdateSettings || saveWorkSchedule.isPending}>
              {saveWorkSchedule.isPending ? t("common.saving") : t("settings.saveWorkSchedule")}
            </Button>
          </CardContent>
        </Card>

        <Card className="filter-card">
          <CardHeader>
            <CardTitle>{t("settings.payrollPolicy")}</CardTitle>
            <CardDescription>{t("settings.payrollPolicyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policyName">{t("settings.policyName")}</Label>
                <Input id="policyName" value={payrollPolicy.name} onChange={(event) => setPayrollPolicy((value) => ({ ...value, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyCycle">{t("settings.payrollCycle")}</Label>
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
                <Label htmlFor="overtimeMinutes">{t("settings.minimumOvertimeMinutes")}</Label>
                <Input id="overtimeMinutes" type="number" value={payrollPolicy.minimum_overtime_minutes} onChange={(event) => setPayrollPolicy((value) => ({ ...value, minimum_overtime_minutes: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumAutoPayMinutes">{t("settings.minimumAutoPayMinutes")}</Label>
                <Input id="minimumAutoPayMinutes" type="number" value={payrollPolicy.minimum_auto_pay_minutes} onChange={(event) => setPayrollPolicy((value) => ({ ...value, minimum_auto_pay_minutes: Number(event.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="allowedLateMinutes">{t("settings.allowedLateMinutes")}</Label>
                <Input id="allowedLateMinutes" type="number" value={payrollPolicy.allowed_late_minutes} onChange={(event) => setPayrollPolicy((value) => ({ ...value, allowed_late_minutes: Number(event.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">{t("settings.currency")}</Label>
                <Select
                  value={isAllowedCurrency(payrollPolicy.default_currency) ? payrollPolicy.default_currency : "DZD"}
                  onValueChange={(currency) => setPayrollPolicy((value) => ({ ...value, default_currency: currency }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder={t("settings.selectCurrency")} />
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
                  {t("settings.preview")}: {formatCurrency(1234.56, payrollPolicy.default_currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="changeThreshold">{t("settings.significantChangeThreshold")}</Label>
                <Input id="changeThreshold" type="number" step="0.01" value={payrollPolicy.significant_change_threshold} onChange={(event) => setPayrollPolicy((value) => ({ ...value, significant_change_threshold: Number(event.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ["paid_vacation_counts_for_daily", t("settings.toggles.paidVacationCountsForDaily")],
                ["overtime_enabled", t("settings.toggles.overtimeEnabled")],
                ["late_makeup_enabled", t("settings.toggles.lateMakeupEnabled")],
                ["late_deduction_enabled", t("settings.toggles.lateDeductionEnabled")],
                ["auto_recalculate_draft_payroll", t("settings.toggles.autoRecalculateDraftPayroll")],
                ["lock_payroll_after_payment", t("settings.toggles.lockPayrollAfterPayment")],
                ["allow_vacation_carryover", t("settings.toggles.allowVacationCarryover")],
                ["reserve_vacation_days_on_pending", t("settings.toggles.reserveVacationDaysOnPending")],
              ].map(([field, label]) => (
                <div key={field} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={payrollPolicy[field as keyof typeof payrollPolicy] === true}
                    onCheckedChange={(checked) => setPayrollPolicy((value) => ({ ...value, [field]: checked }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxCarryoverDays">{t("settings.maxCarryoverDays")}</Label>
                <Input
                  id="maxCarryoverDays"
                  type="number"
                  min={0}
                  disabled={!payrollPolicy.allow_vacation_carryover}
                  value={payrollPolicy.max_vacation_carryover_days ?? ""}
                  onChange={(event) =>
                    setPayrollPolicy((value) => ({
                      ...value,
                      max_vacation_carryover_days: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="carryoverExpiryMonth">{t("settings.carryoverExpiryMonth")}</Label>
                  <Input
                    id="carryoverExpiryMonth"
                    type="number"
                    min={1}
                    max={12}
                    disabled={!payrollPolicy.allow_vacation_carryover}
                    value={payrollPolicy.carryover_expiry_month ?? ""}
                    onChange={(event) =>
                      setPayrollPolicy((value) => ({
                        ...value,
                        carryover_expiry_month: event.target.value === "" ? null : Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carryoverExpiryDay">{t("settings.carryoverExpiryDay")}</Label>
                  <Input
                    id="carryoverExpiryDay"
                    type="number"
                    min={1}
                    max={31}
                    disabled={!payrollPolicy.allow_vacation_carryover}
                    value={payrollPolicy.carryover_expiry_day ?? ""}
                    onChange={(event) =>
                      setPayrollPolicy((value) => ({
                        ...value,
                        carryover_expiry_day: event.target.value === "" ? null : Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button onClick={() => savePayrollPolicy.mutate()} disabled={!canUpdateSettings || savePayrollPolicy.isPending}>
              {savePayrollPolicy.isPending ? t("common.saving") : t("settings.savePayrollPolicy")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
