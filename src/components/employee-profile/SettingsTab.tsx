import { useEffect, useMemo, useState } from 'react';
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

interface EmployeeSettingsTabProps {
  employee: any;
  onUpdated?: (employee: any) => void;
}

type SalaryType = {
  id: number;
  salary_type: string;
};

export function EmployeeSettingsTab({ employee, onUpdated }: EmployeeSettingsTabProps) {
  const [salaryTypes, setSalaryTypes] = useState<SalaryType[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  console.log('EmployeeSettingsTab received employee:', employee);
  const initialForm = useMemo(
    () => ({
      fullname: employee?.fullName ?? employee?.fullname ?? '',
      job_title: employee?.jobTitle ?? employee?.job_title ?? '',
      phone: employee?.phone ?? '',
      email: employee?.email ?? '',
      dues: employee?.dues ?? 0,
      daily_work_hours: employee?.daily_work_hours ?? employee?.dailyWorkHours ?? 0,
      extra_hours_price: employee?.extra_hours_price ?? employee?.extraHoursPrice ?? 0,
      hour_price: employee?.hour_price ?? employee?.hourPrice ?? 0,
      day_price: employee?.day_price ?? employee?.dayPrice ?? 0,
      monthly_price: employee?.monthly_price ?? employee?.monthPrice ?? 0,
      vacation_days: employee?.vacation_days ?? employee?.vacationDays ?? 0,
      salary_type: employee?.salary_type ?? employee?.salaryType ?? 0,
      is_active: employee?.is_active ?? employee?.isActive ?? true,
      allowed_late: employee?.allowed_late ?? employee?.allowedLate ?? 0,
      min_extraTime: employee?.min_extraTime ?? employee?.minExtraTime ?? 0,
    }),
    [employee]
  );

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  useEffect(() => {
    const fetchSalaryTypes = async () => {
      try {
        const response = await fetch('http://localhost:8000/salary_types');
        const json = await response.json();
        setSalaryTypes(json?.data || []);
      } catch {
        setSalaryTypes([]);
      }
    };

    fetchSalaryTypes();
  }, []);

  const toNullableNumber = (next: number, current: number) =>
    Number(next) === Number(current) ? null : Number(next);

  const toNullableString = (next: string, current: string) =>
    next === current ? null : next;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.id) return;

    const payload = {
      id: Number(employee.id),
      fullname: toNullableString(formData.fullname, employee.fullName ?? employee.fullname ?? ''),
      job_title: toNullableString(formData.job_title, employee.jobTitle ?? employee.job_title ?? ''),
      phone: toNullableString(formData.phone, employee.phone ?? ''),
      email: toNullableString(formData.email, employee.email ?? ''),
      dues: toNullableNumber(formData.dues, employee.dues ?? 0),
      daily_work_hours: toNullableNumber(
        formData.daily_work_hours,
        employee.daily_work_hours ?? employee.dailyWorkHours ?? 0
      ),
      extra_hours_price: toNullableNumber(
        formData.extra_hours_price,
        employee.extra_hours_price ?? employee.extraHoursPrice ?? 0
      ),
      hour_price: toNullableNumber(formData.hour_price, employee.hour_price ?? employee.hourPrice ?? 0),
      day_price: toNullableNumber(formData.day_price, employee.day_price ?? employee.dayPrice ?? 0),
      monthly_price: toNullableNumber(
        formData.monthly_price,
        employee.monthly_price ?? employee.monthPrice ?? 0
      ),
      vacation_days: toNullableNumber(
        formData.vacation_days,
        employee.vacation_days ?? employee.vacationDays ?? 0
      ),
      salary_type: toNullableNumber(formData.salary_type, employee.salary_type ?? employee.salaryType ?? 0),
      is_active:
        formData.is_active === (employee.is_active ?? employee.isActive ?? true) ? null : formData.is_active,
      allowed_late: toNullableNumber(
        formData.allowed_late,
        employee.allowed_late ?? employee.allowedLate ?? 0
      ),
      min_extraTime: toNullableNumber(
        formData.min_extraTime,
        employee.min_extraTime ?? employee.minExtraTime ?? 0
      ),
    };
    console.log('employee:', employee);
    console.log('Submitting payload:', payload);
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/employee/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      const mergedEmployee = {
        ...employee,
        fullName: payload.fullname ?? employee.fullName,
        jobTitle: payload.job_title ?? employee.jobTitle,
        phone: payload.phone ?? employee.phone,
        email: payload.email ?? employee.email,
        dues: payload.dues ?? employee.dues,
        daily_work_hours: payload.daily_work_hours ?? employee.daily_work_hours,
        dailyWorkHours: payload.daily_work_hours ?? employee.dailyWorkHours,
        extra_hours_price: payload.extra_hours_price ?? employee.extra_hours_price,
        extraHoursPrice: payload.extra_hours_price ?? employee.extraHoursPrice,
        hour_price: payload.hour_price ?? employee.hour_price,
        hourPrice: payload.hour_price ?? employee.hourPrice,
        day_price: payload.day_price ?? employee.day_price,
        dayPrice: payload.day_price ?? employee.dayPrice,
        monthly_price: payload.monthly_price ?? employee.monthly_price,
        monthPrice: payload.monthly_price ?? employee.monthPrice,
        vacation_days: payload.vacation_days ?? employee.vacation_days,
        vacationDays: payload.vacation_days ?? employee.vacationDays,
        salary_type: payload.salary_type ?? employee.salary_type,
        salaryType: payload.salary_type ?? employee.salaryType,
        is_active: payload.is_active ?? employee.is_active,
        isActive: payload.is_active ?? employee.isActive,
        allowed_late: payload.allowed_late ?? employee.allowed_late,
        allowedLate: payload.allowed_late ?? employee.allowedLate,
        min_extraTime: payload.min_extraTime ?? employee.min_extraTime,
        minExtraTime: payload.min_extraTime ?? employee.minExtraTime,
        status: (payload.is_active ?? employee.is_active ?? employee.isActive) ? 'active' : 'inactive',
      };

      onUpdated?.(mergedEmployee);
      setMessage('Employee updated successfully.');
    } catch {
      setMessage('Failed to update employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullname">Full Name</Label>
          <Input
            id="fullname"
            value={formData.fullname}
            onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">Job Title</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary_type">Salary Type</Label>
          <Select
            value={String(formData.salary_type)}
            onValueChange={(value) =>
              setFormData({ ...formData, salary_type: Number(value) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select salary type" />
            </SelectTrigger>
            <SelectContent>
              {salaryTypes.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.salary_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="is_active">Status</Label>
          <Select
            value={String(formData.is_active)}
            onValueChange={(value) =>
              setFormData({ ...formData, is_active: value === 'true' })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dues">Dues</Label>
          <Input
            id="dues"
            type="number"
            value={formData.dues}
            onChange={(e) => setFormData({ ...formData, dues: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="daily_work_hours">Daily Work Hours</Label>
          <Input
            id="daily_work_hours"
            type="number"
            value={formData.daily_work_hours}
            onChange={(e) =>
              setFormData({ ...formData, daily_work_hours: Number(e.target.value) || 0 })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra_hours_price">Extra Hours Price</Label>
          <Input
            id="extra_hours_price"
            type="number"
            value={formData.extra_hours_price}
            onChange={(e) =>
              setFormData({ ...formData, extra_hours_price: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hour_price">Hour Price</Label>
          <Input
            id="hour_price"
            type="number"
            value={formData.hour_price}
            onChange={(e) =>
              setFormData({ ...formData, hour_price: Number(e.target.value) || 0 })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="day_price">Day Price</Label>
          <Input
            id="day_price"
            type="number"
            value={formData.day_price}
            onChange={(e) =>
              setFormData({ ...formData, day_price: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly_price">Monthly Price</Label>
          <Input
            id="monthly_price"
            type="number"
            value={formData.monthly_price}
            onChange={(e) =>
              setFormData({ ...formData, monthly_price: Number(e.target.value) || 0 })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacation_days">Vacation Days</Label>
          <Input
            id="vacation_days"
            type="number"
            value={formData.vacation_days}
            onChange={(e) =>
              setFormData({ ...formData, vacation_days: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowed_late">Allowed Late</Label>
          <Input
            id="allowed_late"
            type="number"
            value={formData.allowed_late}
            onChange={(e) =>
              setFormData({ ...formData, allowed_late: Number(e.target.value) || 0 })
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="min_extraTime">Min Extra Time</Label>
          <Input
            id="min_extraTime"
            type="number"
            value={formData.min_extraTime}
            onChange={(e) =>
              setFormData({ ...formData, min_extraTime: Number(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
