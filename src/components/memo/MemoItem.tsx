import React from 'react';
import { Trash2 } from 'lucide-react';
import { Memo } from '../../types';

interface MemoItemProps {
  memo: Memo;
  onUpdate: (id: string, title: string, content: string) => void;
  onDelete: (id: string) => void;
}

const MemoItem: React.FC<MemoItemProps> = ({ memo, onUpdate, onDelete }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <input
          type="text"
          value={memo.title}
          onChange={(e) => onUpdate(memo._id, e.target.value, memo.content)}
          className="flex-grow text-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
          placeholder="제목을 입력하세요"
        />
        <button
          onClick={() => onDelete(memo._id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
          aria-label="메모 삭제"
        >
          <Trash2 size={20} />
        </button>
      </div>
      <textarea
        value={memo.content}
        onChange={(e) => onUpdate(memo._id, memo.title, e.target.value)}
        className="flex-grow p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded m-2"
        placeholder="내용을 입력하세요..."
      />
    </div>
  );
};

export default MemoItem;