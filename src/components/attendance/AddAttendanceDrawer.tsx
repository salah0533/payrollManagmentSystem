import { useState, useEffect, useMemo } from 'react';
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
  employees?: Array<{
    id: string;
    fullName: string;
    jobTitle: string;
    dailyWorkHours: number;
  }>;
  selectedEmployeeId?: string;
  onEmployeeChange?: (employeeId: string) => void;
  onSuccess?: () => void;
}

type AttType = { id: number; attendence_type: string };

export function AddAttendanceDrawer({
  open,
  onOpenChange,
  employee,
  employees = [],
  selectedEmployeeId,
  onEmployeeChange,
  onSuccess,
}: AddAttendanceDrawerProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceTypeId, setAttendanceTypeId] = useState<number | null>(null);
  const [entryTime, setEntryTime] = useState('08:00');
  const [hasExitTime, setHasExitTime] = useState(true);
  const [workedHours, setWorkedHours] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attTypes, setAttTypes] = useState<AttType[]>([]);

  const selectedEmployee = useMemo(() => {
    if (employees.length > 0 && selectedEmployeeId) {
      return employees.find((emp) => String(emp.id) === String(selectedEmployeeId));
    }
    return employee;
  }, [employees, selectedEmployeeId, employee]);

  const addHoursToTime = (time: string, hoursToAdd: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + Math.round(hoursToAdd * 60));
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const [exitTime, setExitTime] = useState(() =>
    addHoursToTime('08:00', selectedEmployee?.dailyWorkHours ?? 8)
  );
  const entryTimeChange = (newEntryTime: string) => {
    setEntryTime(newEntryTime);
    const dailyHours = selectedEmployee?.dailyWorkHours ?? 8;
    const newExitTime = addHoursToTime(newEntryTime, dailyHours);
    setExitTime(newExitTime); 
  }
  useEffect(() => {
    const fetchAttTypes = async () => {
      try {
        const res = await fetch('http://localhost:8000/att_types/');
        const json = await res.json();
        const types = json?.data || [];
        setAttTypes(types);
        if (types.length > 0) {
          setAttendanceTypeId(types[0].id);
        }
      } catch {
        setAttTypes([]);
      }
    };
    fetchAttTypes();
  }, []);

  const getTypeName = (t: AttType) => t.attendence_type;

  const getAbsentTypeId = () => {
    const absentType = attTypes.find((t) =>
      getTypeName(t).toLowerCase().includes('absent')
    );
    
    return absentType?.id;
  };


  const handleMarkAbsent = async () => {
    if (!date) return;
    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: Number(selectedEmployee?.id),
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
        description: `${selectedEmployee?.fullName || 'Employee'} marked as absent on ${date}.`,
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
    if (!selectedEmployee?.id) newErrors.employee = 'Employee is required';
    if (!date) newErrors.date = 'Date is required';
    if (!entryTime) newErrors.entryTime = 'Entry time is required';
    if (selectedEmployee && workedHours > (selectedEmployee.dailyWorkHours ?? 8) + 4) {
      newErrors.workedHours = `Worked hours exceed maximum allowed (${(selectedEmployee.dailyWorkHours ?? 8) + 4}h)`;
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
        description: `Attendance for ${selectedEmployee?.fullName || 'employee'} saved.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-calculate worked hours when times change
  useEffect(() => {
    if (!hasExitTime || !entryTime || !exitTime) {
      setWorkedHours(0);
      return;
    }

    const [eH, eM] = entryTime.split(':').map(Number);
    const [xH, xM] = exitTime.split(':').map(Number);
    const diff = (xH * 60 + xM) - (eH * 60 + eM);

    if (diff > 0) {
      setWorkedHours(Math.round((diff / 60) * 100) / 100);
    } else {
      setWorkedHours(0); // ensure value updates when exit <= entry
    }
  }, [entryTime, exitTime, hasExitTime]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Add Attendance
          </SheetTitle>
          <SheetDescription>
            Record attendance for {selectedEmployee?.fullName || 'the selected employee'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {employees.length > 0 ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={onEmployeeChange}
              >
                <SelectTrigger className={errors.employee ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.employee}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <p className="font-semibold">{selectedEmployee?.fullName || 'Not selected'}</p>
              <p className="text-sm text-muted-foreground">{selectedEmployee?.jobTitle}</p>
            </div>
          )}

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
                onChange={(e) => entryTimeChange(e.target.value)}
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
                  {selectedEmployee && (
                    <div className="text-sm text-muted-foreground">
                      <p>Daily: {selectedEmployee.dailyWorkHours}h</p>
                      {workedHours > selectedEmployee.dailyWorkHours && (
                        <p className="text-warning">
                          +{(workedHours - selectedEmployee.dailyWorkHours).toFixed(2)}h extra
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
