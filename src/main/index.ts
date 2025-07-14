import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseManager } from './services/DatabaseManager';
import { LogManager, LogCategory } from './services/LogManager';

class MainWindow {
  private mainWindow: BrowserWindow | null = null;
  private databaseManager: DatabaseManager;
  private logManager: LogManager;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logManager = new LogManager();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logManager.system('应用启动中...');
      
      // 初始化数据库
      await this.databaseManager.initialize();
      this.logManager.system('数据库初始化完成');
      
      // 当所有窗口关闭时退出应用
      app.on('window-all-closed', () => {
        this.logManager.system('应用关闭');
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
    // 最小化窗口
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    // 关闭窗口
    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
    });

    // 获取窗口状态
    ipcMain.handle('window:isMaximized', () => {
      return this.mainWindow?.isMaximized();
    });

    // 最大化/恢复窗口
    ipcMain.handle('window:toggleMaximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });
  }
}

// 创建主窗口实例
new MainWindow(); 