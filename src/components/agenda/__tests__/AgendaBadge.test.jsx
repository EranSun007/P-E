import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AgendaBadge, AgendaIndicator, AgendaStatusIcon } from '../AgendaBadge';

describe('AgendaBadge', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<AgendaBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge with correct count and status', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        memberName="John Doe"
      />
    );

    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('renders resolved status when no unresolved items', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={0} 
        hasUnresolved={false}
        memberName="John Doe"
      />
    );

    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('renders singular form for single item', () => {
    render(
      <AgendaBadge 
        count={1} 
        unresolvedCount={0} 
        hasUnresolved={false}
        memberName="John Doe"
      />
    );

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders with correct icon for unresolved items', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        memberName="John Doe"
      />
    );

    // Clock icon should be present for pending items
    const clockIcon = document.querySelector('svg');
    expect(clockIcon).toBeInTheDocument();
  });

  it('renders with correct icon for resolved items', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={0} 
        hasUnresolved={false}
        memberName="John Doe"
      />
    );

    // CheckCircle2 icon should be present for resolved items
    const checkIcon = document.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        onClick={mockOnClick}
        memberName="John Doe"
      />
    );

    const badge = screen.getByRole('button');
    fireEvent.click(badge);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('does not render as button when onClick is not provided', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        memberName="John Doe"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders with correct size variants', () => {
    const { rerender } = render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        size="sm"
        memberName="John Doe"
      />
    );

    expect(screen.getByText('2 pending')).toBeInTheDocument();

    rerender(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        size="lg"
        memberName="John Doe"
      />
    );

    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        showIcon={false}
        memberName="John Doe"
      />
    );

    expect(document.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('includes proper accessibility attributes', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        onClick={mockOnClick}
        memberName="John Doe"
      />
    );

    const badge = screen.getByRole('button');
    expect(badge).toHaveAttribute('aria-label', 'John Doe has 3 agenda items, 2 pending. Click to view details.');
  });

  it('applies custom className', () => {
    render(
      <AgendaBadge 
        count={3} 
        unresolvedCount={2} 
        hasUnresolved={true}
        className="custom-class"
        memberName="John Doe"
      />
    );

    const badge = screen.getByText('2 pending').closest('div').parentElement;
    expect(badge).toHaveClass('custom-class');
  });
});

describe('AgendaIndicator', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<AgendaIndicator count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders indicator with correct count', () => {
    render(<AgendaIndicator count={5} hasUnresolved={true} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders 99+ for counts over 99', () => {
    render(<AgendaIndicator count={150} hasUnresolved={true} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('applies correct styling for unresolved items', () => {
    render(<AgendaIndicator count={5} hasUnresolved={true} />);
    const indicator = screen.getByText('5');
    expect(indicator.closest('div')).toHaveClass('bg-orange-500');
  });

  it('applies correct styling for resolved items', () => {
    render(<AgendaIndicator count={5} hasUnresolved={false} />);
    const indicator = screen.getByText('5');
    expect(indicator.closest('div')).toHaveClass('bg-green-500');
  });

  it('handles click events when onClick is provided', () => {
    render(<AgendaIndicator count={5} hasUnresolved={true} onClick={mockOnClick} />);
    
    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('includes proper accessibility attributes', () => {
    render(<AgendaIndicator count={5} hasUnresolved={true} onClick={mockOnClick} />);
    
    const indicator = screen.getByRole('button');
    expect(indicator).toHaveAttribute('aria-label', '5 agenda items, some pending');
  });
});

describe('AgendaStatusIcon', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when hasItems is false', () => {
    const { container } = render(<AgendaStatusIcon hasItems={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders alert icon for unresolved items', () => {
    render(<AgendaStatusIcon hasItems={true} hasUnresolved={true} />);
    
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-orange-500');
  });

  it('renders check icon for resolved items', () => {
    render(<AgendaStatusIcon hasItems={true} hasUnresolved={false} />);
    
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-green-500');
  });

  it('handles click events when onClick is provided', () => {
    render(<AgendaStatusIcon hasItems={true} hasUnresolved={true} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('renders with different size variants', () => {
    const { rerender } = render(
      <AgendaStatusIcon hasItems={true} hasUnresolved={true} size="sm" />
    );
    
    let icon = document.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4');

    rerender(<AgendaStatusIcon hasItems={true} hasUnresolved={true} size="lg" />);
    
    icon = document.querySelector('svg');
    expect(icon).toHaveClass('h-6', 'w-6');
  });

  it('includes proper accessibility attributes', () => {
    render(<AgendaStatusIcon hasItems={true} hasUnresolved={true} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Agenda items pending');
  });

  it('applies custom className', () => {
    render(<AgendaStatusIcon hasItems={true} hasUnresolved={true} className="custom-class" />);
    
    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('custom-class');
  });
});