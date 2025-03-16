import React from 'react';
import { ListTodo, StickyNote, Archive, Settings2 } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'todo' | 'memo' | 'backlog' | 'settings';
  setActiveTab: (tab: 'todo' | 'memo' | 'backlog' | 'settings') => void;
  onOpenSettings: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  onOpenSettings
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => setActiveTab('todo')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === 'todo' ? 'text-indigo-600' : 'text-gray-500'
          }`}
        >
          <ListTodo className="w-6 h-6" />
          <span className="text-xs mt-1">할 일</span>
        </button>
        <button
          onClick={() => setActiveTab('backlog')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === 'backlog' ? 'text-indigo-600' : 'text-gray-500'
          }`}
        >
          <Archive className="w-6 h-6" />
          <span className="text-xs mt-1">보관함</span>
        </button>
        <button
          onClick={() => setActiveTab('memo')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === 'memo' ? 'text-indigo-600' : 'text-gray-500'
          }`}
        >
          <StickyNote className="w-6 h-6" />
          <span className="text-xs mt-1">메모</span>
        </button>
        <button
          onClick={onOpenSettings}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeTab === 'settings' ? 'text-indigo-600' : 'text-gray-500'
          }`}
        >
          <Settings2 className="w-6 h-6" />
          <span className="text-xs mt-1">설정</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;