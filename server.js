import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// 환경 변수 로드 전에 NODE_ENV 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 설정 관리 개선
const config = {
  port: process.env.PORT || 5001,
  jwtSecret: process.env.JWT_SECRET || 'default_secret_should_be_changed_in_production',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/doodu',
  environment: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
};

// 개발 환경에서 중요 설정 검증
if (config.environment === 'development') {
  if (config.jwtSecret === 'default_secret_should_be_changed_in_production') {
    console.warn('Warning: Using default JWT secret. Set JWT_SECRET environment variable in production.');
  }
}

// Winston 로거 설정 개선
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'doodu-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// 개발 환경에서는 콘솔 로그 추가
if (config.environment !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 애플리케이션 초기화
const app = express();

// 기본 미들웨어
app.use(cors());
app.use(express.json({ limit: '1mb' }));  // 요청 크기 제한
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// 보안 미들웨어
app.use(helmet()); // 보안 관련 HTTP 헤더 설정
app.use(mongoSanitize()); // NoSQL 인젝션 방지

// 압축 미들웨어
app.use(compression()); // 응답 데이터 압축

// 속도 제한 미들웨어 - 로그인과 일반 API에 다른 제한 적용
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 20, // 각 IP당 15분간 최대 20번 요청 가능
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true, 
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 200, // 각 IP당 15분간 최대 200번 요청 가능
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// 로그인, 회원가입 라우트에 더 엄격한 제한 적용
app.use('/api/login', loginLimiter);
app.use('/api/signup', loginLimiter);

// 다른 API 라우트에 덜 엄격한 제한 적용
app.use('/api', apiLimiter);

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  // 프로덕션 환경에서는 중요 정보 감춤
  const maskedUrl = config.isProduction
    ? req.path
    : `${req.path}${req.query ? `?${JSON.stringify(req.query)}` : ''}`;

  logger.info(`${req.method} ${maskedUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // 응답 시간 측정
  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${maskedUrl} ${res.statusCode} - ${responseTime}ms`);
  });
  
  next();
});

// 중앙화된 에러 핸들링 유틸리티 추가
const handleApiError = (res, error, operation, resourceType) => {
  const errorMessage = `Error ${operation} ${resourceType}`;
  logger.error(`${errorMessage}:`, error);
  
  // 클라이언트에게 전달할 에러 메시지 구성
  const clientErrorMessage = process.env.NODE_ENV === 'production' 
    ? errorMessage 
    : `${errorMessage}: ${error.message}`;
    
  // MongoDB 특정 에러 처리
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      message: clientErrorMessage,
      details: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.name === 'MongoServerError' && error.code === 11000) {
    return res.status(409).json({ 
      message: 'Duplicate entry exists',
      field: Object.keys(error.keyPattern)[0]
    });
  }
  
  return res.status(500).json({ message: clientErrorMessage });
};

// CRUD 작업을 위한 유틸리티 함수 추가
const createCrudHandlers = (Model, resourceName) => {
  return {
    // 목록 조회
    getAll: async (req, res) => {
      try {
        const items = await Model.find({ 
          userId: req.userId,
          workspaceId: req.workspaceId
        }).sort({ updatedAt: -1, createdAt: -1 });
        
        res.json(items);
      } catch (error) {
        handleApiError(res, error, 'fetching', resourceName);
      }
    },
    
    // 단일 항목 조회
    getOne: async (req, res) => {
      try {
        const item = await Model.findOne({ 
          _id: req.params.id, 
          userId: req.userId,
          workspaceId: req.workspaceId
        });
        
        if (!item) {
          return res.status(404).json({ message: `${resourceName} not found` });
        }
        
        res.json(item);
      } catch (error) {
        handleApiError(res, error, 'fetching', resourceName);
      }
    },
    
    // 항목 생성
    create: async (req, res) => {
      try {
        const item = new Model({ 
          ...req.body, 
          userId: req.userId,
          workspaceId: req.workspaceId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await item.save();
        res.status(201).json(item);
      } catch (error) {
        handleApiError(res, error, 'creating', resourceName);
      }
    },
    
    // 항목 업데이트
    update: async (req, res) => {
      try {
        // updatedAt 필드 자동 업데이트
        const updateData = {
          ...req.body,
          updatedAt: new Date()
        };
        
        const item = await Model.findOneAndUpdate(
          { 
            _id: req.params.id, 
            userId: req.userId,
            workspaceId: req.workspaceId
          },
          updateData,
          { new: true, runValidators: true }
        );
        
        if (!item) {
          return res.status(404).json({ message: `${resourceName} not found` });
        }
        
        res.json(item);
      } catch (error) {
        handleApiError(res, error, 'updating', resourceName);
      }
    },
    
    // 항목 삭제
    delete: async (req, res) => {
      try {
        const item = await Model.findOneAndDelete({ 
          _id: req.params.id, 
          userId: req.userId,
          workspaceId: req.workspaceId
        });
        
        if (!item) {
          return res.status(404).json({ message: `${resourceName} not found` });
        }
        
        res.json({ 
          message: `${resourceName} deleted successfully`,
          deletedId: req.params.id
        });
      } catch (error) {
        handleApiError(res, error, 'deleting', resourceName);
      }
    }
  };
};

mongoose.connect(config.mongoUri, {
  serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃
  socketTimeoutMS: 45000, // 소켓 타임아웃
  // 트랜잭션 관련 추가 설정
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10, // 연결 풀 최대 사이즈 설정
  minPoolSize: 1,   // 최소 연결 유지 수
  maxIdleTimeMS: 30000, // 유휴 연결 최대 유지 시간
})
.then(() => logger.info('Connected to MongoDB'))
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1); // 데이터베이스 연결 실패 시 애플리케이션 종료
});

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
  currentWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  passwordChangedAt: Date
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

// Auth 미들웨어 개선
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId).select('-password'); // 비밀번호 제외
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // 토큰 발급 시간 검증 (jwt iat claim)
      const tokenIssuedAt = decoded.iat * 1000; // JWT의 iat는 초 단위, JS는 밀리초 단위
      const passwordChangedAt = user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0;
      
      // 비밀번호 변경 후 발급된 토큰인지 확인
      if (passwordChangedAt > tokenIssuedAt) {
        return res.status(401).json({ 
          message: 'Password was changed after this token was issued. Please login again.' 
        });
      }
      
      // Add user to request object for easier access
      req.user = user;
      req.userId = decoded.userId;
      req.workspaceId = user.currentWorkspaceId;
      
      // Validate that workspaceId exists if it's set
      if (req.workspaceId) {
        const workspaceExists = await Workspace.exists({ 
          _id: req.workspaceId, 
          ownerId: req.userId 
        });
        
        if (!workspaceExists) {
          // 현재 워크스페이스가 유효하지 않으면 다른 워크스페이스를 찾아 설정
          const alternativeWorkspace = await Workspace.findOne({ 
            ownerId: req.userId 
          }).sort({ updatedAt: -1 });
          
          if (alternativeWorkspace) {
            // 다른 워크스페이스 찾으면 자동으로 업데이트
            user.currentWorkspaceId = alternativeWorkspace._id;
            await User.updateOne(
              { _id: req.userId },
              { currentWorkspaceId: alternativeWorkspace._id }
            );
            
            req.workspaceId = alternativeWorkspace._id;
            logger.info(`Auto-updated user ${req.userId} workspace to ${alternativeWorkspace._id}`);
          } else {
            // 다른 워크스페이스도 없다면 새 워크스페이스 생성
            const newWorkspace = new Workspace({
              name: '기본 워크스페이스',
              ownerId: req.userId,
              description: '기본 작업 공간',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await newWorkspace.save();
            
            user.currentWorkspaceId = newWorkspace._id;
            await User.updateOne(
              { _id: req.userId },
              { currentWorkspaceId: newWorkspace._id }
            );
            
            req.workspaceId = newWorkspace._id;
            logger.info(`Created new workspace for user ${req.userId}: ${newWorkspace._id}`);
          }
        }
      } else {
        // 워크스페이스가 설정되지 않은 경우 - 다른 워크스페이스 찾거나 생성
        const alternativeWorkspace = await Workspace.findOne({ 
          ownerId: req.userId 
        }).sort({ updatedAt: -1 });
        
        if (alternativeWorkspace) {
          user.currentWorkspaceId = alternativeWorkspace._id;
          await User.updateOne(
            { _id: req.userId },
            { currentWorkspaceId: alternativeWorkspace._id }
          );
          
          req.workspaceId = alternativeWorkspace._id;
        } else {
          // 워크스페이스가 없으면 새로 생성
          const newWorkspace = new Workspace({
            name: '기본 워크스페이스',
            ownerId: req.userId,
            description: '기본 작업 공간',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await newWorkspace.save();
          
          user.currentWorkspaceId = newWorkspace._id;
          await User.updateOne(
            { _id: req.userId },
            { currentWorkspaceId: newWorkspace._id }
          );
          
          req.workspaceId = newWorkspace._id;
          logger.info(`Created new workspace for user ${req.userId}: ${newWorkspace._id}`);
        }
      }
      
      // 마지막 활동 시간 업데이트 (성능상 이유로 비동기로 실행, 응답을 기다리지 않음)
      User.updateOne(
        { _id: user._id },
        { lastActive: new Date() }
      ).catch(err => logger.warn('Failed to update last active time', err));
      
      next();
    } catch (jwtError) {
      logger.error('JWT verification error:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

// Workspace 라우트
app.post('/api/workspaces', auth, async (req, res) => {
  try {
    // Basic validation
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Workspace name is required' });
    }
    
    const workspace = new Workspace({
      name: name.trim(),
      description: req.body.description || '',
      ownerId: req.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await workspace.save();
    res.status(201).json(workspace);
  } catch (error) {
    handleApiError(res, error, 'creating', 'workspace');
  }
});

app.get('/api/workspaces', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ ownerId: req.userId })
      .sort({ updatedAt: -1 });
    res.json(workspaces);
  } catch (error) {
    handleApiError(res, error, 'fetching', 'workspaces');
  }
});

app.put('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Workspace name cannot be empty' });
    }
    
    // Ensure the workspace exists and belongs to the user
    const workspace = await Workspace.findOne({ 
      _id: id, 
      ownerId: req.userId 
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    // Update only allowed fields
    workspace.name = name.trim();
    workspace.description = req.body.description || '';
    workspace.updatedAt = new Date();
    
    await workspace.save();
    res.json(workspace);
  } catch (error) {
    handleApiError(res, error, 'updating', 'workspace');
  }
});

app.delete('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the workspace first to verify ownership
    const workspace = await Workspace.findOne({
      _id: id,
      ownerId: req.userId
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    
    // Prevent deletion if it's the user's last workspace
    const workspaceCount = await Workspace.countDocuments({ ownerId: req.userId });
    if (workspaceCount <= 1) {
      return res.status(400).json({ 
        message: 'Cannot delete the last workspace. Create a new workspace first.' 
      });
    }
    
    // Start a single transaction for all operations
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete the workspace within the transaction - 순차적으로 실행
      await Workspace.deleteOne({ _id: id }, { session });
      
      // 병렬 작업을 순차적으로 변경하여 트랜잭션 안정성 확보
      await Category.deleteMany({ workspaceId: id }, { session });
      await Todo.deleteMany({ workspaceId: id }, { session });
      await BacklogTodo.deleteMany({ workspaceId: id }, { session });
      await Memo.deleteMany({ workspaceId: id }, { session });
      
      // If this was the user's current workspace, set another workspace as current
      if (req.user.currentWorkspaceId?.toString() === id) {
        const alternativeWorkspace = await Workspace.findOne(
          { ownerId: req.userId, _id: { $ne: id } },
          null,
          { session }
        );
        
        if (alternativeWorkspace) {
          await User.updateOne(
            { _id: req.userId },
            { currentWorkspaceId: alternativeWorkspace._id },
            { session }
          );
        }
      }
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({ 
        message: 'Workspace deleted successfully',
        deletedWorkspaceId: id
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    handleApiError(res, error, 'deleting', 'workspace');
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
    handleApiError(res, error, 'updating current workspace', '');
  }
});

// 입력 검증 유틸리티
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    // Create user with bcrypt password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name: name || email.split('@')[0], // Use part of email as name if not provided
      email, 
      password: hashedPassword 
    });
    
    await user.save();

    // 기본 워크스페이스 생성
    const defaultWorkspace = new Workspace({
      name: '기본 워크스페이스',
      ownerId: user._id,
      description: '기본 작업 공간',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await defaultWorkspace.save();

    // 사용자의 현재 워크스페이스를 기본 워크스페이스로 설정
    user.currentWorkspaceId = defaultWorkspace._id;
    await user.save();

    // 샘플 데이터 생성 코드는 유지...
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
        content: '"Think Simple, Act Fast!"\n\n세상에는 이미 다양한 투두/메모 서비스가 많습니다. 그럼에도 ✔︎ Doo!Du는 가장 쉽고 빠르게 일의 본질에 집중할 수 있도록 돕기 위해 만들어졌습니다.\n\n	•	캘린더 기반 할 일 관리로 하루를 체계적으로 설계하고,\n	•	보관함에 아이디어와 할 일을 잊지 않고 보관하며,\n	•	실시간 저장되는 메모로 생각을 놓치지 않아요.\n\n모든 기능이 직관적이고 빠르게 설계되어, 누구나 쉽게 사용할 수 있어요.\n지금 Doo!Du와 함께 더 정리된 일상을 만들어보세요! 🗓️✨',
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
      //     { text: '📦 보관함 보관소: 일정에 등록하기 부담스러운 일은 보관함로!', completed: false },
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
          { text: '📦 보관함에 일정 보관해놓기', completed: false },
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
      //     { text: '3️⃣ "보관함" 살펴보기', completed: false },
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
        text: '보관함 활용하기 👏',
        completed: false,
        description: '일정에 구애받지 않고 해야할 일을 보관함에 등록해보세요.',
        priority: 'medium',
        categoryId: categories[2]._id,
        subTodos: [
          { text: '✅ 보관함 추가해보기', completed: false },
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

    // 성공 응답 + 로그인 토큰 제공
    const token = generateToken(user._id, true);
    logger.info(`New user signed up: ${email}`);
    
    res.status(201).json({ 
      message: 'User created successfully',
      token,
      userId: user._id,
      currentWorkspaceId: defaultWorkspace._id
    });
  } catch (error) {
    handleApiError(res, error, 'creating', 'user');
  }
});

// JWT 토큰 생성 함수 수정
const generateToken = (userId, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '1d';
  
  try {
    return jwt.sign(
      { userId, iat: Math.floor(Date.now() / 1000) }, 
      config.jwtSecret,
      { expiresIn }
    );
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Error generating authentication token');
  }
};

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt failed: User not found (${email})`);
      // Use same message for both cases to prevent user enumeration
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login attempt failed: Invalid password (${email})`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate token with appropriate expiration
    const token = generateToken(user._id, rememberMe === true);
    
    // Check and ensure user has a valid currentWorkspaceId
    let currentWorkspaceId = user.currentWorkspaceId;
    
    if (!currentWorkspaceId) {
      // If no workspace assigned, find or create one
      const workspace = await Workspace.findOne({ ownerId: user._id });
      
      if (workspace) {
        currentWorkspaceId = workspace._id;
        // Update user with the found workspace
        await User.updateOne(
          { _id: user._id },
          { currentWorkspaceId: workspace._id }
        );
      } else {
        // If no workspace exists, create one
        const newWorkspace = new Workspace({
          name: '기본 워크스페이스',
          ownerId: user._id,
          description: '기본 작업 공간',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newWorkspace.save();
        
        currentWorkspaceId = newWorkspace._id;
        await User.updateOne(
          { _id: user._id },
          { currentWorkspaceId: newWorkspace._id }
        );
      }
    }
    
    logger.info(`User logged in: ${email} (Remember me: ${!!rememberMe})`);
    
    res.json({ 
      token, 
      userId: user._id,
      currentWorkspaceId
    });
  } catch (error) {
    handleApiError(res, error, 'authenticating', 'user');
  }
});

// API 라우트 설정
// CRUD 핸들러 생성
const categoryHandlers = createCrudHandlers(Category, 'Category');
const todoHandlers = createCrudHandlers(Todo, 'Todo');
const backlogTodoHandlers = createCrudHandlers(BacklogTodo, 'Backlog todo');
const memoHandlers = createCrudHandlers(Memo, 'Memo');

// 카테고리 라우트
app.get('/api/categories', auth, categoryHandlers.getAll);
app.get('/api/categories/:id', auth, categoryHandlers.getOne);
app.post('/api/categories', auth, categoryHandlers.create);
app.put('/api/categories/:id', auth, categoryHandlers.update);

// 카테고리 삭제 라우트 - 관련 항목도 처리해야 함
app.delete('/api/categories/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndDelete({ 
      _id: id, 
      userId: req.userId,
      workspaceId: req.workspaceId
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // 관련된 메모와 보관함 항목의 categoryId를 null로 설정
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Promise.all 대신 순차적 실행
      await Memo.updateMany(
        { categoryId: id, workspaceId: req.workspaceId },
        { $set: { categoryId: null, updatedAt: new Date() } },
        { session }
      );
      
      await BacklogTodo.updateMany(
        { categoryId: id, workspaceId: req.workspaceId },
        { $set: { categoryId: null, updatedAt: new Date() } },
        { session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({ 
        message: 'Category deleted successfully',
        deletedId: id
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    handleApiError(res, error, 'deleting', 'category');
  }
});

// 할 일 라우트
app.get('/api/todos', auth, todoHandlers.getAll);
app.get('/api/todos/:id', auth, todoHandlers.getOne);
app.post('/api/todos', auth, todoHandlers.create);
app.put('/api/todos/:id', auth, todoHandlers.update);
app.delete('/api/todos/:id', auth, todoHandlers.delete);

// 보관함 라우트
app.get('/api/backlog', auth, backlogTodoHandlers.getAll);
app.get('/api/backlog/:id', auth, backlogTodoHandlers.getOne);
app.post('/api/backlog', auth, backlogTodoHandlers.create);
app.put('/api/backlog/:id', auth, backlogTodoHandlers.update);
app.delete('/api/backlog/:id', auth, backlogTodoHandlers.delete);

// 메모 라우트
app.get('/api/memos', auth, memoHandlers.getAll);
app.get('/api/memos/:id', auth, memoHandlers.getOne);
app.post('/api/memos', auth, memoHandlers.create);
app.put('/api/memos/:id', auth, memoHandlers.update);
app.delete('/api/memos/:id', auth, memoHandlers.delete);

// 할 일을 보관함로 이동하는 엔드포인트
app.post('/api/todos/:id/move-to-backlog', auth, async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const todo = await Todo.findOne({ 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId 
      }).session(session);
      
      if (!todo) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Todo not found' });
      }

      // 새로운 보관함 항목 생성
      const newBacklogTodo = new BacklogTodo({
        text: todo.text,
        completed: todo.completed,
        description: todo.description,
        subTodos: todo.subTodos,
        priority: todo.priority,
        userId: req.userId,
        workspaceId: req.workspaceId,
        categoryId: null, // 초기에는 카테고리 없음
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newBacklogTodo.save({ session });
      await Todo.findByIdAndDelete(req.params.id, { session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        message: 'Todo moved to backlog successfully',
        backlogTodo: newBacklogTodo
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    handleApiError(res, error, 'moving todo to backlog', req.params.id);
  }
});

// 보관함를 할 일로 이동하는 엔드포인트
app.post('/api/backlog/:id/move-to-todo', auth, async (req, res) => {
  try {
    const { date } = req.body;
    
    // 날짜 유효성 검증
    if (!date) {
      return res.status(400).json({ message: 'Date is required to move to todo' });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const backlogTodo = await BacklogTodo.findOne({ 
        _id: req.params.id, 
        userId: req.userId,
        workspaceId: req.workspaceId 
      }).session(session);
      
      if (!backlogTodo) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Backlog todo not found' });
      }

      // 새로운 할 일 생성
      const newTodo = new Todo({
        text: backlogTodo.text,
        completed: backlogTodo.completed,
        description: backlogTodo.description,
        subTodos: backlogTodo.subTodos,
        priority: backlogTodo.priority,
        date: new Date(date),
        userId: req.userId,
        workspaceId: req.workspaceId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newTodo.save({ session });
      await BacklogTodo.findByIdAndDelete(req.params.id, { session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        message: 'Backlog item moved to todo successfully',
        todo: newTodo
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    handleApiError(res, error, 'moving backlog to todo', req.params.id);
  }
});

// 사용자 계정 삭제 엔드포인트
app.delete('/api/users/me', auth, async (req, res) => {
  try {
    // 세션 시작 - 트랜잭션으로 모든 작업 수행
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 사용자의 모든 워크스페이스 찾기
      const workspaces = await Workspace.find({ 
        ownerId: req.userId 
      }, null, { session });
      
      // 워크스페이스 ID 목록 추출
      const workspaceIds = workspaces.map(workspace => workspace._id);
      
      // 순차적으로 사용자 관련 데이터 삭제
      // 1. 모든 워크스페이스에 속한 메모, 할 일, 보관함 할 일, 카테고리 삭제
      for (const workspaceId of workspaceIds) {
        await Category.deleteMany({ 
          workspaceId, 
          userId: req.userId 
        }, { session });
        
        await Todo.deleteMany({ 
          workspaceId, 
          userId: req.userId 
        }, { session });
        
        await BacklogTodo.deleteMany({ 
          workspaceId, 
          userId: req.userId 
        }, { session });
        
        await Memo.deleteMany({ 
          workspaceId, 
          userId: req.userId 
        }, { session });
      }
      
      // 2. 사용자의 모든 워크스페이스 삭제
      await Workspace.deleteMany({ 
        ownerId: req.userId 
      }, { session });
      
      // 3. 사용자 계정 삭제
      await User.findByIdAndDelete(req.userId, { session });
      
      // 모든 작업이 성공적으로 완료되면 트랜잭션 커밋
      await session.commitTransaction();
      session.endSession();
      
      res.json({ 
        message: 'User account and all associated data deleted successfully' 
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    handleApiError(res, error, 'deleting', 'user account');
  }
});

// SPA를 위한 catch-all 라우트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    message: config.isProduction 
      ? 'Internal server error' 
      : `Internal server error: ${err.message}`
  });
});

// 프로세스 종료 시그널 처리
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// 서버 시작
app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Server running on port ${config.port} in ${config.environment} mode`);
});

// 예기치 않은 에러 처리
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});