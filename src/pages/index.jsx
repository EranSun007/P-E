import Layout from "./Layout.jsx";

import Tasks from "./Tasks";

import Calendar from "./Calendar";

import Metrics from "./Metrics";

import Stakeholders from "./Stakeholders";

import Projects from "./Projects";

import Settings from "./Settings";

import Team from "./Team";

import ProjectDetails from "./ProjectDetails";

import TeamMemberProfile from "./TeamMemberProfile";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
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
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}