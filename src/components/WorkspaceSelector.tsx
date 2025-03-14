import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Workspace } from '../types';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  onCreateWorkspace: (name: string, description: string) => void;
  onUpdateWorkspace: (id: string, name: string, description: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentWorkspace = workspaces.find(w => w._id === currentWorkspaceId);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      if (editingWorkspace) {
        onUpdateWorkspace(editingWorkspace._id, newWorkspaceName, newWorkspaceDescription);
      } else {
        onCreateWorkspace(newWorkspaceName, newWorkspaceDescription);
      }
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setIsCreating(false);
      setEditingWorkspace(null);
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    if (workspace._id === currentWorkspaceId) {
      alert('현재 사용 중인 워크스페이스는 삭제할 수 없습니다.');
      return;
    }
    
    if (window.confirm(`"${workspace.name}" 워크스페이스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      onDeleteWorkspace(workspace._id);
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 워크스페이스 선택 버튼 */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm md:text-base"
      >
        <span className="font-medium truncate max-w-[150px] md:max-w-[200px]">
          {currentWorkspace?.name || '워크스페이스'}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      {/* 워크스페이스 목록 드롭다운 */}
      {isDropdownOpen && (
        <div className="fixed inset-x-0 top-16 mx-4 md:mx-0 md:absolute md:right-0 md:top-full md:mt-2 md:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white p-3 flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700">워크스페이스</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsDropdownOpen(false);
                }}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                title="새 워크스페이스"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-2">
            {workspaces.map(workspace => (
              <div
                key={workspace._id}
                className={`group flex items-center justify-between p-3 rounded-lg ${
                  workspace._id === currentWorkspaceId
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => {
                    onWorkspaceChange(workspace._id);
                    setIsDropdownOpen(false);
                  }}
                  className="flex-grow text-left"
                >
                  <div className="font-medium text-sm">{workspace.name}</div>
                  {workspace.description && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {workspace.description}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-1 md:hidden md:group-hover:flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWorkspace(workspace);
                      setNewWorkspaceName(workspace.name);
                      setNewWorkspaceDescription(workspace.description || '');
                      setIsCreating(true);
                      setIsDropdownOpen(false);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(workspace);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 워크스페이스 생성/수정 모달 */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingWorkspace ? '워크스페이스 수정' : '새 워크스페이스'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingWorkspace(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    placeholder="워크스페이스 이름"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="workspace-description" className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <input
                    type="text"
                    id="workspace-description"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    placeholder="워크스페이스 설명 (선택사항)"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingWorkspace(null);
                    setNewWorkspaceName('');
                    setNewWorkspaceDescription('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {editingWorkspace ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector;