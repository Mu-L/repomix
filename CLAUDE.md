# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Repomix Development Guide

Repomix is a tool that packs repository contents into single files optimized for AI consumption. It converts codebases into structured formats (XML, Markdown, Plain Text) with intelligent compression, security scanning, and token counting for LLM integration.

## Build & Development Commands
- `npm run build` - Build the project
- `npm run lint` - Run all linters (Biome, TypeScript, secretlint)
- `npm run lint-biome` - Run Biome linter with auto-fix
- `npm run lint-ts` - Run TypeScript type checking
- `npm test` - Run all tests
- `npm test -- /path/to/file.test.ts` - Run a specific test file
- `npm test -- -t "test name"` - Run tests matching description
- `npm run test-coverage` - Run tests with coverage report
- `npm run repomix` - Build and run the CLI tool
- `npm run repomix-src` - Pack only src and tests directories
- `npm run repomix-website` - Pack only website directory
- `npm run website` - Start local website development environment
- `npm run website-generate-schema` - Generate JSON schema for configuration

## Core Architecture

### File Processing Pipeline (`src/core/file/`)
- **fileCollect.ts**: Parallel file reading with worker threads for performance
- **fileProcess.ts**: Content transformation including comment removal and formatting
- **fileSearch.ts**: Glob pattern-based file discovery with gitignore integration
- **filePathSort.ts**: Git-aware file ordering by change frequency for optimal AI context

### Security & Validation (`src/core/security/`)
- **securityCheck.ts**: Multi-threaded Secretlint integration for sensitive data detection
- **validateFileSafety.ts**: Pre-processing file safety validation
- Uses worker threads for concurrent security scanning to prevent blocking

### Output Generation (`src/core/output/`)
- **outputGenerate.ts**: Multi-format support (XML default, Markdown, Plain Text)
- **outputStyles/**: Format-specific templates with Handlebars templating
- **outputStyleDecorate.ts**: Content decoration with line numbers and headers

### Tree-Sitter Integration (`src/core/treeSitter/`)
- **languageParser.ts**: 15+ language support for intelligent code parsing
- **parseStrategies/**: Language-specific parsing strategies for optimal compression
- Achieves ~70% token reduction while preserving semantic meaning

### CLI Architecture (`src/cli/`)
- **cliRun.ts**: Main CLI orchestrator using Commander.js
- **actions/**: Modular command handlers (default, remote, init, mcp, version)
- **defaultAction.ts**: Standard local repository processing workflow
- **remoteAction.ts**: GitHub URL/shorthand processing with branch/commit resolution

### MCP Server (`src/mcp/`)
- **mcpServer.ts**: Model Context Protocol server for AI assistant integration
- **tools/**: File system access, repository packing, and content search capabilities
- Provides sandboxed AI-to-codebase interaction layer

## Code Style Guidelines
- **Formatting**: 2 spaces indentation, 120 char line width, single quotes, trailing commas
- **Imports**: Use `node:` prefix for built-ins, `.js` extension for relative imports, `import type` for types
- **TypeScript**: Strict type checking, explicit return types, prefer interfaces for object types
- **Error Handling**: Custom errors extend `RepomixError`, descriptive messages, proper try/catch
- **Dependencies**: Inject dependencies through deps object parameter for testability
- **File Structure**: Keep files under 250 lines, organize by feature, use workers for concurrent operations
- **Testing**: Use Vitest, mock dependencies, descriptive test names, arrange/act/assert pattern

## Naming Conventions
- PascalCase: Classes, interfaces, types
- camelCase: Variables, functions, methods, file names
- Test files: `[filename].test.ts`

## Key Design Patterns

### Worker Thread Architecture
- CPU-intensive operations (file processing, security checks, metrics) use Piscina worker pools
- **Workers**: `src/core/file/workers/`, `src/core/security/workers/`, `src/core/metrics/workers/`
- Enables concurrent processing while keeping main thread responsive

### Dependency Injection
- Functions accept `deps` object parameter containing dependencies for testability
- Example: `fileCollect(paths, options, deps = { readFile, processFile })`
- Enables easy mocking in tests and flexible runtime configuration

### Configuration System
- **configSchema.ts**: Zod-based type-safe configuration with runtime validation
- **configLoad.ts**: Hierarchical config merging (global → project → CLI options)
- Supports JSON5 format for comments in configuration files

### Error Handling
- All custom errors extend `RepomixError` base class in `src/shared/errorHandle.ts`
- Structured error types with context information for debugging
- Proper error propagation through async/worker boundaries

## Git Workflow
- Follow [Conventional Commits](https://www.conventionalcommits.org/) with scope: `type(scope): Description`
- Write detailed commit messages focusing on the "why" rather than the "what"
- Run `npm run lint && npm test` before committing changes
- Examples: `feat(cli): Add new --no-progress flag`, `fix(security): Handle special characters in file paths`
