import React from 'react';
import { PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Todo } from '../types';

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
  addSubTodo: (todoId: string) => void;
  updateSubTodo: (todoId: string, subTodoId: string, text: string) => void;
  toggleSubTodo: (todoId: string, subTodoId: string) => void;
  deleteSubTodo: (todoId: string, subTodoId: string) => void;
}

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
  addSubTodo,
  updateSubTodo,
  toggleSubTodo,
  deleteSubTodo,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        {format(selectedDate, 'yyyy년 MM월 dd일')} 할 일
      </h2>
      
      <div className="flex mb-6">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          className="flex-grow rounded-l-lg px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="새로운 할 일 추가..."
        />
        <button
          onClick={addTodo}
          className="bg-indigo-500 text-white px-6 py-3 rounded-r-lg hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
        {todos.map((todo) => (
          <div
            key={todo._id}
            className="bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleTodo(todo._id)}
                className={`flex-shrink-0 focus:outline-none ${
                  todo.completed ? 'text-green-500' : 'text-gray-400'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={todo.text}
                onChange={(e) => updateTodoText(todo._id, e.target.value)}
                className={`flex-grow bg-transparent focus:outline-none ${
                  todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                }`}
              />
              <button
                onClick={() => deleteTodo(todo._id)}
                className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={todo.description}
              onChange={(e) => updateTodoDescription(todo._id, e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm text-gray-600 bg-white rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="설명 추가..."
            />

            <ul className="mt-3 space-y-2">
              {todo.subTodos.map((subTodo) => (
                <li key={subTodo._id} className="flex items-center gap-2 pl-6">
                  <button
                    onClick={() => toggleSubTodo(todo._id, subTodo._id)}
                    className={`flex-shrink-0 focus:outline-none ${
                      subTodo.completed ? 'text-green-500' : 'text-gray-400'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={subTodo.text}
                    onChange={(e) =>
                      updateSubTodo(todo._id, subTodo._id, e.target.value)
                    }
                    className={`flex-grow bg-transparent text-sm focus:outline-none ${
                      subTodo.completed ? 'line-through text-gray-500' : 'text-gray-700'
                    }`}
                    placeholder="하위 할 일..."
                  />
                  <button
                    onClick={() => deleteSubTodo(todo._id, subTodo._id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => addSubTodo(todo._id)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none"
            >
              + 하위 할 일 추가
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoList;