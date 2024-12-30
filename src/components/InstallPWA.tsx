import React from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

const InstallPWA: React.FC = () => {
  const { isInstallable, install, dismiss } = usePWA();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 flex items-center gap-2">
      <button
        onClick={install}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
      >
        <Download className="w-5 h-5" />
        앱 설치하기
      </button>
      <button
        onClick={dismiss}
        className="bg-gray-600 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        title="설치 알림 닫기"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default InstallPWA;