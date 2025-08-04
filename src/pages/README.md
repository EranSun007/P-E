# Pages Directory

This directory contains page-level components that serve as route handlers for the P&E Manager application. Each page represents a major section of the application and orchestrates the display of multiple feature components.

## Page Structure

### Core Pages
- **`Layout.jsx`** - Main application layout with navigation and common UI elements
- **`Calendar.jsx`** - Calendar view with events, meetings, and scheduling
- **`Tasks.jsx`** - Task management and to-do list interface
- **`Team.jsx`** - Team member management and overview
- **`Projects.jsx`** - Project management and tracking
- **`Metrics.jsx`** - Analytics and performance metrics dashboard
- **`Settings.jsx`** - Application settings and configuration

### Detail Pages
- **`TeamMemberProfile.jsx`** - Individual team member detailed view
- **`PeerProfile.jsx`** - Individual peer detailed view
- **`ProjectDetails.jsx`** - Individual project detailed view

### Secondary Pages
- **`Peers.jsx`** - External peer management
- **`Stakeholders.jsx`** - Stakeholder relationship management

### Utility Files
- **`index.jsx`** - Page exports and routing configuration
- **`serve`** - Development server configuration

## Page Architecture

### Page Component Pattern
```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function PageName() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    try {
      setLoading(true);
      // Load page-specific data
      const result = await dataService.loadData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <ErrorBoundary>
      <div className="page-container">
        <PageHeader title="Page Title" />
        <PageContent data={data} />
      </div>
    </ErrorBoundary>
  );
}
```

### Layout Integration
All pages are wrapped by the `Layout.jsx` component which provides:
- Navigation sidebar
- Header with user information
- Common styling and responsive behavior
- Global error boundaries
- Authentication checks

## Page Responsibilities

### Data Loading
Pages are responsible for:
- Loading initial page data
- Managing loading states
- Handling data loading errors
- Coordinating data refresh

### Component Orchestration
Pages orchestrate multiple feature components:
- Passing data between components
- Managing component interactions
- Handling component-level events
- Coordinating component state

### Route Handling
Pages handle route-specific logic:
- URL parameter processing
- Query string handling
- Navigation state management
- Route-based data filtering

## Key Pages Overview

### Calendar Page
- Displays calendar events and meetings
- Integrates with duty rotation system
- Provides multiple view modes (month, week, day)
- Handles event creation and editing

### Tasks Page
- Main task management interface
- Task filtering and sorting
- Task creation and editing
- Integration with project assignments

### Team Page
- Team member overview and management
- Out-of-office tracking
- Goal management integration
- Team performance metrics

### Projects Page
- Project listing and management
- Project creation and editing
- Progress tracking and reporting
- Task assignment coordination

### Metrics Page
- Performance analytics dashboard
- Team productivity metrics
- Project completion statistics
- Goal achievement tracking

## Testing Standards

### Page Testing Patterns
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import PageName from '../PageName';

// Mock dependencies
jest.mock('@/services/dataService');

const renderWithProviders = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('PageName', () => {
  it('renders loading state initially', () => {
    renderWithProviders(<PageName />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('loads and displays data', async () => {
    const mockData = { items: [] };
    dataService.loadData.mockResolvedValue(mockData);

    renderWithProviders(<PageName />);

    await waitFor(() => {
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });
  });

  it('handles loading errors', async () => {
    dataService.loadData.mockRejectedValue(new Error('Load failed'));

    renderWithProviders(<PageName />);

    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
    });
  });
});
```

### Integration Testing
Pages require integration testing to verify:
- Component interactions work correctly
- Data flows properly between components
- Navigation and routing function as expected
- Error boundaries handle failures appropriately

## Development Guidelines

### Adding New Pages
1. Create page component following established patterns
2. Implement proper loading and error states
3. Add comprehensive tests including integration tests
4. Update routing configuration in `index.jsx`
5. Document page purpose and key features

### Page Performance
- Implement lazy loading for heavy components
- Use React.memo for expensive child components
- Optimize data loading with proper caching
- Implement proper cleanup in useEffect hooks

### Accessibility
- Ensure proper heading hierarchy
- Implement keyboard navigation
- Add appropriate ARIA labels
- Test with screen readers

### Responsive Design
- Use Tailwind responsive utilities
- Test on multiple screen sizes
- Implement mobile-friendly interactions
- Consider touch-friendly UI elements