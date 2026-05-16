import { adminNavigation } from "@/components/layout/navigation";
import { RoleLayout } from "@/components/layout/RoleLayout";

export function AdminLayout() {
  return <RoleLayout brandLabelKey="layout.brand.admin" items={adminNavigation} />;
}
