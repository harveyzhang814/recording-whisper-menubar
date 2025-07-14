import React from 'react';
import { Card } from './Card';

export const TaskList: React.FC = () => {
  // TODO: 从任务管理器获取任务列表
  const tasks = [
    {
      id: '1',
      title: '会议记录',
      description: '产品讨论会议录音',
      state: 'completed',
      createdAt: new Date('2024-01-15T10:30:00'),
    },
    {
      id: '2',
      title: '语音备忘录',
      description: '项目想法记录',
      state: 'pending',
      createdAt: new Date('2024-01-15T14:20:00'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          任务列表
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          共 {tasks.length} 个任务
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">暂无任务</p>
            <p className="text-sm">开始录音或导入音频文件来创建第一个任务</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {task.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {task.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.state === 'completed' 
                      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                      : 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
                  }`}>
                    {task.state === 'completed' ? '已完成' : '待处理'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 