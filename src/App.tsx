import React, { useState, useEffect, useCallback } from 'react';
import mongoose from 'mongoose';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Login from './components/Login';
import Signup from './components/Signup';
import Header from './components/Header';
import TodoList from './components/TodoList';
import BacklogList from './components/BacklogList';
import MemoList from './components/MemoList';
import BottomNavigation from './components/BottomNavigation';
import WorkspaceSelector from './components/WorkspaceSelector';
import InstallPWA from './components/InstallPWA';
import api from './api';
import { Todo, Memo, Category, BacklogTodo, Workspace } from './types';
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/me');
      handleLogout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('계정 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  }, []);

  // Workspace functions
  const handleCreateWorkspace = async (name: string, description: string) => {
    try {
      const response = await api.post('/workspaces', { name, description });
      setWorkspaces(prev => [...prev, response.data]);
      setCurrentWorkspaceId(response.data._id);
      await api.put('/users/current-workspace', { workspaceId: response.data._id });
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const handleUpdateWorkspace = async (id: string, name: string, description: string) => {
    try {
      const response = await api.put(`/workspaces/${id}`, { name, description });
      setWorkspaces(prev => prev.map(w => w._id === id ? response.data : w));
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  const handleWorkspaceChange = async (workspaceId: string) => {
    try {
      await api.put('/users/current-workspace', { workspaceId });
      setCurrentWorkspaceId(workspaceId);
      // 워크스페이스 변경 시 데이터 다시 로드
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    } catch (error) {
      console.error('Error changing workspace:', error);
    }
  };

  // Fetch data functions
  const fetchTodos = useCallback(async () => {
    if (!currentWorkspaceId) return;
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
  }, [currentWorkspaceId]);

  const fetchBacklogTodos = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/backlog');
      setBacklogTodos(response.data);
    } catch (error) {
      console.error('Error fetching backlog todos:', error);
    }
  }, [currentWorkspaceId]);

  const fetchMemos = useCallback(async () => {
    if (!currentWorkspaceId) return;
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
  }, [currentWorkspaceId]);

  const fetchCategories = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [currentWorkspaceId]);

  // Auth functions
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (token) {
      setIsLoggedIn(true);
      if (savedWorkspaceId) {
        setCurrentWorkspaceId(savedWorkspaceId);
      }
      fetchWorkspaces();
    }
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspaceId) {
      localStorage.setItem('currentWorkspaceId', currentWorkspaceId);
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    }
  }, [currentWorkspaceId, fetchTodos, fetchBacklogTodos, fetchMemos, fetchCategories]);

  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const response = await api.post('/login', { email, password, rememberMe });
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      setCurrentWorkspaceId(response.data.currentWorkspaceId);
      fetchWorkspaces();
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  const handleSignup = async (
    name: string,
    email: string,
    password: string
  ) => {
    try {
      await api.post('/signup', { name, email, password });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      setShowSignup(false);
    } catch (error) {
      console.error('Signup error:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentWorkspaceId');
    setIsLoggedIn(false);
    setTodos([]);
    setBacklogTodos([]);
    setMemos([]);
    setCategories([]);
    setWorkspaces([]);
    setCurrentWorkspaceId('');
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

  const updateBacklogTodoCategory = async (id: string, categoryId?: string | null) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const updatedTodo = {
          ...todoToUpdate,
          categoryId: categoryId || null
        };
        const response = await api.put(`/backlog/${id}`, updatedTodo);
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo category:', error);
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

  const updateTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          priority,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo priority:', error);
    }
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

  const updateMemo = async (id: string, title: string, content: string, categoryId?: string | null) => {
    const updatedMemo = {
      title,
      content,
      categoryId: categoryId || null,
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
        await api.put(`/memos/${id}`, updatedMemo);
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
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-medium w-fit"
                title={`남은 할 일 ${stats.remaining}개`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
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
          {/* {stats.total > 0 && (
            <div className="w-[80%] h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ 
                  width: `${(stats.completed / stats.total) * 100}%`
                }}
              />
            </div>
          )} */}
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
        onDeleteAccount={handleDeleteAccount}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        workspaceSelector={
          <WorkspaceSelector
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            onCreateWorkspace={handleCreateWorkspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
          />
        }
      />

      <main className="pt-16 pb-20 md:pb-6 min-h-screen">
        {activeTab === 'todo' ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="lg:w-1/3">
                {/* 모바일 캘린더 토글 버튼 - 항상 표시 */}
                <div className="md:hidden mb-3">
                  <button
                    onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <span className="font-medium">{isCalendarCollapsed ? '캘린더 열기' : '캘린더 접기'}</span>
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
                  updateTodoPriority={updateTodoPriority}
                  addSubTodo={addSubTodo}
                  updateSubTodo={updateSubTodo}
                  toggleSubTodo={toggleSubTodo}
                  deleteSubTodo={deleteSubTodo}
                  onDateChange={setSelectedDate}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'backlog' ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <BacklogList
              todos={backlogTodos}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              newTodo={newTodo}
              setNewTodo={setNewTodo}
              addTodo={addBacklogTodo}
              toggleTodo={toggleBacklogTodo}
              deleteTodo={deleteBacklogTodo}
              updateTodoText={updateBacklogTodoText}
              updateTodoDescription={updateBacklogTodoDescription}
              updateTodoPriority={updateBacklogTodoPriority}
              updateTodoCategory={updateBacklogTodoCategory}
              addSubTodo={addBacklogSubTodo}
              updateSubTodo={updateBacklogSubTodo}
              toggleSubTodo={toggleBacklogSubTodo}
              deleteSubTodo={deleteBacklogSubTodo}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onSelectCategory={setSelectedCategoryId}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
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
      <InstallPWA />
    </div>
  );
}

export default App;