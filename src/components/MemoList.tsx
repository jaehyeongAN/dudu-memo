import React, { useState } from 'react';
import { PlusCircle, Trash2, ArrowLeft, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import { Memo, Category } from '../types';
import CategoryManager from './CategoryManager';

interface MemoListProps {
  memos: Memo[];
  categories: Category[];
  selectedCategoryId: string | null;
  activeMemo: Memo | null;
  setActiveMemo: (memo: Memo | null) => void;
  addMemo: () => void;
  updateMemo: (id: string, title: string, content: string, categoryId?: string) => void;
  deleteMemo: (id: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onSelectCategory: (categoryId: string | null) => void;
}

const MemoList: React.FC<MemoListProps> = ({
  memos,
  categories,
  selectedCategoryId,
  activeMemo,
  setActiveMemo,
  addMemo,
  updateMemo,
  deleteMemo,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSelectCategory,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const filteredMemos = selectedCategoryId
    ? memos.filter(memo => memo.categoryId === selectedCategoryId)
    : memos;

  const getCategory = (categoryId?: string) => {
    return categories.find(cat => cat._id === categoryId);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* 메모 목록과 카테고리 컨테이너 */}
      <div className={`w-full md:w-1/3 flex flex-col gap-4 ${activeMemo ? 'hidden md:flex' : 'flex'}`}>
        {/* 카테고리 관리자 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <CategoryManager
            categories={categories}
            onAddCategory={onAddCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        </div>

        {/* 메모 목록 */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">메모 목록</h2>
              <button
                onClick={addMemo}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="새 메모 추가"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {filteredMemos.map((memo) => (
                <li
                  key={memo._id}
                  onClick={() => setActiveMemo(memo)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeMemo?._id === memo._id
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate flex-grow">
                      {memo.title || '제목 없음'}
                    </h3>
                    {memo.categoryId && (
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: getCategory(memo.categoryId)?.color + '20',
                          color: getCategory(memo.categoryId)?.color
                        }}
                      >
                        {getCategory(memo.categoryId)?.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {memo.content || '내용 없음'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(memo.lastEdited), 'yyyy-MM-dd HH:mm')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 메모 편집 영역 */}
      <div className={`flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
        ${activeMemo ? 'fixed md:relative inset-0 z-50 md:z-auto' : 'hidden md:block'}`}>
        {activeMemo ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveMemo(null)}
                  className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={activeMemo.title}
                  onChange={(e) =>
                    updateMemo(activeMemo._id, e.target.value, activeMemo.content, activeMemo.categoryId)
                  }
                  className="flex-1 text-lg font-medium bg-transparent border-0 focus:outline-none focus:ring-0"
                  placeholder="제목을 입력하세요"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
                  >
                    <Tag className="w-5 h-5" />
                    {activeMemo.categoryId && (
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: getCategory(activeMemo.categoryId)?.color + '20',
                          color: getCategory(activeMemo.categoryId)?.color
                        }}
                      >
                        {getCategory(activeMemo.categoryId)?.name}
                      </span>
                    )}
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-2">
                        <div className="flex justify-between items-center mb-2 px-3 py-2">
                          <span className="text-sm font-medium">카테고리</span>
                          <button
                            onClick={() => setShowCategoryDropdown(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            updateMemo(activeMemo._id, activeMemo.title, activeMemo.content, undefined);
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-100"
                        >
                          카테고리 없음
                        </button>
                        {categories.map(category => (
                          <button
                            key={category._id}
                            onClick={() => {
                              updateMemo(activeMemo._id, activeMemo.title, activeMemo.content, category._id);
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <textarea
              value={activeMemo.content}
              onChange={(e) =>
                updateMemo(activeMemo._id, activeMemo.title, e.target.value, activeMemo.categoryId)
              }
              className="flex-1 p-4 w-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0"
              placeholder="내용을 입력하세요..."
            />
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  deleteMemo(activeMemo._id);
                  setActiveMemo(null);
                }}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Trash2 className="w-4 h-4 inline-block mr-2" />
                메모 삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>메모를 선택하거나 새로운 메모를 추가하세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoList;