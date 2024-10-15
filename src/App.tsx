import React, { useState, useEffect, useCallback } from 'react'
import mongoose from 'mongoose';
import { PlusCircle, Trash2, CheckCircle, ListTodo, StickyNote, LogOut } from 'lucide-react'
import Calendar from 'react-calendar'
import { format, isSameDay } from 'date-fns'
import 'react-calendar/dist/Calendar.css'
import Login from './components/Login'
import Signup from './components/Signup'
import api from './api'

interface Todo {
  _id: string
  text: string
  completed: boolean
  date: Date
  description: string
  subTodos: SubTodo[]
}

interface SubTodo {
  _id: string
  text: string
  completed: boolean
}

interface Memo {
  _id: string
  title: string
  content: string
  lastEdited: Date
}

function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'memo'>('todo')
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [memos, setMemos] = useState<Memo[]>([])
  const [activeMemo, setActiveMemo] = useState<Memo | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  const fetchTodos = useCallback(async () => {
    try {
      const response = await api.get('/todos')
      setTodos(response.data.map((todo: any) => ({
        ...todo,
        date: new Date(todo.date),
        subTodos: todo.subTodos || []
      })))
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }, [])

  const fetchMemos = useCallback(async () => {
    try {
      const response = await api.get('/memos')
      setMemos(response.data.map((memo: any) => ({
        ...memo,
        lastEdited: new Date(memo.lastEdited)
      })))
    } catch (error) {
      console.error('Error fetching memos:', error)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
      fetchTodos()
      fetchMemos()
    }
  }, [fetchTodos, fetchMemos])

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password })
      localStorage.setItem('token', response.data.token)
      setIsLoggedIn(true)
      fetchTodos()
      fetchMemos()
    } catch (error) {
      console.error('Login error:', error)
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
    }
  }

  const handleSignup = async (name: string, birthdate: string, email: string, password: string) => {
    try {
      await api.post('/signup', { name, birthdate, email, password })
      alert('회원가입이 완료되었습니다. 로그인해주세요.')
      setShowSignup(false)
    } catch (error) {
      console.error('Signup error:', error)
      alert('회원가입에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
    setTodos([])
    setMemos([])
  }

  const addTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        const response = await api.post('/todos', {
          text: newTodo,
          completed: false,
          date: selectedDate,
          description: '',
          subTodos: []
        })
        const newTodoItem: Todo = {
          _id: response.data._id,
          text: response.data.text,
          completed: response.data.completed,
          date: new Date(response.data.date),
          description: response.data.description || '',
          subTodos: response.data.subTodos || []
        }
        setTodos(prevTodos => [...prevTodos, newTodoItem])
        setNewTodo('')
      } catch (error) {
        console.error('Error adding todo:', error)
      }
    }
  }

  const toggleTodo = async (id: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === id)
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          completed: !todoToUpdate.completed
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === id ? response.data : todo
        ))
      }
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      await api.delete(`/todos/${id}`)
      setTodos(prevTodos => prevTodos.filter(todo => todo._id !== id))
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const updateTodoText = async (id: string, newText: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === id)
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          text: newText
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === id ? { ...todo, text: newText } : todo
        ))
      }
    } catch (error) {
      console.error('Error updating todo text:', error)
    }
  }

  const updateTodoDescription = async (id: string, description: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === id)
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          description
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === id ? { ...todo, description } : todo
        ))
      }
    } catch (error) {
      console.error('Error updating todo description:', error)
    }
  }

  const addSubTodo = async (todoId: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === todoId)
      if (todoToUpdate) {
        const newSubTodo = { _id: new mongoose.Types.ObjectId().toString(), text: '', completed: false } // 수정된 부분
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo]
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === todoId ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] } : todo
        ))
      }
    } catch (error) {
      console.error('Error adding sub-todo:', error)
    }
  }

  const updateSubTodo = async (todoId: string, subTodoId: string, newText: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === todoId)
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map(subTodo =>
          subTodo._id === subTodoId ? { ...subTodo, text: newText } : subTodo
        )
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
        ))
      }
    } catch (error) {
      console.error('Error updating sub-todo:', error)
    }
  }

  const toggleSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === todoId)
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map(subTodo =>
          subTodo._id === subTodoId ? { ...subTodo, completed: !subTodo.completed } : subTodo
        )
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === todoId ? response.data : todo
        ))
      }
    } catch (error) {
      console.error('Error toggling sub-todo:', error)
    }
  }

  const deleteSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo._id === todoId)
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(subTodo => subTodo._id !== subTodoId)
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos
        })
        setTodos(prevTodos => prevTodos.map(todo =>
          todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
        ))
      }
    } catch (error) {
      console.error('Error deleting sub-todo:', error)
    }
  }

  const filteredTodos = todos.filter(todo => 
    isSameDay(new Date(todo.date), selectedDate)
  )

  const addMemo = async () => {
    try {
      const newMemo = {
        title: '새 메모',
        content: '',
        lastEdited: new Date()
      }
      const response = await api.post('/memos', newMemo)
      setMemos(prevMemos => [response.data, ...prevMemos])
      setActiveMemo(response.data)
    } catch (error) {
      console.error('Error adding memo:', error)
    }
  }

  const updateMemo = async (id: string, title: string, content: string) => {
    try {
      const response = await api.put(`/memos/${id}`, { title, content })
      setMemos(prevMemos => prevMemos.map(memo =>
        memo._id === id ? response.data : memo
      ))
      setActiveMemo(response.data)
    } catch (error) {
      console.error('Error updating memo:', error)
    }
  }

  const deleteMemo = async (id: string) => {
    try {
      await api.delete(`/memos/${id}`)
      setMemos(prevMemos => prevMemos.filter(memo => memo._id !== id))
      if (activeMemo && activeMemo._id === id) {
        setActiveMemo(null)
      }
    } catch (error) {
      console.error('Error deleting memo:', error)
    }
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const todosForDate = todos.filter(todo => isSameDay(new Date(todo.date), date))
      return (
        <div className="text-xs">
          {todosForDate.slice(0, 3).map((todo, index) => (
            <div key={index} className={`truncate ${todo.completed ? 'line-through text-gray-400' : ''}`}>
              {todo.text}
            </div>
          ))}
          {todosForDate.length > 3 && <div>...</div>}
        </div>
      )
    }
  }

  if (!isLoggedIn) {
    return showSignup ? (
      <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('todo')}
              className={`py-2 px-4 rounded-tl-lg ${activeTab === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <ListTodo className="inline-block mr-2" size={20} />
              할 일
            </button>
            <button
              onClick={() => setActiveTab('memo')}
              className={`py-2 px-4 rounded-tr-lg ${activeTab === 'memo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <StickyNote className="inline-block mr-2" size={20} />
              메모
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <LogOut className="inline-block mr-2" size={20} />
            로그아웃
          </button>
        </div>

        {activeTab === 'todo' && (
          <>
            <div className="h-[400px] overflow-auto mb-4">
              <Calendar
                onChange={(value) => {
                  if (value instanceof Date) {
                    setSelectedDate(value)
                  }
                }}
                value={selectedDate}
                tileContent={tileContent}
                className="w-full border-none shadow-lg"
              />
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-bold mb-2">{format(selectedDate, 'yyyy년 MM월 dd일')} 할 일</h2>
              <div className="flex mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="새로운 할 일 추가..."
                />
                <button
                  onClick={addTodo}
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <PlusCircle size={24} />
                </button>
              </div>
              <ul className="space-y-2">
                {filteredTodos.map(todo => (
                  <li key={todo._id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-grow mr-2">
                        <button
                          onClick={() => toggleTodo(todo._id)}
                          className={`mr-2 focus:outline-none ${todo.completed ? 'text-green-500' : 'text-gray-400'}`}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <input
                          type="text"
                          value={todo.text}
                          onChange={(e) => updateTodoText(todo._id, e.target.value)}
                          className={`bg-transparent flex-grow ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                        />
                      </div>
                      <button
                        onClick={() => deleteTodo(todo._id)}
                        className="text-red-500 hover:text-red-700 focus:outline-none"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={todo.description}
                        onChange={(e) => updateTodoDescription(todo._id, e.target.value)}
                        className="w-full bg-white border rounded px-2 py-1"
                        placeholder="설명 추가..."
                      />
                    </div>
                    <ul className="space-y-2 mt-2">
                      {todo.subTodos.map(subTodo => (
                        <li key={subTodo._id} className="flex items-center">
                          <button
                            onClick={() => toggleSubTodo(todo._id, subTodo._id)}
                            className={`mr-2 focus:outline-none ${subTodo.completed ? 'text-green-500' : 'text-gray-400'}`}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <input
                            type="text"
                            value={subTodo.text}
                            onChange={(e) => updateSubTodo(todo._id, subTodo._id, e.target.value)}
                            className={`flex-grow bg-transparent ${subTodo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                            placeholder="하위 할 일..."
                          />
                          <button
                            onClick={() => deleteSubTodo(todo._id, subTodo._id)}
                            className="text-red-500 hover:text-red-700 focus:outline-none ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => addSubTodo(todo._id)}
                      className="mt-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                    >
                      + 하위 할 일 추가
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {activeTab === 'memo' && (
          <div className="flex h-[500px]">
            <div className="w-1/3 border-r pr-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">메모 목록</h2>
                <button
                  onClick={addMemo}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
              <ul className="space-y-2 overflow-y-auto max-h-[450px]">
                {memos.map(memo => (
                  <li
                    key={memo._id}
                    onClick={() => setActiveMemo(memo)}
                    className={`p-2 rounded-lg cursor-pointer ${activeMemo?._id === memo._id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    <h3 className="font-semibold truncate">{memo.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{memo.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(memo.lastEdited), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-2/3 pl-4">
              {activeMemo ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <input
                      type="text"
                      value={activeMemo.title}
                      onChange={(e) => updateMemo(activeMemo._id, e.target.value, activeMemo.content)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="제목"
                    />
                  </div>
                  <textarea
                    value={activeMemo.content}
                    onChange={(e) => updateMemo(activeMemo._id, activeMemo.title, e.target.value)}
                    className="w-full h-[400px] p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="내용을 입력하세요..."
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => deleteMemo(activeMemo._id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  메모를 선택하거나 새로운 메모를 추가하세요.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App