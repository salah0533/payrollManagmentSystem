import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (employee: any) => void;
}

export function AddEmployeeModal({ open, onOpenChange, onAdd }: AddEmployeeModalProps) {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    job_title: '',
    dues: 0,
    daily_work_hours: 8, // keep reset consistent
    extra_hours_price: 0,
    hour_price: 0,
    day_price: 0,
    month_price: 0,
    vacation_days: 0,
    salary_type: 0,
    is_active: true,
    allowed_late: 0,
    min_extraTime: 0,
  });
  const [salaryTypes, setSalaryTypes] = useState([]); // State for salary types
  const monthPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const monthPrice = Number(e.target.value);

    setFormData((prev) => {
      const dayPrice = monthPrice / 30;
      const hourPrice = prev.daily_work_hours > 0 ? dayPrice / prev.daily_work_hours : 0;

      return {
        ...prev,
        month_price: monthPrice,
        day_price: dayPrice.toFixed(2),
        hour_price: hourPrice.toFixed(2),
      };
    });
  }
  const dayPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dayPrice = Number(e.target.value);

    setFormData((prev) => {
      const hourPrice = prev.daily_work_hours > 0 ? dayPrice / prev.daily_work_hours : 0;

      return {
        ...prev,
        day_price: dayPrice.toFixed(2),
        hour_price: hourPrice.toFixed(2),
      };
    });
  }
  useEffect(() => {
    // Fetch salary types from the backend
    const fetchSalaryTypes = async () => {
      const response = await fetch('http://localhost:8000/salary_types');
      const data = await response.json();
      setSalaryTypes(data.data); // Update to access the correct data structure
    };
    fetchSalaryTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:8000/employee/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    onAdd?.(formData);
    onOpenChange(false);
    setFormData({
      fullname: '',
      email: '',
      phone: '',
      job_title: '',
      dues: 0,
      daily_work_hours: 0, // keep reset consistent
      extra_hours_price: 0,
      hour_price: 0,
      day_price: 0,
      month_price: 0,
      vacation_days: 0,
      salary_type: 0,
      is_active: true,
      allowed_late: 0,
      min_extraTime: 0,
    });
  };

  const formContent = (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 m-1">
        <div className="space-y-2">
          <Label htmlFor="fullname">Full Name</Label>
          <Input
            id="fullname"
            value={formData.fullname}
            onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@store.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+213780122675"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">Job Title</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            placeholder="Software Engineer"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary_type">Salary Type</Label>
          <Select
            value={String(formData.salary_type)}
            onValueChange={(value) => setFormData({ ...formData, salary_type: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {salaryTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.salary_type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="month_price">Month Price</Label>
          <Input
            id="month_price"
            type="number"
            value={formData.month_price}
            onChange={monthPriceChange} // changed
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="day_price">Day Price</Label>
          <Input
            id="day_price"
            type="number"
            value={formData.day_price}
            onChange={dayPriceChange}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hour_price">Hour Price</Label>
          <Input
            id="hour_price"
            type="number"
            value={formData.hour_price}
            onChange={(e) => setFormData({ ...formData, hour_price: Number(e.target.value) })}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="daily_work_hours">Daily Work Hours</Label>
          <Input
            id="daily_work_hours"
            type="number"
            min={1}
            value={formData.daily_work_hours}
            onChange={(e) =>
              setFormData({ ...formData, daily_work_hours: Number(e.target.value) || 0 })
            }
            placeholder="8"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dues">Dues</Label>
          <Input
            id="dues"
            type="number"
            value={formData.dues}
            onChange={(e) => setFormData({ ...formData, dues: Number(e.target.value) || 0 })}
            placeholder="0"
            required
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
            placeholder="0"
            required
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
            placeholder="0"
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="allowed_late">Allowed Late (minutes)</Label>
          <Input
            id="allowed_late"
            type="number"
            value={formData.allowed_late}
            onChange={(e) =>
              setFormData({ ...formData, allowed_late: Number(e.target.value) || 0 })
            }
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_extraTime">Min Extra Time (minutes)</Label>
          <Input
            id="min_extraTime"
            type="number"
            value={formData.min_extraTime}
            onChange={(e) =>
              setFormData({ ...formData, min_extraTime: Number(e.target.value) || 0 })
            }
            placeholder="0"
            required
          />
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
      </div>
    </div>
  );

  // Mobile: Full-screen drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>Add New Employee</DrawerTitle>
            <DrawerDescription>
              Enter the details for the new employee.
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 px-4">
            <ScrollArea className="h-full">
              <form id="add-employee-form" onSubmit={handleSubmit} className="pb-4">
                {formContent}
              </form>
            </ScrollArea>
          </div>

          <DrawerFooter className="pt-4 shrink-0">
            <Button type="submit" form="add-employee-form">Add Employee</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the details for the new employee. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col">
          <ScrollArea className="h-full py-4 pr-3">
            {formContent}
          </ScrollArea>
          <DialogFooter className="flex-col gap-2 sm:flex-row shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Employee</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
