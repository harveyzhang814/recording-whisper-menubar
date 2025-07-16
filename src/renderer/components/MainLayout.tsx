import React, { useState } from 'react';
import { Toolbar } from './Toolbar';
import { TaskList } from './TaskList';
import { RecordingPage } from '../pages/RecordingPage';

export const MainLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'tasks' | 'recording'>('recording');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col h-screen">
        {/* 工具栏 */}
        <Toolbar onPageChange={setCurrentPage} currentPage={currentPage} />
        
        {/* 主内容区域 */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full">
            {currentPage === 'tasks' ? (
              <div className="p-4">
                <TaskList />
              </div>
            ) : (
              <RecordingPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}; 