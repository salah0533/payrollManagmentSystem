import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { workWeekOptions } from "@/components/layout/navigation";
import { currencyOptions, isAllowedCurrency } from "@/lib/currencies";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, setDefaultCurrency } from "@/lib/format";
import { timezoneOptions } from "@/lib/timezones";
import { hasPermission } from "@/lib/roles";
import { settingsApi } from "@/services/settingsApi";
import type { WorkSchedule } from "@/types/domain";
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

const CARRYOVER_EXPIRY_YEAR = 2024;

function getCarryoverExpiryDate(month?: number | null, day?: number | null) {
  if (!month || !day) {
    return undefined;
  }

  const date = new Date(CARRYOVER_EXPIRY_YEAR, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function formatCarryoverExpiryDate(date?: Date) {
  return date?.toLocaleDateString(undefined, { month: "long", day: "numeric" }) ?? "";
}

type WorkScheduleFormState = {
  name: string;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  break_minutes: number;
  weekly_off_days: string[];
  timezone: string;
  is_default: boolean;
};

function createEmptyWorkScheduleForm(): WorkScheduleFormState {
  return {
    name: "",
    start_time: "08:00:00",
    end_time: "17:00:00",
    break_start_time: "12:00:00",
    break_end_time: "13:00:00",
    break_minutes: 60,
    weekly_off_days: ["friday", "saturday"],
    timezone: "Africa/Algiers",
    is_default: false,
  };
}

function mapWorkScheduleToForm(schedule: WorkSchedule): WorkScheduleFormState {
  return {
    name: schedule.name,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    break_start_time: schedule.break_start_time ?? null,
    break_end_time: schedule.break_end_time ?? null,
    break_minutes: schedule.break_minutes,
    weekly_off_days: schedule.weekly_off_days,
    timezone: schedule.timezone,
    is_default: schedule.is_default,
  };
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const canUpdateSettings = hasPermission(currentUser, "settings.update");
  const workSchedulesQuery = useQuery({
    queryKey: ["settings", "work-schedules"],
    queryFn: () => settingsApi.listWorkSchedules(),
  });

  const payrollPolicyQuery = useQuery({
    queryKey: ["settings", "payroll-policy"],
    queryFn: () => settingsApi.getPayrollPolicy(),
  });

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleFormState>(createEmptyWorkScheduleForm());

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
    monthly_payroll_calculation_mode: "calendar_days" as "working_days" | "calendar_days",
    auto_recalculate_draft_payroll: true,
    lock_payroll_after_payment: true,
    allow_vacation_carryover: true,
    max_vacation_carryover_days: null as number | null,
    carryover_expiry_month: null as number | null,
    carryover_expiry_day: null as number | null,
    reserve_vacation_days_on_pending: false,
  });

  useEffect(() => {
    const schedules = workSchedulesQuery.data || [];
    if (!schedules.length || isCreatingSchedule) {
      return;
    }

    const selectedExists = selectedScheduleId !== null && schedules.some((schedule) => schedule.id === selectedScheduleId);
    if (!selectedExists) {
      const fallbackSchedule = schedules.find((schedule) => schedule.is_default) || schedules[0];
      setSelectedScheduleId(fallbackSchedule.id);
    }
  }, [isCreatingSchedule, selectedScheduleId, workSchedulesQuery.data]);

  useEffect(() => {
    if (isCreatingSchedule || selectedScheduleId === null) {
      return;
    }

    const selectedSchedule = (workSchedulesQuery.data || []).find((schedule) => schedule.id === selectedScheduleId);
    if (selectedSchedule) {
      setWorkSchedule(mapWorkScheduleToForm(selectedSchedule));
    }
  }, [isCreatingSchedule, selectedScheduleId, workSchedulesQuery.data]);

  useEffect(() => {
    if (payrollPolicyQuery.data) {
      setPayrollPolicy({
        name: payrollPolicyQuery.data.name,
        payroll_cycle: "monthly",
        minimum_overtime_minutes: payrollPolicyQuery.data.minimum_overtime_minutes,
        minimum_auto_pay_minutes: payrollPolicyQuery.data.minimum_auto_pay_minutes,
        allowed_late_minutes: payrollPolicyQuery.data.allowed_late_minutes,
        default_currency: payrollPolicyQuery.data.default_currency,
        significant_change_threshold: Number(payrollPolicyQuery.data.significant_change_threshold),
        paid_vacation_counts_for_daily: payrollPolicyQuery.data.paid_vacation_counts_for_daily,
        overtime_enabled: payrollPolicyQuery.data.overtime_enabled,
        monthly_payroll_calculation_mode: payrollPolicyQuery.data.monthly_payroll_calculation_mode,
        auto_recalculate_draft_payroll: payrollPolicyQuery.data.auto_recalculate_draft_payroll,
        lock_payroll_after_payment: true,
        allow_vacation_carryover: payrollPolicyQuery.data.allow_vacation_carryover,
        max_vacation_carryover_days: payrollPolicyQuery.data.max_vacation_carryover_days ?? null,
        carryover_expiry_month: payrollPolicyQuery.data.carryover_expiry_month ?? null,
        carryover_expiry_day: payrollPolicyQuery.data.carryover_expiry_day ?? null,
        reserve_vacation_days_on_pending: payrollPolicyQuery.data.reserve_vacation_days_on_pending,
      });
    }
  }, [payrollPolicyQuery.data]);

  const saveWorkSchedule = useMutation({
    mutationFn: () => {
      const payload = {
        ...workSchedule,
        break_minutes: getBreakMinutesFromWindow(
          workSchedule.break_start_time,
          workSchedule.break_end_time,
          workSchedule.break_minutes,
        ),
      };
      if (isCreatingSchedule || selectedScheduleId === null) {
        return settingsApi.createWorkSchedule(payload);
      }
      return settingsApi.updateWorkScheduleById(selectedScheduleId, payload);
    },
    onSuccess: async (schedule) => {
      setIsCreatingSchedule(false);
      setSelectedScheduleId(schedule.id);
      setWorkSchedule(mapWorkScheduleToForm(schedule));
      queryClient.setQueryData(["settings", "work-schedules"], (current: WorkSchedule[] | undefined) => {
        const nextSchedules = (current || []).filter((item) => item.id !== schedule.id);
        nextSchedules.push(schedule);
        return nextSchedules
          .map((item) => ({
            ...item,
            is_default: schedule.is_default ? item.id === schedule.id : item.is_default,
          }))
          .sort((left, right) => Number(right.is_default) - Number(left.is_default) || left.id - right.id);
      });
      if (schedule.is_default) {
        queryClient.setQueryData(["settings", "work-schedule"], schedule);
      }
      await queryClient.invalidateQueries({ queryKey: ["settings", "work-schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "work-schedule"] });
      toast({
        title: isCreatingSchedule ? t("settings.createWorkScheduleSuccess") : t("settings.saveWorkScheduleSuccess"),
        description: isCreatingSchedule ? t("settings.createWorkScheduleSuccessDescription") : t("settings.saveWorkScheduleSuccessDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: isCreatingSchedule ? t("settings.createWorkScheduleError") : t("settings.saveWorkScheduleError"),
        description: getErrorMessage(error, isCreatingSchedule ? t("settings.createWorkScheduleErrorDescription") : t("settings.saveWorkScheduleErrorDescription")),
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
  const carryoverExpiryDate = getCarryoverExpiryDate(
    payrollPolicy.carryover_expiry_month,
    payrollPolicy.carryover_expiry_day,
  );
  const schedules = workSchedulesQuery.data || [];
  const scheduleSelectValue = isCreatingSchedule
    ? "__new__"
    : selectedScheduleId !== null
      ? String(selectedScheduleId)
      : "__loading__";

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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="savedSchedule">{t("settings.savedSchedules")}</Label>
                <Select
                  value={scheduleSelectValue}
                  onValueChange={(value) => {
                    if (value === "__new__" || value === "__loading__") {
                      return;
                    }
                    setIsCreatingSchedule(false);
                    setSelectedScheduleId(Number(value));
                  }}
                >
                  <SelectTrigger id="savedSchedule">
                    <SelectValue placeholder={t("settings.selectSchedule")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__loading__" disabled>{t("common.loading")}</SelectItem>
                    <SelectItem value="__new__">{t("settings.newSchedule")}</SelectItem>
                    {schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={String(schedule.id)}>
                        {schedule.is_default ? `${schedule.name} (${t("settings.defaultScheduleBadge")})` : schedule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreatingSchedule(true);
                  setSelectedScheduleId(null);
                  setWorkSchedule(createEmptyWorkScheduleForm());
                }}
                disabled={!canUpdateSettings}
              >
                {t("settings.newSchedule")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.savedSchedulesHint")}</p>
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
              {saveWorkSchedule.isPending ? t("common.saving") : isCreatingSchedule ? t("settings.createWorkSchedule") : t("settings.saveWorkSchedule")}
            </Button>
          </CardContent>
        </Card>

        <Card className="filter-card">
          <CardHeader>
            <CardTitle>{t("settings.payrollPolicy")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("settings.payrollCycle")}</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-foreground">
                  Monthly
                </div>
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

            <div className="space-y-3">
              <Label>{t("settings.payrollCalculationMode")}</Label>
              <RadioGroup
                value={payrollPolicy.monthly_payroll_calculation_mode}
                onValueChange={(value: "working_days" | "calendar_days") =>
                  setPayrollPolicy((current) => ({ ...current, monthly_payroll_calculation_mode: value }))
                }
                className="grid gap-3"
              >
                {(["calendar_days", "working_days"] as const).map((mode) => (
                  <label key={mode} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                    <RadioGroupItem value={mode} id={`monthly-payroll-mode-${mode}`} className="mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {t(`settings.payrollModeOptions.${mode}.label`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`settings.payrollModeOptions.${mode}.description`)}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">{t("settings.payrollCalculationModeHint")}</p>
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
                ["auto_recalculate_draft_payroll", t("settings.toggles.autoRecalculateDraftPayroll")],
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("settings.carryoverExpiryDate")}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!payrollPolicy.allow_vacation_carryover}
                          className="w-full justify-start text-left font-normal sm:w-[240px]"
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {carryoverExpiryDate ? formatCarryoverExpiryDate(carryoverExpiryDate) : t("settings.selectCarryoverExpiryDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={carryoverExpiryDate}
                          defaultMonth={carryoverExpiryDate ?? new Date(CARRYOVER_EXPIRY_YEAR, 0, 1)}
                          onSelect={(selectedDate) => {
                            if (!selectedDate) {
                              return;
                            }
                            setPayrollPolicy((value) => ({
                              ...value,
                              carryover_expiry_month: selectedDate.getMonth() + 1,
                              carryover_expiry_day: selectedDate.getDate(),
                            }));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!payrollPolicy.allow_vacation_carryover || !carryoverExpiryDate}
                      onClick={() =>
                        setPayrollPolicy((value) => ({
                          ...value,
                          carryover_expiry_month: null,
                          carryover_expiry_day: null,
                        }))
                      }
                    >
                      {t("common.clear")}
                    </Button>
                  </div>
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
