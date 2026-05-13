import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, Palmtree } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { PayrollChart } from '@/components/dashboard/PayrollChart';
import { VacationChart } from '@/components/dashboard/VacationChart';
import { useToast } from '@/hooks/use-toast';

type DashboardStats = {
  total_emps: number;
  total_active_emps: number;
  total_att_percent: number;
  total_vacation: number;
};

const Dashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch('http://localhost:8000/stat/dashbord/cards');
        const json = await res.json();
        if (json.status && json.data) {
          setStats(json.data);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard statistics',
          variant: 'destructive',
        });
      }
    };
    fetchDashboardStats();
  }, [toast]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title text-xl md:text-2xl">Dashboard</h1>
        <p className="page-description text-sm md:text-base">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards - Stack on mobile, 2 columns on tablet, 4 on desktop */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Employees"
          value={stats?.total_emps || 0}
          icon={Users}
          variant="default"
        />
        <KPICard
          title="Active Employees"
          value={stats?.total_active_emps || 0}
          icon={UserCheck}
          variant="success"
          trend={{ value: 5, isPositive: true }}
        />
        <KPICard
          title="Attendance Rate"
          value={`${stats?.total_att_percent?.toFixed(1) || 0}%`}
          icon={Clock}
          variant="info"
        />
        <KPICard
          title="On Vacation"
          value={stats?.total_vacation || 0}
          subtitle="employees"
          icon={Palmtree}
          variant="info"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <h3 className="mb-4 text-base md:text-lg font-semibold">Quick Actions</h3>
        <QuickActions />
      </div>

      {/* Charts - Stack on mobile/tablet, 2+1 on desktop */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceChart />
        </div>
        <PayrollChart />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <VacationChart />
        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <h3 className="mb-4 text-base md:text-lg font-semibold">Recent Activity</h3>
          <div className="space-y-3 md:space-y-4">
            {[
              { action: 'Vacation approved', detail: 'Robert Kim - 5 days', time: '2 hours ago' },
              { action: 'Payment processed', detail: 'January salaries - $28,120', time: '1 day ago' },
              { action: 'New employee added', detail: 'Lisa Martinez - Customer Service', time: '3 days ago' },
              { action: 'Attendance alert', detail: 'James Wilson marked absent', time: 'Today' },
            ].map((item, i) => (
              <div key={i} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-medium text-foreground text-sm md:text-base">{item.action}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
