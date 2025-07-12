import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckSquare,
  Calendar,
  BarChart2,
  Users,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Coffee,
  Folders,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as UserEntity } from "@/api/entities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await UserEntity.me();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await UserEntity.logout();
    window.location.reload();
  };

  const navigation = [
    {
      name: "Tasks",
      icon: CheckSquare,
      href: createPageUrl("Tasks"),
      current: currentPageName === "Tasks"
    },
    {
      name: "Calendar",
      icon: Calendar,
      href: createPageUrl("Calendar"),
      current: currentPageName === "Calendar"
    },
    {
      name: "Projects",
      icon: Folders,
      href: createPageUrl("Projects"),
      current: currentPageName === "Projects"
    },
    {
      name: "Metrics",
      icon: BarChart2,
      href: createPageUrl("Metrics"),
      current: currentPageName === "Metrics"
    },
    {
      name: "Team",
      icon: UserPlus,
      href: createPageUrl("Team"),
      current: currentPageName === "Team"
    },
    {
      name: "Stakeholders",
      icon: Users,
      href: createPageUrl("Stakeholders"),
      current: currentPageName === "Stakeholders"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - now sticky */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Coffee className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">P&E Manager</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] justify-between">
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                    item.current
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
          
          <div className="p-4 border-t">
            {user && (
              <div className="mb-4 px-4 py-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-indigo-100">
                  <AvatarFallback className="text-indigo-700">
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Local User
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <Link
                to={createPageUrl("Settings")}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                  currentPageName === "Settings"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top navigation - now sticky */}
        <header className="sticky top-0 bg-white shadow-sm z-10">
          <div className="flex justify-between items-center h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="text-md font-medium text-gray-800">
                P&E Manager {currentPageName && <span className="text-gray-500"> &gt; {currentPageName}</span>}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

