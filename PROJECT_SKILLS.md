# Project Skills & Lessons Learned

> Last Updated: 2026-01-09 23:50
> Session Count: 1

This file contains lessons learned from development sessions to prevent repeating mistakes and reinforce successful patterns.

---

## High Confidence Lessons

### Design System Migration
- **Lesson**: When integrating a new design system into an existing project, always validate visual appearance incrementally before completing the full migration. Don't apply glassmorphism, new color systems, and typography changes all at once without visual testing.
- **Context**: Applies when adopting external design systems or making large-scale UI changes
- **Why**: Multiple overlapping changes make it impossible to isolate what's broken
- **Source**: Session on 2026-01-09 - TeamsSync migration failed due to invisible text, broken components, and over-application of glassmorphism

### Design Revert Strategy
- **Lesson**: When a design migration fails badly, the fastest path to stability is a full git revert rather than attempting incremental fixes.
- **Context**: When stuck in a fix loop without improvement
- **Commands**: `git checkout .` (discard tracked changes) + `git clean -fd` (remove untracked files)
- **Source**: Session on 2026-01-09 - Multiple fix attempts failed; complete revert was the correct solution

### Visual Testing Requirements
- **Lesson**: Always test design changes in the browser with real data before considering them complete. Chrome DevTools screenshots should show actual UI, not login pages.
- **Context**: Any significant UI/styling changes require browser validation
- **Why**: Design issues only become apparent when viewing the actual rendered UI
- **Source**: Session on 2026-01-09 - Design looked broken but wasn't properly tested until late in session

---

## Medium Confidence Lessons

### Design Token Consistency
- **Lesson**: Using design token variables like `rgb(var(--accent-cyan))` provides better maintainability than hard-coded Tailwind colors like `blue-500`. Tokens allow centralized color management.
- **Context**: When styling components, prefer design tokens over direct color values
- **Example**: `text-[rgb(var(--accent-cyan))]` vs `text-blue-500`
- **Source**: Session on 2026-01-09 - Original token system was more stable than new hard-coded colors

### Component Utility Classes
- **Lesson**: Creating new CSS utility class files (like `teamssync-components.css`) can add complexity. Only introduce them if there's clear benefit over inline Tailwind classes.
- **Context**: When considering extracting component styles into separate CSS files
- **Trade-off**: Reusability vs simplicity
- **Source**: Session on 2026-01-09 - Utility classes file needed to be removed during revert

---

## Low Confidence Lessons

### Glassmorphism Caution
- **Lesson**: Glassmorphism effects (`backdrop-blur-md`, translucent backgrounds) may not suit all design systems. Evaluate fit with existing aesthetics before widespread application.
- **Context**: When considering glassmorphism for UI elements
- **Note**: May work well in other contexts; needs more validation
- **Source**: Session on 2026-01-09 - Glassmorphism didn't match existing design; may work better in other contexts

---

## Anti-Patterns to Avoid

### Design Migration Anti-pattern
- **Anti-pattern**: Migrating an entire design system (colors, typography, glassmorphism, component classes) in one large change without incremental visual validation
- **Why**: Leads to compounding issues that are hard to debug
- **Alternative**: Migrate incrementally - colors first, test, then typography, test, then effects
- **Impact**: Resulted in completely broken UI requiring full revert
- **Source**: Session on 2026-01-09

### Fix Loop Anti-pattern
- **Anti-pattern**: Getting stuck in a loop making repeated fixes without improvement when the foundation is fundamentally wrong
- **Why**: Trying to fix a fundamentally broken approach wastes time and can make things worse
- **Alternative**: Assess if the entire approach needs reverting; git makes this safe
- **Signal**: When user says "you're stuck in a loop" - stop and consider full revert
- **Source**: Session on 2026-01-09 - User observed "you're stuck in a loop"

---

## Project-Specific Conventions

### P&E Manager Design System
- **Current Stable Design**: Deep black background (#0A0A0B), purple/blue accent colors from design tokens, no glassmorphism
- **Typography**: Bold/semibold weights (not black/900), monospace for technical elements
- **Color System**: Design token variables in `src/styles/tokens.css` - use `rgb(var(--accent-*))` pattern
- **Component Styling**: Inline Tailwind classes preferred over separate utility class files

---

## Session History

- **Session 1**: 2026-01-09 - Design system migration failure and revert
  - Learned importance of incremental testing
  - Established revert strategy for failed migrations
  - Documented current stable design system
