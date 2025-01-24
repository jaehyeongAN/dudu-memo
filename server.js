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

// User Schema 수정 - birthdate 필드 제거
const UserSchema = new mongoose.Schema({
  name: String,
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
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
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
        title: '✔︎ Doo!Du 소개 글 ✨',
        content: '"Think Simple, Act Fast!"\n\n세상에는 이미 다양한 투두/메모 서비스가 많습니다. 그럼에도 ✔︎ Doo!Du는 가장 쉽고 빠르게 일의 본질에 집중할 수 있도록 돕기 위해 만들어졌습니다.\n\n	•	캘린더 기반 할 일 관리로 하루를 체계적으로 설계하고,\n	•	백로그에 아이디어와 할 일을 잊지 않고 보관하며,\n	•	실시간 저장되는 메모로 생각을 놓치지 않아요.\n\n모든 기능이 직관적이고 빠르게 설계되어, 누구나 쉽게 사용할 수 있어요.\n지금 Doo!Du와 함께 더 정리된 일상을 만들어보세요! 🗓️✨',
        categoryId: categories[2]._id,
        lastEdited: new Date()
      },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        title: '앱 마케팅 홍보 방안 회의 정리 💬',
        content: '[회의 주제]: Doo!Du의 사용자층 확대 방안\n\n1️⃣ SNS 마케팅\n	•	사용자 후기(스크린샷 + 사용 예시) 중심 콘텐츠 제작\n	•	TikTok, Instagram Reels 활용한 짧고 강렬한 홍보 영상 제작 🎥\n\n2️⃣ 협업 캠페인\n	•	생산성 관련 YouTuber/Influencer와 협업 콘텐츠 제작\n	•	앱 스토어 리뷰 이벤트 진행 🎁\n\n3️⃣ 광고 타겟팅 전략\n	•	25~40대 직장인을 주 타겟으로 설정\n	•	생산성 앱 관심도가 높은 사용자 기반 세부 타겟팅\n\n[다음 행동 아이템]: 홍보 영상 시나리오 작성, 협업 대상 리스트업',
        categoryId: categories[0]._id,
        lastEdited: new Date()
      },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        title: '새해 목표 리스트 작성 🎯',
        content: '[2025년 목표]\n1️⃣ 운동: 주 3회 이상 규칙적으로 운동하기 🏋️‍♀️\n	•	헬스장 등록 완료 (1월 중)\n	•	5km 달리기 기록 목표 세우기\n\n2️⃣ 취미 활동: 새로운 취미 2가지 배우기 🎨\n	•	디지털 드로잉 클래스 등록\n	•	주말마다 1시간 요리 연습\n\n3️⃣ 자기계발: 매달 한 권의 책 읽기 📚\n	•	1월 추천 도서: "Atomic Habits"\n\n이제 목표를 세웠으니, 차근차근 실천하며 나아가자! 💪',
        categoryId: categories[1]._id,
        lastEdited: new Date()
      }
    ];
    await Memo.insertMany(sampleMemos);

    const sampleTodos = [
      // {
      //   userId: user._id,
      //   workspaceId: defaultWorkspace._id,
      //   text: '👋 환영합니다! Doo!Du에 오신 것을 환영해요!',
      //   completed: false,
      //   date: today,
      //   description: '✔︎ Doo!Du를 통해 쉽고 빠르게 당신의 할 일과 아이디어를 정리해보세요!',
      //   priority: 'high',
      //   subTodos: [
      //     { text: '🗓️ 캘린더 기반 할 일 관리: 오늘의 계획부터 장기 목표까지 체계적으로 정리!', completed: false },
      //     { text: '📦 백로그 보관소: 일정에 등록하기 부담스러운 일은 백로그로!', completed: false },
      //     { text: '✏️ 메모: 떠오르는 생각을 빠르게 적고, 아이디어를 카테고리별로 깔끔하게!', completed: false },
      //     { text: '🏢 워크스페이스: 개인, 업무, 프로젝트 등 공간별로 완벽히 분리된 관리!', completed: false }
      //   ]
      // },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        text: 'Doo!Du 살펴보기 👋',
        completed: false,
        date: today,
        description: '쉽고 빠르게 당신의 할 일과 아이디어를 정리해보세요!',
        priority: 'high',
        subTodos: [
          { text: '🔥 회원가입 및 로그인하기', completed: true },
          { text: '🗓️ 캘린더에 할 일 등록하기', completed: false },
          { text: '📦 백로그에 일정 보관해놓기', completed: false },
          { text: '✏️ 메모에 아이디어 작성하기', completed: false },
          { text: '🏢 워크스페이스에 분리하기', completed: false }
        ]
      },
      // {
      //   userId: user._id,
      //   workspaceId: defaultWorkspace._id,
      //   text: '두두 둘러보기',
      //   completed: false,
      //   date: today,
      //   description: '"Thik Simple, Act Fast!" 쉽고 빠른 투두/메모 관리 도구인 두두의 주요 기능을 살펴봅니다.',
      //   priority: 'low',
      //   subTodos: [
      //     { text: '1️⃣ 회원가입 및 로그인하기', completed: true },
      //     { text: '2️⃣ "할 일" 살펴보기', completed: false },
      //     { text: '3️⃣ "백로그" 살펴보기', completed: false },
      //     { text: '4️⃣ "메모" 살펴보기', completed: false },
      //     { text: '5️⃣ "워크스페이스" 살펴보기', completed: false }
      //   ]
      // },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        text: 'Doo!Du 별점 5점 주기 🌟',
        completed: true,
        date: today,
        description: '"심플하지만 생산성이 대단해!" 라고 리뷰도 달아줄까?',
        priority: 'low',
        subTodos: [
          { text: '별점 5점 주기!', completed: true },
          { text: '피드백/리뷰 작성하기!', completed: true }
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
        description: '일정에 구애받지 않고 해야할 일을 백로그에 등록해보세요.',
        priority: 'medium',
        categoryId: categories[2]._id,
        subTodos: [
          { text: '✅ 백로그 추가해보기', completed: false },
          { text: '📌 우선순위 지정해보기 (우선순위 정렬)', completed: false },
          { text: '🗂️ 카테고리 관리하기 (카테고리별 필터링) ', completed: false },
        ]
      },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        text: '책 읽기 리스트 📖',
        completed: false,
        description: '올해 꼭 읽고 싶은 책들',
        priority: 'medium',
        categoryId: categories[1]._id,
        subTodos: [
          { text: '데미안', completed: false },
          { text: '어린왕자', completed: false },
          { text: '모모', completed: true },
        ]
      },
      {
        userId: user._id,
        workspaceId: defaultWorkspace._id,
        text: '✔︎ Doo!Du 웹/앱 > UI/UX 개편하기',
        completed: true,
        description: '전체적으로 UI/UX 개편해야할 점 정리',
        priority: 'medium',
        categoryId: categories[0]._id,
        subTodos: [
          { text: '사용자 피드백 분석 결과 정리', completed: true },
          { text: '네비게이션 구조 개선 제안서 작성', completed: true },
          { text: '새로운 홈 화면 와이어프레임 제작', completed: true },
          { text: '다크 모드 디자인 적용 시안 제작', completed: true },
          { text: '버튼과 아이콘 크기 재조정 (접근성 고려)', completed: true },
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