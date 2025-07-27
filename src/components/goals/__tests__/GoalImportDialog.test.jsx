/**
 * Tests for GoalImportDialog Component
 * Test suite for goal import interface functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalImportDialog from '../GoalImportDialog';
import GoalImportService from '../../../services/goalImportService';

// Mock dependencies
vi.mock('../../../services/goalImportService');
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('GoalImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (open = true) => {
    return render(
      <GoalImportDialog
        open={open}
        onOpenChange={mockOnOpenChange}
        onImportComplete={mockOnImportComplete}
      />
    );
  };

  describe('Initial Render', () => {
    it('should render upload step by default', () => {
      renderDialog();

      expect(screen.getByText('Upload Goals File')).toBeInTheDocument();
      expect(screen.getByText('Upload a CSV or JSON file containing employee goals data')).toBeInTheDocument();
      expect(screen.getByLabelText(/click to select or drag and drop/i)).toBeInTheDocument();
    });

    it('should show required fields information', () => {
      renderDialog();

      expect(screen.getByText('Required fields:')).toBeInTheDocument();
      expect(screen.getByText(/Employee ID, Goal Title, Development Need/)).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      renderDialog(false);

      expect(screen.queryByText('Upload Goals File')).not.toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should handle CSV file upload', async () => {
      const user = userEvent.setup();
      const csvContent = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription\nemp-1,Goal 1,Need 1,Activity 1,Description 1';
      
      GoalImportService.parseCSV.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'employeeId',
        title: 'title',
        developmentNeed: 'developmentNeed',
        developmentActivity: 'developmentActivity',
        developmentGoalDescription: 'developmentGoalDescription'
      });

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [
          {
            employeeId: 'emp-1',
            title: 'Goal 1',
            developmentNeed: 'Need 1'
          }
        ],
        validationErrors: [],
        duplicates: []
      });

      renderDialog();

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(GoalImportService.parseCSV).toHaveBeenCalledWith(csvContent);
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });
    });

    it('should handle JSON file upload', async () => {
      const user = userEvent.setup();
      const jsonContent = JSON.stringify([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.parseJSON.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [
          {
            employeeId: 'emp-1',
            title: 'Goal 1',
            developmentNeed: 'Need 1'
          }
        ],
        validationErrors: [],
        duplicates: []
      });

      renderDialog();

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([jsonContent], 'goals.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(GoalImportService.parseJSON).toHaveBeenCalledWith(jsonContent);
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });
    });

    it('should show field mapping step when required fields are missing', async () => {
      const user = userEvent.setup();
      const csvContent = 'ID,Title,Need\nemp-1,Goal 1,Need 1';

      GoalImportService.parseCSV.mockResolvedValue([
        {
          ID: 'emp-1',
          Title: 'Goal 1',
          Need: 'Need 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'ID',
        title: 'Title',
        developmentNeed: 'Need'
        // Missing developmentActivity and developmentGoalDescription
      });

      renderDialog();

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Map Fields')).toBeInTheDocument();
        expect(screen.getByText('Map your file columns to the required goal fields')).toBeInTheDocument();
      });
    });
  });

  describe('Field Mapping', () => {
    const setupMappingStep = async () => {
      const user = userEvent.setup();
      const csvContent = 'ID,Title,Need\nemp-1,Goal 1,Need 1';

      GoalImportService.parseCSV.mockResolvedValue([
        { ID: 'emp-1', Title: 'Goal 1', Need: 'Need 1' }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'ID',
        title: 'Title',
        developmentNeed: 'Need'
      });

      renderDialog();

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Map Fields')).toBeInTheDocument();
      });

      return user;
    };

    it('should render field mapping interface', async () => {
      await setupMappingStep();

      expect(screen.getByText('Employee ID')).toBeInTheDocument();
      expect(screen.getByText('Goal Title')).toBeInTheDocument();
      expect(screen.getByText('Development Need')).toBeInTheDocument();
      expect(screen.getByText('Development Activity')).toBeInTheDocument();
      expect(screen.getByText('Goal Description')).toBeInTheDocument();
    });

    it('should apply field mapping and proceed to preview', async () => {
      const user = await setupMappingStep();

      GoalImportService.mapFields.mockReturnValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: '',
          developmentGoalDescription: ''
        }
      ]);

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [],
        validationErrors: [],
        duplicates: []
      });

      const applyButton = screen.getByText('Apply Mapping');
      await user.click(applyButton);

      await waitFor(() => {
        expect(GoalImportService.mapFields).toHaveBeenCalled();
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });
    });

    it('should allow going back to upload step', async () => {
      const user = await setupMappingStep();

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(screen.getByText('Upload Goals File')).toBeInTheDocument();
    });
  });

  describe('Import Preview', () => {
    const setupPreviewStep = async () => {
      const user = userEvent.setup();
      const csvContent = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription\nemp-1,Goal 1,Need 1,Activity 1,Description 1';

      GoalImportService.parseCSV.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'employeeId',
        title: 'title',
        developmentNeed: 'developmentNeed',
        developmentActivity: 'developmentActivity',
        developmentGoalDescription: 'developmentGoalDescription'
      });

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [
          {
            employeeId: 'emp-1',
            title: 'Goal 1',
            developmentNeed: 'Need 1'
          }
        ],
        validationErrors: [],
        duplicates: []
      });

      renderDialog();

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      return user;
    };

    it('should display import statistics', async () => {
      await setupPreviewStep();

      // Check that we're in the preview step
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
      expect(screen.getByText('Review the data before importing')).toBeInTheDocument();
      
      // Check that statistics are displayed (we can see multiple cards)
      const cards = screen.getAllByText(/Total Goals|Valid|Invalid|Duplicates/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should show sample data in tabs', async () => {
      await setupPreviewStep();

      // Check for tab buttons
      expect(screen.getByRole('tab', { name: 'Sample Data' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Errors' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Duplicates' })).toBeInTheDocument();
      
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Employee: emp-1')).toBeInTheDocument();
    });

    it('should handle skip duplicates option', async () => {
      const user = await setupPreviewStep();

      const checkbox = screen.getByLabelText('Skip duplicate goals');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should start import process', async () => {
      const user = await setupPreviewStep();

      GoalImportService.importGoals.mockResolvedValue({
        imported: [{ id: 'goal-1', title: 'Goal 1' }],
        skipped: [],
        failed: []
      });

      const importButton = screen.getByRole('button', { name: /Import.*Goals/ });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Importing Goals...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(GoalImportService.importGoals).toHaveBeenCalled();
      });
    });
  });

  describe('Import Process', () => {
    it('should show progress during import', async () => {
      const user = userEvent.setup();
      
      // Setup a delayed import to test progress
      GoalImportService.importGoals.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            imported: [{ id: 'goal-1' }],
            skipped: [],
            failed: []
          }), 100)
        )
      );

      renderDialog();
      
      // Simulate going through the flow quickly
      const csvContent = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription\nemp-1,Goal 1,Need 1,Activity 1,Description 1';
      
      GoalImportService.parseCSV.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'employeeId',
        title: 'title',
        developmentNeed: 'developmentNeed',
        developmentActivity: 'developmentActivity',
        developmentGoalDescription: 'developmentGoalDescription'
      });

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [],
        validationErrors: [],
        duplicates: []
      });

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      const importButton = screen.getByRole('button', { name: /Import.*Goals/ });
      await user.click(importButton);

      // Should show progress
      expect(screen.getByText('Importing Goals...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it.skip('should show import results after completion', async () => {
      const user = userEvent.setup();

      GoalImportService.importGoals.mockResolvedValue({
        imported: [{ id: 'goal-1', title: 'Goal 1' }],
        skipped: [],
        failed: []
      });

      // Quick setup to get to import
      renderDialog();
      
      const csvContent = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription\nemp-1,Goal 1,Need 1,Activity 1,Description 1';
      
      GoalImportService.parseCSV.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'employeeId',
        title: 'title',
        developmentNeed: 'developmentNeed',
        developmentActivity: 'developmentActivity',
        developmentGoalDescription: 'developmentGoalDescription'
      });

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [],
        validationErrors: [],
        duplicates: []
      });

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      const importButton = screen.getByRole('button', { name: /Import.*Goals/ });
      await user.click(importButton);

      // First wait for importing to start
      expect(screen.getByText('Importing Goals...')).toBeInTheDocument();

      // Then wait for import to complete
      await waitFor(() => {
        expect(screen.getByText('Import Complete')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check that result statistics are displayed
      const resultLabels = screen.getAllByText(/Imported|Skipped|Failed/);
      expect(resultLabels.length).toBeGreaterThan(0);
    });

    it('should call onImportComplete callback', async () => {
      const user = userEvent.setup();
      const importResult = {
        imported: [{ id: 'goal-1', title: 'Goal 1' }],
        skipped: [],
        failed: []
      };

      GoalImportService.importGoals.mockResolvedValue(importResult);

      // Quick setup to get to import
      renderDialog();
      
      const csvContent = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription\nemp-1,Goal 1,Need 1,Activity 1,Description 1';
      
      GoalImportService.parseCSV.mockResolvedValue([
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        }
      ]);

      GoalImportService.getFieldSuggestions.mockReturnValue({
        employeeId: 'employeeId',
        title: 'title',
        developmentNeed: 'developmentNeed',
        developmentActivity: 'developmentActivity',
        developmentGoalDescription: 'developmentGoalDescription'
      });

      GoalImportService.generateImportPreview.mockResolvedValue({
        totalGoals: 1,
        validGoals: 1,
        invalidGoals: 0,
        duplicateGoals: 0,
        uniqueGoals: 1,
        sampleGoals: [],
        validationErrors: [],
        duplicates: []
      });

      const fileInput = screen.getByLabelText(/click to select or drag and drop/i);
      const file = new File([csvContent], 'goals.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      const importButton = screen.getByRole('button', { name: /Import.*Goals/ });
      await user.click(importButton);

      await waitFor(() => {
        expect(mockOnImportComplete).toHaveBeenCalledWith(importResult);
      });
    });
  });
});