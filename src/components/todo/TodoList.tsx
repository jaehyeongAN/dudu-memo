import React from 'react';
import { PlusCircle } from 'lucide-react';
import TodoItem from './TodoItem';
import { Todo } from '../../types';

interface TodoListProps {
  todos: Todo[];
  onAddTodo: () => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodoText: (id: string, text: string) => void;
  onUpdateTodoDescription: (id: string, description: string) => void;
  onAddSubTodo: (todoId: string) => void;
  onToggleSubTodo: (todoId: string, subTodoId: string) => void;
  onUpdateSubTodo: (todoId: string, subTodoId: string, text: string) => void;
  onDeleteSubTodo: (todoId: string, subTodoId: string) => void;
  newTodo: string;
  onNewTodoChange: (value: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodoText,
  onUpdateTodoDescription,
  onAddSubTodo,
  onToggleSubTodo,
  onUpdateSubTodo,
  onDeleteSubTodo,
  newTodo,
  onNewTodoChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => onNewTodoChange(e.target.value)}
          className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="새로운 할 일 추가..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onAddTodo();
            }
          }}
        />
        <button
          onClick={onAddTodo}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <PlusCircle size={24} />
        </button>
      </div>
      <div className="space-y-3">
        {todos.map((todo) => (
          <TodoItem
            key={todo._id}
            todo={todo}
            onToggle={() => onToggleTodo(todo._id)}
            onDelete={() => onDeleteTodo(todo._id)}
            onUpdateText={(text) => onUpdateTodoText(todo._id, text)}
            onUpdateDescription={(desc) => onUpdateTodoDescription(todo._id, desc)}
            onAddSubTodo={() => onAddSubTodo(todo._id)}
            onToggleSubTodo={(subTodoId) => onToggleSubTodo(todo._id, subTodoId)}
            onUpdateSubTodo={(subTodoId, text) =>
              onUpdateSubTodo(todo._id, subTodoId, text)
            }
            onDeleteSubTodo={(subTodoId) => onDeleteSubTodo(todo._id, subTodoId)}
          />
        ))}
      </div>
    </div>
  );
};

export default TodoList;