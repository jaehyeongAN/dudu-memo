// 기존 signup 라우트를 수정
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
      { name: '업무', color: '#3B82F6', userId: user._id },
      { name: '개인', color: '#10B981', userId: user._id },
      { name: '아이디어', color: '#8B5CF6', userId: user._id }
    ];
    const categories = await Category.insertMany(sampleCategories);

    // 샘플 메모 생성
    const sampleMemos = [
      {
        userId: user._id,
        title: '두두메모 사용법',
        content: '1. 할 일 탭: 캘린더를 통해 날짜별로 할 일을 관리할 수 있습니다.\n2. 백로그 탭: 날짜에 구애받지 않고 자유롭게 할 일을 관리할 수 있습니다.\n3. 메모 탭: 카테고리별로 메모를 작성하고 관리할 수 있습니다.',
        categoryId: categories[0]._id,
        lastEdited: new Date()
      },
      {
        userId: user._id,
        title: '메모 작성 팁',
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
          { text: '할 일 탭 살펴보기', completed: false },
          { text: '백로그 탭 살펴보기', completed: false },
          { text: '메모 탭 살펴보기', completed: false }
        ]
      },
      {
        userId: user._id,
        text: '오늘의 첫 할 일 등록하기',
        completed: false,
        date: today,
        description: '나만의 첫 할 일을 등록해보세요!',
        priority: 'medium',
        subTodos: []
      }
    ];
    await Todo.insertMany(sampleTodos);

    // 샘플 백로그 생성
    const sampleBacklogs = [
      {
        userId: user._id,
        text: '백로그 활용하기',
        completed: false,
        description: '언제든 해야 할 일들을 백로그에 등록해보세요.',
        priority: 'medium',
        subTodos: [
          { text: '우선순위 지정해보기', completed: false },
          { text: '하위 할 일 추가해보기', completed: false }
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