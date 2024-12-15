import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();

// CORS 설정
app.use(cors());

// Body parser 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (프론트엔드 빌드 결과물)
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error:', error));

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  birthdate: Date,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', UserSchema);

// Category Schema
const CategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  color: String,
});

const Category = mongoose.model('Category', CategorySchema);

// SubTodo Schema
const SubTodoSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
});

// Todo Schema
const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  completed: Boolean,
  date: Date,
  description: String,
  subTodos: [SubTodoSchema],
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  }
});

const Todo = mongoose.model('Todo', TodoSchema);

// BacklogTodo Schema
const BacklogTodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  completed: Boolean,
  description: String,
  subTodos: [SubTodoSchema],
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  }
});

const BacklogTodo = mongoose.model('BacklogTodo', BacklogTodoSchema);

// Memo Schema
const MemoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  content: String,
  lastEdited: { type: Date, default: Date.now },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
});

const Memo = mongoose.model('Memo', MemoSchema);

// Auth 미들웨어
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// API 라우트
app.post('/api/signup', async (req, res) => {
  try {
    const { name, birthdate, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, birthdate, email, password: hashedPassword });
    await user.save();

    // 샘플 데이터 생성
    const today = new Date();

    // 샘플 카테고리 생성
    const sampleCategories = [
      { name: '업무', color: '#EF4444', userId: user._id },
      { name: '개인', color: '#F59E0B', userId: user._id },
      { name: '아이디어', color: '#3B82F6', userId: user._id }
    ];
    const categories = await Category.insertMany(sampleCategories);

    // 샘플 메모 생성
    const sampleMemos = [
      {
        userId: user._id,
        title: '🦉 두두메모 사용법',
        content: '1. 할 일: 캘린더를 통해 날짜별로 할 일을 관리할 수 있습니다.\n2. 백로그: 날짜에 구애받지 않고 자유롭게 할 일을 관리할 수 있습니다.\n3. 메모: 카테고리별로 메모를 작성하고 관리할 수 있습니다.',
        categoryId: categories[0]._id,
        lastEdited: new Date()
      },
      {
        userId: user._id,
        title: '🔥 메모 작성 팁',
        content: '- 메모에 카테고리를 지정하여 체계적으로 관리하세요\n- 중요한 메모는 상단에 고정할 수 있습니다\n- 메모 내용은 실시간으로 저장됩니다',
        categoryId: categories[2]._id,
        lastEdited: new Date()
      }
    ];
    await Memo.insertMany(sampleMemos);

    // 샘플 할 일 생성
    const sampleTodos = [
      {
        userId: user._id,
        text: '두두메모 둘러보기',
        completed: false,
        date: today,
        description: '새로운 할 일 관리 도구인 두두메모의 주요 기능을 살펴봅니다.',
        priority: 'high',
        subTodos: [
          { text: '✅ "할 일" 살펴보기', completed: false },
          { text: '📦 "백로그" 살펴보기', completed: false },
          { text: '📝 "메모" 살펴보기', completed: false }
        ]
      },
      {
        userId: user._id,
        text: '오늘의 첫 할 일 등록하기 📌',
        completed: false,
        date: today,
        description: '나만의 첫 할 일을 등록해보세요!',
        priority: 'medium',
        subTodos: []
      },
      {
        userId: user._id,
        text: '상쾌한 하루 시작하기 🤩',
        completed: true,
        date: today,
        description: '',
        priority: 'high',
        subTodos: []
      }
    ];
    await Todo.insertMany(sampleTodos);

    // 샘플 백로그 생성
    const sampleBacklogs = [
      {
        userId: user._id,
        text: '백로그 활용하기 👏',
        completed: false,
        description: '언제든 해야 할 일들을 백로그에 등록해보세요.',
        priority: 'medium',
        subTodos: [
          { text: '🗂️ 우선순위 지정해보기', completed: false },
          { text: '✅ 하위 할 일 추가해보기', completed: false }
        ]
      }
    ];
    await BacklogTodo.insertMany(sampleBacklogs);

    logger.info(`New user signed up: ${email}`);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt failed: User not found (${email})`);
      return res.status(400).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login attempt failed: Invalid credentials (${email})`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    logger.info(`User logged in: ${email}`);
    res.json({ token, userId: user._id });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Category routes
app.get('/api/categories', auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.userId });
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

app.post('/api/categories', auth, async (req, res) => {
  try {
    const category = new Category({ ...req.body, userId: req.userId });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

app.put('/api/categories/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

app.delete('/api/categories/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    // 카테고리가 삭제되면 관련 메모의 categoryId를 null로 설정
    await Memo.updateMany(
      { userId: req.userId, categoryId: req.params.id },
      { $unset: { categoryId: "" } }
    );
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

app.get('/api/todos', auth, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.userId });
    res.json(todos);
  } catch (error) {
    logger.error('Error fetching todos:', error);
    res.status(500).json({ message: 'Error fetching todos', error: error.message });
  }
});

app.post('/api/todos', auth, async (req, res) => {
  try {
    const todo = new Todo({ ...req.body, userId: req.userId });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    logger.error('Error adding todo:', error);
    res.status(500).json({ message: 'Error adding todo', error: error.message });
  }
});

app.put('/api/todos/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    logger.error('Error updating todo:', error);
    res.status(500).json({ message: 'Error updating todo', error: error.message });
  }
});

app.delete('/api/todos/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Error deleting todo', error: error.message });
  }
});

// Backlog routes
app.get('/api/backlog', auth, async (req, res) => {
  try {
    const todos = await BacklogTodo.find({ userId: req.userId });
    res.json(todos);
  } catch (error) {
    logger.error('Error fetching backlog todos:', error);
    res.status(500).json({ message: 'Error fetching backlog todos', error: error.message });
  }
});

app.post('/api/backlog', auth, async (req, res) => {
  try {
    const todo = new BacklogTodo({ ...req.body, userId: req.userId });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    logger.error('Error adding backlog todo:', error);
    res.status(500).json({ message: 'Error adding backlog todo', error: error.message });
  }
});

app.put('/api/backlog/:id', auth, async (req, res) => {
  try {
    const todo = await BacklogTodo.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Backlog todo not found' });
    }
    res.json(todo);
  } catch (error) {
    logger.error('Error updating backlog todo:', error);
    res.status(500).json({ message: 'Error updating backlog todo', error: error.message });
  }
});

app.delete('/api/backlog/:id', auth, async (req, res) => {
  try {
    const todo = await BacklogTodo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!todo) {
      return res.status(404).json({ message: 'Backlog todo not found' });
    }
    res.json({ message: 'Backlog todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting backlog todo:', error);
    res.status(500).json({ message: 'Error deleting backlog todo', error: error.message });
  }
});

app.get('/api/memos', auth, async (req, res) => {
  try {
    const memos = await Memo.find({ userId: req.userId });
    res.json(memos);
  } catch (error) {
    logger.error('Error fetching memos:', error);
    res.status(500).json({ message: 'Error fetching memos', error: error.message });
  }
});

app.post('/api/memos', auth, async (req, res) => {
  try {
    const memo = new Memo({ ...req.body, userId: req.userId });
    await memo.save();
    res.status(201).json(memo);
  } catch (error) {
    logger.error('Error adding memo:', error);
    res.status(500).json({ message: 'Error adding memo', error: error.message });
  }
});

app.put('/api/memos/:id', auth, async (req, res) => {
  try {
    const memo = await Memo.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }
    res.json(memo);
  } catch (error) {
    logger.error('Error updating memo:', error);
    res.status(500).json({ message: 'Error updating memo', error: error.message });
  }
});

app.delete('/api/memos/:id', auth, async (req, res) => {
  try {
    const memo = await Memo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }
    res.json({ message: 'Memo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting memo:', error);
    res.status(500).json({ message: 'Error deleting memo', error: error.message });
  }
});

// SPA를 위한 catch-all 라우트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});