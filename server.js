// ... (기존 코드 유지)

// BacklogTodo Schema 추가
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

// Backlog API Routes
app.get('/api/backlog', auth, async (req, res) => {
  try {
    const todos = await BacklogTodo.find({ userId: req.userId });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching backlog todos', error: error.message });
  }
});

app.post('/api/backlog', auth, async (req, res) => {
  try {
    const todo = new BacklogTodo({ ...req.body, userId: req.userId });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
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
    res.status(500).json({ message: 'Error deleting backlog todo', error: error.message });
  }
});

// ... (기존 코드 유지)