import { hrNavigation } from "@/components/layout/navigation";
import { RoleLayout } from "@/components/layout/RoleLayout";

export function HRLayout() {
  return <RoleLayout brandLabelKey="layout.brand.hr" items={hrNavigation} />;
}
