import React from 'react';
import { Menu, X, LogOut, ListTodo, StickyNote, Archive, UserX } from 'lucide-react';

interface HeaderProps {
  activeTab: 'todo' | 'memo' | 'backlog';
  setActiveTab: (tab: 'todo' | 'memo' | 'backlog') => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  workspaceSelector: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  onDeleteAccount,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  workspaceSelector
}) => {
  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      '정말로 계정을 삭제하시겠습니까?\n\n' +
      '이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다:\n' +
      '- 모든 워크스페이스\n' +
      '- 모든 할 일 및 메모\n' +
      '- 계정 정보'
    );
    
    if (confirmed) {
      onDeleteAccount();
    }
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-indigo-600">🦉 DuDu</span>
            {workspaceSelector}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('todo')}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'todo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ListTodo className="w-4 h-4 mr-2" />
              할 일
            </button>
            <button
              onClick={() => setActiveTab('backlog')}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'backlog'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Archive className="w-4 h-4 mr-2" />
              백로그
            </button>
            <button
              onClick={() => setActiveTab('memo')}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'memo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StickyNote className="w-4 h-4 mr-2" />
              메모
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <button
              onClick={handleDeleteAccount}
              className="inline-flex items-center px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="계정 삭제"
            >
              <UserX className="w-4 h-4 mr-2" />
              계정 삭제
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
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
            {workspaceSelector}
            <button
              onClick={() => {
                setActiveTab('todo');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full inline-flex items-center px-4 py-2 rounded-lg text-left transition-all ${
                activeTab === 'todo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ListTodo className="w-4 h-4 mr-2" />
              할 일
            </button>
            <button
              onClick={() => {
                setActiveTab('backlog');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full inline-flex items-center px-4 py-2 rounded-lg text-left transition-all ${
                activeTab === 'backlog'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Archive className="w-4 h-4 mr-2" />
              백로그
            </button>
            <button
              onClick={() => {
                setActiveTab('memo');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full inline-flex items-center px-4 py-2 rounded-lg text-left transition-all ${
                activeTab === 'memo'
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StickyNote className="w-4 h-4 mr-2" />
              메모
            </button>
            <div className="h-px bg-gray-200 my-2" />
            <button
              onClick={() => {
                handleDeleteAccount();
                setIsMobileMenuOpen(false);
              }}
              className="w-full inline-flex items-center px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <UserX className="w-4 h-4 mr-2" />
              계정 삭제
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