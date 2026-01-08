# Technology Stack & Build System

## Core Technologies

- **Frontend Framework**: React 18 with Vite as the build tool
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **State Management**: React Context API (AuthContext) + local component state
- **Data Storage**: Browser localStorage with custom localClient API layer
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Vitest + React Testing Library + jsdom
- **Icons**: Lucide React
- **Animations**: Framer Motion + Tailwind CSS animations

## Build System & Commands

```bash
# Development
npm run dev          # Start development server with hot reload

# Building
npm run build        # Production build to dist/ folder
npm run preview      # Preview production build locally

# Testing
npm run test         # Run test suite with Vitest

# Linting
npm run lint         # ESLint code quality checks

# Production Serving
npm start            # Serve built application (requires npm run build first)
```

## Key Dependencies

- **@base44/sdk**: Legacy SDK for potential future integrations
- **date-fns**: Date manipulation and formatting
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility
- **sonner**: Toast notifications
- **recharts**: Charts and data visualization

## Development Setup

1. Node.js environment required
2. All dependencies managed via npm
3. Path aliases configured (`@/` maps to `src/`)
4. ESLint configured for React best practices
5. Vitest configured with jsdom for component testing