export interface SubTodo {
  _id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  date: Date;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
}

export interface BacklogTodo {
  _id: string;
  text: string;
  completed: boolean;
  description: string;
  subTodos: SubTodo[];
  priority: 'high' | 'medium' | 'low';
}

export interface Category {
  _id: string;
  name: string;
  color: string;
}

export interface Memo {
  _id: string;
  title: string;
  content: string;
  lastEdited: Date;
  categoryId?: string;
}