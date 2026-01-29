import { lazy, Suspense } from 'react';
import Layout from "./Layout.jsx";
import ProtectedRoute from "@/components/auth/ProtectedRoute.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

import { 
  PageLoadingSkeleton, 
  TasksPageSkeleton, 
  CalendarPageSkeleton, 
  TeamPageSkeleton 
} from "@/components/ui/loading-skeletons";
import { PageChunkErrorBoundary, retryImport } from "@/components/ui/error-boundaries";

// Loading fallback components for different page types
function PageLoadingFallback() {
  return <PageLoadingSkeleton />;
}

function TasksLoadingFallback() {
  return <TasksPageSkeleton />;
}

function CalendarLoadingFallback() {
  return <CalendarPageSkeleton />;
}

function TeamLoadingFallback() {
  return <TeamPageSkeleton />;
}

// The error boundary and retry logic are now imported from error-boundaries.jsx

// Lazy load all page components with enhanced retry mechanism and proper chunk naming
const Tasks = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-tasks" */ "./Tasks"), 3, 1000));
const Calendar = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-calendar" */ "./Calendar"), 3, 1000));
const Metrics = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-metrics" */ "./Metrics"), 3, 1000));
const Stakeholders = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-stakeholders" */ "./Stakeholders"), 3, 1000));
const Projects = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-projects" */ "./Projects"), 3, 1000));
const Settings = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-settings" */ "./Settings"), 3, 1000));
const Team = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-team" */ "./Team"), 3, 1000));
const ProjectDetails = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-project-details" */ "./ProjectDetails"), 3, 1000));
const TeamMemberProfile = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-team-member-profile" */ "./TeamMemberProfile"), 3, 1000));
const Peers = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-peers" */ "./Peers"), 3, 1000));
const PeerProfile = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-peer-profile" */ "./PeerProfile"), 3, 1000));
const Duties = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-duties" */ "./Duties"), 3, 1000));
const GitHubRepos = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-github-repos" */ "./GitHubRepos"), 3, 1000));
const JiraIssues = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-jira-issues" */ "./JiraIssues"), 3, 1000));

// Product Mode Pages
const Services = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-services" */ "./Services"), 3, 1000));
const Roadmap = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-roadmap" */ "./Roadmap"), 3, 1000));
const Backlog = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-backlog" */ "./Backlog"), 3, 1000));
const Analytics = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-analytics" */ "./Analytics"), 3, 1000));
const Feedback = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-feedback" */ "./Feedback"), 3, 1000));
const Releases = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-releases" */ "./Releases"), 3, 1000));

// Capture Framework Pages
const CaptureInbox = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-capture-inbox" */ "./CaptureInbox"), 3, 1000));
const CaptureRules = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-capture-rules" */ "./CaptureRules"), 3, 1000));

// Bug Dashboard Pages
const BugDashboard = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-bug-dashboard" */ "./BugDashboard"), 3, 1000));

// Knowledge Search Pages (v1.5 - MCP integration)
const KnowledgeSearch = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-knowledge-search" */ "./KnowledgeSearch"), 3, 1000));

// TeamSync (v1.6 - Team Sync integration)
const TeamSync = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-teamsync" */ "./TeamSync"), 3, 1000));

const PAGES = {
    
    Tasks: Tasks,
    
    Calendar: Calendar,
    
    Metrics: Metrics,
    
    Stakeholders: Stakeholders,
    
    Projects: Projects,
    
    Settings: Settings,
    
    Team: Team,
    
    ProjectDetails: ProjectDetails,
    
    TeamMemberProfile: TeamMemberProfile,
    
    Peers: Peers,
    
    PeerProfile: PeerProfile,

    Duties: Duties,

    GitHubRepos: GitHubRepos,

    JiraIssues: JiraIssues,

    // Product Mode Pages
    Services: Services,

    Roadmap: Roadmap,

    Backlog: Backlog,

    Analytics: Analytics,

    Feedback: Feedback,

    Releases: Releases,

    // Capture Framework Pages
    CaptureInbox: CaptureInbox,

    CaptureRules: CaptureRules,

    // Bug Dashboard
    BugDashboard: BugDashboard,

    // Knowledge Search (v1.5 - MCP integration)
    KnowledgeSearch: KnowledgeSearch,

    // TeamSync (v1.6)
    TeamSync: TeamSync,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Helper function to get appropriate loading fallback for each route
function getLoadingFallback(pathname) {
    const path = pathname.toLowerCase();
    if (path.includes('tasks') || path === '/') return <TasksLoadingFallback />;
    if (path.includes('calendar')) return <CalendarLoadingFallback />;
    if (path.includes('team')) return <TeamLoadingFallback />;
    return <PageLoadingFallback />;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const loadingFallback = getLoadingFallback(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <PageChunkErrorBoundary pageName={currentPage}>
                <Suspense fallback={loadingFallback}>
                    <Routes>

                            <Route path="/" element={<Tasks />} />


                        <Route path="/tasks" element={<Tasks />} />

                        <Route path="/calendar" element={<Calendar />} />

                        <Route path="/metrics" element={<Metrics />} />

                        <Route path="/stakeholders" element={<Stakeholders />} />

                        <Route path="/projects" element={<Projects />} />

                        <Route path="/settings" element={<Settings />} />

                        <Route path="/team" element={<Team />} />

                        <Route path="/projectdetails" element={<ProjectDetails />} />

                        <Route path="/teammemberprofile" element={<TeamMemberProfile />} />

                        <Route path="/peers" element={<Peers />} />

                        <Route path="/peerprofile" element={<PeerProfile />} />

                        <Route path="/duties" element={<Duties />} />

                        <Route path="/github" element={<GitHubRepos />} />

                        <Route path="/jira" element={<JiraIssues />} />

                        {/* Product Mode Pages */}
                        <Route path="/services" element={<Services />} />
                        <Route path="/roadmap" element={<Roadmap />} />
                        <Route path="/backlog" element={<Backlog />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/releases" element={<Releases />} />

                        {/* Capture Framework Routes */}
                        <Route path="/captureinbox" element={<CaptureInbox />} />
                        <Route path="/capturerules" element={<CaptureRules />} />

                        {/* Bug Dashboard */}
                        <Route path="/bugdashboard" element={<BugDashboard />} />

                        {/* Knowledge Search (v1.5 - MCP integration) */}
                        <Route path="/knowledge-search" element={<KnowledgeSearch />} />

                        {/* TeamSync (v1.6 - Team Sync integration) */}
                        <Route path="/teamsync" element={<TeamSync />} />

                    </Routes>
                </Suspense>
            </PageChunkErrorBoundary>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <ProtectedRoute>
                <PagesContent />
            </ProtectedRoute>
        </Router>
    );
}