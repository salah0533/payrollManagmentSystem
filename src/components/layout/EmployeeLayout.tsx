import { employeeNavigation } from "@/components/layout/navigation";
import { RoleLayout } from "@/components/layout/RoleLayout";

export function EmployeeLayout() {
  return <RoleLayout brandLabel="Employee Self-Service" items={employeeNavigation} />;
}
