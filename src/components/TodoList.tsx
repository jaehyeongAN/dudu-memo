import React, { useState, useRef } from 'react';
import { CalendarPlus, Plus, Trash2, Circle, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, PackagePlus } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { Todo } from '../types';
import { toast } from 'react-hot-toast';

interface TodoListProps {
  todos: Todo[];
  selectedDate: Date;
  newTodo: string;
  setNewTodo: (value: string) => void;
  addTodo: () => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoText: (id: string, text: string) => void;
  updateTodoDescription: (id: string, description: string) => void;
  updateTodoPriority: (id: string, priority: 'high' | 'medium' | 'low') => void;
  addSubTodo: (todoId: string) => void;
  updateSubTodo: (todoId: string, subTodoId: string, text: string) => void;
  toggleSubTodo: (todoId: string, subTodoId: string) => void;
  deleteSubTodo: (todoId: string, subTodoId: string) => void;
  onDateChange?: (date: Date) => void;
  updateTodoDate: (id: string, date: Date) => void;
  onMoveToBacklog: (id: string) => void;
}

const priorityConfig = {
  high: {
    label: '높음',
    color: 'bg-red-50 text-red-700 hover:bg-red-100',
    dotColor: 'bg-red-500'
  },
  medium: {
    label: '중간',
    color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500'
  },
  low: {
    label: '낮음',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    dotColor: 'bg-blue-500'
  }
};

const TodoList: React.FC<TodoListProps> = ({
  todos,
  selectedDate,
  newTodo,
  setNewTodo,
  addTodo,
  toggleTodo,
  deleteTodo,
  updateTodoText,
  updateTodoDescription,
  updateTodoPriority,
  addSubTodo,
  updateSubTodo,
  toggleSubTodo,
  deleteSubTodo,
  onDateChange,
  updateTodoDate,
  onMoveToBacklog,
}) => {
  const [openPriorityId, setOpenPriorityId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // 완료된 할 일을 맨 아래로 정렬
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) {
      if (!a.completed) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    }
    return a.completed ? 1 : -1;
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // 수직 스크롤이 수평 스와이프보다 크면 스와이프 무시
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    // 최소 스와이프 거리 (50px)
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && !isAnimating) {
        setSwipeDirection('right');
        setIsAnimating(true);
        setTimeout(() => {
          onDateChange?.(subDays(selectedDate, 1));
          setIsAnimating(false);
          setSwipeDirection(null);
        }, 300);
      } else if (deltaX < 0 && !isAnimating) {
        setSwipeDirection('left');
        setIsAnimating(true);
        setTimeout(() => {
          onDateChange?.(addDays(selectedDate, 1));
          setIsAnimating(false);
          setSwipeDirection(null);
        }, 300);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 우선순위 드롭다운 외부 클릭 감지
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openPriorityId) {
        const dropdown = document.getElementById(`priority-dropdown-${openPriorityId}`);
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenPriorityId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPriorityId]);

  const handlePostpone = (todo: Todo) => {
    // 기존의 모든 토스트를 제거
    toast.dismiss();
    
    toast((t) => (
      <div className="flex flex-col gap-3 p-2">
        <div className="font-medium text-gray-800">할 일을 내일로 미루시겠습니까?</div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            취소
          </button>
          <button
            className="px-3 py-1 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors"
            onClick={() => {
              const tomorrow = addDays(selectedDate, 1);
              updateTodoDate(todo._id, tomorrow);
              toast.dismiss(t.id);
              toast.success(
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">할 일을 내일로 미뤘습니다</span>
                </div>
              );
            }}
          >
            확인
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: {
        background: '#fff',
        color: '#1f2937',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
    });
  };

  const handleToggleTodo = (todo: Todo) => {
    toggleTodo(todo._id);
    toast.success(
      <div className="flex items-center gap-2">
        <span className="font-medium text-white">
          {todo.completed ? '할 일을 다시 시작합니다 💪' : '할 일을 완료했습니다 🎉'}
        </span>
      </div>
    );
  };

  const handleMoveToBacklog = (todoId: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div className="font-medium">
          해당 할 일을 백로그로 이동하시겠습니까?
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            취소
          </button>
          <button
            className="px-3 py-1 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors"
            onClick={() => {
              onMoveToBacklog(todoId);
              toast.dismiss(t.id);
              toast.success('할 일을 백로그에 보관하였습니다.');
            }}
          >
            확인
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: {
        background: '#fff',
        color: '#1f2937',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
    });
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`transition-transform duration-300 ${
          swipeDirection === 'left' ? '-translate-x-full' :
          swipeDirection === 'right' ? 'translate-x-full' : ''
        }`}
      >
        <div className="p-4 sm:p-6">
          {/* 날짜 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onDateChange?.(subDays(selectedDate, 1))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {format(selectedDate, 'yyyy. MM. dd')} 할 일
            </h2>
            <button
              onClick={() => onDateChange?.(addDays(selectedDate, 1))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* 할 일 추가 입력 영역 */}
          <div className="flex items-center gap-2 sm:gap-3 mb-6">
            <div className="flex-grow relative">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                placeholder="새로운 할 일 추가..."
              />
            </div>
            <button
              onClick={addTodo}
              className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
            >
              <CalendarPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* 할 일 목록 */}
          <div className="space-y-3">
            {sortedTodos.map((todo) => (
              <div
                key={todo._id}
                className={`bg-gray-50 rounded-lg p-3 sm:p-4 transition-all hover:shadow-md border border-gray-100 ${
                  todo.completed ? 'opacity-75' : ''
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className={`flex-shrink-0 focus:outline-none ${
                        todo.completed ? 'text-green-500' : 'text-gray-400'
                      } hover:scale-110 transition-transform`}
                      aria-label={todo.completed ? "할 일 완료 취소" : "할 일 완료"}
                    >
                      {todo.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={todo.text}
                      onChange={(e) => updateTodoText(todo._id, e.target.value)}
                      className={`flex-grow min-w-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 text-sm sm:text-base ${
                        todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                      }`}
                    />
                    <button
                      onClick={() => deleteTodo(todo._id)}
                      className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none hover:scale-110 transition-transform"
                      aria-label="할 일 삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 우선순위 뱃지 */}
                  {!todo.completed && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative" id={`priority-dropdown-${todo._id}`}>
                        <button
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${priorityConfig[todo.priority].color}`}
                          onClick={() => setOpenPriorityId(openPriorityId === todo._id ? null : todo._id)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[todo.priority].dotColor}`} />
                          {priorityConfig[todo.priority].label}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openPriorityId === todo._id && (
                          <div className="absolute left-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            {Object.entries(priorityConfig).map(([key, config]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  updateTodoPriority(todo._id, key as 'high' | 'medium' | 'low');
                                  setOpenPriorityId(null);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                  todo.priority === key ? 'bg-gray-50 font-medium' : ''
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                                {config.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* 내일로 미루기 버튼 추가 */}
                      <button
                        onClick={() => handlePostpone(todo)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        title="내일로 미루기"
                      >
                        <ArrowRight className="w-3 h-3" />
                        내일로 미루기
                      </button>

                      {/* 백로그로 이동 버튼 */}
                      <button
                        onClick={() => handleMoveToBacklog(todo._id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <PackagePlus className="w-3 h-3" />
                        백로그에 보관
                      </button>
                    </div>
                  )}

                  {/* 설명 입력 영역 */}
                  <input
                    type="text"
                    value={todo.description}
                    onChange={(e) => updateTodoDescription(todo._id, e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-xs sm:text-sm text-gray-600 bg-white rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="설명 추가..."
                  />

                  {/* 하위 할 일 목록 */}
                  <ul className="space-y-2.5">
                    {todo.subTodos.map((subTodo) => (
                      <li key={subTodo._id} className="flex items-start gap-2 pl-6 sm:pl-8 relative">
                        <div className="absolute left-2 sm:left-3 top-0 bottom-0 w-px bg-gray-200" />
                        
                        <button
                          onClick={() => toggleSubTodo(todo._id, subTodo._id)}
                          className={`flex-shrink-0 focus:outline-none mt-0.5 ${
                            subTodo.completed ? 'text-green-500' : 'text-gray-400'
                          } hover:scale-110 transition-transform`}
                        >
                          {subTodo.completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        
                        <div className="flex-grow min-w-0">
                          <input
                            type="text"
                            value={subTodo.text}
                            onChange={(e) => updateSubTodo(todo._id, subTodo._id, e.target.value)}
                            className={`w-full bg-transparent text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 ${
                              subTodo.completed 
                                ? 'line-through text-gray-500' 
                                : 'text-gray-700'
                            }`}
                            placeholder="하위 할 일..."
                          />
                        </div>
                        
                        <button
                          onClick={() => deleteSubTodo(todo._id, subTodo._id)}
                          className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none hover:scale-110 transition-transform mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* 하위 할 일 추가 버튼 */}
                  <button
                    onClick={() => addSubTodo(todo._id)}
                    className="text-sm sm:text-base text-indigo-600 hover:text-indigo-700 focus:outline-none pl-6 sm:pl-8 flex items-center gap-2 hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    하위 할 일 추가
                  </button>
                </div>
              </div>
            ))}
            
            {/* 할 일이 없을 때 메시지 */}
            {todos.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm sm:text-base">
                  등록된 할 일이 없습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoList;