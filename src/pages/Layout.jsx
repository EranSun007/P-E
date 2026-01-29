import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckSquare,
  Calendar,
  CalendarDays,
  BarChart2,
  Users,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Coffee,
  Folders,
  UserPlus,
  Eye,
  EyeOff,
  Github,
  Bug,
  Server,
  Map,
  ListTodo,
  TrendingUp,
  MessageSquare,
  Rocket,
  Inbox,
  FileCode,
  Search,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { User as UserEntity } from "@/api/entities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useDisplayMode } from "@/contexts/DisplayModeContext.jsx";
import { useAppMode } from "@/contexts/AppModeContext.jsx";
import { AIChatPanel, AIAssistantButton } from "@/components/ai";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const { logout, isAuthenticated } = useAuth();
  const { isPresentationMode, togglePresentationMode } = useDisplayMode();
  const { isProductMode, toggleAppMode } = useAppMode();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (!isAuthenticated) {
        setUser(null);
        setUserLoading(false);
        return;
      }

      try {
        setUserLoading(true);
        const userData = await UserEntity.me();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
  };

  const handleModeToggle = () => {
    toggleAppMode();
    // Navigate to the default page of the new mode
    if (isProductMode) {
      // Switching to People mode
      navigate('/Tasks');
    } else {
      // Switching to Product mode
      navigate('/Services');
    }
  };

  // People & Engineering Mode Navigation
  const peopleNavigation = [
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
      name: "Duties",
      icon: CalendarDays,
      href: createPageUrl("Duties"),
      current: currentPageName === "Duties"
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
    },
    {
      name: "Peers",
      icon: Users,
      href: createPageUrl("Peers"),
      current: currentPageName === "Peers"
    },
    {
      name: "GitHub",
      icon: Github,
      href: createPageUrl("GitHub"),
      current: currentPageName === "GitHubRepos"
    },
    {
      name: "Jira",
      icon: Bug,
      href: createPageUrl("Jira"),
      current: currentPageName === "JiraIssues"
    },
    {
      name: "Capture Inbox",
      icon: Inbox,
      href: createPageUrl("CaptureInbox"),
      current: currentPageName === "CaptureInbox"
    },
    {
      name: "Capture Rules",
      icon: FileCode,
      href: createPageUrl("CaptureRules"),
      current: currentPageName === "CaptureRules"
    },
    {
      name: "Bug Dashboard",
      icon: Bug,
      href: createPageUrl("BugDashboard"),
      current: currentPageName === "BugDashboard"
    },
    {
      name: "Knowledge Search",
      icon: Search,
      href: createPageUrl("KnowledgeSearch"),
      current: currentPageName === "KnowledgeSearch"
    },
    {
      name: "Team Sync",
      icon: Users,
      href: createPageUrl("TeamSync"),
      current: currentPageName === "TeamSync"
    },
    {
      name: "Team Status",
      icon: Activity,
      href: createPageUrl("TeamStatus"),
      current: currentPageName === "TeamStatus"
    }
  ];

  // Product & Engineering Mode Navigation
  const productNavigation = [
    {
      name: "My Services",
      icon: Server,
      href: createPageUrl("Services"),
      current: currentPageName === "Services"
    },
    {
      name: "My Roadmap",
      icon: Map,
      href: createPageUrl("Roadmap"),
      current: currentPageName === "Roadmap"
    },
    {
      name: "My Backlog",
      icon: ListTodo,
      href: createPageUrl("Backlog"),
      current: currentPageName === "Backlog"
    },
    {
      name: "Usage Analytics",
      icon: TrendingUp,
      href: createPageUrl("Analytics"),
      current: currentPageName === "Analytics"
    },
    {
      name: "Customer Feedback",
      icon: MessageSquare,
      href: createPageUrl("Feedback"),
      current: currentPageName === "Feedback"
    },
    {
      name: "Releases",
      icon: Rocket,
      href: createPageUrl("Releases"),
      current: currentPageName === "Releases"
    }
  ];

  const navigation = isProductMode ? productNavigation : peopleNavigation;

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300",
      isProductMode ? "bg-gray-800" : "bg-gray-50"
    )}>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - with mode-based theming */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          isProductMode ? "bg-gray-900" : "bg-white"
        )}
      >
        <div className={cn(
          "sticky top-0 z-10 border-b transition-colors duration-300",
          isProductMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        )}>
          <div className="flex items-center justify-between h-16 px-6">
            {/* Clickable Logo Area */}
            <button
              onClick={handleModeToggle}
              className={cn(
                "flex items-center cursor-pointer rounded-lg px-2 py-1 -ml-2 transition-all duration-200",
                isProductMode
                  ? "hover:bg-gray-800"
                  : "hover:bg-gray-100"
              )}
              title={isProductMode ? "Switch to People & Engineering" : "Switch to Product & Engineering"}
            >
              <Coffee
                className={cn(
                  "h-8 w-8 transition-all duration-300",
                  isProductMode
                    ? "text-purple-400 fill-purple-400"
                    : "text-indigo-600"
                )}
              />
              <span className={cn(
                "ml-2 text-xl font-bold transition-colors duration-300",
                isProductMode ? "text-white" : "text-gray-900"
              )}>
                {isProductMode ? "Product & Eng." : "P & Engineering"}
              </span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "lg:hidden transition-colors",
                isProductMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              )}
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
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200",
                    isProductMode
                      ? item.current
                        ? "bg-purple-900/50 text-purple-300"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      : item.current
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

          <div className={cn(
            "p-4 border-t transition-colors duration-300",
            isProductMode ? "border-gray-700" : "border-gray-200"
          )}>
            {userLoading ? (
              <div className="mb-4 px-4 py-3 flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full animate-pulse",
                  isProductMode ? "bg-gray-700" : "bg-gray-200"
                )}></div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "h-4 rounded animate-pulse mb-1",
                    isProductMode ? "bg-gray-700" : "bg-gray-200"
                  )}></div>
                  <div className={cn(
                    "h-3 rounded animate-pulse w-2/3",
                    isProductMode ? "bg-gray-700" : "bg-gray-200"
                  )}></div>
                </div>
              </div>
            ) : user ? (
              <div className="mb-4 px-4 py-3 flex items-center gap-3">
                <Avatar className={cn(
                  "h-10 w-10",
                  isProductMode ? "bg-purple-900" : "bg-indigo-100"
                )}>
                  <AvatarFallback className={cn(
                    isProductMode ? "text-purple-300" : "text-indigo-700"
                  )}>
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate transition-colors",
                    isProductMode ? "text-white" : "text-gray-900"
                  )}>
                    {user.name || "User"}
                  </p>
                  <p className={cn(
                    "text-xs truncate transition-colors",
                    isProductMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    @{user.username || "user"}
                  </p>
                </div>
              </div>
            ) : isAuthenticated && (
              <div className="mb-4 px-4 py-3 flex items-center gap-3">
                <Avatar className={cn(
                  "h-10 w-10",
                  isProductMode ? "bg-gray-700" : "bg-gray-100"
                )}>
                  <AvatarFallback className={cn(
                    isProductMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isProductMode ? "text-white" : "text-gray-900"
                  )}>
                    User
                  </p>
                  <p className={cn(
                    "text-xs truncate",
                    isProductMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    Authenticated
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Link
                to={createPageUrl("Settings")}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  isProductMode
                    ? currentPageName === "Settings"
                      ? "bg-purple-900/50 text-purple-300"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    : currentPageName === "Settings"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  isProductMode
                    ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
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
        <header className={cn(
          "sticky top-0 shadow-sm z-10 transition-colors duration-300",
          isPresentationMode
            ? "bg-amber-50"
            : isProductMode
              ? "bg-gray-800"
              : "bg-white"
        )}>
          <div className="flex justify-between items-center h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className={cn(
                  "lg:hidden mr-4 transition-colors",
                  isProductMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className={cn(
                "text-md font-medium transition-colors",
                isProductMode ? "text-white" : "text-gray-800"
              )}>
                {isProductMode ? "Product & Eng." : "P & Engineering"} Manager
                {currentPageName && (
                  <span className={isProductMode ? "text-gray-400" : "text-gray-500"}>
                    {" "}&gt; {currentPageName}
                  </span>
                )}
              </div>
            </div>

            {/* Mode indicator and Presentation Mode Toggle */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell
                className={isProductMode ? 'hover:bg-gray-700' : ''}
              />

              {/* Mode indicator badge */}
              <span className={cn(
                "hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                isProductMode
                  ? "bg-purple-900 text-purple-200"
                  : "bg-indigo-100 text-indigo-800"
              )}>
                {isProductMode ? "Product" : "People"}
              </span>

              <button
                onClick={togglePresentationMode}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  isPresentationMode
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : isProductMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                title={isPresentationMode ? "Switch to Working Mode" : "Switch to Presentation Mode"}
              >
                {isPresentationMode ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Presenting</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Working</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* AI Assistant */}
      <AIAssistantButton />
      <AIChatPanel />
    </div>
  );
}
