import { redirect } from "next/navigation";

const DashboardPage = async () => {
  return redirect("/dashboard/home");
};

export default DashboardPage;
