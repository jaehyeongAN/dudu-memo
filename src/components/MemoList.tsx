import React, { useState } from 'react';
import { FilePlus2, Trash2, ArrowLeft, Tag, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Memo, Category } from '../types';
import CategoryManager from './CategoryManager';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Link as LinkIcon, Highlighter } from 'lucide-react';

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

const MemoEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
}> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '내용을 입력하세요...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-gray-900 max-w-none focus:outline-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-2 prose-pre:my-2',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: true,
  });

  // 새로 추가: content prop이 변경될 때 에디터 내용 업데이트
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const MenuButton = ({ 
    onClick, 
    active, 
    children,
    title
  }: { 
    onClick: () => void; 
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
        editor.commands.focus();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={`p-2.5 rounded-lg transition-colors touch-manipulation ${
        active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-gray-200 overflow-x-auto editor-toolbar">
        <div className="p-1.5 flex items-center gap-0.5 min-w-max">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="굵게"
          >
            <Bold className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="기울임"
          >
            <Italic className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="제목 1"
          >
            <Heading1 className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="제목 2"
          >
            <Heading2 className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="글머리 기호"
          >
            <List className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="번호 매기기"
          >
            <ListOrdered className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="인용"
          >
            <Quote className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="코드"
          >
            <Code className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => {
              const url = window.prompt('URL을 입력하세요:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            active={editor.isActive('link')}
            title="링크"
          >
            <LinkIcon className="w-5 h-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="형광펜"
          >
            <Highlighter className="w-5 h-5" />
          </MenuButton>
        </div>
      </div>
      <EditorContent 
        editor={editor} 
        className="flex-1 overflow-y-auto px-4 py-2 [&_.ProseMirror]:min-h-full [&_.ProseMirror]:px-0"
      />
    </div>
  );
};

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

  // HTML 태그를 제거하고 일반 텍스트로 변환하는 함수 추가
  const stripHtmlTags = (html: string) => {
    if (!html) return '';
    // 임시 DOM 요소를 생성하여 HTML을 파싱
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // 텍스트 내용만 추출
    return doc.body.textContent || '';
  };

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-8rem)] gap-4">
      {/* 왼쪽 패널: 카테고리 관리자와 메모 목록 */}
      <div className={`w-full md:w-1/3 flex flex-col gap-3 ${activeMemo ? 'hidden md:flex' : 'flex'} md:h-full`}>
        {/* 카테고리 관리자 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-h-56 overflow-y-auto">
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
          <div className="p-4 flex-shrink-0">
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
                    className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
                    title="새 메모 추가"
                  >
                    <FilePlus2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* 메모 목록 컨테이너: 모바일에서는 스크롤 없음, 데스크톱에서는 스크롤 있음 */}
          <div className="md:flex-1 md:overflow-y-auto overflow-x-hidden">
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
                        {stripHtmlTags(memo.content) || '내용 없음'}
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
            <div className="p-3 border-b border-gray-200">
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
                        없음
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
            <MemoEditor
              content={stripHtmlTags(activeMemo.content)}
              onChange={(newContent) =>
                updateMemo(activeMemo._id, activeMemo.title, newContent, activeMemo.categoryId)
              }
            />
            <div className="p-4 pb-20 md:pb-4 flex justify-end">
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