import { AudioRecorderImpl, RecordingError } from '../AudioRecorder';
import { LogManager } from '../LogManager';
import { FileManagerImpl } from '../FileManager';
import { TaskManagerImpl } from '../TaskManager';
import { ConfigManagerImpl } from '../ConfigManager';
import { DatabaseManager } from '../DatabaseManager';

// Mock dependencies
jest.mock('../LogManager');
jest.mock('../FileManager');
jest.mock('../TaskManager');
jest.mock('../ConfigManager');
jest.mock('../DatabaseManager');

describe('AudioRecorderImpl', () => {
  let audioRecorder: AudioRecorderImpl;
  let mockLogManager: jest.Mocked<LogManager>;
  let mockFileManager: jest.Mocked<FileManagerImpl>;
  let mockTaskManager: jest.Mocked<TaskManagerImpl>;
  let mockConfigManager: jest.Mocked<ConfigManagerImpl>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLogManager = new LogManager() as jest.Mocked<LogManager>;
    mockFileManager = new FileManagerImpl({} as DatabaseManager, mockLogManager) as jest.Mocked<FileManagerImpl>;
    mockTaskManager = new TaskManagerImpl({} as DatabaseManager, mockLogManager) as jest.Mocked<TaskManagerImpl>;
    mockConfigManager = new ConfigManagerImpl({} as DatabaseManager, mockLogManager) as jest.Mocked<ConfigManagerImpl>;

    // Create AudioRecorder instance
    audioRecorder = new AudioRecorderImpl(
      mockLogManager,
      mockFileManager,
      mockTaskManager,
      mockConfigManager
    );
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock config manager to return audio config
      mockConfigManager.getConfig.mockReturnValue(Promise.resolve({
        format: 'audio/wav',
        sampleRate: 44100,
        channels: 1
      }));

      await expect(audioRecorder.initialize()).resolves.not.toThrow();
      expect(mockLogManager.audio).toHaveBeenCalledWith('初始化录音管理器');
      expect(mockLogManager.audio).toHaveBeenCalledWith('录音管理器初始化完成');
    });

    it('should handle initialization errors', async () => {
      mockConfigManager.getConfig.mockImplementation(() => {
        throw new Error('Config error');
      });

      await expect(audioRecorder.initialize()).rejects.toThrow(RecordingError);
      expect(mockLogManager.error).toHaveBeenCalledWith(
        expect.any(String),
        '录音管理器初始化失败',
        expect.any(Error)
      );
    });
  });

  describe('recording state management', () => {
    it('should return initial recording state', () => {
      const state = audioRecorder.getRecordingState();
      
      expect(state).toEqual({
        isRecording: false,
        isPaused: false,
        duration: 0,
        volumeLevel: 0,
        deviceId: '',
        startTime: expect.any(Date)
      });
    });

    it('should return zero volume when not recording', () => {
      const volume = audioRecorder.getVolumeLevel();
      expect(volume).toBe(0);
    });

    it('should return zero duration when not recording', () => {
      const duration = audioRecorder.getRecordingDuration();
      expect(duration).toBe(0);
    });
  });

  describe('device management', () => {
    it('should get available devices', async () => {
      // Mock navigator.mediaDevices
      const mockDevices = [
        {
          deviceId: 'device1',
          label: 'Microphone 1',
          groupId: 'group1',
          kind: 'audioinput'
        }
      ];

      // Mock getUserMedia to grant permission
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockResolvedValue({}),
          enumerateDevices: jest.fn().mockResolvedValue(mockDevices)
        },
        writable: true
      });

      const devices = await audioRecorder.getAvailableDevices();
      
      expect(devices).toEqual([
        {
          deviceId: 'device1',
          label: 'Microphone 1',
          groupId: 'group1',
          kind: 'audioinput'
        }
      ]);
    });

    it('should handle device enumeration errors', async () => {
      // Mock getUserMedia to throw error
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')),
          enumerateDevices: jest.fn().mockResolvedValue([])
        },
        writable: true
      });

      await expect(audioRecorder.getAvailableDevices()).rejects.toThrow(RecordingError);
    });
  });

  describe('recording operations', () => {
    beforeEach(() => {
      // Mock Web Audio API
      global.AudioContext = jest.fn().mockImplementation(() => ({
        createAnalyser: jest.fn().mockReturnValue({
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
          minDecibels: -90,
          maxDecibels: -10,
          frequencyBinCount: 1024,
          getByteFrequencyData: jest.fn()
        }),
        createMediaStreamSource: jest.fn().mockReturnValue({
          connect: jest.fn()
        }),
        close: jest.fn()
      }));

      // Mock MediaRecorder
      global.MediaRecorder = jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        ondataavailable: null,
        onstop: null,
        mimeType: 'audio/wav'
      })) as any;
      
      // Add static method
      (global.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true);

      // Mock getUserMedia
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockResolvedValue({
            getTracks: jest.fn().mockReturnValue([
              { stop: jest.fn() }
            ])
          })
        },
        writable: true
      });
    });

    it('should start recording successfully', async () => {
      await expect(audioRecorder.startRecording()).resolves.not.toThrow();
      
      const state = audioRecorder.getRecordingState();
      expect(state.isRecording).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('should not start recording when already recording', async () => {
      // Start recording first
      await audioRecorder.startRecording();
      
      // Try to start again
      await expect(audioRecorder.startRecording()).rejects.toThrow(RecordingError);
    });

    it('should pause and resume recording', async () => {
      await audioRecorder.startRecording();
      
      await expect(audioRecorder.pauseRecording()).resolves.not.toThrow();
      let state = audioRecorder.getRecordingState();
      expect(state.isPaused).toBe(true);
      
      await expect(audioRecorder.resumeRecording()).resolves.not.toThrow();
      state = audioRecorder.getRecordingState();
      expect(state.isPaused).toBe(false);
    });

    it('should cancel recording', async () => {
      await audioRecorder.startRecording();
      
      await expect(audioRecorder.cancelRecording()).resolves.not.toThrow();
      
      const state = audioRecorder.getRecordingState();
      expect(state.isRecording).toBe(false);
      expect(state.isPaused).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should handle events', () => {
      const mockListener = jest.fn();
      
      audioRecorder.on('testEvent', mockListener);
      audioRecorder.off('testEvent', mockListener);
      
      // No error should be thrown
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should destroy recorder without errors', () => {
      expect(() => audioRecorder.destroy()).not.toThrow();
    });
  });
}); 