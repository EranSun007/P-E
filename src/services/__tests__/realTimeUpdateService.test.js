// src/services/__tests__/realTimeUpdateService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealTimeUpdateService } from '../realTimeUpdateService.js';
import { localClient } from '../../api/localClient.js';

// Mock the localClient
vi.mock('../../api/localClient.js', () => ({
  localClient: {
    entities: {
      Meeting: {
        list: vi.fn()
      },
      OutOfOffice: {
        list: vi.fn()
      },
      Duty: {
        list: vi.fn()
      },
      TeamMember: {
        list: vi.fn()
      },
      CalendarEvent: {
        list: vi.fn()
      }
    }
  }
}));

describe('RealTimeUpdateService', () => {
  let service;
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(async () => {
    // Mock default empty responses before creating service
    localClient.entities.Meeting.list.mockResolvedValue([]);
    localClient.entities.OutOfOffice.list.mockResolvedValue([]);
    localClient.entities.Duty.list.mockResolvedValue([]);
    localClient.entities.TeamMember.list.mockResolvedValue([]);
    localClient.entities.CalendarEvent.list.mockResolvedValue([]);
    
    service = new RealTimeUpdateService();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Reset all mocks after initialization
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    vi.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default values', () => {
      expect(service.isPolling).toBe(false);
      expect(service.pollingInterval).toBe(null);
      expect(service.pollIntervalMs).toBe(30000);
      expect(service.connectionStatus).toBe('connected');
      expect(service.retryCount).toBe(0);
      expect(service.maxRetries).toBe(3);
    });

    it('should initialize timestamps map', () => {
      expect(service.lastUpdateTimestamps).toBeInstanceOf(Map);
      expect(service.subscribers).toBeInstanceOf(Map);
    });
  });

  describe('Entity Data Retrieval', () => {
    it('should get meeting data', async () => {
      const mockMeetings = [
        { id: '1', title: 'Meeting 1', updated_date: '2024-01-01T10:00:00Z' }
      ];
      localClient.entities.Meeting.list.mockResolvedValue(mockMeetings);

      const result = await service.getEntityData('meetings');
      expect(result).toEqual(mockMeetings);
      expect(localClient.entities.Meeting.list).toHaveBeenCalledOnce();
    });

    it('should get out-of-office data', async () => {
      const mockOutOfOffice = [
        { id: '1', type: 'vacation', updated_date: '2024-01-01T10:00:00Z' }
      ];
      localClient.entities.OutOfOffice.list.mockResolvedValue(mockOutOfOffice);

      const result = await service.getEntityData('out_of_office');
      expect(result).toEqual(mockOutOfOffice);
      expect(localClient.entities.OutOfOffice.list).toHaveBeenCalledOnce();
    });

    it('should get duty data', async () => {
      const mockDuties = [
        { id: '1', type: 'devops', updated_date: '2024-01-01T10:00:00Z' }
      ];
      localClient.entities.Duty.list.mockResolvedValue(mockDuties);

      const result = await service.getEntityData('duties');
      expect(result).toEqual(mockDuties);
      expect(localClient.entities.Duty.list).toHaveBeenCalledOnce();
    });

    it('should return empty array for unknown entity type', async () => {
      const result = await service.getEntityData('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('Timestamp Management', () => {
    it('should get latest timestamp from entities', () => {
      const entities = [
        { id: '1', updated_date: '2024-01-01T10:00:00Z' },
        { id: '2', updated_date: '2024-01-02T10:00:00Z' },
        { id: '3', updated_date: '2024-01-01T15:00:00Z' }
      ];

      const latest = service.getLatestTimestamp(entities);
      expect(latest).toBe('2024-01-02T10:00:00Z');
    });

    it('should handle entities with only created_date', () => {
      const entities = [
        { id: '1', created_date: '2024-01-01T10:00:00Z' },
        { id: '2', created_date: '2024-01-02T10:00:00Z' }
      ];

      const latest = service.getLatestTimestamp(entities);
      expect(latest).toBe('2024-01-02T10:00:00Z');
    });

    it('should return epoch for empty entities', () => {
      const latest = service.getLatestTimestamp([]);
      expect(latest).toBe(new Date(0).toISOString());
    });

    it('should prefer updated_date over created_date', () => {
      const entities = [
        { 
          id: '1', 
          created_date: '2024-01-02T10:00:00Z',
          updated_date: '2024-01-01T10:00:00Z'
        }
      ];

      const latest = service.getLatestTimestamp(entities);
      expect(latest).toBe('2024-01-01T10:00:00Z');
    });
  });

  describe('Polling Control', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should start polling', () => {
      service.startPolling();
      
      expect(service.isPolling).toBe(true);
      expect(service.connectionStatus).toBe('connected');
      expect(service.retryCount).toBe(0);
      expect(mockConsoleLog).toHaveBeenCalledWith('RealTimeUpdateService: Starting polling');
    });

    it('should not start polling if already polling', () => {
      service.isPolling = true;
      const spy = vi.spyOn(service, 'checkForUpdates');
      
      service.startPolling();
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('should stop polling', () => {
      service.startPolling();
      service.stopPolling();
      
      expect(service.isPolling).toBe(false);
      expect(service.pollingInterval).toBe(null);
      expect(mockConsoleLog).toHaveBeenCalledWith('RealTimeUpdateService: Stopped polling');
    });

    it('should not stop polling if not currently polling', () => {
      const initialState = service.isPolling;
      service.stopPolling();
      
      expect(service.isPolling).toBe(initialState);
    });

    it('should check for updates at specified interval', async () => {
      const spy = vi.spyOn(service, 'checkForUpdates').mockImplementation(() => Promise.resolve());
      
      service.startPolling();
      
      // Initial call
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Advance time by polling interval
      vi.advanceTimersByTime(30000);
      expect(spy).toHaveBeenCalledTimes(2);
      
      // Advance again
      vi.advanceTimersByTime(30000);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Update Detection', () => {
    it('should detect updates when timestamps change', async () => {
      // Set initial timestamp
      service.lastUpdateTimestamps.set('meetings', '2024-01-01T10:00:00Z');
      
      // Mock newer data
      const mockMeetings = [
        { id: '1', title: 'Meeting 1', updated_date: '2024-01-02T10:00:00Z' }
      ];
      localClient.entities.Meeting.list.mockResolvedValue(mockMeetings);
      
      const spy = vi.spyOn(service, 'notifySubscribers');
      
      await service.checkForUpdates();
      
      expect(spy).toHaveBeenCalledWith(expect.any(Map));
      const updates = spy.mock.calls[0][0];
      expect(updates.has('meetings')).toBe(true);
      expect(updates.get('meetings').currentTimestamp).toBe('2024-01-02T10:00:00Z');
    });

    it('should not notify when no updates detected', async () => {
      // Set current timestamp
      service.lastUpdateTimestamps.set('meetings', '2024-01-01T10:00:00Z');
      
      // Mock same data
      const mockMeetings = [
        { id: '1', title: 'Meeting 1', updated_date: '2024-01-01T10:00:00Z' }
      ];
      localClient.entities.Meeting.list.mockResolvedValue(mockMeetings);
      
      const spy = vi.spyOn(service, 'notifySubscribers');
      
      await service.checkForUpdates();
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle errors during update check', async () => {
      localClient.entities.Meeting.list.mockRejectedValue(new Error('Network error'));
      
      const spy = vi.spyOn(service, 'handleUpdateError');
      
      await service.checkForUpdates();
      
      expect(spy).toHaveBeenCalledWith(expect.any(Error));
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should increment retry count on error', () => {
      const error = new Error('Test error');
      
      service.handleUpdateError(error);
      
      expect(service.retryCount).toBe(1);
      expect(service.connectionStatus).toBe('retrying');
    });

    it('should set error status after max retries', () => {
      const error = new Error('Test error');
      
      // Reach max retries
      for (let i = 0; i < service.maxRetries; i++) {
        service.handleUpdateError(error);
      }
      
      expect(service.connectionStatus).toBe('error');
      expect(mockConsoleError).toHaveBeenCalledWith('Max retries reached, marking connection as error');
    });

    it('should notify subscribers of connection status changes', () => {
      const spy = vi.spyOn(service, 'notifyConnectionStatusChange');
      const error = new Error('Test error');
      
      service.handleUpdateError(error);
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to meeting updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.onMeetingUpdate(callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(service.subscribers.size).toBe(1);
    });

    it('should subscribe to out-of-office updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.onOutOfOfficeUpdate(callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(service.subscribers.size).toBe(1);
    });

    it('should subscribe to duty updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.onDutyUpdate(callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(service.subscribers.size).toBe(1);
    });

    it('should subscribe to all updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.onUpdate(callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(service.subscribers.size).toBe(1);
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsubscribe = service.onUpdate(callback);
      
      expect(service.subscribers.size).toBe(1);
      
      unsubscribe();
      
      expect(service.subscribers.size).toBe(0);
    });

    it('should filter updates for specific entity subscriptions', () => {
      const callback = vi.fn();
      service.onMeetingUpdate(callback);
      
      const updates = new Map();
      updates.set('meetings', { data: [], currentTimestamp: '2024-01-01T10:00:00Z' });
      updates.set('duties', { data: [], currentTimestamp: '2024-01-01T10:00:00Z' });
      
      service.notifySubscribers(updates);
      
      expect(callback).toHaveBeenCalledWith(expect.any(Map));
      const receivedUpdates = callback.mock.calls[0][0];
      expect(receivedUpdates.has('meetings')).toBe(true);
      expect(receivedUpdates.has('duties')).toBe(false);
    });

    it('should pass all updates for general subscription', () => {
      const callback = vi.fn();
      service.onUpdate(callback);
      
      const updates = new Map();
      updates.set('meetings', { data: [], currentTimestamp: '2024-01-01T10:00:00Z' });
      updates.set('duties', { data: [], currentTimestamp: '2024-01-01T10:00:00Z' });
      
      service.notifySubscribers(updates);
      
      expect(callback).toHaveBeenCalledWith(updates);
    });
  });

  describe('Force Refresh', () => {
    it('should force refresh successfully', async () => {
      const spy = vi.spyOn(service, 'initializeTimestamps').mockResolvedValue();
      const checkSpy = vi.spyOn(service, 'checkForUpdates').mockResolvedValue();
      
      const result = await service.forceRefresh();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Refresh completed successfully');
      expect(spy).toHaveBeenCalled();
      expect(checkSpy).toHaveBeenCalled();
    });

    it('should handle force refresh errors', async () => {
      const error = new Error('Refresh failed');
      vi.spyOn(service, 'initializeTimestamps').mockRejectedValue(error);
      
      const result = await service.forceRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh failed');
    });
  });

  describe('Status and Configuration', () => {
    it('should return connection status', () => {
      service.isPolling = true;
      service.connectionStatus = 'connected';
      service.retryCount = 1;
      
      const status = service.getConnectionStatus();
      
      expect(status).toEqual({
        status: 'connected',
        isPolling: true,
        retryCount: 1,
        pollInterval: 30000
      });
    });

    it('should update poll interval', () => {
      const newInterval = 60000;
      
      service.setPollInterval(newInterval);
      
      expect(service.pollIntervalMs).toBe(newInterval);
    });

    it('should restart polling when interval changes during active polling', () => {
      const stopSpy = vi.spyOn(service, 'stopPolling');
      const startSpy = vi.spyOn(service, 'startPolling');
      
      service.isPolling = true;
      service.setPollInterval(60000);
      
      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should return last update timestamps', () => {
      // Clear any existing timestamps from initialization
      service.lastUpdateTimestamps.clear();
      service.lastUpdateTimestamps.set('meetings', '2024-01-01T10:00:00Z');
      service.lastUpdateTimestamps.set('duties', '2024-01-02T10:00:00Z');
      
      const timestamps = service.getLastUpdateTimestamps();
      
      expect(timestamps).toEqual({
        meetings: '2024-01-01T10:00:00Z',
        duties: '2024-01-02T10:00:00Z'
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const callback = vi.fn();
      service.onUpdate(callback);
      service.lastUpdateTimestamps.set('test', '2024-01-01T10:00:00Z');
      
      const stopSpy = vi.spyOn(service, 'stopPolling');
      
      service.destroy();
      
      expect(stopSpy).toHaveBeenCalled();
      expect(service.subscribers.size).toBe(0);
      expect(service.lastUpdateTimestamps.size).toBe(0);
    });
  });

  describe('Callback ID Generation', () => {
    it('should generate unique callback IDs', () => {
      const id1 = service.generateCallbackId();
      const id2 = service.generateCallbackId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^callback_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^callback_\d+_[a-z0-9]+$/);
    });
  });
});