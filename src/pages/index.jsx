import { lazy, Suspense } from 'react';
import { Component } from 'react';
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
                        
                        
                        <Route path="/Tasks" element={<Tasks />} />
                        
                        <Route path="/Calendar" element={<Calendar />} />
                        
                        <Route path="/Metrics" element={<Metrics />} />
                        
                        <Route path="/Stakeholders" element={<Stakeholders />} />
                        
                        <Route path="/Projects" element={<Projects />} />
                        
                        <Route path="/Settings" element={<Settings />} />
                        
                        <Route path="/Team" element={<Team />} />
                        
                        <Route path="/ProjectDetails" element={<ProjectDetails />} />
                        
                        <Route path="/TeamMemberProfile" element={<TeamMemberProfile />} />
                        
                        <Route path="/Peers" element={<Peers />} />
                        
                        <Route path="/PeerProfile" element={<PeerProfile />} />
                        
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