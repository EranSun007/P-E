# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- JavaScript (ES Modules) - Full-stack application (Node.js backend, React frontend)

**Secondary:**
- SQL - PostgreSQL database schema and migrations
- JSON - Configuration files, API data exchange

## Runtime

**Environment:**
- Node.js v20.19.0

**Package Manager:**
- npm (version from Node.js)
- Lockfile: package-lock.json present

## Frameworks

**Core:**
- React 18.2.0 - Frontend UI library
- Express.js 4.18.2 - Backend web server
- Vite 6.1.0 - Build tool and dev server

**Testing:**
- Vitest 3.2.4 - Test runner with jsdom 27.0.1 environment
- @testing-library/react 16.3.0 - Component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation

**Build/Dev:**
- Vite 6.1.0 - Development server with HMR, production bundler
- rollup-plugin-visualizer 6.0.3 - Bundle analysis
- concurrently 8.2.2 - Run frontend and backend in parallel
- ESLint 9.19.0 - Code linting with React plugins
- PostCSS 8.5.3 - CSS processing
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Autoprefixer 10.4.20 - CSS vendor prefixing

## Key Dependencies

**Critical:**
- pg 8.11.3 - PostgreSQL client for Node.js (connection pooling, parameterized queries)
- react-router-dom 7.2.0 - Client-side routing
- jsonwebtoken 9.0.3 - JWT token generation and validation for authentication
- bcrypt 6.0.0 - Password hashing (for user authentication)

**Infrastructure:**
- dotenv 17.2.3 - Environment variable management
- cors 2.8.5 - Cross-Origin Resource Sharing middleware
- @sap/xsenv 4.2.0 - SAP BTP environment helpers (VCAP_SERVICES parsing)
- @sap/xssec 3.6.1 - SAP XSUAA authentication (prepared but not active)

**AI Integration:**
- @sap-ai-sdk/orchestration 2.5.0 - SAP AI Core SDK for LLM orchestration
- @base44/sdk 0.1.2 - Additional AI utilities

**UI Components:**
- @radix-ui/* (24 packages) - Unstyled, accessible UI primitives (Accordion, Dialog, Dropdown, Select, etc.)
- lucide-react 0.475.0 - Icon library
- framer-motion 12.4.7 - Animation library
- recharts 2.15.1 - Charting library for data visualization
- react-day-picker 8.10.1 - Calendar date picker
- embla-carousel-react 8.5.2 - Carousel component
- sonner 2.0.1 - Toast notifications

**Form Management:**
- react-hook-form 7.54.2 - Form state management and validation
- @hookform/resolvers 4.1.2 - Validation schema resolvers
- zod 3.24.2 - TypeScript-first schema validation

**Utilities:**
- date-fns 3.6.0 - Date manipulation and formatting
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.0.2 - Merge Tailwind CSS classes
- tailwindcss-animate 1.0.7 - Tailwind animation utilities
- cmdk 1.0.0 - Command palette component
- next-themes 0.4.4 - Theme switching (dark mode)
- vaul 1.1.2 - Drawer component
- input-otp 1.4.2 - OTP input component
- react-resizable-panels 2.1.7 - Resizable panel layouts

**Development:**
- serve 14.2.4 - Static file server for production preview

## Configuration

**Environment:**
- Development: `.env.development` (local PostgreSQL, dev auth bypass, AI Core keys)
- Production: `.env.production` (SAP BTP backend URL)
- Backend reads: NODE_ENV, PORT, AUTH_MODE, DB_* variables, JWT_SECRET, AI_DEPLOYMENT_ID, AICORE_SERVICE_KEY
- Frontend reads: VITE_API_URL, VITE_AUTH_MODE, VITE_BACKEND_URL (Vite prefix required)

**Build:**
- `vite.config.js` - Vite configuration with proxy, path aliases (@), bundle optimization, chunk splitting
- `tailwind.config.js` - Tailwind CSS theme customization (HSL color variables, animations)
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `eslint.config.js` - ESLint rules for React and JSX
- `vitest.config.js` - Test configuration
- `jsconfig.json` - JavaScript module resolution
- `components.json` - shadcn/ui configuration

## Platform Requirements

**Development:**
- Node.js 20.x
- PostgreSQL 12+ (local or Docker)
- npm
- Operating system: macOS, Linux, or Windows

**Production:**
- SAP BTP Cloud Foundry
- PostgreSQL service binding (pe-manager-db3)
- SAP AI Core service binding (for AI features)
- nodejs_buildpack (backend)
- staticfile_buildpack (frontend)
- Memory: 512MB (backend), 128MB (frontend)

---

*Stack analysis: 2026-01-21*
