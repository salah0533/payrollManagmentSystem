import { adminNavigation } from "@/components/layout/navigation";
import { RoleLayout } from "@/components/layout/RoleLayout";

export function AdminLayout() {
  return <RoleLayout brandLabel="Admin Interface" items={adminNavigation} />;
}
