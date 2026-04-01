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

type AnnualVacation = {
  allowed_days: number;
  year: number;
  employee_id: number;
};

export function EmployeeSettingsTab({ employee, onUpdated }: EmployeeSettingsTabProps) {
  const [salaryTypes, setSalaryTypes] = useState<SalaryType[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showAnnualVacations, setShowAnnualVacations] = useState(false);
  const [annualVacations, setAnnualVacations] = useState<AnnualVacation[]>([]);
  const [loadingAnnualVacations, setLoadingAnnualVacations] = useState(false);
  const [addingAnnualVacation, setAddingAnnualVacation] = useState(false);
  const [annualVacationMessage, setAnnualVacationMessage] = useState('');
  const [newAnnualYear, setNewAnnualYear] = useState<number>(new Date().getFullYear());
  const [newAllowedDays, setNewAllowedDays] = useState<number>(21);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editingAllowedDays, setEditingAllowedDays] = useState<number>(0);
  const [editingOrDeleting, setEditingOrDeleting] = useState(false);

  const initialForm = useMemo(
    () => ({
      fullname: employee?.fullName ?? employee?.fullname ?? '',
      job_title: employee?.jobTitle ?? employee?.job_title ?? '',
      phone: employee?.phone ?? '',
      email: employee?.email ?? '',
      joined: employee?.joined ?? employee?.hireDate ?? '',
      dues: employee?.dues ?? 0,
      daily_work_hours: employee?.daily_work_hours ?? employee?.dailyWorkHours ?? 0,
      extra_hours_price: employee?.extra_hours_price ?? employee?.extraHoursPrice ?? 0,
      hour_price: employee?.hour_price ?? employee?.hourPrice ?? 0,
      day_price: employee?.day_price ?? employee?.dayPrice ?? 0,
      monthly_price: employee?.monthly_price ?? employee?.monthPrice ?? 0,
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

  const loadAnnualVacations = async () => {
    if (!employee?.id) return;

    setLoadingAnnualVacations(true);
    setAnnualVacationMessage('');
    try {
      const response = await fetch(`http://localhost:8000/annual_vacations/${employee.id}`);
      const json = await response.json();
      const rows: AnnualVacation[] = Array.isArray(json?.data) ? json.data : [];
      setAnnualVacations(rows.sort((a, b) => Number(b.year) - Number(a.year)));
    } catch {
      setAnnualVacations([]);
      setAnnualVacationMessage('Failed to load annual vacations.');
    } finally {
      setLoadingAnnualVacations(false);
    }
  };

  useEffect(() => {
    if (showAnnualVacations) {
      loadAnnualVacations();
    }
  }, [showAnnualVacations, employee?.id]);

  const handleAddAnnualVacation = async () => {
    if (!employee?.id) return;

    if (!newAnnualYear || newAllowedDays < 0) {
      setAnnualVacationMessage('Please enter valid year and allowed days.');
      return;
    }

    setAddingAnnualVacation(true);
    setAnnualVacationMessage('');

    try {
      const payload = {
        emp_id: Number(employee.id),
        year: Number(newAnnualYear),
        allowed_days: Number(newAllowedDays),
      };

      let response = await fetch('http://localhost:8000/annual_vacations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && (response.status === 404 || response.status === 405)) {
        response = await fetch('http://localhost:8000/annual_vacations/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to add annual vacation');
      }

      setAnnualVacationMessage('Annual vacation added successfully.');
      setNewAnnualYear(new Date().getFullYear());
      setNewAllowedDays(21);
      await loadAnnualVacations();
    } catch {
      setAnnualVacationMessage('Failed to add annual vacation.');
    } finally {
      setAddingAnnualVacation(false);
    }
  };

  const handleEditAnnualVacation = async (year: number) => {
    if (!employee?.id) return;

    if (editingAllowedDays < 0) {
      setAnnualVacationMessage('Allowed days must be 0 or greater.');
      return;
    }

    setEditingOrDeleting(true);
    setAnnualVacationMessage('');

    try {
      const payload = {
        emp_id: Number(employee.id),
        year: Number(year),
        allowed_days: Number(editingAllowedDays),
      };

      const response = await fetch('http://localhost:8000/annual_vacations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update annual vacation');
      }

      setAnnualVacationMessage('Annual vacation updated successfully.');
      setEditingYear(null);
      await loadAnnualVacations();
    } catch {
      setAnnualVacationMessage('Failed to update annual vacation.');
    } finally {
      setEditingOrDeleting(false);
    }
  };

  const handleDeleteAnnualVacation = async (year: number) => {
    if (!employee?.id) return;

    if (!window.confirm(`Are you sure you want to delete the ${year} vacation record?`)) {
      return;
    }

    setEditingOrDeleting(true);
    setAnnualVacationMessage('');

    try {
      const payload = {
        emp_id: Number(employee.id),
        year: Number(year),
      };

      const response = await fetch('http://localhost:8000/annual_vacations/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to delete annual vacation');
      }

      setAnnualVacationMessage('Annual vacation deleted successfully.');
      setEditingYear(null);
      await loadAnnualVacations();
    } catch {
      setAnnualVacationMessage('Failed to delete annual vacation.');
    } finally {
      setEditingOrDeleting(false);
    }
  };

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
      joined: toNullableString(formData.joined, employee.joined ?? employee.hireDate ?? ''),
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
        joined: payload.joined ?? employee.joined,
        hireDate: payload.joined ?? employee.hireDate,
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
          <Label htmlFor="joined">Joined Date</Label>
          <Input
            id="joined"
            type="date"
            value={formData.joined}
            onChange={(e) => setFormData({ ...formData, joined: e.target.value })}
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

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Annual Vacations</p>
            <p className="text-sm text-muted-foreground">Manage yearly allowed vacation days.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAnnualVacations((prev) => !prev)}
          >
            {showAnnualVacations ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showAnnualVacations && (
          <div className="space-y-4">
            {loadingAnnualVacations ? (
              <p className="text-sm text-muted-foreground">Loading annual vacations...</p>
            ) : annualVacations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No annual vacations found.</p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Year</th>
                      <th className="text-left p-2">Allowed Days</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualVacations.map((item, idx) => (
                      <tr key={`${item.year}-${idx}`} className="border-t border-border">
                        <td className="p-2">{item.year}</td>
                        <td className="p-2">
                          {editingYear === item.year ? (
                            <Input
                              type="number"
                              value={editingAllowedDays}
                              onChange={(e) => setEditingAllowedDays(Number(e.target.value) || 0)}
                              className="h-6 text-xs"
                            />
                          ) : (
                            item.allowed_days
                          )}
                        </td>
                        <td className="p-2 text-right space-x-1">
                          {editingYear === item.year ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => handleEditAnnualVacation(item.year)}
                                disabled={editingOrDeleting}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingYear(null)}
                                disabled={editingOrDeleting}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingYear(item.year);
                                  setEditingAllowedDays(item.allowed_days);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteAnnualVacation(item.year)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="annual-year">Year</Label>
                <Input
                  id="annual-year"
                  type="number"
                  value={newAnnualYear}
                  onChange={(e) => setNewAnnualYear(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual-allowed-days">Allowed Days</Label>
                <Input
                  id="annual-allowed-days"
                  type="number"
                  value={newAllowedDays}
                  onChange={(e) => setNewAllowedDays(Number(e.target.value) || 0)}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddAnnualVacation}
                disabled={addingAnnualVacation || !employee?.id}
              >
                {addingAnnualVacation ? 'Adding...' : 'Add Annual Vacation'}
              </Button>
            </div>

            {annualVacationMessage ? (
              <p className="text-sm text-muted-foreground">{annualVacationMessage}</p>
            ) : null}
          </div>
        )}
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
