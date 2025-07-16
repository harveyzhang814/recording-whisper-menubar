import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  },
  
  // 录音相关
  recording: {
    startRecording: (options?: any) => ipcRenderer.invoke('recording:startRecording', options),
    stopRecording: () => ipcRenderer.invoke('recording:stopRecording'),
    pauseRecording: () => ipcRenderer.invoke('recording:pauseRecording'),
    resumeRecording: () => ipcRenderer.invoke('recording:resumeRecording'),
    cancelRecording: () => ipcRenderer.invoke('recording:cancelRecording'),
    getRecordingState: () => ipcRenderer.invoke('recording:getRecordingState'),
    getVolumeLevel: () => ipcRenderer.invoke('recording:getVolumeLevel'),
    getRecordingDuration: () => ipcRenderer.invoke('recording:getRecordingDuration'),
    getAvailableDevices: () => ipcRenderer.invoke('recording:getAvailableDevices'),
    setRecordingDevice: (deviceId: string) => ipcRenderer.invoke('recording:setRecordingDevice', deviceId),
  },
  
  // 任务管理
  tasks: {
    create: (audioSource: string, metadata?: any) => ipcRenderer.invoke('task:create', audioSource, metadata),
    getAll: (filters?: any) => ipcRenderer.invoke('task:getAll', filters),
    get: (taskId: string) => ipcRenderer.invoke('task:get', taskId),
    update: (taskId: string, updates: any) => ipcRenderer.invoke('task:update', taskId, updates),
    delete: (taskId: string) => ipcRenderer.invoke('task:delete', taskId),
    updateState: (taskId: string, state: string) => ipcRenderer.invoke('task:updateState', taskId, state),
    search: (query: string) => ipcRenderer.invoke('task:search', query),
  },
  
  // 转录相关
  transcription: {
    start: (taskId: string, options?: any) => ipcRenderer.invoke('transcription:start', taskId, options),
    stop: (taskId: string) => ipcRenderer.invoke('transcription:stop', taskId),
    getStatus: (taskId: string) => ipcRenderer.invoke('transcription:getStatus', taskId),
    getProgress: (taskId: string) => ipcRenderer.invoke('transcription:getProgress', taskId),
    getResult: (taskId: string) => ipcRenderer.invoke('transcription:getResult', taskId),
    export: (taskId: string, format: string) => ipcRenderer.invoke('transcription:export', taskId, format),
    batch: (taskIds: string[]) => ipcRenderer.invoke('transcription:batch', taskIds),
  },
  
  // 文件管理
  files: {
    import: (filePaths: string[]) => ipcRenderer.invoke('file:import', filePaths),
    validate: (filePath: string) => ipcRenderer.invoke('file:validate', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('file:getInfo', filePath),
    copy: (sourcePath: string, taskId: string) => ipcRenderer.invoke('file:copy', sourcePath, taskId),
    delete: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
    getStorageUsage: () => ipcRenderer.invoke('file:getStorageUsage'),
    cleanup: () => ipcRenderer.invoke('file:cleanup'),
  },
  
  // 配置管理
  config: {
    get: (category: string, key?: string) => ipcRenderer.invoke('config:get', category, key),
    set: (category: string, key: string, value: any) => ipcRenderer.invoke('config:set', category, key, value),
    getApiConfig: (apiType: string) => ipcRenderer.invoke('config:getApiConfig', apiType),
    getShortcuts: () => ipcRenderer.invoke('config:getShortcuts'),
    updateShortcut: (action: string, key: string, enabled: boolean) => ipcRenderer.invoke('config:updateShortcut', action, key, enabled),
  },
  
  // 事件监听
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  
  off: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
});

// 类型定义
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        toggleMaximize: () => Promise<void>;
      };
      recording: {
        startRecording: (options?: any) => Promise<void>;
        stopRecording: () => Promise<any>;
        pauseRecording: () => Promise<void>;
        resumeRecording: () => Promise<void>;
        cancelRecording: () => Promise<void>;
        getRecordingState: () => Promise<any>;
        getVolumeLevel: () => Promise<number>;
        getRecordingDuration: () => Promise<number>;
        getAvailableDevices: () => Promise<any[]>;
        setRecordingDevice: (deviceId: string) => Promise<void>;
      };
      tasks: {
        create: (audioSource: string, metadata?: any) => Promise<any>;
        getAll: (filters?: any) => Promise<any[]>;
        get: (taskId: string) => Promise<any>;
        update: (taskId: string, updates: any) => Promise<void>;
        delete: (taskId: string) => Promise<void>;
        updateState: (taskId: string, state: string) => Promise<void>;
        search: (query: string) => Promise<any[]>;
      };
      transcription: {
        start: (taskId: string, options?: any) => Promise<void>;
        stop: (taskId: string) => Promise<void>;
        getStatus: (taskId: string) => Promise<any>;
        getProgress: (taskId: string) => Promise<number>;
        getResult: (taskId: string) => Promise<any>;
        export: (taskId: string, format: string) => Promise<string>;
        batch: (taskIds: string[]) => Promise<any[]>;
      };
      files: {
        import: (filePaths: string[]) => Promise<any[]>;
        validate: (filePath: string) => Promise<boolean>;
        getInfo: (filePath: string) => Promise<any>;
        copy: (sourcePath: string, taskId: string) => Promise<string>;
        delete: (filePath: string) => Promise<void>;
        getStorageUsage: () => Promise<any>;
        cleanup: () => Promise<void>;
      };
      config: {
        get: (category: string, key?: string) => Promise<any>;
        set: (category: string, key: string, value: any) => Promise<void>;
        getApiConfig: (apiType: string) => Promise<any>;
        getShortcuts: () => Promise<any[]>;
        updateShortcut: (action: string, key: string, enabled: boolean) => Promise<void>;
      };
      on: (channel: string, callback: Function) => void;
      off: (channel: string, callback: Function) => void;
    };
  }
} 