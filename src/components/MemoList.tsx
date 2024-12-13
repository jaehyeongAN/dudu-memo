import React from 'react';
import { PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Memo } from '../types';

interface MemoListProps {
  memos: Memo[];
  activeMemo: Memo | null;
  setActiveMemo: (memo: Memo | null) => void;
  addMemo: () => void;
  updateMemo: (id: string, title: string, content: string) => void;
  deleteMemo: (id: string) => void;
}

const MemoList: React.FC<MemoListProps> = ({
  memos,
  activeMemo,
  setActiveMemo,
  addMemo,
  updateMemo,
  deleteMemo,
}) => {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] gap-4">
      {/* 메모 목록 (모바일에서는 activeMemo가 없을 때만 표시) */}
      <div className={`w-full md:w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden 
        ${activeMemo ? 'hidden md:block' : 'block'}`}>
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
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          <ul className="divide-y divide-gray-200">
            {memos.map((memo) => (
              <li
                key={memo._id}
                onClick={() => setActiveMemo(memo)}
                className={`p-4 cursor-pointer transition-colors ${
                  activeMemo?._id === memo._id
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <h3 className="font-medium text-gray-900 truncate">
                  {memo.title || '제목 없음'}
                </h3>
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

      {/* 메모 편집 영역 (모바일에서는 activeMemo가 있을 때만 전체 화면으로 표시) */}
      <div className={`flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
        ${activeMemo ? 'fixed md:relative inset-0 z-50 md:z-auto' : 'hidden md:block'}`}>
        {activeMemo ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
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
                  updateMemo(activeMemo._id, e.target.value, activeMemo.content)
                }
                className="flex-1 text-lg font-medium bg-transparent border-0 focus:outline-none focus:ring-0"
                placeholder="제목을 입력하세요"
              />
            </div>
            <textarea
              value={activeMemo.content}
              onChange={(e) =>
                updateMemo(activeMemo._id, activeMemo.title, e.target.value)
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