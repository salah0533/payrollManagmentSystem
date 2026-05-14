import { apiRequest } from "@/lib/api-client";
import type { Employee, EmployeeReference, SalaryType } from "@/types/domain";

export const employeeApi = {
  list() {
    return apiRequest<Employee[]>("/employee/");
  },
  getMyProfile() {
    return apiRequest<Employee>("/me/profile");
  },
  get(employeeId: number) {
    return apiRequest<Employee>(`/employee/${employeeId}`);
  },
  create(payload: Record<string, unknown>) {
    return apiRequest<Employee>("/employee/", {
      method: "POST",
      body: payload,
    });
  },
  update(employeeId: number, payload: Record<string, unknown>) {
    return apiRequest<Employee>(`/employee/${employeeId}`, {
      method: "PUT",
      body: payload,
    });
  },
  remove(employeeId: number) {
    return apiRequest<null>(`/employee/${employeeId}`, {
      method: "DELETE",
    });
  },
  getSalaryTypes() {
    return apiRequest<SalaryType[]>("/salary_types/");
  },
  getDepartments() {
    return apiRequest<EmployeeReference[]>("/employee-references/departments");
  },
  createDepartment(name: string) {
    return apiRequest<EmployeeReference>("/employee-references/departments", {
      method: "POST",
      body: { name },
    });
  },
  getPositions() {
    return apiRequest<EmployeeReference[]>("/employee-references/positions");
  },
  createPosition(name: string) {
    return apiRequest<EmployeeReference>("/employee-references/positions", {
      method: "POST",
      body: { name },
    });
  },
};
