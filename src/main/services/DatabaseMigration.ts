import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DatabaseMigration {
  private db: Database.Database;
  private dbPath: string;

  constructor(db: Database.Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  async migrate(): Promise<void> {
    try {
      // 检查当前版本
      const currentVersion = await this.getCurrentVersion();
      console.log(`当前数据库版本: ${currentVersion}`);

      // 执行迁移脚本
      await this.executeMigrations(currentVersion);

      // 更新版本号
      await this.updateVersion();

      console.log('数据库迁移完成');
    } catch (error) {
      console.error('数据库迁移失败:', error);
      throw error;
    }
  }

  private async getCurrentVersion(): Promise<number> {
    try {
      // 检查版本表是否存在
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
      `).get();

      if (!tableExists) {
        // 创建版本表
        this.db.exec(`
          CREATE TABLE schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
          )
        `);
        return 0;
      }

      // 获取当前版本
      const result = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
      return result ? result.version : 0;
    } catch (error) {
      console.error('获取数据库版本失败:', error);
      return 0;
    }
  }

  private async executeMigrations(currentVersion: number): Promise<void> {
    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`执行迁移: v${migration.version} - ${migration.description}`);
        
        try {
          // 开始事务
          this.db.exec('BEGIN TRANSACTION');
          
          // 执行迁移脚本
          this.db.exec(migration.sql);
          
          // 记录迁移版本
          const now = new Date().toISOString();
          this.db.prepare(`
            INSERT INTO schema_version (version, applied_at) VALUES (?, ?)
          `).run(migration.version, now);
          
          // 提交事务
          this.db.exec('COMMIT');
          
          console.log(`迁移 v${migration.version} 执行成功`);
        } catch (error) {
          // 回滚事务
          this.db.exec('ROLLBACK');
          console.error(`迁移 v${migration.version} 执行失败:`, error);
          throw error;
        }
      }
    }
  }

  private getMigrations(): Array<{ version: number; description: string; sql: string }> {
    return [
      {
        version: 1,
        description: '初始化数据库结构',
        sql: `
          -- 这个迁移已经在DatabaseManager中处理
          -- 这里可以添加后续的数据库结构变更
        `,
      },
      // 可以在这里添加更多的迁移脚本
      // {
      //   version: 2,
      //   description: '添加新字段',
      //   sql: `
      //     ALTER TABLE task ADD COLUMN priority INTEGER DEFAULT 0;
      //   `,
      // },
    ];
  }

  private async updateVersion(): Promise<void> {
    const result = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    if (result) {
      console.log(`数据库版本已更新到: ${result.version}`);
    }
  }

  async backup(): Promise<string> {
    try {
      const backupPath = this.dbPath.replace('.db', `_backup_${Date.now()}.db`);
      
      // 创建备份文件
      fs.copyFileSync(this.dbPath, backupPath);
      
      console.log(`数据库备份完成: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('数据库备份失败:', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      // 验证备份文件
      if (!fs.existsSync(backupPath)) {
        throw new Error('备份文件不存在');
      }

      // 关闭当前数据库连接
      this.db.close();

      // 恢复数据库文件
      fs.copyFileSync(backupPath, this.dbPath);

      console.log(`数据库恢复完成: ${backupPath}`);
    } catch (error) {
      console.error('数据库恢复失败:', error);
      throw error;
    }
  }

  async cleanupOldBackups(keepDays: number = 7): Promise<void> {
    try {
      const backupDir = path.dirname(this.dbPath);
      const files = fs.readdirSync(backupDir);
      const backupFiles = files.filter(file => file.includes('_backup_') && file.endsWith('.db'));
      
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`删除旧备份文件: ${file}`);
        }
      }
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }
} 