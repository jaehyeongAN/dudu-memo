import React from 'react';
import { CheckCircle, Trash2, Plus } from 'lucide-react';
import { SubTodo } from '../../types';

interface SubTodoListProps {
  subTodos: SubTodo[];
  onToggleSubTodo: (subTodoId: string) => void;
  onUpdateSubTodo: (subTodoId: string, text: string) => void;
  onDeleteSubTodo: (subTodoId: string) => void;
  onAddSubTodo: () => void;
}

const SubTodoList: React.FC<SubTodoListProps> = ({
  subTodos,
  onToggleSubTodo,
  onUpdateSubTodo,
  onDeleteSubTodo,
  onAddSubTodo,
}) => {
  return (
    <div className="space-y-2">
      {subTodos.map((subTodo) => (
        <div key={subTodo._id} className="flex items-center gap-2">
          <button
            onClick={() => onToggleSubTodo(subTodo._id)}
            className={`focus:outline-none ${
              subTodo.completed ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            <CheckCircle size={16} />
          </button>
          <input
            type="text"
            value={subTodo.text}
            onChange={(e) => onUpdateSubTodo(subTodo._id, e.target.value)}
            className={`flex-grow bg-transparent text-sm focus:outline-none ${
              subTodo.completed ? 'line-through text-gray-500' : 'text-gray-700'
            }`}
            placeholder="하위 할 일..."
          />
          <button
            onClick={() => onDeleteSubTodo(subTodo._id)}
            className="text-red-500 hover:text-red-600 focus:outline-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        onClick={onAddSubTodo}
        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 focus:outline-none mt-2"
      >
        <Plus size={16} />
        하위 할 일 추가
      </button>
    </div>
  );
};

export default SubTodoList;