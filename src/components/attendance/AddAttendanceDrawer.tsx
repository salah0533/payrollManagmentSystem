import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, AlertCircle } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';

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

type AttType = { id: number; att_type?: string; attendance_type?: string };

export function AddAttendanceDrawer({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: AddAttendanceDrawerProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceTypeId, setAttendanceTypeId] = useState<number>(0);
  const [entryTime, setEntryTime] = useState('09:00');
  const [exitTime, setExitTime] = useState('17:00');
  const [hasExitTime, setHasExitTime] = useState(true);
  const [workedHours, setWorkedHours] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attTypes, setAttTypes] = useState<AttType[]>([]);

  useEffect(() => {
    const fetchAttTypes = async () => {
      try {
        const res = await fetch('http://localhost:8000/att_types/');
        const json = await res.json();
        setAttTypes(json?.data || []);
        if ((json?.data || []).length > 0) {
          setAttendanceTypeId(json.data[0].id);
        }
      } catch {
        setAttTypes([]);
      }
    };
    fetchAttTypes();
  }, []);

  const getTypeName = (t: AttType) => t.att_type ?? t.attendance_type ?? t.attendence_type ?? String(t.id);

  const getAbsentTypeId = () => {
    const absentType = attTypes.find((t) =>
      getTypeName(t).toLowerCase().includes('absent')
    );
    return absentType?.id ?? attendanceTypeId;
  };

  const handleMarkAbsent = async () => {
    if (!date) return;
    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: Number(employee?.id),
        date,
        entry_time: null,
        exit_time: null,
        attendence_type: getAbsentTypeId(),
      };

      const res = await fetch('http://localhost:8000/attendance/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to mark absent');

      toast({
        title: 'Marked Absent',
        description: `${employee?.fullName || 'Employee'} marked as absent on ${date}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to mark absent.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required';
    if (!entryTime) newErrors.entryTime = 'Entry time is required';
    if (employee && workedHours > (employee.dailyWorkHours ?? 8) + 4) {
      newErrors.workedHours = `Worked hours exceed maximum allowed (${(employee.dailyWorkHours ?? 8) + 4}h)`;
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
        entry_time: entryTime + ':00',
        exit_time: hasExitTime ? exitTime + ':00' : null,
        attendence_type: attendanceTypeId,
      };

      const res = await fetch('http://localhost:8000/attendance/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save attendance');

      toast({
        title: 'Attendance Added',
        description: `Attendance for ${employee?.fullName || 'employee'} saved.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <p className="font-semibold">{employee?.fullName || 'Not selected'}</p>
            <p className="text-sm text-muted-foreground">{employee?.jobTitle}</p>
          </div>

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
                  <AlertCircle className="h-3 w-3" />{errors.date}
                </p>
              )}
            </div>

            {/* Attendance Type from backend */}
            <div className="space-y-2">
              <Label htmlFor="type">Attendance Type</Label>
              <Select
                value={String(attendanceTypeId)}
                onValueChange={(v) => setAttendanceTypeId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {attTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.attendence_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  <AlertCircle className="h-3 w-3" />{errors.entryTime}
                </p>
              )}
            </div>

            {/* Exit Time (optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="exitTime">Exit Time</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setHasExitTime((v) => !v)}
                >
                  {hasExitTime ? 'Remove exit time' : 'Add exit time'}
                </button>
              </div>
              {hasExitTime && (
                <Input
                  id="exitTime"
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                />
              )}
            </div>

            {/* Worked Hours */}
            {hasExitTime && (
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
                    <AlertCircle className="h-3 w-3" />{errors.workedHours}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-8 flex flex-col gap-2">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => { setErrors({}); onOpenChange(false); }} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={handleMarkAbsent}
            disabled={isSubmitting}
            className="w-full"
          >
            Mark as Absent
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
