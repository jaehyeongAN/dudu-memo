import React, { useState, useEffect, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Login from './components/Login';
import Signup from './components/Signup';
import TodoList from './components/todo/TodoList';
import MemoList from './components/memo/MemoList';
import api from './api';
import { Todo, Memo } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'memo'>('todo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeMemo, setActiveMemo] = useState<Memo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

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
        setTodos((prevTodos) => [
          ...prevTodos,
          {
            ...response.data,
            date: new Date(response.data.date),
          },
        ]);
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

  const updateTodoText = async (id: string, text: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          text,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo text:', error);
    }
  };

  const updateTodoDescription = async (id: string, description: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          description,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo description:', error);
    }
  };

  const addSubTodo = async (todoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const newSubTodo = {
          _id: Math.random().toString(),
          text: '',
          completed: false,
        };
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo],
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === todoId ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error adding sub-todo:', error);
    }
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

  const updateSubTodo = async (
    todoId: string,
    subTodoId: string,
    text: string
  ) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
          subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
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
      console.error('Error updating sub-todo:', error);
    }
  };

  const deleteSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(
          (subTodo) => subTodo._id !== subTodoId
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
      console.error('Error deleting sub-todo:', error);
    }
  };

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

  const updateMemo = async (id: string, title: string, content: string) => {
    try {
      const response = await api.put(`/memos/${id}`, { title, content });
      setMemos((prevMemos) =>
        prevMemos.map((memo) => (memo._id === id ? response.data : memo))
      );
      if (activeMemo?._id === id) {
        setActiveMemo(response.data);
      }
    } catch (error) {
      console.error('Error updating memo:', error);
    }
  };

  const deleteMemo = async (id: string) => {
    try {
      await api.delete(`/memos/${id}`);
      setMemos((prevMemos) => prevMemos.filter((memo) => memo._id !== id));
      if (activeMemo?._id === id) {
        setActiveMemo(null);
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  const filteredTodos = todos.filter((todo) =>
    isSameDay(new Date(todo.date), selectedDate)
  );

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const todosForDate = todos.filter((todo) =>
        isSameDay(new Date(todo.date), date)
      );
      return (
        <div className="text-xs">
          {todosForDate.slice(0, 3).map((todo, index) => (
            <div
              key={index}
              className={`truncate ${
                todo.completed ? 'line-through text-gray-400' : ''
              }`}
            >
              {todo.text}
            </div>
          ))}
          {todosForDate.length > 3 && <div>...</div>}
        </div>
      );
    }
  };

  if (!isLoggedIn) {
    return showSignup ? (
      <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isSidebarOpen}
      />
      <main className="pt-16 lg:pl-64">
        <div className="p-4 md:p-6 lg:p-8">
          {activeTab === 'todo' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <Calendar
                  onChange={(value) => {
                    if (value instanceof Date) {
                      setSelectedDate(value);
                    }
                  }}
                  value={selectedDate}
                  tileContent={tileContent}
                  className="w-full border-none"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-bold mb-4">
                  {format(selectedDate, 'yyyy년 MM월 dd일')} 할 일
                </h2>
                <TodoList
                  todos={filteredTodos}
                  onAddTodo={addTodo}
                  onToggleTodo={toggleTodo}
                  onDeleteTodo={deleteTodo}
                  onUpdateTodoText={updateTodoText}
                  onUpdateTodoDescription={updateTodoDescription}
                  onAddSubTodo={addSubTodo}
                  onToggleSubTodo={toggleSubTodo}
                  onUpdateSubTodo={updateSubTodo}
                  onDeleteSubTodo={deleteSubTodo}
                  newTodo={newTodo}
                  onNewTodoChange={setNewTodo}
                />
              </div>
            </div>
          )}
          {activeTab === 'memo' && (
            <div className="bg-white rounded-lg shadow-sm p-4 min-h-[calc(100vh-9rem)]">
              <MemoList
                memos={memos}
                activeMemo={activeMemo}
                onAddMemo={addMemo}
                onSelectMemo={setActiveMemo}
                onUpdateMemo={updateMemo}
                onDeleteMemo={deleteMemo}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;