import React, { useEffect, useRef } from 'react';
import { LogOut, UserX, X, ChevronRight, BarChart4, Award, ActivitySquare, Calendar, ClipboardCheck, Info, Shield, Smartphone, ExternalLink, Settings as SettingsIcon, User } from 'lucide-react';
import { Todo, BacklogTodo, SubTodo } from '../types';
import { isSameDay, isSameWeek, isSameMonth, isPast, subDays, subWeeks, format } from 'date-fns';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isGuestMode: boolean;
  isModal: boolean;
  todos?: Todo[];
  backlogTodos?: BacklogTodo[];
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  onLogout,
  onDeleteAccount,
  isGuestMode,
  isModal,
  todos = [],
  backlogTodos = []
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isModal) return;
    
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
  }, [isOpen, onClose, isModal]);

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

  // 통계 계산 함수들
  const calculateCompletionRate = () => {
    const pastTodos = todos.filter(todo => isPast(new Date(todo.date)));
    if (pastTodos.length === 0) return 0;
    
    const completedPastTodos = pastTodos.filter(todo => todo.completed);
    return Math.round((completedPastTodos.length / pastTodos.length) * 100);
  };

  const calculateTodayStats = () => {
    const today = new Date();
    const todayTodos = todos.filter(todo => isSameDay(new Date(todo.date), today));
    const total = todayTodos.length;
    const completed = todayTodos.filter(todo => todo.completed).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const calculateWeekStats = () => {
    const today = new Date();
    const weekTodos = todos.filter(todo => 
      isSameWeek(new Date(todo.date), today, { weekStartsOn: 1 })
    );
    const total = weekTodos.length;
    const completed = weekTodos.filter(todo => todo.completed).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const calculateMonthStats = () => {
    const today = new Date();
    const monthTodos = todos.filter(todo => 
      isSameMonth(new Date(todo.date), today)
    );
    const total = monthTodos.length;
    const completed = monthTodos.filter(todo => todo.completed).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const calculateYearStats = () => {
    const today = new Date();
    const yearTodos = todos.filter(todo => {
      const todoDate = new Date(todo.date);
      return todoDate.getFullYear() === today.getFullYear();
    });
    const total = yearTodos.length;
    const completed = yearTodos.filter(todo => todo.completed).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const calculatePriorityDistribution = () => {
    const allTodos = [...todos, ...backlogTodos];
    const totalCount = allTodos.length;
    
    if (totalCount === 0) return { high: 0, medium: 0, low: 0 };
    
    const highCount = allTodos.filter(todo => todo.priority === 'high').length;
    const mediumCount = allTodos.filter(todo => todo.priority === 'medium').length;
    const lowCount = allTodos.filter(todo => todo.priority === 'low').length;
    
    return {
      high: Math.round((highCount / totalCount) * 100),
      medium: Math.round((mediumCount / totalCount) * 100),
      low: Math.round((lowCount / totalCount) * 100)
    };
  };

  const calculateSubtaskStats = () => {
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    // 메인 Todo의 서브태스크 계산
    todos.forEach(todo => {
      totalSubtasks += todo.subTodos.length;
      completedSubtasks += todo.subTodos.filter(subTodo => subTodo.completed).length;
    });
    
    // 백로그 Todo의 서브태스크 계산
    backlogTodos.forEach(todo => {
      totalSubtasks += todo.subTodos.length;
      completedSubtasks += todo.subTodos.filter(subTodo => subTodo.completed).length;
    });
    
    return { 
      total: totalSubtasks, 
      completed: completedSubtasks,
      percentage: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
    };
  };

  const calculateRecentProgress = () => {
    const today = new Date();
    const lastWeek = subWeeks(today, 1);
    
    const recentTodos = todos.filter(todo => {
      const todoDate = new Date(todo.date);
      return isPast(todoDate) && todoDate >= lastWeek;
    });
    
    const total = recentTodos.length;
    const completed = recentTodos.filter(todo => todo.completed).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  // 통계 결과 계산
  const completionRate = calculateCompletionRate();
  const todayStats = calculateTodayStats();
  const weekStats = calculateWeekStats();
  const monthStats = calculateMonthStats();
  const yearStats = calculateYearStats();
  const priorityDistribution = calculatePriorityDistribution();
  const subtaskStats = calculateSubtaskStats();
  const recentProgress = calculateRecentProgress();

  if (!isOpen && isModal) return null;

  const SettingsContent = (
    <div className="space-y-6">
      {isGuestMode && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            게스트 모드에서는 데이터가 브라우저에만 저장되며, 브라우저를 닫으면 모든 데이터가 삭제됩니다.
          </p>
        </div>
      )}

      {/* 통계 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart4 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">통계</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* 오늘의 할 일 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">오늘</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">{todayStats.completed}/{todayStats.total}</span>
              <span className="text-xs text-gray-500">완료된 할 일</span>
              
              <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${todayStats.percentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 이번 주 할 일 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-700">이번 주</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">{weekStats.completed}/{weekStats.total}</span>
              <span className="text-xs text-gray-500">완료된 할 일</span>
              
              <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full"
                  style={{ width: `${weekStats.percentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 이번 달 할 일 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-gray-700">이번 달</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">{monthStats.completed}/{monthStats.total}</span>
              <span className="text-xs text-gray-500">완료된 할 일</span>
              
              <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-600 rounded-full"
                  style={{ width: `${monthStats.percentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 올해 할 일 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-700">올해</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">{yearStats.completed}/{yearStats.total}</span>
              <span className="text-xs text-gray-500">완료된 할 일</span>
              
              <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${yearStats.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 종합 통계 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">완료율 및 현황</span>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* 할일 완료율 */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">할일 완료율</span>
                <span className="text-xs font-medium text-gray-900">{completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-gray-500">
                  {todos.filter(todo => todo.completed).length} / {todos.filter(todo => isPast(new Date(todo.date))).length} 완료
                </span>
              </div>
            </div>
            
            {/* 보관함 완료율 */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">보관함 완료율</span>
                <span className="text-xs font-medium text-gray-900">
                  {backlogTodos.length > 0 
                    ? Math.round((backlogTodos.filter(todo => todo.completed).length / backlogTodos.length) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${backlogTodos.length > 0 
                    ? Math.round((backlogTodos.filter(todo => todo.completed).length / backlogTodos.length) * 100) 
                    : 0}%` }}
                />
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-gray-500">
                  {backlogTodos.filter(todo => todo.completed).length} / {backlogTodos.length} 완료
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 우선순위 분포 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ActivitySquare className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">우선순위 분포</span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 h-4 rounded-sm bg-gray-100 overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ width: `${priorityDistribution.high}%` }}
                />
              </div>
              <div className="flex-1 h-4 rounded-sm bg-gray-100 overflow-hidden">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ width: `${priorityDistribution.medium}%` }}
                />
              </div>
              <div className="flex-1 h-4 rounded-sm bg-gray-100 overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${priorityDistribution.low}%` }}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-xs text-gray-600">높음 {priorityDistribution.high}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-xs text-gray-600">중간 {priorityDistribution.medium}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs text-gray-600">낮음 {priorityDistribution.low}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">앱 정보</h3>
        </div>
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">버전</span>
            </div>
            <span className="text-sm font-medium text-gray-900">1.3.1</span>
          </div>
          <a 
            href="https://www.doodu.kr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">웹사이트</span>
            </div>
            <span className="text-sm font-medium text-indigo-600">doodu.kr</span>
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">법적 고지</h3>
        </div>
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
          <a 
            href="https://sites.google.com/view/doodu/terms-conditions" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">이용약관</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </a>
          <a 
            href="https://sites.google.com/view/doodu/privacy-policy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">개인정보처리방침</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </a>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">© 2025 Doo!Du. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">계정</h3>
        </div>
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

    </div>
  );

  // Modal view for desktop
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
        <div 
          ref={modalRef}
          className="bg-white w-full max-h-[90vh] overflow-y-auto md:w-[28rem] md:rounded-2xl md:shadow-xl"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">설정</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {SettingsContent}
          </div>
        </div>
      </div>
    );
  }

  // Page view for mobile
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">설정</h2>
        </div>
        {SettingsContent}
      </div>
    </div>
  );
};

export default Settings; 