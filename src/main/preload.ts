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
    start: () => ipcRenderer.invoke('recording:start'),
    stop: () => ipcRenderer.invoke('recording:stop'),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume'),
    cancel: () => ipcRenderer.invoke('recording:cancel'),
    getState: () => ipcRenderer.invoke('recording:getState'),
    getVolumeLevel: () => ipcRenderer.invoke('recording:getVolumeLevel'),
    getDuration: () => ipcRenderer.invoke('recording:getDuration'),
    getDevices: () => ipcRenderer.invoke('recording:getDevices'),
    setDevice: (deviceId: string) => ipcRenderer.invoke('recording:setDevice', deviceId),
  },
  
  // 任务管理
  tasks: {
    create: (data: any) => ipcRenderer.invoke('tasks:create', data),
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getById: (id: string) => ipcRenderer.invoke('tasks:getById', id),
    update: (id: string, data: any) => ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    search: (query: string) => ipcRenderer.invoke('tasks:search', query),
  },
  
  // 转录相关
  transcription: {
    start: (taskId: string, options?: any) => ipcRenderer.invoke('transcription:start', taskId, options),
    stop: (taskId: string) => ipcRenderer.invoke('transcription:stop', taskId),
    getStatus: (taskId: string) => ipcRenderer.invoke('transcription:getStatus', taskId),
    getProgress: (taskId: string) => ipcRenderer.invoke('transcription:getProgress', taskId),
    getResult: (taskId: string) => ipcRenderer.invoke('transcription:getResult', taskId),
    export: (taskId: string, format: string) => ipcRenderer.invoke('transcription:export', taskId, format),
  },
  
  // 文件管理
  files: {
    import: (filePaths: string[]) => ipcRenderer.invoke('files:import', filePaths),
    validate: (filePath: string) => ipcRenderer.invoke('files:validate', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('files:getInfo', filePath),
    delete: (filePath: string) => ipcRenderer.invoke('files:delete', filePath),
    getStorageUsage: () => ipcRenderer.invoke('files:getStorageUsage'),
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
        start: () => Promise<void>;
        stop: () => Promise<any>;
        pause: () => Promise<void>;
        resume: () => Promise<void>;
        cancel: () => Promise<void>;
        getState: () => Promise<any>;
        getVolumeLevel: () => Promise<number>;
        getDuration: () => Promise<number>;
        getDevices: () => Promise<any[]>;
        setDevice: (deviceId: string) => Promise<void>;
      };
      tasks: {
        create: (data: any) => Promise<any>;
        getAll: () => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        update: (id: string, data: any) => Promise<void>;
        delete: (id: string) => Promise<void>;
        search: (query: string) => Promise<any[]>;
      };
      transcription: {
        start: (taskId: string, options?: any) => Promise<void>;
        stop: (taskId: string) => Promise<void>;
        getStatus: (taskId: string) => Promise<any>;
        getProgress: (taskId: string) => Promise<number>;
        getResult: (taskId: string) => Promise<any>;
        export: (taskId: string, format: string) => Promise<string>;
      };
      files: {
        import: (filePaths: string[]) => Promise<any[]>;
        validate: (filePath: string) => Promise<boolean>;
        getInfo: (filePath: string) => Promise<any>;
        delete: (filePath: string) => Promise<void>;
        getStorageUsage: () => Promise<any>;
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