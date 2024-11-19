import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

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

// CORS 설정 업데이트
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 로깅 미들웨어
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

// Signup
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

// Login
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

// Middleware to verify JWT
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Get todos
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

// Add todo
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

// Update todo
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

// Delete todo
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

// Get memos
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

// Add memo
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

// Update memo
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

// Delete memo
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));