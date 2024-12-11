import React, { useState, useEffect, useCallback } from 'react';
import mongoose from 'mongoose';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Header from './components/Header';
import TodoList from './components/TodoList';
import MemoList from './components/MemoList';
import api from './api';
import { Todo, Memo } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'memo'>('todo');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
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

  // Auth functions
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchTodos();
      fetchMemos();
    }
  }, [fetchTodos, fetchMemos]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      fetchTodos();
      fetchMemos();
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
    setMemos([]);
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
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
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

  const updateMemo = (id: string, title: string, content: string) => {
    setMemos((prevMemos) =>
      prevMemos.map((memo) =>
        memo._id === id ? { ...memo, title, content } : memo
      )
    );
    setActiveMemo((prevMemo) =>
      prevMemo && prevMemo._id === id
        ? { ...prevMemo, title, content }
        : prevMemo
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        await api.put(`/memos/${id}`, { title, content });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="pt-16">
        {activeTab === 'todo' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/3">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                  <Calendar
                    onChange={(value) => {
                      if (value instanceof Date) {
                        setSelectedDate(value);
                      }
                    }}
                    value={selectedDate}
                    className="w-full border-none"
                  />
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
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MemoList
              memos={memos}
              activeMemo={activeMemo}
              setActiveMemo={setActiveMemo}
              addMemo={addMemo}
              updateMemo={updateMemo}
              deleteMemo={deleteMemo}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;