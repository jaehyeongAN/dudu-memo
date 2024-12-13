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
  categoryId?: string; // 카테고리 ID 추가
}