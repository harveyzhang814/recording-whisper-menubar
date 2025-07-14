import React from 'react';
import { Toolbar } from './Toolbar';
import { TaskList } from './TaskList';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col h-screen">
        {/* 工具栏 */}
        <Toolbar />
        
        {/* 主内容区域 */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-4">
            <TaskList />
          </div>
        </main>
      </div>
    </div>
  );
}; 