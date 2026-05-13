import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, UserCircle2 } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";

export default function Profile() {
  const { currentUser } = useAuth();
  const employeeId = currentUser?.employee_id;

  const profileQuery = useQuery({
    queryKey: ["employee-profile", "self"],
    queryFn: () => employeeApi.getMyProfile(),
    enabled: Boolean(employeeId),
  });

  const profile = profileQuery.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Profile"
        description="Your employee profile is loaded from the backend employee record linked to your user account."
      />

      {profile ? (
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile.position || "Employee"}</p>
                  <div className="mt-2">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{profile.id}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Hire date</p>
                  <p className="font-medium">{formatDate(profile.hire_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact and work details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Daily work hours</p>
                  <p className="font-medium">{profile.daily_work_hours}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Vacation days</p>
                  <p className="font-medium">{profile.vacation_days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title={profileQuery.isLoading ? "Loading profile..." : "No linked employee profile"}
          description="Employee self-service requires the logged-in user to be linked to an employee record."
        />
      )}
    </div>
  );
}
