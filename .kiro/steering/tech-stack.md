# Technical Stack

> Last Updated: 2025-07-26
> Version: 1.0.0

## Application Framework
- **Framework:** React 18
- **Build Tool:** Vite 6.1.0
- **Language:** JavaScript (ES modules)
- **Package Manager:** npm

## Database System
- **Current:** Local Storage (discovery phase)
- **Future:** SAP HANA Cloud / PostgreSQL
- **Migration Strategy:** Built-in data migration system

## JavaScript Framework
- **Framework:** React 18.2.0
- **Router:** React Router DOM 7.2.0
- **State Management:** React Context + Hooks

## Import Strategy
- **Strategy:** Node.js modules (ES6 imports)
- **Build System:** Vite with ES modules
- **Module Resolution:** Path aliases (@/ for src/)

## CSS Framework
- **Framework:** TailwindCSS 3.4.17
- **PostCSS:** 8.5.3
- **Animations:** tailwindcss-animate 1.0.7
- **Merge Utility:** tailwind-merge 3.0.2

## UI Component Library
- **Primary:** Radix UI (comprehensive component set)
- **Components:** @radix-ui/react-* (20+ components)
- **Styling:** class-variance-authority 0.7.1
- **Utilities:** clsx 2.1.1

## Forms and Validation
- **Forms:** React Hook Form 7.54.2
- **Validation:** Zod 3.24.2
- **Resolvers:** @hookform/resolvers 4.1.2

## Fonts Provider
- **Loading Strategy:** System fonts + fallbacks
- **Implementation:** CSS font stacks

## Icon Library
- **Library:** Lucide React 0.475.0
- **Icons:** SVG-based component library

## Additional Libraries
- **Date Handling:** date-fns 3.6.0
- **Calendar:** react-day-picker 8.10.1
- **Charts:** recharts 2.15.1
- **Notifications:** sonner 2.0.1
- **Animations:** framer-motion 12.4.7
- **Command Interface:** cmdk 1.0.0
- **Theme Management:** next-themes 0.4.4

## Testing Framework
- **Test Runner:** Vitest 3.2.4
- **Testing Library:** @testing-library/react 16.3.0
- **DOM Testing:** @testing-library/jest-dom 6.6.3
- **User Events:** @testing-library/user-event 14.6.1
- **Environment:** jsdom 26.1.0

## Application Hosting
- **Current:** SAP Business Technology Platform (BTP)
- **Build Output:** Static files via Vite build
- **Deployment:** serve 14.2.4 for local testing

## Database Hosting
- **Current:** Browser Local Storage
- **Future:** SAP HANA Cloud
- **Data Access:** Custom service layer abstraction

## Asset Hosting
- **Current:** Vite static assets
- **Future:** SAP BTP asset management
- **Optimization:** Vite asset optimization

## Development Tools
- **Linting:** ESLint 9.19.0 with React plugins
- **Code Style:** ESLint + React best practices
- **Type Checking:** JSDoc + TypeScript definitions
- **Development Server:** Vite dev server

## Deployment Solution
- **Platform:** SAP Business Technology Platform
- **CI/CD:** Manual deployment (discovery phase)
- **Build Process:** npm run build → Vite production build
- **Static Hosting:** Served as SPA

## Integration Layer
- **Current:** @base44/sdk 0.1.2 (legacy)
- **Future:** SAP AI Core integration
- **Calendar:** Planned Outlook/Exchange integration
- **HR Systems:** Future SAP SuccessFactors integration