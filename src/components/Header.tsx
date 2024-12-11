import React from 'react';
import { Menu, X, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: 'todo' | 'memo';
  setActiveTab: (tab: 'todo' | 'memo') => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) => {
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-indigo-600">🦉 DuDu</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
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
              onClick={() => setActiveTab('memo')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'memo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              메모
            </button>
            <button
              onClick={onLogout}
              className="ml-4 inline-flex items-center px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
              className={`w-full px-4 py-2 rounded-lg text-left transition-all ${
                activeTab === 'todo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              할 일
            </button>
            <button
              onClick={() => {
                setActiveTab('memo');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-4 py-2 rounded-lg text-left transition-all ${
                activeTab === 'memo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              메모
            </button>
            <button
              onClick={onLogout}
              className="w-full inline-flex items-center px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;