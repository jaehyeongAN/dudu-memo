import React from 'react';
import { ListTodo, StickyNote } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: 'todo' | 'memo';
  onTabChange: (tab: 'todo' | 'memo') => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen }) => {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 w-64 transition-transform duration-300 ease-in-out z-40',
        {
          '-translate-x-full lg:translate-x-0': !isOpen,
          'translate-x-0': isOpen,
        }
      )}
    >
      <nav className="p-4 space-y-2">
        <button
          onClick={() => onTabChange('todo')}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            {
              'bg-blue-50 text-blue-600': activeTab === 'todo',
              'hover:bg-gray-50 text-gray-700': activeTab !== 'todo',
            }
          )}
        >
          <ListTodo size={20} />
          <span className="font-medium">할 일</span>
        </button>
        <button
          onClick={() => onTabChange('memo')}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            {
              'bg-blue-50 text-blue-600': activeTab === 'memo',
              'hover:bg-gray-50 text-gray-700': activeTab !== 'memo',
            }
          )}
        >
          <StickyNote size={20} />
          <span className="font-medium">메모</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;