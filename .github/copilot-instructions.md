# GitHub Copilot Instructions - JavaScript API Testing App

## Project Overview
Building a Next.js 14 full-stack application for testing JavaScript scripts that make API requests. The app provides a visual dashboard to inspect payloads, simulate API responses, and validate script behavior.

## Tech Stack
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui or Material-UI
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **State Management**: Zustand or React Context
- **HTTP Client**: Axios with interceptors
- **Script Execution**: VM2 for safe JavaScript execution
- **Data Fetching**: TanStack Query or SWR
- **JSON Display**: React JSON View
- **Forms**: React Hook Form with Zod validation

## Key Features to Implement

### 1. Dashboard Layout
- Split-panel layout with resizable sections
- Script editor on the left
- Request/response inspector on the right
- Bottom panel for test results and logs
- Sidebar for mock configuration

### 2. Core Components Needed
```typescript
// Components to create:
- ScriptEditor: Monaco editor with JavaScript syntax highlighting
- PayloadViewer: JSON formatter for request/response data
- MockConfigPanel: Form to configure mock API responses
- RequestLogger: Table/list of all API requests made
- TestResults: Display script execution results and errors
- ResponseSimulator: UI to create custom API responses
```

### 3. API Routes Structure
```typescript
// API endpoints to create:
/api/execute-script - POST: Execute JavaScript code safely
/api/mock/[...slug] - ALL: Dynamic mock API endpoints
/api/requests - GET/POST: Log and retrieve request history
/api/config - GET/POST/PUT/DELETE: Manage mock configurations
/api/validate - POST: Validate script syntax before execution
```

### 4. Data Models
```typescript
// TypeScript interfaces needed:
interface TestScript {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockConfig {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
}

interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  timestamp: Date;
  duration: number;
}
```

## Development Guidelines

### File Naming Conventions
- Use kebab-case for files and folders
- Components: PascalCase (e.g., `ScriptEditor.tsx`)
- API routes: lowercase with hyphens (e.g., `execute-script`)
- Utilities: camelCase (e.g., `scriptRunner.ts`)

### Code Style Preferences
- Use arrow functions for components
- Prefer const over let/var
- Use destructuring for props and imports
- Implement proper error handling with try/catch
- Add TypeScript types for all functions and components
- Use async/await instead of Promises.then()

### UI/UX Requirements
- Dark theme support with system preference detection
- Responsive design (mobile-friendly)
- Keyboard shortcuts for common actions (Ctrl+R for run script)
- Auto-save functionality for scripts
- Syntax highlighting and error detection in editor
- Real-time request monitoring
- Collapsible/expandable panels
- Loading states and error boundaries

### Security Considerations
- Sanitize and validate all user input
- Use VM2 for safe script execution (no access to file system)
- Implement rate limiting on script execution
- Validate JSON payloads before processing
- Use CSRF protection for API routes

### Performance Optimizations
- Lazy load Monaco Editor
- Implement virtual scrolling for large request logs
- Debounce script validation
- Cache mock configurations
- Use React.memo for expensive components

## Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── execute-script/
│   │   ├── mock/
│   │   ├── requests/
│   │   └── config/
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── editor/
│   ├── panels/
│   └── layout/
├── lib/
│   ├── script-runner.ts
│   ├── mock-manager.ts
│   ├── request-logger.ts
│   └── utils.ts
├── hooks/
│   ├── use-script-execution.ts
│   ├── use-mock-config.ts
│   └── use-request-logs.ts
├── types/
│   └── index.ts
└── store/
    └── app-store.ts
```

## Common Code Patterns

### Error Handling
```typescript
// Use this pattern for API routes
try {
  const result = await executeScript(code);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error('Script execution failed:', error);
  return NextResponse.json(
    { success: false, error: error.message },
    { status: 500 }
  );
}
```

### React Component Structure
```typescript
// Follow this component pattern
interface ComponentProps {
  // Define props here
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  // Hooks first
  // State management
  // Event handlers
  // Effects
  
  return (
    // JSX here
  );
};
```

## Priority Implementation Order
1. Basic Next.js setup with TypeScript and Tailwind
2. Monaco Editor integration and basic script editor
3. Script execution API with VM2
4. Request logging and display
5. Mock API configuration system
6. Payload inspection and JSON viewer
7. Dashboard layout with resizable panels
8. Real-time updates and WebSocket integration
9. Script persistence and management
10. Advanced features (themes, shortcuts, etc.)

## Testing Strategy
- Unit tests for utility functions
- API route testing with Jest
- Component testing with React Testing Library
- E2E testing with Playwright for critical flows
- Mock different API scenarios for robust testing