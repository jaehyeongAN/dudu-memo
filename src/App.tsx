import React, { useState, useEffect, useCallback } from 'react';
import mongoose from 'mongoose';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Login from './components/Login';
import Signup from './components/Signup';
import Header from './components/Header';
import TodoList from './components/TodoList';
import BacklogList from './components/BacklogList';
import MemoList from './components/MemoList';
import BottomNavigation from './components/BottomNavigation';
import WorkspaceSelector from './components/WorkspaceSelector';
import InstallPWA from './components/InstallPWA';
import api from './api';
import { Todo, Memo, Category, BacklogTodo, Workspace } from './types';
import { getTodoStats } from './utils/todoStats';
import Settings from './components/Settings';
import { useSwipeable } from 'react-swipeable';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';

function App() {
  const [activeTab, setActiveTab] = useState<'todo' | 'memo' | 'backlog' | 'settings'>('todo');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [backlogTodos, setBacklogTodos] = useState<BacklogTodo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeMemo, setActiveMemo] = useState<Memo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [calendarAnimation, setCalendarAnimation] = useState<'slide-left' | 'slide-right' | ''>('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    version: string;
    message: string;
    timestamp: string;
  }>({
    version: '',
    message: '새 버전이 준비되었습니다!',
    timestamp: ''
  });

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle settings navigation based on device
  const handleOpenSettings = () => {
    if (isMobile) {
      setActiveTab('settings');
    } else {
      setIsSettingsOpen(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsGuestMode(false);
    setActiveTab('todo');
    setIsSettingsOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentWorkspaceId');
    setTodos([]);
    setBacklogTodos([]);
    setMemos([]);
    setCategories([]);
    setWorkspaces([]);
    setCurrentWorkspaceId('');
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/me');
      setActiveTab('todo');
      setIsSettingsOpen(false);
      handleLogout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('계정 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  }, []);

  // Workspace functions
  const handleCreateWorkspace = async (name: string, description: string) => {
    try {
      if (isGuestMode) {
        const newWorkspace = {
          _id: `guest-${Date.now()}`,
          name,
          description,
          ownerId: 'guest',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setWorkspaces(prev => [...prev, newWorkspace]);
        setCurrentWorkspaceId(newWorkspace._id);
        return;
      }

      const response = await api.post('/workspaces', { name, description });
      setWorkspaces(prev => [...prev, response.data]);
      setCurrentWorkspaceId(response.data._id);
      await api.put('/users/current-workspace', { workspaceId: response.data._id });
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const handleUpdateWorkspace = async (id: string, name: string, description: string) => {
    try {
      const response = await api.put(`/workspaces/${id}`, { name, description });
      setWorkspaces(prev => prev.map(w => w._id === id ? response.data : w));
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  const handleWorkspaceChange = async (workspaceId: string) => {
    try {
      await api.put('/users/current-workspace', { workspaceId });
      setCurrentWorkspaceId(workspaceId);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      
      // 워크스페이스 변경 시 데이터 다시 로드
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    } catch (error) {
      console.error('Error changing workspace:', error);
    }
  };

  // Fetch data functions
  const fetchTodos = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/todos');
      setTodos(
        response.data.map((todo: any) => ({
          ...todo,
          date: new Date(todo.date),
          subTodos: todo.subTodos || [],
        }))
      );
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  }, [currentWorkspaceId]);

  const fetchBacklogTodos = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/backlog');
      setBacklogTodos(response.data);
    } catch (error) {
      console.error('Error fetching backlog todos:', error);
    }
  }, [currentWorkspaceId]);

  const fetchMemos = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/memos');
      setMemos(
        response.data.map((memo: any) => ({
          ...memo,
          lastEdited: new Date(memo.lastEdited),
        }))
      );
    } catch (error) {
      console.error('Error fetching memos:', error);
    }
  }, [currentWorkspaceId]);

  const fetchCategories = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [currentWorkspaceId]);

  // Auth functions
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    
    if (token) {
      setIsLoggedIn(true);
      
      // 워크스페이스 데이터 로드
      const initializeWorkspaces = async () => {
        try {
          const response = await api.get('/workspaces');
          setWorkspaces(response.data);
          
          // 저장된 워크스페이스 ID가 있고, 해당 워크스페이스가 존재하는 경우
          if (savedWorkspaceId && response.data.some((w: Workspace) => w._id === savedWorkspaceId)) {
            setCurrentWorkspaceId(savedWorkspaceId);
          } else if (response.data.length > 0) {
            // 저장된 ID가 없거나 유효하지 않은 경우, 첫 번째 워크스페이스 선택
            setCurrentWorkspaceId(response.data[0]._id);
            localStorage.setItem('currentWorkspaceId', response.data[0]._id);
          }
        } catch (error) {
          console.error('Error fetching workspaces:', error);
        }
      };

      initializeWorkspaces();
    }
  }, []);

  useEffect(() => {
    if (currentWorkspaceId && !isGuestMode) {
      fetchTodos();
      fetchBacklogTodos();
      fetchMemos();
      fetchCategories();
    }
  }, [currentWorkspaceId, fetchTodos, fetchBacklogTodos, fetchMemos, fetchCategories, isGuestMode]);

  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const response = await api.post('/login', { email, password, rememberMe });
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      setCurrentWorkspaceId(response.data.currentWorkspaceId);
      fetchWorkspaces();
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  const handleSignup = async (
    name: string,
    email: string,
    password: string
  ) => {
    try {
      await api.post('/signup', { name, email, password });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      setShowSignup(false);
    } catch (error) {
      console.error('Signup error:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGuestStart = () => {
    setIsGuestMode(true);
    setCurrentWorkspaceId('guest');
    
    // 게스트를 위한 초기 데이터 설정
    setWorkspaces([{
      _id: 'guest',
      name: '기본 워크스페이스',
      description: '기본 작업 공간',
      ownerId: 'guest',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // 샘플 카테고리 추가
    setCategories([
      {
        _id: 'guest-category-1',
        name: '업무',
        color: '#EF4444',
        userId: 'guest',
        workspaceId: 'guest'
      },
      {
        _id: 'guest-category-2',
        name: '개인',
        color: '#F59E0B',
        userId: 'guest',
        workspaceId: 'guest'
      },
      {
        _id: 'guest-category-3',
        name: '아이디어',
        color: '#3B82F6',
        userId: 'guest',
        workspaceId: 'guest'
      }
    ]);

    // 샘플 백로그 추가
    setBacklogTodos([
      {
        _id: 'guest-backlog-1',
        text: '✨ 새로운 기능 아이디어',
        completed: false,
        description: '앱의 발전을 위한 새로운 기능 아이디어들을 정리해보세요.',
        subTodos: [
          { _id: 'guest-backlog-subtodo-1', text: '🎨 다크 모드 지원', completed: false },
          { _id: 'guest-backlog-subtodo-2', text: '📱 모바일 앱 개발', completed: false },
          { _id: 'guest-backlog-subtodo-3', text: '🔄 반복 일정 기능', completed: false }
        ],
        priority: 'medium',
        workspaceId: 'guest',
        userId: 'guest',
        categoryId: 'guest-category-3'
      },
      {
        _id: 'guest-backlog-2',
        text: '📚 읽고 싶은 책 목록',
        completed: false,
        description: '개인 성장을 위한 독서 목록입니다.',
        subTodos: [
          { _id: 'guest-backlog-subtodo-4', text: '아토믹 해빗', completed: false },
          { _id: 'guest-backlog-subtodo-5', text: '1일 1로그 100일 완성 IT 지식', completed: false }
        ],
        priority: 'low',
        workspaceId: 'guest',
        userId: 'guest',
        categoryId: 'guest-category-2'
      },
      {
        _id: 'guest-backlog-3',
        text: '💼 프로젝트 준비사항',
        completed: false,
        description: '새로운 프로젝트 시작 전 준비해야 할 사항들입니다.',
        subTodos: [
          { _id: 'guest-backlog-subtodo-6', text: '기술 스택 검토', completed: true },
          { _id: 'guest-backlog-subtodo-7', text: '프로젝트 일정 계획', completed: false },
          { _id: 'guest-backlog-subtodo-8', text: '팀원 구성', completed: false }
        ],
        priority: 'high',
        workspaceId: 'guest',
        userId: 'guest',
        categoryId: 'guest-category-1'
      }
    ]);

    // 샘플 메모 추가
    setMemos([
      {
        _id: 'guest-memo-1',
        title: '✔︎ Doo!Du 소개 글 ✨',
        content: '"Think Simple, Act Fast!"\n\n세상에는 이미 다양한 투두/메모 서비스가 많습니다. 그럼에도 ✔︎ Doo!Du는 가장 쉽고 빠르게 일의 본질에 집중할 수 있도록 돕기 위해 만들어졌습니다.\n\n	•	캘린더 기반 할 일 관리로 하루를 체계적으로 설계하고,\n	•	백로그에 아이디어와 할 일을 잊지 않고 보관하며,\n	•	실시간 저장되는 메모로 생각을 놓치지 않아요.\n\n모든 기능이 직관적이고 빠르게 설계되어, 누구나 쉽게 사용할 수 있어요.\n지금 Doo!Du와 함께 더 정리된 일상을 만들어보세요! 🗓️✨',
        categoryId: 'guest-category-3',
        lastEdited: new Date(),
        workspaceId: 'guest',
        userId: 'guest'
      },
      {
        _id: 'guest-memo-2',
        title: '앱 마케팅 홍보 방안 회의 정리 💬',
        content: '[회의 주제]: Doo!Du의 사용자층 확대 방안\n\n1️⃣ SNS 마케팅\n	•	사용자 후기(스크린샷 + 사용 예시) 중심 콘텐츠 제작\n	•	TikTok, Instagram Reels 활용한 짧고 강렬한 홍보 영상 제작 🎥\n\n2️⃣ 협업 캠페인\n	•	생산성 관련 YouTuber/Influencer와 협업 콘텐츠 제작\n	•	앱 스토어 리뷰 이벤트 진행 🎁\n\n3️⃣ 광고 타겟팅 전략\n	•	25~40대 직장인을 주 타겟으로 설정\n	•	생산성 앱 관심도가 높은 사용자 기반 세부 타겟팅\n\n[다음 행동 아이템]: 홍보 영상 시나리오 작성, 협업 대상 리스트업',
        categoryId: 'guest-category-1',
        lastEdited: new Date(),
        workspaceId: 'guest',
        userId: 'guest'
      },
      {
        _id: 'guest-memo-3',
        title: '새해 목표 리스트 작성 🎯',
        content: '[2025년 목표]\n1️⃣ 운동: 주 3회 이상 규칙적으로 운동하기 🏋️‍♀️\n	•	헬스장 등록 완료 (1월 중)\n	•	5km 달리기 기록 목표 세우기\n\n2️⃣ 취미 활동: 새로운 취미 2가지 배우기 🎨\n	•	디지털 드로잉 클래스 등록\n	•	주말마다 1시간 요리 연습\n\n3️⃣ 자기계발: 매달 한 권의 책 읽기 📚\n	•	1월 추천 도서: "Atomic Habits"\n\n이제 목표를 세웠으니, 차근차근 실천하며 나아가자! 💪',
        categoryId: 'guest-category-2',
        lastEdited: new Date(),
        workspaceId: 'guest',
        userId: 'guest'
      }
    ]);

    // 샘플 할 일 추가
    setTodos([
      {
        _id: 'guest-todo-1',
        text: '🥷 게스트 모드 이용 중',
        completed: false,
        date: new Date(),
        description: '⚠️ 게스트 모드에서 생성한 데이터는 저장되지 않습니다.',
        subTodos: [
          { _id: 'guest-subtodo-1', text: '게스트 모드로 체험하기', completed: true },
        ],
        workspaceId: 'guest',
        userId: 'guest',
        priority: 'high'
      },
      {
        _id: 'guest-todo-2',
        text: 'Doo!Du 살펴보기 👋',
        completed: false,
        date: new Date(),
        description: '쉽고 빠르게 당신의 할 일과 아이디어를 정리해보세요!',
        subTodos: [
          { _id: 'guest-subtodo-1', text: '🔥 회원가입 및 로그인하기', completed: true },
          { _id: 'guest-subtodo-2', text: '🗓️ 캘린더에 할 일 등록하기', completed: false },
          { _id: 'guest-subtodo-3', text: '📦 백로그에 일정 보관해놓기', completed: false },
          { _id: 'guest-subtodo-4', text: '✏️ 메모에 아이디어 작성하기', completed: false },
          { _id: 'guest-subtodo-5', text: '🏢 워크스페이스에 분리하기', completed: false }
        ],
        workspaceId: 'guest',
        userId: 'guest',
        priority: 'high'
      }
    ]);
  };

  // Category functions
  const handleAddCategory = async (name: string, color: string) => {
    try {
      if (isGuestMode) {
        const newCategory = {
          _id: `guest-${Date.now()}`,
          name,
          color,
          userId: 'guest',
          workspaceId: 'guest'
        };
        setCategories(prev => [...prev, newCategory]);
        return;
      }

      const response = await api.post('/categories', { name, color });
      setCategories(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async (id: string, name: string, color: string) => {
    try {
      const response = await api.put(`/categories/${id}`, { name, color });
      setCategories(prev => prev.map(cat => cat._id === id ? response.data : cat));
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(cat => cat._id !== id));
      setMemos(prev => prev.map(memo => 
        memo.categoryId === id ? { ...memo, categoryId: undefined } : memo
      ));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const updateBacklogTodoCategory = async (id: string, categoryId?: string | null) => {
    try {
      if (isGuestMode) {
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, categoryId: categoryId || null } : todo
          )
        );
        return;
      }

      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/backlog/${id}`, {
          ...todoToUpdate,
          categoryId: categoryId || null
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo category:', error);
    }
  };

  // Todo functions
  const addTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        if (isGuestMode) {
          // 게스트 모드에서는 로컬에서만 처리
          const newTodoItem = {
            _id: `guest-${Date.now()}`,
            text: newTodo,
            completed: false,
            date: selectedDate,
            description: '',
            subTodos: [],
            workspaceId: 'guest',
            userId: 'guest',
            priority: 'medium' as const
          };
          setTodos((prevTodos) => [...prevTodos, newTodoItem]);
          setNewTodo('');
          return;
        }

        // 기존 API 호출 코드
        const response = await api.post('/todos', {
          text: newTodo,
          completed: false,
          date: selectedDate,
          description: '',
          subTodos: [],
          priority: 'medium'
        });
        setTodos((prevTodos) => [...prevTodos, response.data]);
        setNewTodo('');
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      if (isGuestMode) {
        // 게스트 모드에서는 로컬에서만 상태 업데이트
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, completed: !todo.completed } : todo
          )
        );
        return;
      }

      // 로그인된 사용자의 경우 API 호출
      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          completed: !todoToUpdate.completed,
        });
        
        const updatedTodo = {
          ...response.data,
          date: new Date(response.data.date)
        };
        
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? updatedTodo : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };
  
  const deleteTodo = async (id: string) => {
    try {
      if (isGuestMode) {
        setTodos((prevTodos) => prevTodos.filter((todo) => todo._id !== id));
        return;
      }

      await api.delete(`/todos/${id}`);
      setTodos((prevTodos) => prevTodos.filter((todo) => todo._id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const updateTodoText = (id: string, text: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => (todo._id === id ? { ...todo, text } : todo))
    );

    if (isGuestMode) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/todos/${id}`, { ...todoToUpdate, text });
        }
      } catch (error) {
        console.error('Error updating todo text:', error);
      }
    }, 500);
  };

  const updateTodoDescription = (id: string, description: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === id ? { ...todo, description } : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/todos/${id}`, { ...todoToUpdate, description });
        }
      } catch (error) {
        console.error('Error updating todo description:', error);
      }
    }, 500);
  };

  const updateTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      if (isGuestMode) {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, priority } : todo
          )
        );
        return;
      }

      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          priority,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating todo priority:', error);
    }
  };

  const updateTodoDate = async (id: string, newDate: Date) => {
    try {
      if (isGuestMode) {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, date: newDate } : todo
          )
        );
        return;
      }

      const todoToUpdate = todos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/todos/${id}`, {
          ...todoToUpdate,
          date: newDate,
        });
        
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...response.data, date: new Date(response.data.date) } : todo
          )
        );
      }
    } catch (error) {
      console.error('Error updating todo date:', error);
    }
  };

  // Backlog functions
  const addBacklogTodo = async () => {
    if (newTodo.trim() !== '') {
      try {
        if (isGuestMode) {
          const newBacklogTodoItem = {
            _id: `guest-${Date.now()}`,
            text: newTodo,
            completed: false,
            description: '',
            subTodos: [],
            priority: 'medium' as const,
            workspaceId: 'guest',
            userId: 'guest',
            categoryId: selectedCategoryId
          };
          setBacklogTodos((prevTodos) => [...prevTodos, newBacklogTodoItem]);
          setNewTodo('');
          return;
        }

        const response = await api.post('/backlog', {
          text: newTodo,
          completed: false,
          description: '',
          subTodos: [],
          priority: 'medium',
        });
        setBacklogTodos((prevTodos) => [...prevTodos, response.data]);
        setNewTodo('');
      } catch (error) {
        console.error('Error adding backlog todo:', error);
      }
    }
  };

  const toggleBacklogTodo = async (id: string) => {
    try {
      if (isGuestMode) {
        // 게스트 모드에서는 로컬에서만 상태 업데이트
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, completed: !todo.completed } : todo
          )
        );
        return;
      }

      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/backlog/${id}`, {
          ...todoToUpdate,
          completed: !todoToUpdate.completed,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo:', error);
    }
  };

  const deleteBacklogTodo = async (id: string) => {
    try {
      await api.delete(`/backlog/${id}`);
      setBacklogTodos((prevTodos) => prevTodos.filter((todo) => todo._id !== id));
    } catch (error) {
      console.error('Error deleting backlog todo:', error);
    }
  };

  const updateBacklogTodoText = (id: string, text: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) => (todo._id === id ? { ...todo, text } : todo))
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/backlog/${id}`, { ...todoToUpdate, text });
        }
      } catch (error) {
        console.error('Error updating backlog todo text:', error);
      }
    }, 500);
  };

  const updateBacklogTodoDescription = (id: string, description: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === id ? { ...todo, description } : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
        if (todoToUpdate) {
          await api.put(`/backlog/${id}`, { ...todoToUpdate, description });
        }
      } catch (error) {
        console.error('Error updating backlog todo description:', error);
      }
    }, 500);
  };

  const updateBacklogTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      if (isGuestMode) {
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === id ? { ...todo, priority } : todo
          )
        );
        return;
      }

      const todoToUpdate = backlogTodos.find((todo) => todo._id === id);
      if (todoToUpdate) {
        const response = await api.put(`/backlog/${id}`, {
          ...todoToUpdate,
          priority,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === id ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error updating backlog todo priority:', error);
    }
  };

  // SubTodo functions
  const addSubTodo = async (todoId: string) => {
    try {
      if (isGuestMode) {
        const todoToUpdate = todos.find((todo) => todo._id === todoId);
        if (todoToUpdate) {
          const newSubTodo = {
            _id: `guest-${Date.now()}`,
            text: '',
            completed: false
          };
          setTodos((prevTodos) =>
            prevTodos.map((todo) =>
              todo._id === todoId
                ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] }
                : todo
            )
          );
        }
        return;
      }

      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const newSubTodo = {
          _id: new mongoose.Types.ObjectId().toString(),
          text: '',
          completed: false,
        };
        await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo],
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] }
              : todo
          )
        );
      }
    } catch (error) {
      console.error('Error adding sub-todo:', error);
    }
  };

  const addBacklogSubTodo = async (todoId: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const newSubTodo = {
          _id: new mongoose.Types.ObjectId().toString(),
          text: '',
          completed: false,
        };
        await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: [...todoToUpdate.subTodos, newSubTodo],
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? { ...todo, subTodos: [...todo.subTodos, newSubTodo] }
              : todo
          )
        );
      }
    } catch (error) {
      console.error('Error adding backlog sub-todo:', error);
    }
  };

  const updateSubTodo = (todoId: string, subTodoId: string, text: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === todoId
          ? {
              ...todo,
              subTodos: todo.subTodos.map((subTodo) =>
                subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
              ),
            }
          : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = todos.find((todo) => todo._id === todoId);
        if (todoToUpdate) {
          const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
            subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
          );
          await api.put(`/todos/${todoId}`, {
            ...todoToUpdate,
            subTodos: updatedSubTodos,
          });
        }
      } catch (error) {
        console.error('Error updating sub-todo:', error);
      }
    }, 500);
  };

  const updateBacklogSubTodo = (todoId: string, subTodoId: string, text: string) => {
    setBacklogTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo._id === todoId
          ? {
              ...todo,
              subTodos: todo.subTodos.map((subTodo) =>
                subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
              ),
            }
          : todo
      )
    );

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
        if (todoToUpdate) {
          const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
            subTodo._id === subTodoId ? { ...subTodo, text } : subTodo
          );
          await api.put(`/backlog/${todoId}`, {
            ...todoToUpdate,
            subTodos: updatedSubTodos,
          });
        }
      } catch (error) {
        console.error('Error updating backlog sub-todo:', error);
      }
    }, 500);
  };

  const toggleSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      if (isGuestMode) {
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? {
                  ...todo,
                  subTodos: todo.subTodos.map((subTodo) =>
                    subTodo._id === subTodoId
                      ? { ...subTodo, completed: !subTodo.completed }
                      : subTodo
                  ),
                }
              : todo
          )
        );
        return;
      }

      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
          subTodo._id === subTodoId
            ? { ...subTodo, completed: !subTodo.completed }
            : subTodo
        );
        const response = await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === todoId ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error toggling sub-todo:', error);
    }
  };

  const toggleBacklogSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      if (isGuestMode) {
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId
              ? {
                  ...todo,
                  subTodos: todo.subTodos.map((subTodo) =>
                    subTodo._id === subTodoId
                      ? { ...subTodo, completed: !subTodo.completed }
                      : subTodo
                  ),
                }
              : todo
          )
        );
        return;
      }

      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.map((subTodo) =>
          subTodo._id === subTodoId
            ? { ...subTodo, completed: !subTodo.completed }
            : subTodo
        );
        const response = await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) => (todo._id === todoId ? response.data : todo))
        );
      }
    } catch (error) {
      console.error('Error toggling backlog sub-todo:', error);
    }
  };

  const deleteSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = todos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(
          (subTodo) => subTodo._id !== subTodoId
        );
        await api.put(`/todos/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
          )
        );
      }
    } catch (error) {
      console.error('Error deleting sub-todo:', error);
    }
  };

  const deleteBacklogSubTodo = async (todoId: string, subTodoId: string) => {
    try {
      const todoToUpdate = backlogTodos.find((todo) => todo._id === todoId);
      if (todoToUpdate) {
        const updatedSubTodos = todoToUpdate.subTodos.filter(
          (subTodo) => subTodo._id !== subTodoId
        );
        await api.put(`/backlog/${todoId}`, {
          ...todoToUpdate,
          subTodos: updatedSubTodos,
        });
        setBacklogTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo._id === todoId ? { ...todo, subTodos: updatedSubTodos } : todo
          )
        );
      }
    } catch (error) {
      console.error('Error deleting backlog sub-todo:', error);
    }
  };

  // Memo functions
  const addMemo = async () => {
    try {
      if (isGuestMode) {
        const newMemoItem = {
          _id: `guest-${Date.now()}`,
          title: '새 메모',
          content: '',
          lastEdited: new Date(),
          workspaceId: 'guest',
          userId: 'guest',
          categoryId: undefined
        };
        setMemos((prevMemos) => [newMemoItem, ...prevMemos]);
        setActiveMemo(newMemoItem);
        return;
      }

      const newMemo = {
        title: '새 메모',
        content: '',
        lastEdited: new Date(),
      };
      const response = await api.post('/memos', newMemo);
      setMemos((prevMemos) => [response.data, ...prevMemos]);
      setActiveMemo(response.data);
    } catch (error) {
      console.error('Error adding memo:', error);
    }
  };

  const updateMemo = async (id: string, title: string, content: string, categoryId?: string | null) => {
    const updatedMemo = {
      title,
      content,
      categoryId: categoryId || null,
      lastEdited: new Date()
    };
  
    setMemos((prevMemos) =>
      prevMemos.map((memo) =>
        memo._id === id ? { ...memo, ...updatedMemo } : memo
      )
    );
    
    setActiveMemo((prevMemo) =>
      prevMemo && prevMemo._id === id
        ? { ...prevMemo, ...updatedMemo }
        : prevMemo
    );
  
    if (isGuestMode) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(async () => {
      try {
        await api.put(`/memos/${id}`, updatedMemo);
      } catch (error) {
        console.error('Error updating memo:', error);
      }
    }, 500);
  };

  const deleteMemo = async (id: string) => {
    try {
      await api.delete(`/memos/${id}`);
      setMemos((prevMemos) => prevMemos.filter((memo) => memo._id !== id));
      if (activeMemo && activeMemo._id === id) {
        setActiveMemo(null);
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  // 달 변경 핸들러 추가
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    if (direction === 'next') {
      setCalendarAnimation('slide-left');
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      setCalendarAnimation('slide-right');
      newDate.setMonth(newDate.getMonth() - 1);
    }
    
    setSelectedDate(newDate);
    
    // 애니메이션 리셋
    setTimeout(() => {
      setCalendarAnimation('');
    }, 300);
  };

  // 스와이프 핸들러 설정
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleMonthChange('next'),
    onSwipedRight: () => handleMonthChange('prev'),
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  const moveBacklogToTodo = async (id: string, date: Date) => {
    try {
      if (isGuestMode) {
        const backlogTodo = backlogTodos.find(todo => todo._id === id);
        if (backlogTodo) {
          const newTodo = {
            _id: `guest-${Date.now()}`,
            text: backlogTodo.text,
            completed: backlogTodo.completed,
            description: backlogTodo.description,
            subTodos: backlogTodo.subTodos,
            priority: backlogTodo.priority,
            date: date,
            workspaceId: 'guest',
            userId: 'guest'
          };
          setTodos(prev => [...prev, newTodo]);
          setBacklogTodos(prev => prev.filter(todo => todo._id !== id));
        }
        return;
      }

      const response = await api.post(`/backlog/${id}/move-to-todo`, { date });
      setTodos(prev => [...prev, response.data]);
      setBacklogTodos(prev => prev.filter(todo => todo._id !== id));
    } catch (error) {
      console.error('Error moving backlog to todo:', error);
    }
  };

  const moveTodoToBacklog = async (id: string) => {
    try {
      if (isGuestMode) {
        const todo = todos.find(todo => todo._id === id);
        if (todo) {
          const newBacklogTodo = {
            _id: `guest-${Date.now()}`,
            text: todo.text,
            completed: todo.completed,
            description: todo.description,
            subTodos: todo.subTodos,
            priority: todo.priority,
            workspaceId: 'guest',
            userId: 'guest',
            categoryId: null
          };
          setBacklogTodos(prev => [...prev, newBacklogTodo]);
          setTodos(prev => prev.filter(t => t._id !== id));
        }
        return;
      }

      const response = await api.post(`/todos/${id}/move-to-backlog`);
      setBacklogTodos(prev => [...prev, response.data]);
      setTodos(prev => prev.filter(todo => todo._id !== id));
    } catch (error) {
      console.error('Error moving todo to backlog:', error);
      toast.error('백로그로 이동하는 중 오류가 발생했습니다.');
    }
  };

  // 서비스 워커 업데이트 감지
  useEffect(() => {
    // 서비스 워커 메시지 리스너 등록
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NEW_VERSION') {
        console.log('New app version available:', event.data.version);
        setShowUpdateNotification(true);
        
        // 업데이트 상세 정보 저장
        setUpdateDetails({
          version: event.data.version || '',
          message: event.data.details?.message || '새 버전이 준비되었습니다!',
          timestamp: event.data.timestamp || new Date().toISOString()
        });
        
        // 로컬 스토리지에 업데이트 정보 저장 (앱 재시작 시에도 알림 표시)
        localStorage.setItem('pendingUpdate', JSON.stringify({
          version: event.data.version,
          timestamp: event.data.timestamp || new Date().toISOString(),
          importance: event.data.details?.importance || 'normal'
        }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    // 서비스 워커 업데이트 확인
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // 로컬 스토리지에서 대기 중인 업데이트 확인
          const pendingUpdate = localStorage.getItem('pendingUpdate');
          if (pendingUpdate) {
            const updateInfo = JSON.parse(pendingUpdate);
            // 모바일에서는 업데이트가 적용될 때까지 계속 알림 표시
            // 데스크톱에서는 24시간 이내의 업데이트만 표시
            const updateTime = new Date(updateInfo.timestamp).getTime();
            const currentTime = new Date().getTime();
            const hoursSinceUpdate = (currentTime - updateTime) / (1000 * 60 * 60);
            
            if (isMobile || hoursSinceUpdate < 24) {
              setShowUpdateNotification(true);
              setUpdateDetails({
                version: updateInfo.version || '',
                message: updateInfo.importance === 'critical' 
                  ? '중요 업데이트가 있습니다! 최신 기능과 개선사항을 적용하려면 업데이트하세요.'
                  : '새 버전이 준비되었습니다!',
                timestamp: updateInfo.timestamp
              });
            } else if (!isMobile) {
              // 오래된 업데이트 정보 삭제 (데스크톱에서만)
              localStorage.removeItem('pendingUpdate');
            }
          }
          
          // 서비스 워커 등록 상태 확인
          const registration = await navigator.serviceWorker.ready;
          
          // 업데이트 확인
          registration.update();
          
          // 업데이트 감지 리스너
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker installed, update available');
                  setShowUpdateNotification(true);
                  setUpdateDetails({
                    version: '',
                    message: '중요 업데이트가 있습니다! 최신 기능과 개선사항을 적용하려면 업데이트하세요.',
                    timestamp: new Date().toISOString()
                  });
                  
                  // 로컬 스토리지에 업데이트 정보 저장
                  localStorage.setItem('pendingUpdate', JSON.stringify({
                    version: '',
                    timestamp: new Date().toISOString(),
                    importance: 'critical'
                  }));
                }
              });
            }
          });
        } catch (error) {
          console.error('Service worker update check failed:', error);
        }
      }
    };

    // 초기 업데이트 확인
    checkForUpdates();
    
    // 주기적으로 업데이트 확인 (모바일에서는 더 자주 확인)
    const updateInterval = setInterval(checkForUpdates, isMobile ? 5 * 60 * 1000 : 15 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      clearInterval(updateInterval);
    };
  }, [isMobile]);

  // 앱 업데이트 적용
  const applyUpdate = () => {
    // 업데이트 적용 후 로컬 스토리지에서 대기 중인 업데이트 정보 삭제
    localStorage.removeItem('pendingUpdate');
    // 페이지 새로고침하여 새 버전 적용
    window.location.reload();
  };

  if (!isLoggedIn && !isGuestMode) {
    return showSignup ? (
      <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login 
        onLogin={handleLogin} 
        onSwitchToSignup={() => setShowSignup(true)} 
        onGuestStart={handleGuestStart}
      />
    );
  }

  const filteredTodos = todos.filter((todo) => {
    const todoDate = new Date(todo.date);
    return (
      todoDate.getFullYear() === selectedDate.getFullYear() &&
      todoDate.getMonth() === selectedDate.getMonth() &&
      todoDate.getDate() === selectedDate.getDate()
    );
  });

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const stats = getTodoStats(todos, date);
      
      if (stats.total === 0) return null;
  
      return (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-full flex flex-col items-center gap-1">
            {stats.remaining > 0 && (
              <div 
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-medium w-fit"
                title={`남은 할 일 ${stats.remaining}개`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {stats.remaining}
              </div>
            )}
            {stats.completed > 0 && (
              <div 
                className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium w-fit"
                title={`완료된 할 일 ${stats.completed}개`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {stats.completed}
              </div>
            )}
          </div>
          {/* Progress bar */}
          {/* {stats.total > 0 && (
            <div className="w-[80%] h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ 
                  width: `${(stats.completed / stats.total) * 100}%`
                }}
              />
            </div>
          )} */}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="bottom-center"
        containerStyle={{
          bottom: isMobile ? 60 : 20, // 모바일에서 네비게이션 바 높이만큼 띄움
        }}
        toastOptions={{
          className: 'text-sm',
          duration: 2000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      {/* 앱 업데이트 알림 - 모바일 최적화 및 UI 개선 */}
      {showUpdateNotification && (
        <div className="fixed inset-x-0 bottom-0 md:top-0 md:bottom-auto z-50 shadow-lg bg-gradient-to-r from-indigo-600 to-blue-500">
          <div className="max-w-7xl mx-auto">
            {/* 모바일 디자인 - 네비게이션 바 위에 표시되도록 수정 */}
            <div className="md:hidden">
              <div className="flex flex-col items-center text-white px-4 py-3 pb-[calc(0.75rem+60px)]">
                <div className="flex items-center justify-center w-full mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">새 버전이 준비되었습니다!</h3>
                <p className="text-sm text-center mb-3 text-white/90">
                  {updateDetails.message}
                  {updateDetails.version && <span className="block mt-1 text-xs opacity-75">버전: {updateDetails.version}</span>}
                </p>
                {/* '나중에' 버튼 제거하고 업데이트 버튼만 표시 */}
                <button 
                  onClick={applyUpdate}
                  className="w-full bg-white text-indigo-600 py-3 rounded-lg text-base font-medium hover:bg-indigo-50 transition-colors shadow-md flex items-center justify-center"
                >
                  {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg> */}
                  지금 업데이트하기
                </button>
                {/* 하단 네비게이션 바 영역 확보를 위한 공간 */}
                <div className="h-[60px] w-full md:hidden"></div>
              </div>
            </div>
            
            {/* 데스크톱 디자인 */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">새 버전이 준비되었습니다!</h3>
                    <p className="text-sm text-white/80">
                      {updateDetails.message}
                      {updateDetails.version && <span className="ml-2 text-xs opacity-75">버전: {updateDetails.version}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={applyUpdate}
                    className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors shadow-md"
                  >
                    지금 업데이트
                  </button>
                  <button 
                    onClick={() => setShowUpdateNotification(false)}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onOpenSettings={handleOpenSettings}
        isGuestMode={isGuestMode}
        workspaceSelector={
          <WorkspaceSelector
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            onCreateWorkspace={handleCreateWorkspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
          />
        }
      />

      <main className={`pt-16 pb-20 md:pb-6 min-h-screen ${showUpdateNotification ? 'mb-[calc(60px+8rem)]' : ''}`}>
        {activeTab === 'todo' ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="lg:w-1/3">
                {/* 모바일 캘린더 토글 버튼 - 항상 표시 */}
                <div className="md:hidden mb-3">
                  <button
                    onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <span className="font-medium">{isCalendarCollapsed ? '캘린더 열기' : '캘린더 접기'}</span>
                    {isCalendarCollapsed ? (
                      <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                    ) : (
                      <ChevronUp className="w-5 h-5 transition-transform duration-300" />
                    )}
                  </button>
                </div>
                
                {/* 캘린더 컨테이너 */}
                <div 
                  ref={calendarRef}
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isCalendarCollapsed 
                      ? 'max-h-0 md:max-h-[1000px] opacity-0 md:opacity-100 scale-y-95 origin-top' 
                      : 'max-h-[1000px] opacity-100 scale-y-100 origin-top'
                  }`}
                >
                  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-500 ${
                    isCalendarCollapsed ? 'transform -translate-y-4 md:transform-none' : 'transform translate-y-0'
                  }`}>
                    <div className="p-6">
                      <div
                        {...swipeHandlers}
                        className={`transition-transform duration-300 ease-in-out ${
                          calendarAnimation === 'slide-left' 
                            ? '-translate-x-full' 
                            : calendarAnimation === 'slide-right'
                            ? 'translate-x-full'
                            : ''
                        }`}
                      >
                        <Calendar
                          onChange={(value) => {
                            if (value instanceof Date) {
                              setSelectedDate(value);
                              setIsCalendarCollapsed(true);
                            }
                          }}
                          value={selectedDate}
                          tileContent={tileContent}
                          className="w-full border-none"
                          calendarType="US"
                          tileClassName={({ date, view }) => 
                            view === 'month' && date.getDay() === 6 ? 'text-blue-500' : null
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-2/3">
                <TodoList
                  todos={filteredTodos}
                  selectedDate={selectedDate}
                  newTodo={newTodo}
                  setNewTodo={setNewTodo}
                  addTodo={addTodo}
                  toggleTodo={toggleTodo}
                  deleteTodo={deleteTodo}
                  updateTodoText={updateTodoText}
                  updateTodoDescription={updateTodoDescription}
                  updateTodoPriority={updateTodoPriority}
                  updateTodoDate={updateTodoDate}
                  addSubTodo={addSubTodo}
                  updateSubTodo={updateSubTodo}
                  toggleSubTodo={toggleSubTodo}
                  deleteSubTodo={deleteSubTodo}
                  onDateChange={setSelectedDate}
                  onMoveToBacklog={moveTodoToBacklog}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'backlog' ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <BacklogList
              todos={backlogTodos}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              newTodo={newTodo}
              setNewTodo={setNewTodo}
              addTodo={addBacklogTodo}
              toggleTodo={toggleBacklogTodo}
              deleteTodo={deleteBacklogTodo}
              updateTodoText={updateBacklogTodoText}
              updateTodoDescription={updateBacklogTodoDescription}
              updateTodoPriority={updateBacklogTodoPriority}
              updateTodoCategory={updateBacklogTodoCategory}
              addSubTodo={addBacklogSubTodo}
              updateSubTodo={updateBacklogSubTodo}
              toggleSubTodo={toggleBacklogSubTodo}
              deleteSubTodo={deleteBacklogSubTodo}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onSelectCategory={setSelectedCategoryId}
              onMoveToTodo={moveBacklogToTodo}
            />
          </div>
        ) : activeTab === 'memo' ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <MemoList
              memos={memos}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              activeMemo={activeMemo}
              setActiveMemo={setActiveMemo}
              addMemo={addMemo}
              updateMemo={updateMemo}
              deleteMemo={deleteMemo}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onSelectCategory={setSelectedCategoryId}
            />
          </div>
        ) : activeTab === 'settings' && isMobile ? (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            <Settings
              isOpen={true}
              onClose={() => setActiveTab('todo')}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              isGuestMode={isGuestMode}
              isModal={false}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-0">
            {/* Fallback for desktop when settings tab is selected */}
            {activeTab === 'settings' && !isMobile && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-center text-gray-500">
                  설정은 화면 상단의 설정 아이콘을 클릭하여 열 수 있습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenSettings={handleOpenSettings}
      />
      <InstallPWA />

      {/* Desktop modal settings */}
      {!isMobile && (
        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          isGuestMode={isGuestMode}
          isModal={true}
        />
      )}
    </div>
  );
}

export default App;