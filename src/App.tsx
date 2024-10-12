import React, { useState, useEffect } from 'react'
import { PlusCircle, Trash2, CheckCircle, ListTodo, StickyNote, AlignLeft, List, ChevronDown, ChevronRight } from 'lucide-react'
import Calendar from 'react-calendar'
import { format, isSameDay } from 'date-fns'
import 'react-calendar/dist/Calendar.css'

interface SubTask {
  id: number
  text: string
  completed: boolean
}

interface Todo {
  id: number
  text: string
  completed: boolean
  date: Date
  description: string
  isExpanded: boolean
  subTasks: SubTask[]
}

interface Memo {
  id: number
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

  useEffect(() => {
    const storedTodos = localStorage.getItem('todos')
    const storedMemos = localStorage.getItem('memos')
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos, (key, value) => 
        key === 'date' ? new Date(value) : value
      ))
    }
    if (storedMemos) {
      setMemos(JSON.parse(storedMemos, (key, value) => 
        key === 'lastEdited' ? new Date(value) : value
      ))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos))
  }, [memos])

  const addTodo = () => {
    if (newTodo.trim() !== '') {
      setTodos([...todos, { 
        id: Date.now(), 
        text: newTodo, 
        completed: false, 
        date: selectedDate,
        description: '',
        isExpanded: false,
        subTasks: []
      }])
      setNewTodo('')
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const updateTodoText = (id: number, text: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, text } : todo
    ))
  }

  const toggleDescription = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, isExpanded: !todo.isExpanded } : todo
    ))
  }

  const updateDescription = (id: number, description: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, description } : todo
    ))
  }

  const addSubTask = (todoId: number) => {
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, subTasks: [...todo.subTasks, { id: Date.now(), text: '', completed: false }] }
        : todo
    ))
  }

  const updateSubTask = (todoId: number, subTaskId: number, text: string) => {
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, subTasks: todo.subTasks.map(subTask =>
            subTask.id === subTaskId ? { ...subTask, text } : subTask
          )}
        : todo
    ))
  }

  const toggleSubTask = (todoId: number, subTaskId: number) => {
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, subTasks: todo.subTasks.map(subTask =>
            subTask.id === subTaskId ? { ...subTask, completed: !subTask.completed } : subTask
          )}
        : todo
    ))
  }

  const deleteSubTask = (todoId: number, subTaskId: number) => {
    setTodos(todos.map(todo =>
      todo.id === todoId
        ? { ...todo, subTasks: todo.subTasks.filter(subTask => subTask.id !== subTaskId) }
        : todo
    ))
  }

  const filteredTodos = todos.filter(todo => 
    isSameDay(todo.date, selectedDate)
  )

  const addMemo = () => {
    const newMemo: Memo = {
      id: Date.now(),
      title: '새 메모',
      content: '',
      lastEdited: new Date()
    }
    setMemos([newMemo, ...memos])
    setActiveMemo(newMemo)
  }

  const updateMemo = (id: number, title: string, content: string) => {
    const updatedMemos = memos.map(memo =>
      memo.id === id ? { ...memo, title, content, lastEdited: new Date() } : memo
    )
    setMemos(updatedMemos)
    setActiveMemo(updatedMemos.find(memo => memo.id === id) || null)
  }

  const deleteMemo = (id: number) => {
    setMemos(memos.filter(memo => memo.id !== id))
    if (activeMemo && activeMemo.id === id) {
      setActiveMemo(null)
    }
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const todosForDate = todos.filter(todo => isSameDay(todo.date, date))
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl">
        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab('todo')}
            className={`flex-1 py-2 px-4 rounded-tl-lg ${activeTab === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <ListTodo className="inline-block mr-2" size={20} />
            할 일
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            className={`flex-1 py-2 px-4 rounded-tr-lg ${activeTab === 'memo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <StickyNote className="inline-block mr-2" size={20} />
            메모
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
                  <li key={todo.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-grow mr-2">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={`mr-2 focus:outline-none ${todo.completed ? 'text-green-500' : 'text-gray-400'}`}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <input
                          type="text"
                          value={todo.text}
                          onChange={(e) => updateTodoText(todo.id, e.target.value)}
                          className={`bg-transparent flex-grow focus:outline-none ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleDescription(todo.id)}
                          className="text-blue-500 hover:text-blue-700 focus:outline-none"
                        >
                          <AlignLeft size={20} />
                        </button>
                        <button
                          onClick={() => addSubTask(todo.id)}
                          className="text-blue-500 hover:text-blue-700 focus:outline-none"
                        >
                          <List size={20} />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-red-500 hover:text-red-700 focus:outline-none"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    {todo.isExpanded && (
                      <div className="mt-2">
                        <textarea
                          value={todo.description}
                          onChange={(e) => updateDescription(todo.id, e.target.value)}
                          className="w-full p-2 border rounded resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-300"
                          placeholder="할 일에 대한 설명을 입력하세요..."
                          rows={1}
                          style={{ minHeight: '2.5rem', maxHeight: '10rem' }}
                        />
                      </div>
                    )}
                    {todo.subTasks.length > 0 && (
                      <ul className="mt-2 space-y-2 pl-6">
                        {todo.subTasks.map(subTask => (
                          <li key={subTask.id} className="flex items-center">
                            <button
                              onClick={() => toggleSubTask(todo.id, subTask.id)}
                              className={`mr-2 focus:outline-none ${subTask.completed ? 'text-green-500' : 'text-gray-400'}`}
                            >
                              <CheckCircle size={16} />
                            </button>
                            <input
                              type="text"
                              value={subTask.text}
                              onChange={(e) => updateSubTask(todo.id, subTask.id, e.target.value)}
                              className={`bg-transparent flex-grow focus:outline-none ${subTask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                              placeholder="하위 할 일..."
                            />
                            <button
                              onClick={() => deleteSubTask(todo.id, subTask.id)}
                              className="text-red-500 hover:text-red-700 focus:outline-none ml-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
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
                    key={memo.id}
                    onClick={() => setActiveMemo(memo)}
                    className={`p-2 rounded-lg cursor-pointer ${activeMemo?.id === memo.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    <h3 className="font-semibold truncate">{memo.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{memo.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(memo.lastEdited, 'yyyy-MM-dd HH:mm')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-2/3 pl-4">
              {activeMemo ? (
                <>
                  <input
                    type="text"
                    value={activeMemo.title}
                    onChange={(e) => updateMemo(activeMemo.id, e.target.value, activeMemo.content)}
                    className="w-full mb-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="제목"
                  />
                  <textarea
                    value={activeMemo.content}
                    onChange={(e) => updateMemo(activeMemo.id, activeMemo.title, e.target.value)}
                    className="w-full h-[400px] p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="내용을 입력하세요..."
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => deleteMemo(activeMemo.id)}
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