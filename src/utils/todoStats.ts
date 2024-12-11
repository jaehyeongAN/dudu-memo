import { Todo } from '../types';
import { isSameDay } from 'date-fns';

export const getTodoStats = (todos: Todo[], date: Date) => {
  const todosForDate = todos.filter(todo => isSameDay(new Date(todo.date), date));
  
  const total = todosForDate.length;
  const completed = todosForDate.filter(todo => todo.completed).length;
  const remaining = total - completed;

  return { total, completed, remaining };
};