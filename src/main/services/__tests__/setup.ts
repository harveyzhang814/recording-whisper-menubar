// 全局测试设置
import fs from 'fs';
import path from 'path';

// 清理测试目录
const cleanupTestDirs = () => {
  const testDirs = [
    '/tmp/test-app-data',
    '/tmp/test-logs',
  ];

  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
};

// 在所有测试开始前清理
beforeAll(() => {
  cleanupTestDirs();
});

// 在所有测试结束后清理
afterAll(() => {
  cleanupTestDirs();
});

// 设置测试环境变量
process.env.NODE_ENV = 'test'; 