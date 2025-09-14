# ScriptPlayground - JavaScript API Testing App

A Next.js 14 full-stack application for testing JavaScript scripts that make API requests. This app provides a visual dashboard to inspect payloads, simulate API responses, and validate script behavior with a focus on HubSpot and general API automation.

## 🚀 Features

- **Script Editor**: Monaco-based code editor with JavaScript syntax highlighting
- **Predefined Scripts**: 10 curated example scripts including HubSpot automation
- **URL Detection**: Automatically detects URLs and tokens in scripts
- **Mock API System**: Create and manage mock API responses for testing
- **Request Logging**: Track all API requests with detailed inspection
- **Variable Configuration**: Dynamic variable injection with Mock API switching
- **Real-time Execution**: Safe script execution using Node.js VM
- **Dark Theme**: System preference detection with toggle support

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Database**: PostgreSQL with Prisma ORM
- **Script Execution**: Node.js VM module for safe execution
- **HTTP Client**: Fetch API with interceptors
- **State Management**: React hooks and context

## 📋 Predefined Scripts

The application includes 10 ready-to-use scripts:

### General API Scripts
1. **Basic API Test** - Simple GET request example
2. **POST Request** - Form data submission example
3. **Authentication Flow** - Bearer token authentication
4. **Error Handling** - Comprehensive error scenarios
5. **Rate Limiting** - Request throttling and retry logic

### HubSpot Automation Scripts
6. **Contact Operations** - Create, update, and manage HubSpot contacts
7. **Deal Management** - Sales pipeline automation
8. **Company Data** - Company record management
9. **Call Orchestrator** - Communication workflow automation
10. **Analytics Integration** - Data analysis and reporting

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/script-playground.git
cd script-playground
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database connection string:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/script_playground"
```

4. Set up the database:
```bash
npx prisma migrate dev --name init
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 💡 Usage

### Running Scripts

1. Select a predefined script from the dropdown or write your own
2. Configure any detected variables (URLs, API keys, etc.)
3. Toggle between Real API and Mock API modes
4. Click "Run Script" to execute
5. Inspect the request/response data in the results panel

### Mock API Configuration

1. Click "Mock API Config" to open the configuration panel
2. Add custom endpoints with responses
3. Configure status codes, headers, and response bodies
4. Use the Mock API toggle to test against your mocks

### Variable Detection

The app automatically detects:
- URLs and API endpoints
- API keys and tokens
- Configuration parameters
- Environment-specific values

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Main dashboard pages
│   ├── api/                  # API routes
│   │   ├── execute-script/   # Script execution endpoint
│   │   └── mock/             # Mock API system
│   └── globals.css
├── components/
│   ├── ui/                   # Shadcn/ui components
│   ├── dashboard/            # Dashboard-specific components
│   └── layout/               # Layout components
├── lib/
│   ├── example-scripts.ts    # Predefined script repository
│   ├── url-analyzer.ts       # URL and token detection
│   ├── script-runner.ts      # VM-based script execution
│   └── utils.ts              # Utility functions
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript type definitions
└── prisma/                   # Database schema and migrations
```

## 🔧 API Endpoints

- `POST /api/execute-script` - Execute JavaScript code safely
- `GET|POST|PUT|DELETE /api/mock/config` - Manage mock configurations
- `ALL /api/mock/[...path]` - Dynamic mock API endpoints

## 🛡 Security Features

- Safe script execution using Node.js VM sandbox
- Input validation and sanitization
- No file system access for executed scripts
- Environment variable isolation
- Rate limiting on script execution

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

For E2E testing:
```bash
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker

```bash
docker build -t script-playground .
docker run -p 3000:3000 script-playground
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have any questions or need help, please open an issue on GitHub or contact the maintainers.

## 🎯 Roadmap

- [ ] WebSocket integration for real-time updates
- [ ] Script templates and sharing
- [ ] Advanced analytics and reporting
- [ ] Plugin system for custom integrations
- [ ] Collaborative editing features
- [ ] Performance monitoring and optimization

---

Built with ❤️ using Next.js and TypeScript