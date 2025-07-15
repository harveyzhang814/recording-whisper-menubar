import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseManager } from './services/DatabaseManager';
import { LogManager, LogCategory } from './services/LogManager';
import { ConfigManagerImpl } from './services/ConfigManager';
import { TaskManagerImpl } from './services/TaskManager';
import { FileManagerImpl } from './services/FileManager';

class MainWindow {
  private mainWindow: BrowserWindow | null = null;
  private databaseManager: DatabaseManager;
  private logManager: LogManager;
  private configManager: ConfigManagerImpl;
  private taskManager: TaskManagerImpl;
  private fileManager: FileManagerImpl;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logManager = new LogManager();
    this.configManager = new ConfigManagerImpl(this.databaseManager, this.logManager);
    this.taskManager = new TaskManagerImpl(this.databaseManager, this.logManager);
    this.fileManager = new FileManagerImpl(this.databaseManager, this.logManager);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logManager.system('应用启动中...');
      
      // 初始化数据库
      await this.databaseManager.initialize();
      this.logManager.system('数据库初始化完成');
      
      // 初始化配置管理器
      await this.configManager.initialize();
      this.logManager.system('配置管理器初始化完成');
      
      // 初始化任务管理器
      await this.taskManager.initialize();
      this.logManager.system('任务管理器初始化完成');
      
      // 初始化文件管理器
      await this.fileManager.initialize();
      this.logManager.system('文件管理器初始化完成');
      
      // 当所有窗口关闭时退出应用
      app.on('window-all-closed', () => {
        this.logManager.system('应用关闭');
        this.cleanup();
        if (process.platform !== 'darwin') {
          app.quit();
        }
      });

      // 当应用激活时创建窗口
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });

      // 应用准备就绪时创建窗口
      app.whenReady().then(() => {
        this.createWindow();
        this.setupIPC();
        this.logManager.system('应用启动完成');
      });
    } catch (error) {
      this.logManager.error(LogCategory.SYSTEM, '应用初始化失败', error as Error);
      throw error;
    }
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset', // macOS 风格标题栏
      show: false, // 先隐藏窗口
    });

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // 开发环境加载本地服务器
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      // 生产环境加载打包后的文件
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // 窗口关闭时清理引用
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIPC(): void {
    // 窗口控制
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('window:isMaximized', () => {
      return this.mainWindow?.isMaximized();
    });

    ipcMain.handle('window:toggleMaximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    // 配置管理
    ipcMain.handle('config:get', async (event, category: string, key?: string) => {
      return await this.configManager.getConfig(category, key);
    });

    ipcMain.handle('config:set', async (event, category: string, key: string, value: any) => {
      await this.configManager.setConfig(category, key, value);
    });

    ipcMain.handle('config:getApiConfig', async (event, apiType: string) => {
      return await this.configManager.getApiConfig(apiType);
    });

    ipcMain.handle('config:getShortcuts', async () => {
      return await this.configManager.getShortcuts();
    });

    ipcMain.handle('config:updateShortcut', async (event, action: string, key: string, isEnabled: boolean) => {
      await this.configManager.updateShortcut(action, key, isEnabled);
    });

    // 任务管理
    ipcMain.handle('task:create', async (event, audioSource: string, metadata?: any) => {
      return await this.taskManager.createTask(audioSource as any, metadata);
    });

    ipcMain.handle('task:getAll', async (event, filters?: any) => {
      return await this.taskManager.getTasks(filters);
    });

    ipcMain.handle('task:get', async (event, taskId: string) => {
      return await this.taskManager.getTask(taskId);
    });

    ipcMain.handle('task:update', async (event, taskId: string, updates: any) => {
      await this.taskManager.updateTask(taskId, updates);
    });

    ipcMain.handle('task:delete', async (event, taskId: string) => {
      await this.taskManager.deleteTask(taskId);
    });

    ipcMain.handle('task:updateState', async (event, taskId: string, state: string) => {
      await this.taskManager.updateTaskState(taskId, state as any);
    });

    ipcMain.handle('task:search', async (event, query: string) => {
      return await this.taskManager.searchTasks(query);
    });

    // 文件管理
    ipcMain.handle('file:import', async (event, filePaths: string[]) => {
      return await this.fileManager.importAudioFiles(filePaths);
    });

    ipcMain.handle('file:validate', async (event, filePath: string) => {
      return await this.fileManager.validateAudioFile(filePath);
    });

    ipcMain.handle('file:getInfo', async (event, filePath: string) => {
      return await this.fileManager.getAudioFileInfo(filePath);
    });

    ipcMain.handle('file:copy', async (event, sourcePath: string, taskId: string) => {
      return await this.fileManager.copyAudioFile(sourcePath, taskId);
    });

    ipcMain.handle('file:delete', async (event, filePath: string) => {
      await this.fileManager.deleteAudioFile(filePath);
    });

    ipcMain.handle('file:getStorageUsage', async () => {
      return await this.fileManager.getStorageUsage();
    });

    ipcMain.handle('file:cleanup', async () => {
      await this.fileManager.cleanupTempFiles();
    });
  }

  private async cleanup(): Promise<void> {
    try {
      await this.configManager.cleanup();
      await this.taskManager.cleanup();
      await this.fileManager.cleanup();
      this.databaseManager.close();
      this.logManager.system('应用清理完成');
    } catch (error) {
      this.logManager.error(LogCategory.SYSTEM, '应用清理失败', error as Error);
    }
  }
}

// 创建主窗口实例
new MainWindow(); 