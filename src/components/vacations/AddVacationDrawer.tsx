import { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Palmtree, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DrawerEmployee = {
  id: string;
  fullName: string;
  jobTitle: string;
  dailyWorkHours?: number;
  dues?: number;
};

interface AddVacationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: DrawerEmployee;
  employees?: DrawerEmployee[];
  selectedEmployeeId?: string;
  onEmployeeChange?: (employeeId: string) => void;
  onSuccess?: () => void;
}

type VacationType = {
  id: number;
  vacation_type: string;
};

type AnnualYearStat = {
  used: number;
  allowed_days: number;
};

type VacationStatus = {
  id: number;
  vacation_status: string;
};

const formatTypeLabel = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function AddVacationDrawer({
  open,
  onOpenChange,
  employee,
  employees = [],
  selectedEmployeeId,
  onEmployeeChange,
  onSuccess,
}: AddVacationDrawerProps) {
  const [vacationType, setVacationType] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [totalDays, setTotalDays] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [vacationStatuses, setVacationStatuses] = useState<VacationStatus[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [vacationStatus, setVacationStatus] = useState('0');
  const [yearlyStats, setYearlyStats] = useState<Record<string, AnnualYearStat>>({});
  const [isLoadingYearlyStats, setIsLoadingYearlyStats] = useState(false);
  const [showYearlyDetails, setShowYearlyDetails] = useState(false);
  const [isPaid, setIsPaid] = useState(true);

  const selectedEmployee = useMemo(() => {
    if (employees.length > 0 && selectedEmployeeId) {
      return employees.find((item) => String(item.id) === String(selectedEmployeeId));
    }

    return employee;
  }, [employees, selectedEmployeeId, employee]);

  useEffect(() => {
    const fetchVacationTypesAndStatuses = async () => {
      setIsLoadingTypes(true);
      setIsLoadingStatuses(true);
      try {
        const [typesRes, statusesRes] = await Promise.all([
          fetch('http://localhost:8000/vacation_types/'),
          fetch('http://localhost:8000/vacation_status/'),
        ]);
        const typesJson = await typesRes.json();
        const statusesJson = await statusesRes.json();
        
        const types: VacationType[] = typesJson?.data || [];
        const statuses: VacationStatus[] = statusesJson?.data || [];
        
        setVacationTypes(types);
        setVacationStatuses(statuses);

        if (!types.some((type) => type.vacation_type === vacationType)) {
          const yearlyType = types.find((type) => type.vacation_type === 'yearly_vacation');
          setVacationType(yearlyType?.vacation_type ?? types[0]?.vacation_type ?? '');
        }
        
        if (!statuses.some((s) => s.id === Number(vacationStatus))) {
          setVacationStatus(String(statuses[0]?.id ?? '0'));
        }
      } catch {
        setVacationTypes([]);
        setVacationStatuses([]);
      } finally {
        setIsLoadingTypes(false);
        setIsLoadingStatuses(false);
      }
    };

    fetchVacationTypesAndStatuses();
  }, []);

  // Calculate total days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = differenceInDays(end, start) + 1;
      setTotalDays(Math.max(1, days));
    }
  }, [startDate, endDate]);

  const isYearlyVacation = vacationType === 'yearly_vacation';

  useEffect(() => {
    const fetchYearlyStats = async () => {
      if (!selectedEmployee?.id || !isYearlyVacation) {
        setYearlyStats({});
        return;
      }

      setIsLoadingYearlyStats(true);
      try {
        const res = await fetch(`http://localhost:8000/annual_vacations/used_vac/${selectedEmployee.id}`);
        const json = await res.json();
        setYearlyStats(json?.data || {});
      } catch {
        setYearlyStats({});
      } finally {
        setIsLoadingYearlyStats(false);
      }
    };

    fetchYearlyStats();
  }, [selectedEmployee?.id, isYearlyVacation]);

  const yearlySummary = useMemo(() => {
    const entries = Object.entries(yearlyStats).sort(([a], [b]) => Number(b) - Number(a));
    const totals = entries.reduce(
      (acc, [, stat]) => {
        acc.used += Number(stat.used || 0);
        acc.allowed += Number(stat.allowed_days || 0);
        return acc;
      },
      { used: 0, allowed: 0 }
    );

    const remaining = Math.max(0, totals.allowed - totals.used);
    const usedPercentage = totals.allowed > 0 ? (totals.used / totals.allowed) * 100 : 0;
    const remainingPercentage = totals.allowed > 0 ? (remaining / totals.allowed) * 100 : 0;

    return {
      entries,
      used: totals.used,
      allowed: totals.allowed,
      remaining,
      usedPercentage: Math.min(100, usedPercentage),
      remainingPercentage,
    };
  }, [yearlyStats]);

  const isUnpaid = vacationType.includes('unpaid');
  const exceedsLimit =
    isYearlyVacation && yearlySummary.allowed > 0 && totalDays > yearlySummary.remaining;
  
  const getSelectedVacationTypeId = () => {
    return vacationTypes.find((t) => t.vacation_type === vacationType)?.id ?? 0;
  };

  const availableYearlyYears = useMemo(
    () => yearlySummary.entries.map(([year]) => year),
    [yearlySummary.entries]
  );

  const isYearAllowedForYearlyVacation = (dateValue: string) => {
    if (!dateValue) return true;
    const pickedYear = new Date(dateValue).getFullYear().toString();
    return availableYearlyYears.includes(pickedYear);
  };
  
  const validateYearlyVacationDates = () => {
    if (!isYearlyVacation) return true;
    
    const startYear = new Date(startDate).getFullYear().toString();
    const endYear = new Date(endDate).getFullYear().toString();

    return availableYearlyYears.includes(startYear) && availableYearlyYears.includes(endYear);
  };

  const hasInvalidYearlyDates = isYearlyVacation && !validateYearlyVacationDates();

  const handleStartDateChange = (value: string) => {
    if (isYearlyVacation && !isYearAllowedForYearlyVacation(value)) {
      setErrors((prev) => ({
        ...prev,
        dates: 'This year is not available in yearly vacation statistics',
      }));
      return;
    }

    setStartDate(value);
    setErrors((prev) => {
      const { dates, startDate: startDateError, ...rest } = prev;
      return rest;
    });
  };

  const handleEndDateChange = (value: string) => {
    if (isYearlyVacation && !isYearAllowedForYearlyVacation(value)) {
      setErrors((prev) => ({
        ...prev,
        dates: 'This year is not available in yearly vacation statistics',
      }));
      return;
    }

    setEndDate(value);
    setErrors((prev) => {
      const { dates, endDate: endDateError, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedEmployee?.id) {
      newErrors.employee = 'Employee is required';
    }
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate && parseISO(endDate) < parseISO(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (exceedsLimit) {
      newErrors.days = `Requested ${totalDays} days exceeds remaining balance of ${yearlySummary.remaining} days`;
    }
    
    if (isYearlyVacation && !validateYearlyVacationDates()) {
      newErrors.dates = 'Start and end dates must be within available years in your vacation history';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const payload = {
        employee_id: Number(selectedEmployee?.id),
        start_date: startDate,
        end_date: endDate,
        vacation_type: getSelectedVacationTypeId(),
        vacation_status: Number(vacationStatus),
        is_paid: isPaid,
      };
      
      const response = await fetch('http://localhost:8000/vacation/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit vacation request');
      }
      
      const typeLabel = vacationTypes.find(t => t.id === payload.vacation_type)?.vacation_type || vacationType;
      toast({
        title: 'Vacation Request Submitted',
        description: `${totalDays} day(s) of ${formatTypeLabel(typeLabel)} has been requested.`,
      });
      
      // Reset form
      const yearlyType = vacationTypes.find((type) => type.vacation_type === 'yearly_vacation');
      setVacationType(yearlyType?.vacation_type ?? vacationTypes[0]?.vacation_type ?? '');
      setVacationStatus(String(vacationStatuses[0]?.id ?? '0'));
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
      setReason('');
      setIsPaid(true);
      setErrors({});
      setShowYearlyDetails(false);
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit vacation request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5" />
            Add Vacation
          </SheetTitle>
          <SheetDescription>
            Request vacation for {selectedEmployee?.fullName || 'the selected employee'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Employee Info */}
          {employees.length > 0 ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployeeId || ''} onValueChange={onEmployeeChange}>
                <SelectTrigger className={cn(errors.employee && 'border-destructive')}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee && <p className="text-sm text-destructive">{errors.employee}</p>}
              {selectedEmployee && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="font-semibold">{selectedEmployee.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.jobTitle}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <p className="font-semibold">{selectedEmployee?.fullName || 'Not selected'}</p>
              <p className="text-sm text-muted-foreground">{selectedEmployee?.jobTitle}</p>
            </div>
          )}

          {/* Vacation Usage Progress */}
          {isYearlyVacation && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <Label className="text-xs text-muted-foreground">Yearly Vacation Statistics</Label>
              {isLoadingYearlyStats ? (
                <p className="text-sm text-muted-foreground">Loading yearly statistics...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-3xl font-bold">{yearlySummary.remaining}</span>
                      <span className="text-muted-foreground ml-1">days remaining</span>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{yearlySummary.used} / {yearlySummary.allowed} used</p>
                      <p>Remaining {Math.round(yearlySummary.remainingPercentage)}%</p>
                    </div>
                  </div>

                  <Progress
                    value={yearlySummary.usedPercentage}
                    className={cn(
                      'h-3',
                      yearlySummary.remaining < 5 && '[&>div]:bg-warning',
                      yearlySummary.remaining === 0 && '[&>div]:bg-destructive'
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-sm"
                    onClick={() => setShowYearlyDetails((prev) => !prev)}
                    disabled={yearlySummary.entries.length === 0}
                  >
                    {showYearlyDetails ? (
                      <ChevronUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="mr-1 h-4 w-4" />
                    )}
                    {showYearlyDetails ? 'Hide yearly details' : 'Show yearly details'}
                  </Button>

                  {showYearlyDetails && (
                    <div className="space-y-3 pt-1">
                      {yearlySummary.entries.map(([year, stat]) => {
                        const allowed = Number(stat.allowed_days || 0);
                        const used = Number(stat.used || 0);
                        const remaining = Math.max(0, allowed - used);
                        const usedPercentage = allowed > 0 ? (used / allowed) * 100 : 0;

                        return (
                          <div key={year} className="rounded-md border border-border/70 p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{year}</span>
                              <span className="text-muted-foreground">
                                Remaining {remaining}, allowed {allowed}
                              </span>
                            </div>
                            <Progress value={Math.min(100, usedPercentage)} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {yearlySummary.remaining < 5 && yearlySummary.remaining > 0 && (
                    <p className="text-sm text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Low yearly vacation balance
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Vacation Type */}
            <div className="space-y-2">
              <Label>Vacation Type</Label>
              <Select value={vacationType} onValueChange={setVacationType}>
                <SelectTrigger className={cn(isUnpaid && 'border-warning bg-warning/5')}>
                  <SelectValue placeholder={isLoadingTypes ? 'Loading types...' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {vacationTypes.map((type) => (
                    <SelectItem key={type.id} value={type.vacation_type}>
                      <div className="flex items-center gap-2">
                        {formatTypeLabel(type.vacation_type)}
                        {type.vacation_type.includes('unpaid') && (
                          <Badge variant="outline" className="text-xs">Unpaid</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUnpaid && (
                <p className="text-sm text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This leave type is unpaid
                </p>
              )}
            </div>
            
            {/* Vacation Status */}
            <div className="space-y-2">
              <Label>Vacation Status</Label>
              <Select value={vacationStatus} onValueChange={setVacationStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingStatuses ? 'Loading...' : 'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  {vacationStatuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      {formatTypeLabel(status.vacation_status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Is Paid */}
            {!isYearlyVacation && (
              <div className="space-y-3">
                <Label>Payment Type</Label>
                <RadioGroup value={String(isPaid)} onValueChange={(val) => setIsPaid(val === 'true')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="paid" />
                    <Label htmlFor="paid" className="font-normal cursor-pointer">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="unpaid-radio" />
                    <Label htmlFor="unpaid-radio" className="font-normal cursor-pointer">Unpaid</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={errors.startDate ? 'border-destructive' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={errors.endDate ? 'border-destructive' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Total Days Display */}
            <div className="space-y-2">
              <Label>Total Days</Label>
              <div className={cn(
                'flex items-center justify-center p-4 rounded-lg border',
                exceedsLimit ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/50'
              )}>
                <span className={cn(
                  'text-4xl font-bold',
                  exceedsLimit && 'text-destructive'
                )}>
                  {totalDays}
                </span>
                <span className="text-muted-foreground ml-2">day{totalDays !== 1 ? 's' : ''}</span>
              </div>
              {errors.days && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.days}
                </p>
              )}
              {errors.dates && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.dates}
                </p>
              )}
              {exceedsLimit && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Exceeds remaining vacation balance
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for vacation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={errors.reason ? 'border-destructive' : ''}
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason}</p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || exceedsLimit || !vacationType || hasInvalidYearlyDates || !!errors.dates || !selectedEmployee?.id}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
