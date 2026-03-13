import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DollarSign, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Employee, payments } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  onSuccess?: () => void;
}

const paymentTypes = [
  { value: 'salary', label: 'Salary', icon: DollarSign },
  { value: 'bonus', label: 'Bonus', icon: TrendingUp },
  { value: 'deduction', label: 'Deduction', icon: TrendingDown },
];

export function AddPaymentModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: AddPaymentModalProps) {
  const [paymentType, setPaymentType] = useState('salary');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate payment summary for the employee
  const paymentSummary = useMemo(() => {
    if (!employee) return null;

    const employeePayments = payments.filter(p => p.employeeId === employee.id);
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyPayments = employeePayments.filter(p => p.date.startsWith(currentMonth));
    
    const monthlySalary = employee.monthPrice;
    const paidSoFar = monthlyPayments
      .filter(p => p.status === 'paid' && p.type !== 'deduction')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalDeductions = monthlyPayments
      .filter(p => p.type === 'deduction')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);
    
    const remainingDues = Math.max(0, monthlySalary - paidSoFar);
    const paidPercentage = (paidSoFar / monthlySalary) * 100;

    return {
      monthlySalary,
      paidSoFar,
      totalDeductions,
      remainingDues,
      paidPercentage: Math.min(100, paidPercentage),
    };
  }, [employee]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast({
      title: 'Payment Added',
      description: `${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} of $${amount} has been recorded.`,
    });
    
    // Reset form
    setPaymentType('salary');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setDescription('');
    setErrors({});
    
    setIsSubmitting(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  const isDeduction = paymentType === 'deduction';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
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

          {/* Payment Summary */}
          {paymentSummary && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <Label className="text-xs text-muted-foreground">Payment Summary (This Month)</Label>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Salary</p>
                  <p className="font-bold text-lg">${paymentSummary.monthlySalary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid So Far</p>
                  <p className="font-bold text-lg text-success">${paymentSummary.paidSoFar.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="font-bold text-lg text-warning">${paymentSummary.remainingDues.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Progress</span>
                  <span>{paymentSummary.paidPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={paymentSummary.paidPercentage} className="h-2" />
              </div>
              {paymentSummary.totalDeductions > 0 && (
                <p className="text-xs text-destructive">
                  Total Deductions: ${paymentSummary.totalDeductions.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className={cn(isDeduction && 'border-destructive bg-destructive/5')}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={cn(
                          'h-4 w-4',
                          type.value === 'deduction' && 'text-destructive',
                          type.value === 'bonus' && 'text-success'
                        )} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="amount">Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            disabled={isSubmitting || !amount}
            className={cn(isDeduction && 'bg-destructive hover:bg-destructive/90')}
          >
            {isSubmitting ? 'Saving...' : isDeduction ? 'Record Deduction' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
