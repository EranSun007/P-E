# P&E Manager

A unified people and engineering management system that helps P&E managers connect people development with project delivery in a single platform.

## Overview

P&E Manager eliminates the fragmentation of traditional management tools by providing a unified context platform where all management activities live together. Built for P&E managers with 5-15 direct reports, it connects people development with engineering capacity in one seamless system.

## Key Features

- **Unified Task Management**: Consolidate tasks from one-on-ones, stakeholder interactions, and project requirements
- **Integrated Project Oversight**: Manage multiple projects with tasks automatically linked to initiatives
- **Team Management**: Complete team member profiles with out-of-office tracking and goal management
- **Calendar Integration**: Unified calendar view with meetings, events, and scheduling
- **Performance Analytics**: Track both product progress and personal productivity metrics
- **One-on-One Management**: Structured meeting management with agenda tracking and historical context

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + Radix UI
- **State Management**: React Context + localStorage
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library
- **Icons**: Lucide React

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd pe-manager

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run test suite
npm run lint         # Run ESLint
```

## Project Structure

```
src/
├── api/                    # Data layer (localStorage-based)
├── components/            # UI components organized by domain
│   ├── ui/               # Base components (Radix UI)
│   ├── auth/             # Authentication components
│   ├── calendar/         # Calendar features
│   ├── duty/             # Duty management
│   ├── task/             # Task management
│   └── team/             # Team management
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── pages/                # Route-level components
├── services/             # Business logic services
├── utils/                # Pure utility functions
└── test/                 # Test setup and utilities
```

## Data Storage

Currently uses browser localStorage for rapid development iteration. The system includes a built-in migration system for future cloud database transition.

## Development Guidelines

### Code Organization
- **Feature-based structure**: Components organized by business domain
- **Co-located tests**: Tests in `__tests__/` folders within features
- **Consistent naming**: PascalCase for components, camelCase for utilities

### Import Conventions
```javascript
// React imports first
import React, { useState } from 'react';

// Third-party imports
import { Button } from '@/components/ui/button';

// Local imports
import { useAuth } from '@/contexts/AuthContext';
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage
```

## Documentation

- **[Developer Onboarding Guide](docs/developer-onboarding-guide.md)** - Complete guide for new developers
- **[Architecture Decision Record](docs/architecture-decision-record.md)** - Architectural decisions and rationale
- **[Naming Conventions Guide](docs/naming-conventions-guide.md)** - Code style and naming standards
- **[Directory README Files](src/README.md)** - Detailed documentation for each major directory

## Contributing

1. Read the [Developer Onboarding Guide](docs/developer-onboarding-guide.md)
2. Follow the [Naming Conventions Guide](docs/naming-conventions-guide.md)
3. Write tests for new functionality
4. Update documentation as needed

## Architecture

P&E Manager follows a clean architecture with clear separation of concerns:

- **Pages**: Route-level components that orchestrate features
- **Components**: Reusable UI components organized by domain
- **Services**: Business logic that orchestrates data operations
- **API Layer**: Data access abstraction (currently localStorage)
- **Utils**: Pure utility functions with no side effects

## Future Roadmap

- **Cloud Migration**: Transition to PostgreSQL/SAP HANA Cloud
- **Real-time Collaboration**: Multi-user support with live synchronization
- **AI Integration**: Intelligent insights and recommendations
- **Enterprise Integration**: SAP SuccessFactors, JIRA, and other system connections

---

Built with ❤️ for P&E managers who want to connect people development with engineering excellence.