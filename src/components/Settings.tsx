import React, { useEffect, useRef } from 'react';
import { LogOut, UserX, X, ChevronRight } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isGuestMode: boolean;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  onLogout,
  onDeleteAccount,
  isGuestMode
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      '정말로 계정을 삭제하시겠습니까?\n\n' +
      '이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다:\n' +
      '- 모든 워크스페이스\n' +
      '- 모든 할 일 및 메모\n' +
      '- 계정 정보'
    );
    
    if (confirmed) {
      onClose();
      onDeleteAccount();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-end md:items-center justify-center">
      <div 
        ref={modalRef}
        className="bg-white w-full md:w-[28rem] md:rounded-2xl md:shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">설정</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {isGuestMode && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  게스트 모드에서는 데이터가 브라우저에만 저장되며, 브라우저를 닫으면 모든 데이터가 삭제됩니다.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">계정</h3>
              <div className="space-y-2">
                {!isGuestMode && (
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserX className="w-5 h-5" />
                      <span>계정 삭제</span>
                    </div>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <span>{isGuestMode ? '게스트 모드 종료' : '로그아웃'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">앱 정보</h3>
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">버전</span>
                  <span className="text-sm font-medium text-gray-900">1.2.1</span>
                </div>
                <a 
                  href="https://www.doodu.kr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">웹사이트</span>
                  <span className="text-sm font-medium text-indigo-600">doodu.kr</span>
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">법적 고지</h3>
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
                <a 
                  href="https://sites.google.com/view/doodu/terms-conditions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">이용약관</span>
                  <span className="text-sm text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </a>
                <a 
                  href="https://sites.google.com/view/doodu/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">개인정보처리방침</span>
                  <span className="text-sm text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </a>
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-500">© 2025 Doo!Du. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 