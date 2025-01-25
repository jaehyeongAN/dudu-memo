import React from 'react';
import { Menu, X, Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: 'todo' | 'memo' | 'backlog';
  setActiveTab: (tab: 'todo' | 'memo' | 'backlog') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onOpenSettings: () => void;
  workspaceSelector: React.ReactNode;
  isGuestMode: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onOpenSettings,
  workspaceSelector,
  isGuestMode
}) => {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-512x512-no-padding.png" alt="Doo!Du Logo" className="w-4 h-4" />
            <span className="text-xl font-bold text-indigo-600">Doo!Du</span>
            {isGuestMode && (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Guest
              </span>
            )}
            {workspaceSelector}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
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
              백로그
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
              <SettingsIcon className="w-5 h-5" />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2 space-y-2">
            <button
              onClick={() => {
                setActiveTab('todo');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-4 py-2 text-left rounded-lg transition-all ${
                activeTab === 'todo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              할 일
            </button>
            <button
              onClick={() => {
                setActiveTab('backlog');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-4 py-2 text-left rounded-lg transition-all ${
                activeTab === 'backlog'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              백로그
            </button>
            <button
              onClick={() => {
                setActiveTab('memo');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-4 py-2 text-left rounded-lg transition-all ${
                activeTab === 'memo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              메모
            </button>
            <div className="h-px bg-gray-200" />
            <button
              onClick={() => {
                onOpenSettings();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <SettingsIcon className="w-5 h-5" />
              설정
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;