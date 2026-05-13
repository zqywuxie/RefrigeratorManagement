// Shared selectors for BioFridge E2E tests.
// Prefer text-based selectors since the app uses inline styles / Tailwind heavily.

export const SEL = {
  // Login page
  login: {
    usernameInput: 'input:not([type="password"])',
    passwordInput: 'input[type="password"]',
    loginBtn: 'button:has-text("登录"):not(:has-text("注册"))',
    registerTab: 'button:has-text("注册")',
    errorMsg: '[role="alert"]',
  },

  // Header / chrome
  header: {
    title: 'text=冰箱管理系统',
    fridgeSelectorBtn: 'button:has-text("选择冰箱")',
    globalAdminBtn: 'button:has-text("全局管理")',
    returnFridgeBtn: 'button:has-text("返回冰箱")',
    themeToggle: 'button[title*="切换"]',
    userMenuBtn: 'header button:has-text("root")',
    logoutBtn: 'button[title="退出登录"]',
    addUserBtn: 'button[title="创建用户"]',
  },

  // Fridge display
  fridge: {
    body: 'text=Refrigerator Management',
    upperTab: 'button:has-text("上层 / Upper")',
    lowerTab: 'button:has-text("下层 / Lower")',
    statusLED: 'text=/OK|WARN|ALERT/',
  },

  // Sample cards & slots
  sample: {
    card: (id: string) => `text=${id}`,
    detailPanel: 'text=样本详情',
    deleteBtn: 'button:has-text("删除样本")',
    editBtn: 'button[title="编辑"]',
    statusNormal: 'button:has-text("正常")',
    addSampleBtn: 'button:has-text("添加新样本")',
    addSubSampleBtn: 'button:has-text("添加副样本")',
  },

  // Modal (AddSampleModal)
  modal: {
    title: 'text=添加新样本',
    titleEdit: 'text=编辑样本',
    typeSelect: 'select',
    patientId: 'input[placeholder*="P-20"]',
    uploader: 'input[placeholder*="检验科"]',
    volume: 'input[placeholder*="例"]',
    tags: 'input[placeholder*="紧急"]',
    note: 'textarea[placeholder*="备注"]',
    submitBtn: 'button:has-text("确认添加")',
    cancelBtn: 'button:has-text("取消")',
  },

  // Container sub-view
  container: {
    breadcrumb: 'text=冰箱',
    backBtn: 'button:has(svg)',
  },

  // Admin panel
  admin: {
    summarySection: 'text=全局管理',
    userTable: 'table',
    sampleList: 'text=样本列表',
    refreshBtn: 'button:has-text("刷新")',
    createUserBtn: 'button:has-text("创建用户")',
  },

  // Search
  search: {
    input: 'input[placeholder*="搜索样本"]',
    resultCount: 'text=/\\d+ 个匹配/',
    clearBtn: 'button:has-text("×")',
  },

  // Stats
  stats: {
    totalCapacity: 'text=总容量',
    upperComp: 'text=上层',
    lowerComp: 'text=下层',
    abnormalAlert: 'text=异常警报',
    tagStats: 'text=标签统计',
  },
};
