import { Home, Library, Activity } from "lucide-react";

export const MENU_ITEMS = (): {
  title: string;
  href: string;
  icon: React.ReactNode;
}[] => [
  {
    title: "Home",
    href: "/dashboard/home",
    icon: <Home className="w-5 h-5" />,
  },
  {
    title: "Library",
    href: "/dashboard/library",
    icon: <Library className="w-5 h-5" />,
  },
  {
    title: "Activity",
    href: "/dashboard/activity",
    icon: <Activity className="w-5 h-5" />,
  },
];
