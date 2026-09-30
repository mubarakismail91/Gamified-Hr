import { useSession } from "@/context/SessionContext";
import EmployeeDashboard from "./dashboards/EmployeeDashboard";
import ManagerDashboard from "./dashboards/ManagerDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

/** Each role gets its own dashboard layout — same components, different focus. */
export default function Dashboard() {
  const { role } = useSession();
  if (role === "manager") return <ManagerDashboard />;
  if (role === "admin") return <AdminDashboard />;
  return <EmployeeDashboard />;
}
