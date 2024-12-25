export interface SubTodo {
  _id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  _id: string;
  workspaceId: string; // 추가
  text: string;
  completed: boolean;
  date: Date;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
}

export interface BacklogTodo {
  _id: string;
  workspaceId: string; // 추가
  text: string;
  completed: boolean;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
}

export interface Category {
  _id: string;
  workspaceId: string; // 추가
  name: string;
  color: string;
}

export interface Memo {
  _id: string;
  workspaceId: string; // 추가
  title: string;
  content: string;
  lastEdited: Date;
  categoryId?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}