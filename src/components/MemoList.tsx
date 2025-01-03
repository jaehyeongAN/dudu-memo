import React, { useState } from 'react';
import { PlusCircle, Trash2, ArrowLeft, Tag, X, CheckCircle } from 'lucide-react';
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
  const [selectedMemos, setSelectedMemos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // 메모를 마지막 수정 시간 기준으로 정렬
  const sortedAndFilteredMemos = React.useMemo(() => {
    const filtered = selectedCategoryId
      ? memos.filter(memo => memo.categoryId === selectedCategoryId)
      : memos;
    
    return [...filtered].sort((a, b) => {
      return new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime();
    });
  }, [memos, selectedCategoryId]);

  const getCategory = (categoryId?: string) => {
    return categories.find(cat => cat._id === categoryId);
  };

  const handleMemoClick = (memo: Memo, e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      const newSelectedMemos = new Set(selectedMemos);
      if (selectedMemos.has(memo._id)) {
        newSelectedMemos.delete(memo._id);
      } else {
        newSelectedMemos.add(memo._id);
      }
      setSelectedMemos(newSelectedMemos);
      if (newSelectedMemos.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      setActiveMemo(memo);
    }
  };

  const handleMemoLongPress = (memo: Memo) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedMemos(new Set([memo._id]));
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = window.confirm(`선택한 ${selectedMemos.size}개의 메모를 삭제하시겠습니까?`);
    if (confirmed) {
      for (const memoId of selectedMemos) {
        await deleteMemo(memoId);
      }
      setSelectedMemos(new Set());
      setIsSelectionMode(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-8rem)] gap-4">
      {/* 왼쪽 패널: 카테고리 관리자와 메모 목록 */}
      <div className={`w-full md:w-1/3 flex flex-col gap-4 ${activeMemo ? 'hidden md:flex' : 'flex'} md:h-full`}>
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
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:min-h-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800">메모 목록</h2>
                {isSelectionMode && (
                  <span className="text-sm text-gray-500">
                    {selectedMemos.size}개 선택됨
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isSelectionMode ? (
                  <>
                    <button
                      onClick={handleDeleteSelected}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="선택한 메모 삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedMemos(new Set());
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="선택 모드 종료"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={addMemo}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="새 메모 추가"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* 메모 목록 컨테이너: 모바일에서는 스크롤 없음, 데스크톱에서는 스크롤 있음 */}
          <div className="md:flex-1 md:overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {sortedAndFilteredMemos.map((memo) => (
                <li
                  key={memo._id}
                  onClick={(e) => handleMemoClick(memo, e)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleMemoLongPress(memo);
                  }}
                  className={`p-4 cursor-pointer transition-colors relative ${
                    activeMemo?._id === memo._id && !isSelectionMode
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelectionMode && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMemos.has(memo._id)
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedMemos.has(memo._id) && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900 truncate">
                        {memo.title || '제목 없음'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {memo.content || '내용 없음'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-gray-400">
                          {format(new Date(memo.lastEdited), 'yyyy-MM-dd HH:mm')}
                        </p>
                        {memo.categoryId && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: getCategory(memo.categoryId)?.color + '20',
                              color: getCategory(memo.categoryId)?.color
                            }}
                          >
                            <Tag className="w-3 h-3" />
                            {getCategory(memo.categoryId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeMemo?.categoryId
                      ? `hover:opacity-80`
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={activeMemo?.categoryId ? {
                    backgroundColor: getCategory(activeMemo.categoryId)?.color + '20',
                    color: getCategory(activeMemo.categoryId)?.color
                  } : undefined}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {activeMemo?.categoryId ? getCategory(activeMemo.categoryId)?.name : ''}
                </button>
                {showCategoryDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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
                        className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50"
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
                          className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
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
            <div className="p-4 pb-24 md:pb-4 border-t border-gray-200">
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