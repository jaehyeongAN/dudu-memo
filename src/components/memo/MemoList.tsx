import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Memo } from '../../types';
import MemoItem from './MemoItem';

interface MemoListProps {
  memos: Memo[];
  activeMemo: Memo | null;
  onAddMemo: () => void;
  onSelectMemo: (memo: Memo) => void;
  onUpdateMemo: (id: string, title: string, content: string) => void;
  onDeleteMemo: (id: string) => void;
}

const MemoList: React.FC<MemoListProps> = ({
  memos,
  activeMemo,
  onAddMemo,
  onSelectMemo,
  onUpdateMemo,
  onDeleteMemo,
}) => {
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-4">
      <div className="flex flex-col bg-white rounded-lg shadow-sm p-4 h-[calc(100vh-12rem)] lg:h-[calc(100vh-9rem)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">메모 목록</h2>
          <button
            onClick={onAddMemo}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
            aria-label="새 메모 추가"
          >
            <PlusCircle size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {memos.map((memo) => (
            <button
              key={memo._id}
              onClick={() => onSelectMemo(memo)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                activeMemo?._id === memo._id
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-gray-50 border-transparent'
              } border`}
            >
              <h3 className="font-medium text-gray-900 truncate">
                {memo.title || '제목 없음'}
              </h3>
              <p className="text-sm text-gray-500 truncate mt-1">
                {memo.content || '내용 없음'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(memo.lastEdited).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </button>
          ))}
          {memos.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              메모가 없습니다
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-12rem)] lg:h-[calc(100vh-9rem)]">
        {activeMemo ? (
          <MemoItem
            memo={activeMemo}
            onUpdate={onUpdateMemo}
            onDelete={onDeleteMemo}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 p-4 text-center">
            <div>
              <p className="mb-2">메모를 선택하거나</p>
              <p>새로운 메모를 추가하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoList;