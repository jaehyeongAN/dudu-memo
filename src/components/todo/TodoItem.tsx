import React from 'react';
import { CheckCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Todo } from '../../types';
import SubTodoList from './SubTodoList';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateText: (text: string) => void;
  onUpdateDescription: (description: string) => void;
  onAddSubTodo: () => void;
  onToggleSubTodo: (subTodoId: string) => void;
  onUpdateSubTodo: (subTodoId: string, text: string) => void;
  onDeleteSubTodo: (subTodoId: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onUpdateText,
  onUpdateDescription,
  onAddSubTodo,
  onToggleSubTodo,
  onUpdateSubTodo,
  onDeleteSubTodo,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={`mt-1 focus:outline-none ${
              todo.completed ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            <CheckCircle size={20} />
          </button>
          <div className="flex-grow">
            <input
              type="text"
              value={todo.text}
              onChange={(e) => onUpdateText(e.target.value)}
              className={`w-full bg-transparent focus:outline-none ${
                todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
              }`}
            />
            {isExpanded && (
              <input
                type="text"
                value={todo.description}
                onChange={(e) => onUpdateDescription(e.target.value)}
                className="w-full mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="설명 추가..."
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded-md focus:outline-none"
            >
              {isExpanded ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-50 text-red-500 rounded-md focus:outline-none"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <SubTodoList
            subTodos={todo.subTodos}
            onToggleSubTodo={onToggleSubTodo}
            onUpdateSubTodo={onUpdateSubTodo}
            onDeleteSubTodo={onDeleteSubTodo}
            onAddSubTodo={onAddSubTodo}
          />
        </div>
      )}
    </div>
  );
};

export default TodoItem;