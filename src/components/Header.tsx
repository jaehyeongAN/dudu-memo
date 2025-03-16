import React from 'react';
import { Settings2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'todo' | 'memo' | 'backlog';
  setActiveTab: (tab: 'todo' | 'memo' | 'backlog') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenSettings: () => void;
  workspaceSelector: React.ReactNode;
  isGuestMode: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  workspaceSelector,
  isGuestMode
}) => {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          {/* Logo and Guest badge */}
          <div className="flex items-center gap-2">
            <img src="/icons/icon-512x512-no-padding.png" alt="Doo!Du Logo" className="w-5 h-5" />
            <span className="text-xl font-bold text-indigo-600">Doo!Du</span>
            {isGuestMode && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                Guest
              </span>
            )}
          </div>

          {/* Workspace selector on mobile (right side) and settings on desktop */}
          <div className="flex items-center">
            {/* Workspace selector - visible on all screens */}
            <div className="mr-2 md:mr-0">
              {workspaceSelector}
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2 ml-6">
              <button
                onClick={() => setActiveTab('todo')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'todo'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                할 일
              </button>
              <button
                onClick={() => setActiveTab('backlog')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'backlog'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                보관함
              </button>
              <button
                onClick={() => setActiveTab('memo')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'memo'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                메모
              </button>
              <div className="h-6 w-px bg-gray-200 mx-2" />
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="설정"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;