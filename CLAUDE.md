# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

ReactSpacesMonoRepo - A React-based monorepo for Unity WebGL integration with Firebase backend. Provides micro-frontends for metaverse experiences.

### Tech Stack
- **Frontend**: React, TypeScript
- **Build**: npm workspaces, Vite
- **Backend**: Firebase (Firestore, Functions, Hosting, Auth)
- **Real-time**: Agora RTC (voice/video)
- **3D**: Unity WebGL integration

### Package Structure
```
packages/
├── webgl/           # Unity WebGL loader and messaging
├── website/         # Main website
├── chat/            # Agora-based voice/video chat
├── header-auth-links/ # Auth UI components
├── shared/          # Shared utilities and themes
└── testing/         # Development testing harness
functions/           # Firebase Cloud Functions
```

## Workflows

- Primary workflow: `./.claude/workflows/primary-workflow.md`
- Development rules: `./.claude/workflows/development-rules.md`
- Orchestration: `./.claude/workflows/orchestration-protocol.md`
- Documentation: `./.claude/workflows/documentation-management.md`

**IMPORTANT:** Follow the development rules in `./.claude/workflows/development-rules.md` strictly.

## Available Skills

Activate relevant skills based on task:

| Task | Skill |
|------|-------|
| React/TypeScript code | `frontend-development`, `web-frameworks` |
| UI/UX work | `ui-styling`, `frontend-design` |
| Code review | `code-review`, `github-pr-review` |
| Firebase/backend | `backend-development`, `databases` |
| Unity WebGL messaging | `theone-unity-standards` (C# patterns reference) |
| Debugging | `debugging` |
| Documentation | `docs-seeker` |
| Planning | `planning`, `sequential-thinking` |

## Commands

### Development
```bash
# Install all dependencies
npm install

# Setup (create .env + install)
npm run setup

# Run individual package dev server
cd packages/{package-name} && npm run dev

# Run testing harness (loads all packages)
cd packages/testing && npm run dev
```

### Build & Deploy
```bash
# Full build
npm run build

# Build and deploy to Firebase
npm run deploy

# Deploy Firestore rules only
npm run deploy:rules
```

### Reset
```bash
# Clean reinstall
npm run reset
```

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types - use proper typing
- Prefer functional components with hooks
- Use `const` for immutable values

### React Patterns
- Functional components only
- Custom hooks for shared logic
- Use React Context for state that spans component tree
- Memoize expensive computations with `useMemo`/`useCallback`

### Firebase
- All Firestore access through typed services
- Use transactions for atomic operations
- Follow security rules in `firestore.rules`
- Rate limiting enabled - see `RATE_LIMITING.md`

### Unity WebGL Integration
- Messages to Unity go through `packages/webgl`
- Use `useUnityMessaging` hook for React-Unity communication
- Build files stored in `packages/testing/public/devBuilds/`

## File Conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Types: `types.ts` or `*.types.ts`
- Tests: `*.test.ts` or `*.spec.ts`

## Environment Variables

Copy `.env.example` to `.env` and configure:
- Firebase credentials (optional - fallbacks exist)
- Agora credentials for chat features

## Documentation

Key documentation files:
- [README.md](README.md) - Setup and overview
- [ANALYTICS_QUICK_START.md](ANALYTICS_QUICK_START.md) - Analytics integration
- [FIRESTORE_RULES.md](FIRESTORE_RULES.md) - Security rules explanation
- [RATE_LIMITING.md](RATE_LIMITING.md) - Rate limit configuration

## Agents

Available agents in `./.claude/agents/`:
- `planner` - Implementation planning
- `researcher` - Technical research
- `code-reviewer` - Code quality review
- `tester` - Testing and validation
- `debugger` - Bug investigation
- `docs-manager` - Documentation updates

## Session Initialization

On session start:
1. Check `./ctx` for recent errors/patterns
2. Read this CLAUDE.md
3. Check `.claude/workflows/` for task-specific guidance
4. Verify active plan in `./plans/` if continuing work
