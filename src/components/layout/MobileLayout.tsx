import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, CheckSquare, BookOpen, Wallet, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileLayout() {
  const location = useLocation();

  const navItems = [
    { name: "Inicio", path: "/dashboard", icon: Home },
    { name: "Tareas", path: "/tasks", icon: CheckSquare },
    { name: "Ranking", path: "/ranking", icon: Trophy },
    { name: "Cursos", path: "/training", icon: BookOpen },
    { name: "Billetera", path: "/wallet", icon: Wallet },
    { name: "Perfil", path: "/profile", icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon
                className={cn("w-6 h-6 mb-1", isActive && "fill-blue-100")}
              />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
