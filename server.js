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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error:', error));

// Workspace Schema
const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Workspace = mongoose.model('Workspace', WorkspaceSchema);

// User Schema 수정
const UserSchema = new mongoose.Schema({
  name: String,
  birthdate: Date,
  email: { type: String, unique: true },
  password: String,
  currentWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }
});

const User = mongoose.model('User', UserSchema);

// 기존 스키마들에 workspaceId 필드 추가
const CategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: String,
  color: String
});


const Category = mongoose.model('Category', CategorySchema);

const SubTodoSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
});

const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
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

const BacklogTodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  text: String,
  completed: Boolean,
  description: String,
  subTodos: [SubTodoSchema],
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
});

const BacklogTodo = mongoose.model('BacklogTodo', BacklogTodoSchema);

const MemoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: String,
  content: String,
  lastEdited: { type: Date, default: Date.now },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }
});

const Memo = mongoose.model('Memo', MemoSchema);

// Auth 미들웨어 수정
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.userId = decoded.userId;
    req.workspaceId = user.currentWorkspaceId;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Workspace 라우트
app.post('/api/workspaces', auth, async (req, res) => {
  try {
    const workspace = new Workspace({
      name: req.body.name,
      description: req.body.description,
      ownerId: req.userId
    });
    await workspace.save();
    res.status(201).json(workspace);
  } catch (error) {
    logger.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Error creating workspace' });
  }
});

app.get('/api/workspaces', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ ownerId: req.userId });
    res.json(workspaces);
  } catch (error) {
    logger.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Error fetching workspaces' });
  }
});

app.put('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.json(workspace);
  } catch (error) {
    logger.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Error updating workspace' });
  }
});

app.delete('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId
    });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    // 관련된 모든 데이터 삭제
    await Promise.all([
      Category.deleteMany({ workspaceId: req.params.id }),
      Todo.deleteMany({ workspaceId: req.params.id }),
      BacklogTodo.deleteMany({ workspaceId: req.params.id }),
      Memo.deleteMany({ workspaceId: req.params.id })
    ]);
    
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Error deleting workspace' });
  }
});

// 현재 워크스페이스 변경
app.put('/api/users/current-workspace', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { currentWorkspaceId: req.body.workspaceId },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    logger.error('Error updating current workspace:', error);
    res.status(500).json({ message: 'Error updating current workspace' });
  }
});

// 기존 API 엔드포인트들 수정 - workspaceId 추가
app.post('/api/signup', async (req, res) => {
  try {
    const { name, birthdate, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, birthdate, email, password: hashedPassword });
    await user.save();

    // 기본 워크스페이스 생성
    const defaultWorkspace = new Workspace({
      name: '기본 워크스페이스',
      ownerId: user._id,
      description: '기본 작업 공간'
    });
    await defaultWorkspace.save();

    // 사용자의 현재 워크스페이스를 기본 워크스페이스로 설정
    user.currentWorkspaceId = defaultWorkspace._id;
    await user.save();

    // 샘플 데이터 생성 (workspaceId 포함)
    const today = new Date();

    const sampleCategories = [
      { name: '업무', color: '#EF4444', userId: user._id, workspaceId: defaultWorkspace._id },
      { name: '개인', color: '#F59E0B', userId: user._id, workspaceId: defaultWorkspace._id },
      { name: '아이디어', color: '#3B82F6', userId: user._id, workspaceId: defaultWorkspace._id }
    ];
    const categories = await Category.insertMany(sampleCategories);

    const sampleMemos = [
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        title: '🦉 두두메모 사용법',
        content: '1. 할 일: 캘린더를 통해 날짜별로 할 일을 관리할 수 있습니다.\n2. 백로그: 날짜에 구애받지 않고 자유롭게 할 일을 관리할 수 있습니다.\n3. 메모: 카테고리별로 메모를 작성하고 관리할 수 있습니다.',
        categoryId: categories[0]._id,
        lastEdited: new Date()
      },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        title: '🔥 메모 작성 팁',
        content: '- 메모에 카테고리를 지정하여 체계적으로 관리하세요\n- 중요한 메모는 상단에 고정할 수 있습니다\n- 메모 내용은 실시간으로 저장됩니다',
        categoryId: categories[2]._id,
        lastEdited: new Date()
      }
    ];
    await Memo.insertMany(sampleMemos);

    const sampleTodos = [
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
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
      }
    ];
    await Todo.insertMany(sampleTodos);

    const sampleBacklogs = [
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
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

// JWT 토큰 생성 함수 수정
const generateToken = (userId, rememberMe = false) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '1h' }
  );
};

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
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
    const token = generateToken(user._id, rememberMe);
    logger.info(`User logged in: ${email} (Remember me: ${rememberMe})`);
    res.json({ 
      token, 
      userId: user._id,
      currentWorkspaceId: user.currentWorkspaceId
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// 기존 API 엔드포인트들 수정 - workspaceId 조건 추가
app.get('/api/categories', auth, async (req, res) => {
  try {
    const categories = await Category.find({ 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

app.post('/api/categories', auth, async (req, res) => {
  try {
    const category = new Category({ 
      ...req.body, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

app.put('/api/categories/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId
      },
      req.body,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

app.delete('/api/categories/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // 관련된 메모와 백로그 항목의 categoryId를 null로 설정
    await Promise.all([
      Memo.updateMany(
        { categoryId: req.params.id },
        { $set: { categoryId: null } }
      ),
      BacklogTodo.updateMany(
        { categoryId: req.params.id },
        { $set: { categoryId: null } }
      )
    ]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

app.get('/api/todos', auth, async (req, res) => {
  try {
    const todos = await Todo.find({ 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    res.json(todos);
  } catch (error) {
    logger.error('Error fetching todos:', error);
    res.status(500).json({ message: 'Error fetching todos' });
  }
});

app.post('/api/todos', auth, async (req, res) => {
  try {
    const todo = new Todo({ 
      ...req.body, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    logger.error('Error adding todo:', error);
    res.status(500).json({ message: 'Error adding todo' });
  }
});

app.put('/api/todos/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId
      },
      req.body,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    logger.error('Error updating todo:', error);
    res.status(500).json({ message: 'Error updating todo' });
  }
});

app.delete('/api/todos/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Error deleting todo' });
  }
});

app.get('/api/backlog', auth, async (req, res) => {
  try {
    const todos = await BacklogTodo.find({ 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    res.json(todos);
  } catch (error) {
    logger.error('Error fetching backlog todos:', error);
    res.status(500).json({ message: 'Error fetching backlog todos' });
  }
});

app.post('/api/backlog', auth, async (req, res) => {
  try {
    const todo = new BacklogTodo({ 
      ...req.body, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    logger.error('Error adding backlog todo:', error);
    res.status(500).json({ message: 'Error adding backlog todo' });
  }
});

app.put('/api/backlog/:id', auth, async (req, res) => {
  try {
    const todo = await BacklogTodo.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId
      },
      req.body,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Backlog todo not found' });
    }
    res.json(todo);
  } catch (error) {
    logger.error('Error updating backlog todo:', error);
    res.status(500).json({ message: 'Error updating backlog todo' });
  }
});

app.delete('/api/backlog/:id', auth, async (req, res) => {
  try {
    const todo = await BacklogTodo.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    if (!todo) {
      return res.status(404).json({ message: 'Backlog todo not found' });
    }
    res.json({ message: 'Backlog todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting backlog todo:', error);
    res.status(500).json({ message: 'Error deleting backlog todo' });
  }
});

app.get('/api/memos', auth, async (req, res) => {
  try {
    const memos = await Memo.find({ 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    res.json(memos);
  } catch (error) {
    logger.error('Error fetching memos:', error);
    res.status(500).json({ message: 'Error fetching memos' });
  }
});

app.post('/api/memos', auth, async (req, res) => {
  try {
    const memo = new Memo({ 
      ...req.body, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    await memo.save();
    res.status(201).json(memo);
  } catch (error) {
    logger.error('Error adding memo:', error);
    res.status(500).json({ message: 'Error adding memo' });
  }
});

app.put('/api/memos/:id', auth, async (req, res) => {
  try {
    const memo = await Memo.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId
      },
      req.body,
      { new: true }
    );
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }
    res.json(memo);
  } catch (error) {
    logger.error('Error updating memo:', error);
    res.status(500).json({ message: 'Error updating memo' });
  }
});

app.delete('/api/memos/:id', auth, async (req, res) => {
  try {
    const memo = await Memo.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }
    res.json({ message: 'Memo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting memo:', error);
    res.status(500).json({ message: 'Error deleting memo' });
  }
});

// 회원 탈퇴 엔드포인트 추가
app.delete('/api/users/me', auth, async (req, res) => {
  try {
    // 사용자의 모든 워크스페이스 찾기
    const workspaces = await Workspace.find({ ownerId: req.userId });
    const workspaceIds = workspaces.map(w => w._id);

    // 모든 데이터 삭제
    await Promise.all([
      // 워크스페이스별 데이터 삭제
      Category.deleteMany({ userId: req.userId }),
      Todo.deleteMany({ userId: req.userId }),
      BacklogTodo.deleteMany({ userId: req.userId }),
      Memo.deleteMany({ userId: req.userId }),
      // 워크스페이스 삭제
      Workspace.deleteMany({ ownerId: req.userId }),
      // 사용자 삭제
      User.findByIdAndDelete(req.userId)
    ]);

    logger.info(`User account deleted: ${req.userId}`);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account' });
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