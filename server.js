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

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error:', error));

// API 라우트 설정
app.use('/api', (req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  birthdate: Date,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', UserSchema);

// Memo Schema
const MemoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  content: String,
  lastEdited: { type: Date, default: Date.now },
});

const Memo = mongoose.model('Memo', MemoSchema);

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
});

const Todo = mongoose.model('Todo', TodoSchema);

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

app.get('/api/todos', auth, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.userId });
    logger.info(`Fetched todos for user: ${req.userId}`);
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
    logger.info(`New todo added for user: ${req.userId}`);
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
      logger.warn(`Todo not found for update: ${req.params.id}`);
      return res.status(404).json({ message: 'Todo not found' });
    }
    logger.info(`Todo updated: ${req.params.id}`);
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
      logger.warn(`Todo not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: 'Todo not found' });
    }
    logger.info(`Todo deleted: ${req.params.id}`);
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Error deleting todo', error: error.message });
  }
});

app.get('/api/memos', auth, async (req, res) => {
  try {
    const memos = await Memo.find({ userId: req.userId });
    logger.info(`Fetched memos for user: ${req.userId}`);
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
    logger.info(`New memo added for user: ${req.userId}`);
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
      logger.warn(`Memo not found for update: ${req.params.id}`);
      return res.status(404).json({ message: 'Memo not found' });
    }
    logger.info(`Memo updated: ${req.params.id}`);
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
      logger.warn(`Memo not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: 'Memo not found' });
    }
    logger.info(`Memo deleted: ${req.params.id}`);
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