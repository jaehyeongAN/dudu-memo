export interface SubTodo {
  _id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  _id: string;
  workspaceId: string;
  text: string;
  completed: boolean;
  date: Date;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
  userId?: string;
}

export interface BacklogTodo {
  _id: string;
  workspaceId: string;
  text: string;
  completed: boolean;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
  categoryId?: string;
  userId?: string;
}

export interface Category {
  _id: string;
  workspaceId: string;
  name: string;
  color: string;
  userId?: string;
}

export interface Memo {
  _id: string;
  workspaceId: string;
  title: string;
  content: string;
  lastEdited: Date;
  categoryId?: string;
  userId?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}