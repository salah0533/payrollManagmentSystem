import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Employee } from '@/data/mockData';

interface AddAttendanceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: {
    id: string;
    fullName: string;
    jobTitle: string;
    dailyWorkHours: number;
  };
  onSuccess?: () => void;
}

const attendanceTypes = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'half-day', label: 'Half Day' },
];

export function AddAttendanceDrawer({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: AddAttendanceDrawerProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceType, setAttendanceType] = useState('present');
  const [entryTime, setEntryTime] = useState('09:00');
  const [exitTime, setExitTime] = useState('17:00');
  const [workedHours, setWorkedHours] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate worked hours when times change
  useEffect(() => {
    if (attendanceType === 'absent' || attendanceType === 'vacation') {
      setWorkedHours(0);
      return;
    }

    if (entryTime && exitTime) {
      const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
      const [exitHours, exitMinutes] = exitTime.split(':').map(Number);
      
      const entryInMinutes = entryHours * 60 + entryMinutes;
      const exitInMinutes = exitHours * 60 + exitMinutes;
      
      if (exitInMinutes > entryInMinutes) {
        const diffInHours = (exitInMinutes - entryInMinutes) / 60;
        setWorkedHours(Math.round(diffInHours * 100) / 100);
      }
    }
  }, [entryTime, exitTime, attendanceType]);

  // Validate against daily work hours
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (attendanceType !== 'absent' && attendanceType !== 'vacation') {
      if (!entryTime) {
        newErrors.entryTime = 'Entry time is required';
      }
      
      if (employee && workedHours > (employee.dailyWorkHours ?? 8) + 4) {
        newErrors.workedHours = `Worked hours exceed maximum allowed (${(employee.dailyWorkHours ?? 8) + 4}h)`;
      }
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
      title: 'Attendance Added',
      description: `Attendance record for ${employee?.fullName || 'employee'} has been saved.`,
    });
    
    setIsSubmitting(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleCancel = () => {
    setErrors({});
    onOpenChange(false);
  };

  const showTimeFields = attendanceType !== 'absent' && attendanceType !== 'vacation';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Add Attendance
          </SheetTitle>
          <SheetDescription>
            Record attendance for {employee?.fullName || 'the selected employee'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Employee Info (Read-only) */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <p className="font-semibold">{employee?.fullName || 'Not selected'}</p>
            <p className="text-sm text-muted-foreground">{employee?.jobTitle}</p>
          </div>

          {/* Form Grid */}
          <div className="grid gap-4">
            {/* Date */}
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
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.date}
                </p>
              )}
            </div>

            {/* Attendance Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Attendance Type</Label>
              <Select value={attendanceType} onValueChange={setAttendanceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {attendanceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Fields - Hidden for Absent/Vacation */}
            {showTimeFields && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Entry Time */}
                  <div className="space-y-2">
                    <Label htmlFor="entryTime">Entry Time</Label>
                    <Input
                      id="entryTime"
                      type="time"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className={errors.entryTime ? 'border-destructive' : ''}
                    />
                    {errors.entryTime && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.entryTime}
                      </p>
                    )}
                  </div>

                  {/* Exit Time */}
                  <div className="space-y-2">
                    <Label htmlFor="exitTime">Exit Time (Optional)</Label>
                    <Input
                      id="exitTime"
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Worked Hours (Auto-calculated) */}
                <div className="space-y-2">
                  <Label>Worked Hours</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-border bg-muted/50 p-3">
                      <span className="text-2xl font-bold">{workedHours}</span>
                      <span className="text-muted-foreground ml-1">hours</span>
                    </div>
                    {employee && (
                      <div className="text-sm text-muted-foreground">
                        <p>Daily: {employee.dailyWorkHours}h</p>
                        {workedHours > employee.dailyWorkHours && (
                          <p className="text-warning">
                            +{(workedHours - employee.dailyWorkHours).toFixed(2)}h extra
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.workedHours && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.workedHours}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Auto Attendance Indicator */}
            {employee?.autoAttendance && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                  Auto Attendance
                </Badge>
                <span className="text-sm text-muted-foreground">
                  This employee has auto-attendance enabled
                </span>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-8 flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Save Attendance'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
