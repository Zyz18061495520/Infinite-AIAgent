# Agent Admin

[English](#english) | [中文 (简体)](./README.zh-CN.md)

---

### 📖 Introduction

Agent Admin is a modern, feature-rich admin dashboard for managing AI agents, built with Vue 3, Vite 5, TypeScript, and Naive UI. It provides a comprehensive platform for creating, managing, and deploying intelligent agents with support for multiple agent types, models, tools, and integrations.

### ✨ Features

- 🤖 **Agent Management**: Create and manage agents with support for single agents, workflows, and supervisor patterns
- 🧠 **Model Management**: Configure and manage AI models from multiple providers (DeepSeek, OpenAI, Qwen, Ollama)
- 🛠️ **Tool Management**: Integrate and manage various tools for agent capabilities
- 💾 **Database Management**: Connect and manage database resources
- 📚 **RAG (Retrieval-Augmented Generation)**: Manage knowledge bases and RAG configurations
- ❓ **FAQ Management**: Create and manage frequently asked questions
- 🔌 **MCP (Model Context Protocol)**: Manage MCP integrations
- 👥 **Workspace Management**: Multi-workspace support with member management
- 🏪 **App Store**: Browse and deploy pre-built agent applications
- 🌐 **Internationalization**: Built-in support for English and Chinese
- 🎨 **Modern UI**: Clean and intuitive interface built with Naive UI
- 🌓 **Dark Mode**: Support for light and dark themes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🛠️ Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite 5
- **Language**: TypeScript
- **UI Library**: Naive UI
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **HTTP Client**: Alova
- **Styling**: UnoCSS, SCSS
- **Icons**: Iconify
- **Editor**: Monaco Editor, Markdown Editor, Rich Text Editor
- **Charts**: ECharts
- **Workflow**: Vue Flow
- **Internationalization**: Vue I18n

### 📦 Prerequisites

- Node.js >= 18.x
- pnpm >= 8.x (recommended) or npm/yarn

### 🚀 Quick Start

#### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/agent-admin.git

# Navigate to the project directory
cd agent-admin

# Install dependencies
pnpm install
```

#### Development

```bash
# Start development server
pnpm dev

# The application will be available at http://localhost:9980
```

#### Build

```bash
# Build for production
pnpm build

# Build for development environment
pnpm build:dev

# Preview production build
pnpm preview
```

#### Linting

```bash
# Check for linting errors
pnpm lint

# Fix linting errors automatically
pnpm lint:fix

# Open ESLint config inspector
pnpm lint:check
```

### 📁 Project Structure

```
agent-admin/
├── build/              # Build configuration files
├── dist/               # Production build output
├── docker/             # Docker configuration files
├── locales/            # Internationalization files
│   ├── en_US.json     # English translations
│   └── zh_CN.json     # Chinese translations
├── public/             # Static assets
├── src/
│   ├── assets/        # Images, icons, and other assets
│   ├── components/    # Reusable Vue components
│   ├── constants/     # Application constants
│   ├── directives/    # Vue directives
│   ├── hooks/         # Composition API hooks
│   ├── layouts/       # Layout components
│   ├── modules/       # Module configurations
│   ├── router/        # Vue Router configuration
│   ├── service/       # API services and HTTP client
│   ├── store/         # Pinia stores
│   ├── styles/        # Global styles
│   ├── typings/       # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── views/         # Page components
├── Dockerfile          # Docker configuration
├── Jenkinsfile         # CI/CD pipeline configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── unocss.config.ts    # UnoCSS configuration
└── vite.config.ts      # Vite configuration
```

### 🐳 Docker Deployment

#### Build Docker Image

```bash
docker build -t agent-admin:latest .
```

#### Run Docker Container

```bash
docker run -d \
  --name agent-admin \
  -p 80:80 \
  agent-admin:latest
```

### 🔧 Configuration

#### Environment Variables

Create a `.env` file in the root directory:

```env
# Base URL for the application
VITE_BASE_URL=/

# Route mode: 'hash' or 'history'
VITE_ROUTE_MODE=hash

# API base URL
VITE_API_BASE_URL=http://localhost:8080/api
```

#### Service Configuration

Edit `service.config.ts` to configure API endpoints and other service settings.

### 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm dev:prod` - Start development server in production mode
- `pnpm build` - Build for production
- `pnpm build:dev` - Build for development environment
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint and TypeScript type checking
- `pnpm lint:fix` - Fix linting errors automatically
- `pnpm lint:check` - Open ESLint config inspector
- `pnpm sizecheck` - Analyze bundle size

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
