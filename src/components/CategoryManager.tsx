import React, { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#6B7280'
];

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      if (editingId) {
        onUpdateCategory(editingId, newCategoryName, selectedColor);
        setEditingId(null);
      } else {
        onAddCategory(newCategoryName, selectedColor);
      }
      setNewCategoryName('');
      setSelectedColor(COLORS[0]);
      setIsAdding(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category._id);
    setNewCategoryName(category.name);
    setSelectedColor(category.color);
    setIsAdding(true);
  };

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">카테고리</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 text-gray-600 hover:text-gray-900"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="카테고리 이름"
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            {editingId ? '수정' : '추가'}
          </button>
        </form>
      )}

      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-100 ${
            !selectedCategoryId ? 'bg-gray-100 font-medium' : ''
          }`}
        >
          전체
        </button>
        {categories.map((category) => (
          <div
            key={category._id}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
              selectedCategoryId === category._id ? 'bg-gray-100' : ''
            }`}
          >
            <button
              onClick={() => onSelectCategory(category._id)}
              className="flex items-center gap-2 flex-grow text-left"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm">{category.name}</span>
            </button>
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={() => startEditing(category)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteCategory(category._id)}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;