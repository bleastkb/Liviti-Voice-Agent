# Voice AI Coach MVP

一个专注于帮助过载专业人士在晚上释放工作压力的语音AI教练应用。

## 项目结构

```
voice-ai-coach/
├── components/          # React组件
│   ├── SafetyBanner.tsx      # 安全横幅组件
│   ├── MicButton.tsx         # 麦克风按钮组件
│   ├── MessageList.tsx       # 消息列表组件
│   ├── MessageBubble.tsx     # 消息气泡组件
│   └── MicroActionCard.tsx   # 微行动卡片组件
├── pages/              # Next.js页面
│   ├── _app.tsx             # 应用入口
│   ├── index.tsx            # 首页/欢迎页
│   ├── session.tsx           # 会话页面
│   └── summary.tsx          # 摘要/检查页面
├── lib/                # 工具库
│   └── api.ts               # API占位函数（STT、LLM、安全检测）
├── types/              # TypeScript类型定义
│   └── index.ts
├── styles/             # 样式文件
│   └── globals.css
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 功能特性

### 核心行为
- ✅ 让用户通过语音安全地发泄
- ✅ 验证情绪（命名1-2种感受并正常化）
- ✅ 问1-2个温和的反思性问题
- ✅ 建议1-2个微小、现实的微行动
- ✅ 会话结束时的简短摘要和情绪检查
- ✅ 高风险内容检测和安全响应

### 页面
1. **Home/Welcome** (`/`) - 欢迎页面，包含说明和"开始会话"按钮
2. **Session** (`/session`) - 会话页面，包含麦克风按钮和聊天界面
3. **Summary** (`/summary`) - 摘要页面，包含对话回顾和情绪检查按钮

### 组件
- `SafetyBanner` - 当检测到高风险内容时显示的安全横幅
- `MicButton` - 大型麦克风按钮，用于开始/停止录音
- `MessageList` - 显示消息列表和微行动卡片
- `MessageBubble` - 单条消息的气泡显示
- `MicroActionCard` - 微行动建议卡片

## 技术栈

- **框架**: Next.js 15.3.4
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **React**: 19.0.0

## 开发

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 待集成功能

以下功能目前使用占位实现，需要在后续步骤中集成真实API：

1. **语音转文字 (STT)**
   - 文件: `lib/api.ts` → `transcribeAudio()`
   - 建议: 集成 Whisper API 或其他STT服务

2. **LLM响应**
   - 文件: `lib/api.ts` → `getAIResponse()`
   - 建议: 集成 OpenAI、Claude 或其他LLM服务
   - 需要配置系统提示词以实现核心行为

3. **安全检测**
   - 文件: `lib/api.ts` → `checkSafetyLevel()` 和 `detectSafetyLevel()`
   - 建议: 使用LLM的安全检测功能或专门的安全分类器

## 设计理念

- **简洁**: UI设计简洁、平静、易读
- **安全**: 内置安全检测和危机响应机制
- **用户友好**: 清晰的交互流程和反馈
- **可扩展**: 代码结构清晰，便于后续集成真实API

## 注意事项

⚠️ **这不是专业的心理治疗服务，也不适用于紧急情况。**

如果用户正在经历心理健康危机，应用会显示安全横幅，建议联系专业人士或紧急服务。

