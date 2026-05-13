import { hrNavigation } from "@/components/layout/navigation";
import { RoleLayout } from "@/components/layout/RoleLayout";

export function HRLayout() {
  return <RoleLayout brandLabel="HR Operations" items={hrNavigation} />;
}
