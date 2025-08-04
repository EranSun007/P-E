# P&E Manager - AI Assistant Instructions

## Project Overview

P&E Manager is a unified people and engineering management system that combines two critical management functions:
1. **People Management**: Team tasks, vacation tracking, one-on-one goals, and project management
2. **HR Development**: Engineer Development Capacity and career growth tracking

This is a living, breathing system designed for P&E managers who need flexibility to evolve their management tools day-by-day based on real-world insights.

## Current State

**Technology Stack:**
- React 18 + Vite
- TailwindCSS + Radix UI
- React Router DOM
- Local Storage (discovery phase)
- Vitest + Testing Library
- React Hook Form + Zod validation

**Key Features Implemented:**
- Task Management with time tracking
- Project Management with budgets and deadlines
- Team Management with OOO tracking
- Stakeholder Management
- Calendar System with recurring events
- One-on-One Meeting management
- Metrics & Reporting
- Authentication System
- Data Migration System

## Product Vision

**Problem Statement:**
Existing tools like Asana and Monday.com are built top-down with fixed features. P&E Manager is different - it's a customizable system that P&E managers can extend and modify based on their evolving needs.

**Target Users:**
- P&E Managers (primary)
- Team Leads with direct reports
- Product & Engineering Managers

**Unique Value:**
- Connects people management with engineering capacity
- Single context system for all management activities
- Can be extended and modified by the user
- Unified memory system for all meeting insights

## Development Philosophy

**Discovery Phase Approach:**
- Currently in rapid iteration mode
- Daily feature additions based on real usage
- Local storage for quick experimentation
- Deploy and test immediately on SAP BTP

**AI-Assisted Development:**
- Prefer smaller files for better AI tool comprehension
- Use AI for testing, documentation, and feature development
- Leverage AI for code organization and best practices

## Current Priorities

**Immediate Features:**
- Personal goals connectivity to projects
- Enhanced to-do list integration
- HR metadata expansion
- Calendar/Outlook integration

**Future Architecture:**
- Migration from local storage to cloud (Postgres/SAP HANA)
- SAP AI integration for intelligent features
- External HR system metadata integration

## Development Guidelines

**File Organization:**
- Keep files small and focused for AI tools
- Organize by feature/domain
- Maintain clear separation of concerns

**Testing:**
- Comprehensive test coverage
- AI-assisted test generation
- Focus on business logic testing

**Documentation:**
- Document decisions and insights immediately
- Capture daily learnings and feature rationale
- Maintain architecture decision records

## Context for AI Assistants

**When working on this project:**
1. This is a personal productivity tool for a P&E manager
2. Prioritize rapid iteration and experimentation
3. Focus on connecting people and engineering data
4. Consider the daily management workflow
5. Design for future extensibility
6. Keep SAP BTP deployment in mind
7. Optimize for single-user experience (for now)

**Key Relationships to Understand:**
- People ↔ Projects (who works on what)
- Meetings ↔ Projects (project context in meetings)
- One-on-ones ↔ Goals (personal development tracking)
- Tasks ↔ People (workload and capacity)

**Technical Constraints:**
- Local storage for now (discovery phase)
- SAP BTP deployment target
- Must work as single-page application
- Vite build system requirements

## Questions to Ask When Adding Features

1. Does this connect people and engineering data?
2. Will this reduce context switching for the manager?
3. Can this capture insights from daily work?
4. Is this extensible for future needs?
5. Does this fit the unified memory system vision?

## Current Architecture

```
src/
├── components/     # Reusable UI components
├── pages/         # Route-based page components
├── services/      # Business logic and data access
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── api/          # Data models and entity definitions
└── tests/        # Test files
```

**Data Flow:**
- Local storage as primary data store
- Service layer abstracts data access
- Components use hooks for state management
- Form validation with Zod schemas

## Known Technical Debt

- Local storage limitations (size, persistence)
- No real-time collaboration features
- Limited offline capability
- Manual data backup/export

## Success Metrics

**Discovery Phase Goals:**
- Capture 100% of management work in the system
- Reduce context switching between tools
- Improve meeting preparation and follow-up
- Better connection between people development and project outcomes

**Technical Goals:**
- Maintain fast development iteration
- Keep AI tools effective for development
- Prepare for future scaling and collaboration