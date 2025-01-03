import React, { useState } from 'react';
import { PlusCircle, Trash2, CheckCircle, ChevronDown, Tag } from 'lucide-react';
import { BacklogTodo, Category } from '../types';
import CategoryManager from './CategoryManager';

interface BacklogListProps {
  todos: BacklogTodo[];
  categories: Category[];
  selectedCategoryId: string | null;
  newTodo: string;
  setNewTodo: (value: string) => void;
  addTodo: () => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoText: (id: string, text: string) => void;
  updateTodoDescription: (id: string, description: string) => void;
  updateTodoPriority: (id: string, priority: 'high' | 'medium' | 'low') => void;
  updateTodoCategory: (id: string, categoryId?: string) => void;
  addSubTodo: (todoId: string) => void;
  updateSubTodo: (todoId: string, subTodoId: string, text: string) => void;
  toggleSubTodo: (todoId: string, subTodoId: string) => void;
  deleteSubTodo: (todoId: string, subTodoId: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onSelectCategory: (categoryId: string | null) => void;
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

const BacklogList: React.FC<BacklogListProps> = ({
  todos,
  categories,
  selectedCategoryId,
  newTodo,
  setNewTodo,
  addTodo,
  toggleTodo,
  deleteTodo,
  updateTodoText,
  updateTodoDescription,
  updateTodoPriority,
  updateTodoCategory,
  addSubTodo,
  updateSubTodo,
  toggleSubTodo,
  deleteSubTodo,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSelectCategory,
}) => {
  const [openPriorityId, setOpenPriorityId] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // 완료된 할 일을 맨 아래로 정렬
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) {
      // 완료되지 않은 항목들은 우선순위에 따라 정렬
      if (!a.completed) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    }
    return a.completed ? 1 : -1;
  });

  // 선택된 카테고리에 따라 필터링
  const filteredTodos = selectedCategoryId
    ? sortedTodos.filter(todo => todo.categoryId === selectedCategoryId)
    : sortedTodos;

  const getCategory = (categoryId?: string) => {
    return categories.find(cat => cat._id === categoryId);
  };

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-8rem)] gap-4">
      {/* 왼쪽 패널: 카테고리 관리자 */}
      <div className="w-full md:w-1/4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <CategoryManager
            categories={categories}
            onAddCategory={onAddCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </div>

      {/* 오른쪽 패널: 백로그 목록 */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">백로그</h2>
            
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
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* 할 일 목록 */}
            <div className="space-y-3">
              {filteredTodos.map((todo) => (
                <div
                  key={todo._id}
                  className={`bg-gray-50 rounded-lg p-3 sm:p-4 transition-all hover:shadow-md border border-gray-100 ${
                    todo.completed ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => toggleTodo(todo._id)}
                      className={`flex-shrink-0 focus:outline-none ${
                        todo.completed ? 'text-green-500' : 'text-gray-400'
                      } hover:scale-110 transition-transform`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={todo.text}
                      onChange={(e) => updateTodoText(todo._id, e.target.value)}
                      className={`flex-grow min-w-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 text-sm sm:text-base ${
                        todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!todo.completed && (
                        <>
                          {/* 카테고리 뱃지 */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenCategoryId(openCategoryId === todo._id ? null : todo._id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                todo.categoryId
                                  ? `hover:opacity-80`
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              style={todo.categoryId ? {
                                backgroundColor: getCategory(todo.categoryId)?.color + '20',
                                color: getCategory(todo.categoryId)?.color
                              } : undefined}
                            >
                              <Tag className="w-3.5 h-3.5" />
                              {todo.categoryId ? getCategory(todo.categoryId)?.name : ''}
                            </button>
                            {openCategoryId === todo._id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  onClick={() => {
                                    updateTodoCategory(todo._id, undefined);
                                    setOpenCategoryId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                >
                                  카테고리 없음
                                </button>
                                {categories.map(category => (
                                  <button
                                    key={category._id}
                                    onClick={() => {
                                      updateTodoCategory(todo._id, category._id);
                                      setOpenCategoryId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 우선순위 뱃지 */}
                          <div className="relative">
                            <button
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityConfig[todo.priority].color}`}
                              onClick={() => setOpenPriorityId(openPriorityId === todo._id ? null : todo._id)}
                            >
                              <span className={`w-2 h-2 rounded-full ${priorityConfig[todo.priority].dotColor}`} />
                              {priorityConfig[todo.priority].label}
                              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                            </button>
                            {openPriorityId === todo._id && (
                              <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
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
                        </>
                      )}
                      <button
                        onClick={() => deleteTodo(todo._id)}
                        className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none hover:scale-110 transition-transform"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* 설명 입력 영역 */}
                  <input
                    type="text"
                    value={todo.description}
                    onChange={(e) => updateTodoDescription(todo._id, e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-xs sm:text-sm text-gray-600 bg-white rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="설명 추가..."
                  />

                  {/* 하위 할 일 목록 */}
                  <ul className="mt-3 space-y-2.5">
                    {todo.subTodos.map((subTodo) => (
                      <li key={subTodo._id} className="flex items-start gap-2 pl-6 sm:pl-8 relative">
                        <div className="absolute left-2 sm:left-3 top-0 bottom-0 w-px bg-gray-200" />
                        <button
                          onClick={() => toggleSubTodo(todo._id, subTodo._id)}
                          className={`flex-shrink-0 focus:outline-none mt-0.5 ${
                            subTodo.completed ? 'text-green-500' : 'text-gray-400'
                          } hover:scale-110 transition-transform`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <div className="flex-grow min-w-0">
                          <input
                            type="text"
                            value={subTodo.text}
                            onChange={(e) => updateSubTodo(todo._id, subTodo._id, e.target.value)}
                            className={`w-full bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 ${
                              subTodo.completed ? 'line-through text-gray-500' : 'text-gray-700'
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
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none pl-6 sm:pl-8 flex items-center gap-2 hover:underline"
                  >
                    <PlusCircle className="w-4 h-4" />
                    하위 할 일 추가
                  </button>
                </div>
              ))}

              {/* 할 일이 없을 때 메시지 */}
              {filteredTodos.length === 0 && (
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
    </div>
  );
};

export default BacklogList;