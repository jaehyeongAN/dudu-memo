import React, { useState, useEffect, useCallback } from 'react';
import mongoose from 'mongoose';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Login from './components/Login';
import Signup from './components/Signup';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import TodoList from './components/TodoList';
import BacklogList from './components/BacklogList';
import MemoList from './components/MemoList';
import api from './api';
import { Todo, Memo, Category, BacklogTodo } from './types';
import { getTodoStats } from './utils/todoStats';

function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'memo' | 'backlog'>('todo');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [backlogTodos, setBacklogTodos] = useState<BacklogTodo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeMemo, setActiveMemo] = useState<Memo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch data functions
  const fetchTodos = useCallback(async () => {
    try {
      const response = await api.get('/todos');
      setTodos(
        response.data.map((todo: any) => ({
          ...todo,
          date: new Date(todo.date),
          subTodos: todo.subTodos || [],
        }))
      );
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  }, []);

  const fetchBacklogTodos = useCallback(async () => {
    try {
      const response = await api.get('/backlog');
      setBacklogTodos(response.data);
    } catch (error) {
      console.error('Error fetching backlog todos:', error);
    }
  }, []);

  const fetchMemos = useCallback(async () => {
    try {
      const response = await api.get('/memos');
      setMemos(
        response.data.map((memo: any) => ({
          ...memo,
          lastEdited: new Date(memo.lastEdited),
        }))
      );
    } catch (error) {
      console.error('Error fetching memos:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Auth functions
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    }
  }, [fetchTodos, fetchBacklogTodos, fetchMemos, fetchCategories]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  const handleSignup = async (
    name: string,
    birthdate: string,
    email: string,
    password: string
  ) => {
    try {
      await api.post('/signup', { name, birthdate, email, password });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      setShowSignup(false);
    } catch (error) {
      console.error('Signup error:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setTodos([]);
    setBacklogTodos([]);
    setMemos([]);
    setCategories([]);
  };

  // Category functions
  const handleAddCategory = async (name: string, color: string) => {
    try {
      const response = await api.post('/categories', { name, color });
      setCategories(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async (id: string, name: string, color: string) => {
    try {
      const response = await api.put(`/categories/${id}`, { name, color });
      setCategories(prev => prev.map(cat => cat._id === id ? response.data : cat));
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(cat => cat._id !== id));
      setMemos(prev => prev.map(memo => 
        memo.categoryId === id ? { ...memo, categoryId: undefined } : memo
      ));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Todo functions
  const addTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        const response = await api.post('/todos', {
          text: newTodo,
          completed: false,
          date: selectedDate,
          description: '',
          subTodos: [],
        });
        setTodos((prevTodos) => [...prevTodos, response.data]);
        setNewTodo('');
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          completed: !todoToUpdate.completed,
        });
        
        const updatedTodo = {
          ...response.data,
          date: new Date(response.data.date)
        };
        
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? updatedTodo : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };
  
  const deleteTodo = async (id: string) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos((prevTodos) => prevTodos.filter((todo) => todo._id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const updateTodoText = (id: string, text: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => (todo._id === id ? { ...todo, text } : todo))
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/todos/${id}`, { ...todoToUpdate, text });
        }
      } catch (error) {
        console.error('Error updating todo text:', error);
      }
    }, 500);
  };

  const updateTodoDescription = (id: string, description: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === id ? { ...todo, description } : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/todos/${id}`, { ...todoToUpdate, description });
        }
      } catch (error) {
        console.error('Error updating todo description:', error);
      }
    }, 500);
  };

  // Backlog functions
  const addBacklogTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        const response = await api.post('/backlog', {
          text: newTodo,
          completed: false,
          description: '',
          subTodos: [],
          priority: 'medium',
        });
        setBacklogTodos((prevTodos) => [...prevTodos, response.data]);
        setNewTodo('');
      } catch (error) {
        console.error('Error adding backlog todo:', error);
      }
    }
  };

  const toggleBacklogTodo = async (id: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/backlog/${id}`, {
          ...todoToUpdate,
          completed: !todoToUpdate.completed,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo:', error);
    }
  };

  const deleteBacklogTodo = async (id: string) => {
    try {
      await api.delete(`/backlog/${id}`);
      setBacklogTodos((prevTodos) => prevTodos.filter((todo) => todo._id !== id));
    } catch (error) {
      console.error('Error deleting backlog todo:', error);
    }
  };

  const updateBacklogTodoText = (id: string, text: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) => (todo._id === id ? { ...todo, text } : todo))
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/backlog/${id}`, { ...todoToUpdate, text });
        }
      } catch (error) {
        console.error('Error updating backlog todo text:', error);
      }
    }, 500);
  };

  const updateBacklogTodoDescription = (id: string, description: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === id ? { ...todo, description } : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/backlog/${id}`, { ...todoToUpdate, description });
        }
      } catch (error) {
        console.error('Error updating backlog todo description:', error);
      }
    }, 500);
  };

  const updateBacklogTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/backlog/${id}`, {
          ...todoToUpdate,
          priority,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo priority:', error);
    }
  };

  // SubTodo functions
  const addSubTodo = async (todoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const newSubTodo = {
          _id: new mongoose.Types.ObjectId().toString(),
          text: '',
          completed: false,
        };
        await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo],
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] }
              : todo
          )
        );
      }
    } catch (error) {
      console.error('Error adding sub-todo:', error);
    }
  };

  const addBacklogSubTodo = async (todoId: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const newSubTodo = {
          _id: new mongoose.Types.ObjectId().toString(),
          text: '',
          completed: false,
        };
        await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo],
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] }
              : todo
          )
        );
      }
    } catch (error) {
      console.error('Error adding backlog sub-todo:', error);
    }
  };

  const updateSubTodo = (todoId: string, subTodoId: string, text: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === todoId
          ? {
              ...todo,
              subTodos: todo.subTodos.map((subTodo) =>
                subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
              ),
            }
          : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === todoId);
        if (todoToUpdate) {
          const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
            subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
          );
          await api.put(`/todos/${todoId}`, {
            ...todoToUpdate,
            subTodos: updatedSubTodos,
          });
        }
      } catch (error) {
        console.error('Error updating sub-todo:', error);
      }
    }, 500);
  };

  const updateBacklogSubTodo = (todoId: string, subTodoId: string, text: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === todoId
          ? {
              ...todo,
              subTodos: todo.subTodos.map((subTodo) =>
                subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
              ),
            }
          : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
        if (todoToUpdate) {
          const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
            subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
          );
          await api.put(`/backlog/${todoId}`, {
            ...todoToUpdate,
            subTodos: updatedSubTodos,
          });
        }
      } catch (error) {
        console.error('Error updating backlog sub-todo:', error);
      }
    }, 500);
  };

  const toggleSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
          subTodo._id === subTodoId
            ? { ...subTodo, completed: !subTodo.completed }
            : subTodo
        );
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === todoId ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error toggling sub-todo:', error);
    }
  };

  const toggleBacklogSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
          subTodo._id === subTodoId
            ? { ...subTodo, completed: !subTodo.completed }
            : subTodo
        );
        const response = await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === todoId ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error toggling backlog sub-todo:', error);
    }
  };

  const deleteSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(
          (subTodo) => subTodo._id !== subTodoId
        );
        await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
          )
        );
      }
    } catch (error) {
      console.error('Error deleting sub-todo:', error);
    }
  };

  const deleteBacklogSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(
          (subTodo) => subTodo._id !== subTodoId
        );
        await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
          )
        );
      }
    } catch (error) {
      console.error('Error deleting backlog sub-todo:', error);
    }
  };

  // Memo functions
  const addMemo = async () => {
    try {
      const newMemo = {
        title: '새 메모',
        content: '',
        lastEdited: new Date(),
      };
      const response = await api.post('/memos', newMemo);
      setMemos((prevMemos) => [response.data, ...prevMemos]);
      setActiveMemo(response.data);
    } catch (error) {
      console.error('Error adding memo:', error);
    }
  };

  const updateMemo = async (id: string, title: string, content: string, categoryId?: string) => {
    const updatedMemo = {
      title,
      content,
      categoryId,
      lastEdited: new Date()
    };
  
    // 메모 목록과 활성 메모 모두 즉시 업데이트
    setMemos((prevMemos) =>
      prevMemos.map((memo) =>
        memo._id === id ? { ...memo, ...updatedMemo } : memo
      )
    );
    
    setActiveMemo((prevMemo) =>
      prevMemo && prevMemo._id === id
        ? { ...prevMemo, ...updatedMemo }
        : prevMemo
    );
  
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await api.put(`/memos/${id}`, updatedMemo);
        // 서버 응답으로 상태 다시 업데이트
        const serverUpdatedMemo = response.data;
        
        setMemos((prevMemos) =>
          prevMemos.map((memo) =>
            memo._id === id ? { ...memo, ...serverUpdatedMemo } : memo
          )
        );
        
        setActiveMemo((prevMemo) =>
          prevMemo && prevMemo._id === id
            ? { ...prevMemo, ...serverUpdatedMemo }
            : prevMemo
        );
      } catch (error) {
        console.error('Error updating memo:', error);
      }
    }, 500);
  };

  const deleteMemo = async (id: string) => {
    try {
      await api.delete(`/memos/${id}`);
      setMemos((prevMemos) => prevMemos.filter((memo) => memo._id !== id));
      if (activeMemo && activeMemo._id === id) {
        setActiveMemo(null);
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  if (!isLoggedIn) {
    return showSignup ? (
      <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  const filteredTodos = todos.filter((todo) => {
    const todoDate = new Date(todo.date);
    return (
      todoDate.getFullYear() === selectedDate.getFullYear() &&
      todoDate.getMonth() === selectedDate.getMonth() &&
      todoDate.getDate() === selectedDate.getDate()
    );
  });

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const stats = getTodoStats(todos, date);
      
      if (stats.total === 0) return null;
  
      return (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-full flex flex-col items-center gap-1">
            {stats.remaining > 0 && (
              <div 
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium w-fit"
                title={`남은 할 일 ${stats.remaining}개`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {stats.remaining}
              </div>
            )}
            {stats.completed > 0 && (
              <div 
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium w-fit"
                title={`완료된 할 일 ${stats.completed}개`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {stats.completed}
              </div>
            )}
          </div>
          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="w-[80%] h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ 
                  width: `${(stats.completed / stats.total) * 100}%`
                }}
              />
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="pt-16 pb-20 md:pb-6">
        {activeTab === 'todo' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/3">
                {/* 모바일 캘린더 토글 버튼 - 항상 표시 */}
                <div className="md:hidden mb-4">
                  <button
                    onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <span className="font-medium">캘린더</span>
                    {isCalendarCollapsed ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* 캘린더 컨테이너 */}
                <div className={`transition-all duration-300 ${
                  isCalendarCollapsed ? 'h-0 md:h-auto overflow-hidden' : 'h-auto'
                }`}>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                      <Calendar
                        onChange={(value) => {
                          if (value instanceof Date) {
                            setSelectedDate(value);
                            setIsCalendarCollapsed(true);
                          }
                        }}
                        value={selectedDate}
                        tileContent={tileContent}
                        className="w-full border-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-2/3">
                <TodoList
                  todos={filteredTodos}
                  selectedDate={selectedDate}
                  newTodo={newTodo}
                  setNewTodo={setNewTodo}
                  addTodo={addTodo}
                  toggleTodo={toggleTodo}
                  deleteTodo={deleteTodo}
                  updateTodoText={updateTodoText}
                  updateTodoDescription={updateTodoDescription}
                  addSubTodo={addSubTodo}
                  updateSubTodo={updateSubTodo}
                  toggleSubTodo={toggleSubTodo}
                  deleteSubTodo={deleteSubTodo}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'backlog' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <BacklogList
              todos={backlogTodos}
              newTodo={newTodo}
              setNewTodo={setNewTodo}
              addTodo={addBacklogTodo}
              toggleTodo={toggleBacklogTodo}
              deleteTodo={deleteBacklogTodo}
              updateTodoText={updateBacklogTodoText}
              updateTodoDescription={updateBacklogTodoDescription}
              updateTodoPriority={updateBacklogTodoPriority}
              addSubTodo={addBacklogSubTodo}
              updateSubTodo={updateBacklogSubTodo}
              toggleSubTodo={toggleBacklogSubTodo}
              deleteSubTodo={deleteBacklogSubTodo}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MemoList
              memos={memos}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              activeMemo={activeMemo}
              setActiveMemo={setActiveMemo}
              addMemo={addMemo}
              updateMemo={updateMemo}
              deleteMemo={deleteMemo}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onSelectCategory={setSelectedCategoryId}
            />
          </div>
        )}
      </main>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab } />
    </div>
  );
}

export default App;