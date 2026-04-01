import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Banknote, AlertCircle, Loader2, CalendarDays } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: {
    id: string;
    fullName: string;
    jobTitle: string;
    dues?: number;
  };
  onSuccess?: () => void;
}

type PaymentType = {
  id: number;
  payment_type: string;
};

type AttendanceStats = {
  salary_type?: string;
  month_price?: number;
  day_price?: number;
  hour_price?: number;
  overtime_price?: number;
  present?: number;
  absent?: number;
  late?: number;
  overtime?: number;
  paid_vacation?: number;
  not_paid_vacation?: number;
};

export function AddPaymentModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: AddPaymentModalProps) {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentTypeId, setPaymentTypeId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [yearMonth, setYearMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [description, setDescription] = useState('');
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingAttendanceStats, setIsLoadingAttendanceStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPaymentType = useMemo(
    () => paymentTypes.find((type) => String(type.id) === paymentTypeId),
    [paymentTypeId, paymentTypes]
  );

  const isAttendancePayment = selectedPaymentType?.payment_type?.toLowerCase() === 'attendence';

  const computedAttendanceTotals = useMemo(() => {
    if (!attendanceStats || attendanceStats.salary_type !== 'monthly') return null;

    const monthPrice = Number(attendanceStats.month_price ?? 0);
    const dayPrice = Number(attendanceStats.day_price ?? 0);
    const hourPrice = Number(attendanceStats.hour_price ?? 0);
    const overtimePrice = Number(attendanceStats.overtime_price ?? attendanceStats.hour_price ?? 0);
    const absent = Number(attendanceStats.absent ?? 0);
    const notPaidVacation = Number(attendanceStats.not_paid_vacation ?? 0);
    const late = Number(attendanceStats.late ?? 0);
    const overtime = Number(attendanceStats.overtime ?? 0);

    const absentDeduction = absent * dayPrice;
    const notPaidVacationDeduction = notPaidVacation * dayPrice;
    const subtotal = monthPrice - absentDeduction - notPaidVacationDeduction;
    const total = subtotal - late * hourPrice + overtime * overtimePrice;

    return {
      monthPrice,
      absent,
      notPaidVacation,
      late,
      overtime,
      absentDeduction,
      notPaidVacationDeduction,
      lateDeduction: late * hourPrice,
      overtimeAddition: overtime * overtimePrice,
      subtotal,
      total,
    };
  }, [attendanceStats]);

  useEffect(() => {
    if (!open) return;

    const fetchPaymentTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const response = await fetch('http://localhost:8000/payment_types/');
        if (!response.ok) throw new Error('Failed to load payment types');

        const json = await response.json();
        const types = (json?.data || []) as PaymentType[];
        setPaymentTypes(types);

        if (!paymentTypeId && types.length > 0) {
          setPaymentTypeId(String(types[0].id));
        }
      } catch {
        setPaymentTypes([]);
        toast({
          title: 'Error',
          description: 'Failed to load payment types.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchPaymentTypes();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!employee?.id) return;
    if (!isAttendancePayment) {
      setAttendanceStats(null);
      return;
    }
    if (!yearMonth) return;

    const fetchAttendanceStats = async () => {
      setIsLoadingAttendanceStats(true);
      try {
        const response = await fetch(`http://localhost:8000/payment/att/${employee.id}/${yearMonth}`);
        if (!response.ok) throw new Error('Failed to load attendance payment stats');

        const json = await response.json();
        setAttendanceStats(json?.data || null);
      } catch {
        setAttendanceStats(null);
        toast({
          title: 'Error',
          description: 'Failed to load attendance payment stats.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAttendanceStats(false);
      }
    };

    fetchAttendanceStats();
  }, [open, employee?.id, isAttendancePayment, yearMonth]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentTypeId) {
      newErrors.paymentType = 'Payment type is required';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (isAttendancePayment && !yearMonth) {
      newErrors.yearMonth = 'Month is required for attendance payment';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        employee_id: Number(employee?.id),
        date,
        payment_type: Number(paymentTypeId),
        amount: Number(amount),
        description: description.trim(),
        year_month: isAttendancePayment ? yearMonth : null,
      };

      let response = await fetch('http://localhost:8000/payment/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && (response.status === 404 || response.status === 405)) {
        response = await fetch('http://localhost:8000/payment/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save payment');
      }

      toast({
        title: 'Payment Added',
        description: `${selectedPaymentType?.payment_type ?? 'Payment'} of ${Number(amount).toLocaleString()} DA has been recorded.`,
      });

      setAmount('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setYearMonth(format(new Date(), 'yyyy-MM'));
      setDescription('');
      setAttendanceStats(null);
      setErrors({});

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add payment.',
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

  const isDeduction = selectedPaymentType?.payment_type?.toLowerCase() === 'deduction';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Add Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for {employee?.fullName || 'the selected employee'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Employee Info */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <p className="font-semibold">{employee?.fullName || 'Not selected'}</p>
            <p className="text-sm text-muted-foreground">{employee?.jobTitle}</p>
          </div>

          {/* Dues Summary for non-attendance types */}
          {!isAttendancePayment && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Employee Dues</Label>
              <p className="text-2xl font-bold">{Number(employee?.dues ?? 0).toLocaleString()} DA</p>
              <p className="text-xs text-muted-foreground">Shown for payment types other than attendence.</p>
            </div>
          )}

          {/* Attendance stats and total calculation */}
          {isAttendancePayment && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <Label className="text-xs text-muted-foreground">Attendance Payment Stats</Label>
              <div className="space-y-2">
                <Label htmlFor="year-month">Month</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="year-month"
                    type="month"
                    value={yearMonth}
                    onChange={(e) => setYearMonth(e.target.value)}
                    className={cn('pl-9', errors.yearMonth && 'border-destructive')}
                  />
                </div>
                {errors.yearMonth && <p className="text-sm text-destructive">{errors.yearMonth}</p>}
              </div>

              {isLoadingAttendanceStats ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attendance stats...
                </div>
              ) : attendanceStats ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p>Present: <span className="font-semibold">{attendanceStats.present ?? 0}</span></p>
                    <p>Absent: <span className="font-semibold">{attendanceStats.absent ?? 0}</span></p>
                    <p>Late: <span className="font-semibold">{attendanceStats.late ?? 0}</span></p>
                    <p>Overtime: <span className="font-semibold">{attendanceStats.overtime ?? 0}</span></p>
                    <p>Paid Vacation: <span className="font-semibold">{attendanceStats.paid_vacation ?? 0}</span></p>
                    <p>Not Paid Vacation: <span className="font-semibold">{attendanceStats.not_paid_vacation ?? 0}</span></p>
                  </div>

                  {computedAttendanceTotals ? (
                    <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                      <p>
                        Base: {computedAttendanceTotals.monthPrice.toLocaleString()} - absent ({computedAttendanceTotals.absent} x {Number(attendanceStats?.day_price ?? 0).toLocaleString()}) - not paid vacation ({computedAttendanceTotals.notPaidVacation} x {Number(attendanceStats?.day_price ?? 0).toLocaleString()})
                      </p>
                      <p>Subtotal: <span className="font-semibold">{computedAttendanceTotals.subtotal.toLocaleString()} DA</span></p>
                      <p>
                        Final: subtotal - late ({computedAttendanceTotals.late} x {Number(attendanceStats?.hour_price ?? 0).toLocaleString()}) + overtime ({computedAttendanceTotals.overtime} x {Number(attendanceStats?.overtime_price ?? attendanceStats?.hour_price ?? 0).toLocaleString()})
                      </p>
                      <p className="text-base font-bold">Total Payment: {computedAttendanceTotals.total.toLocaleString()} DA</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Auto calculation is shown only when salary type is monthly.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No stats available for the selected month.</p>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={paymentTypeId} onValueChange={setPaymentTypeId}>
                <SelectTrigger className={cn(isDeduction && 'border-destructive bg-destructive/5')}>
                  <SelectValue placeholder={isLoadingTypes ? 'Loading types...' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      <div className="flex items-center gap-2 capitalize">
                        {type.payment_type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentType && (
                <p className="text-sm text-destructive">{errors.paymentType}</p>
              )}
              {isDeduction && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This will be recorded as a deduction
                </p>
              )}
            </div>

            {/* Amount & Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (DA)</Label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn('pl-9', errors.amount && 'border-destructive')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={errors.date ? 'border-destructive' : ''}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter payment description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={errors.description ? 'border-destructive' : ''}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !amount || !paymentTypeId || isLoadingTypes}
            className={cn(isDeduction && 'bg-destructive hover:bg-destructive/90')}
          >
            {isSubmitting ? 'Saving...' : isDeduction ? 'Record Deduction' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
