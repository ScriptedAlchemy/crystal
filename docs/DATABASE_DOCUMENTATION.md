# Crystal Database Documentation

This document provides a comprehensive overview of all SQLite database tables and local storage mechanisms used in the Crystal application.

## Overview

Crystal uses a SQLite database located at `~/.crystal/sessions.db` for persistent data storage. The database is managed using Better-SQLite3 for synchronous operations and includes a migration system for schema evolution.

## Database Tables

### 1. `projects` Table

Stores project configurations and metadata.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique project identifier | PRIMARY KEY AUTOINCREMENT |
| `name` | TEXT | Project display name | NOT NULL |
| `path` | TEXT | Absolute path to project directory | NOT NULL UNIQUE |
| `system_prompt` | TEXT | Project-specific system prompt | Optional |
| `run_script` | TEXT | Script command for testing (deprecated) | Optional |
| `build_script` | TEXT | Script command for building | Optional |
| `active` | BOOLEAN | Whether this is the active project | DEFAULT 0 |
| `created_at` | DATETIME | Project creation timestamp | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | Last update timestamp | DEFAULT CURRENT_TIMESTAMP |
| `default_permission_mode` | TEXT | Default permission mode for sessions | 'approve' or 'ignore' (default 'ignore') |
| `open_ide_command` | TEXT | Command to open IDE for this project | Optional |
| `display_order` | INTEGER | Order for UI display | Optional |
| `main_branch` | TEXT | Main branch name (deprecated, no longer used) | Optional |
| `worktree_folder` | TEXT | Base folder for worktrees | Optional |
| `lastUsedModel` | TEXT | Last used AI model | Default 'claude-sonnet-4-20250514' |
| `commit_mode` | TEXT | Git commit mode | 'structured', 'checkpoint', or 'disabled' (default 'checkpoint') |
| `commit_structured_prompt_template` | TEXT | Template for structured commits | Optional |
| `commit_checkpoint_prefix` | TEXT | Prefix for checkpoint commits | Default 'checkpoint: ' |

**Purpose**: Manages multiple project directories, allowing users to switch between different codebases. Only one project can be active at a time.

### 2. `project_run_commands` Table

Stores multiple run commands per project, replacing the deprecated `run_script` column.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique command identifier | PRIMARY KEY AUTOINCREMENT |
| `project_id` | INTEGER | Associated project | FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE |
| `command` | TEXT | Command to execute | NOT NULL |
| `display_name` | TEXT | Display name for the command | Optional |
| `order_index` | INTEGER | Order for UI display | DEFAULT 0 |
| `created_at` | DATETIME | Command creation timestamp | DEFAULT CURRENT_TIMESTAMP |

**Purpose**: Allows projects to have multiple run commands with custom names and ordering.

### 3. `folders` Table

Organizes sessions into hierarchical folders within projects.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Unique folder identifier (UUID) | PRIMARY KEY |
| `name` | TEXT | Folder display name | NOT NULL |
| `project_id` | INTEGER | Associated project | FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE |
| `parent_folder_id` | TEXT | Parent folder for nesting | REFERENCES folders(id) ON DELETE CASCADE |
| `display_order` | INTEGER | Order for UI display | DEFAULT 0 |
| `created_at` | DATETIME | Folder creation timestamp | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | Last update timestamp | DEFAULT CURRENT_TIMESTAMP |

Indexes:
- `idx_folders_project_id`
- `idx_folders_display_order` on (`project_id`, `display_order`)
- `idx_folders_parent_id`

**Purpose**: Provides hierarchical organization of sessions within projects, supporting nested folder structures.

### 4. `sessions` Table

Core session metadata for Claude Code instances.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | TEXT | Unique session identifier (UUID) | PRIMARY KEY |
| `name` | TEXT | Session display name | NOT NULL |
| `initial_prompt` | TEXT | Initial user prompt | NOT NULL |
| `worktree_name` | TEXT | Git worktree branch name | NOT NULL |
| `worktree_path` | TEXT | Absolute path to git worktree | NOT NULL |
| `status` | TEXT | Session state | NOT NULL DEFAULT 'pending' |
| `created_at` | DATETIME | Session creation timestamp | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | Last update timestamp | DEFAULT CURRENT_TIMESTAMP |
| `last_output` | TEXT | Last terminal output | Optional |
| `exit_code` | INTEGER | Process exit code | Optional |
| `pid` | INTEGER | Process ID when running | Optional |
| `claude_session_id` | TEXT | Claude API session identifier | Optional |
| `archived` | BOOLEAN | Whether session is archived | DEFAULT 0 |
| `last_viewed_at` | DATETIME | Last time session was viewed | Optional |
| `project_id` | INTEGER | Associated project | FOREIGN KEY REFERENCES projects(id) ON DELETE CASCADE |
| `folder_id` | TEXT | Associated folder | REFERENCES folders(id) ON DELETE SET NULL |
| `permission_mode` | TEXT | Permission handling mode | 'approve' or 'ignore' (default 'ignore') |
| `run_started_at` | DATETIME | When execution started | Optional |
| `is_main_repo` | BOOLEAN | Whether this is the main repository session | DEFAULT 0 |
| `display_order` | INTEGER | Order for UI display | Optional |
| `is_favorite` | BOOLEAN | Whether session is favorited | DEFAULT 0 |
| `auto_commit` | BOOLEAN | Whether to auto-commit changes (deprecated) | DEFAULT 1 |
| `model` | TEXT | AI model used for session | Default 'claude-sonnet-4-20250514' |
| `base_commit` | TEXT | Base commit for session | Optional |
| `base_branch` | TEXT | Base branch for session | Optional |
| `commit_mode` | TEXT | Git commit mode | 'structured', 'checkpoint', or 'disabled' |
| `commit_mode_settings` | TEXT | JSON settings for commit mode | Optional |
| `skip_continue_next` | BOOLEAN | Skip auto-continue to next session | DEFAULT 0 |

Indexes:
- `idx_sessions_archived`
- `idx_sessions_project_id`
- `idx_sessions_is_main_repo` on (`is_main_repo`, `project_id`)
- `idx_sessions_display_order` on (`project_id`, `display_order`)
- `idx_sessions_folder_id`

**Status Values**:
- `pending` - Session created but not started
- `running` - Claude is actively processing
- `stopped` - Session was manually stopped
- `completed` - Task finished successfully
- `failed` - Something went wrong

**Purpose**: Tracks all Claude Code sessions, their states, and metadata for session management and recovery.

### 3. `session_outputs` Table

Stores terminal output history for each session.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique output identifier | PRIMARY KEY AUTOINCREMENT |
| `session_id` | INTEGER | Associated session | FOREIGN KEY REFERENCES sessions(id) |
| `type` | TEXT | Output type | NOT NULL |
| `data` | TEXT | Output content | NOT NULL |
| `timestamp` | DATETIME | When output was generated | DEFAULT CURRENT_TIMESTAMP |

Indexes:
- `idx_session_outputs_session_id`
- `idx_session_outputs_timestamp`

**Type Values**:
- `stdout` - Standard output text
- `stderr` - Error output text
- `json` - JSON messages from Claude
- `system` - System messages

**Purpose**: Maintains complete history of all session outputs for replay and debugging. Raw JSON messages are stored as-is, with formatting done on-the-fly during retrieval.

### 4. `conversation_messages` Table

Stores conversation history for session continuation.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique message identifier | PRIMARY KEY AUTOINCREMENT |
| `session_id` | INTEGER | Associated session | FOREIGN KEY REFERENCES sessions(id) |
| `message_type` | TEXT | Message sender/type | NOT NULL |
| `content` | TEXT | Message content | NOT NULL |
| `timestamp` | DATETIME | Message timestamp | DEFAULT CURRENT_TIMESTAMP |

Indexes:
- `idx_conversation_messages_session_id`
- `idx_conversation_messages_timestamp`

**Role/Type Values**:
- `user` - User input messages
- `assistant` - Claude's responses
- `system` - System prompts

**Purpose**: Enables conversation continuation by preserving the full message history context when resuming a session.

### 5. `execution_diffs` Table

Tracks git diffs for each execution round.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique diff identifier | PRIMARY KEY AUTOINCREMENT |
| `session_id` | TEXT | Associated session | FOREIGN KEY REFERENCES sessions(id) |
| `prompt_marker_id` | INTEGER | Linked prompt marker | REFERENCES prompt_markers(id) ON DELETE SET NULL |
| `execution_sequence` | INTEGER | Sequence number for execution ordering | NOT NULL |
| `git_diff` | TEXT | Git diff output | Optional |
| `files_changed` | TEXT | JSON array of changed files | Optional |
| `stats_additions` | INTEGER | Number of lines added | DEFAULT 0 |
| `stats_deletions` | INTEGER | Number of lines deleted | DEFAULT 0 |
| `stats_files_changed` | INTEGER | Number of files changed | DEFAULT 0 |
| `before_commit_hash` | TEXT | Git commit hash before changes | Optional |
| `after_commit_hash` | TEXT | Git commit hash after changes | Optional |
| `commit_message` | TEXT | Commit message for this diff (if any) | Optional |
| `timestamp` | DATETIME | When diff was captured | DEFAULT CURRENT_TIMESTAMP |

Indexes:
- `idx_execution_diffs_session_id`
- `idx_execution_diffs_prompt_marker_id`
- `idx_execution_diffs_timestamp`
- `idx_execution_diffs_sequence` on (`session_id`, `execution_sequence`)

**Purpose**: Maintains a history of code changes per execution round, allowing users to see what changed at each step of the session with detailed statistics and commit tracking.

### 6. `prompt_markers` Table

Navigation markers for prompts within session output.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | INTEGER | Unique marker identifier | PRIMARY KEY AUTOINCREMENT |
| `session_id` | INTEGER | Associated session | FOREIGN KEY REFERENCES sessions(id) |
| `prompt_text` | TEXT | The prompt content | NOT NULL |
| `output_index` | INTEGER | Position in session_outputs | NOT NULL |
| `output_line` | INTEGER | Line number within the output chunk | Optional |
| `timestamp` | DATETIME | When prompt was sent | DEFAULT CURRENT_TIMESTAMP |
| `completion_timestamp` | DATETIME | When prompt finished processing | Optional |

Indexes:
- `idx_prompt_markers_session_id`
- `idx_prompt_markers_timestamp`

**Purpose**: Enables quick navigation to specific prompts within long session outputs and tracks execution duration.

### 7. `migrations` Table

Tracks applied database migrations.

Note: The application uses automated idempotent checks and applies schema changes on startup. A dedicated `migrations` table is not used; instead, PRAGMA checks and ALTER/CREATE statements ensure the schema matches expected state across versions.

## Database Indexes

The database includes several indexes for performance optimization:

- Sessions: `idx_sessions_archived`, `idx_sessions_project_id`, `idx_sessions_is_main_repo` (is_main_repo, project_id), `idx_sessions_display_order` (project_id, display_order), `idx_sessions_folder_id`
- Session Outputs: `idx_session_outputs_session_id`, `idx_session_outputs_timestamp`
- Conversation Messages: `idx_conversation_messages_session_id`, `idx_conversation_messages_timestamp`
- Execution Diffs: `idx_execution_diffs_session_id`, `idx_execution_diffs_prompt_marker_id`, `idx_execution_diffs_timestamp`, `idx_execution_diffs_sequence`
- Prompt Markers: `idx_prompt_markers_session_id`, `idx_prompt_markers_timestamp`
- Projects: `idx_projects_display_order`
- Project Run Commands: `idx_project_run_commands_project_id`
- UI State: `idx_ui_state_key`
- App Opens: `idx_app_opens_opened_at`
- User Preferences: `idx_user_preferences_key`

## Local Storage (Non-Database)

### 1. Electron Store

Location: Platform-specific (handled by electron-store)
- macOS: `~/Library/Application Support/Crystal/config.json`
- Windows: `%APPDATA%/Crystal/config.json`
- Linux: `~/.config/Crystal/config.json`

**Stored Data**:
```json
{
  "verboseLogging": boolean,
  "anthropicApiKey": "string (encrypted)",
  "globalSystemPrompt": "string",
  "claudeExecutablePath": "string",
  "notifications": {
    "enabled": boolean,
    "sound": boolean,
    "statusChanges": boolean,
    "waiting": boolean,
    "completion": boolean,
    "errors": boolean
  }
}
```

### 2. Application Directory

Location: `~/.crystal/`

**Contents**:
- `sessions.db` - Main SQLite database
- `config.json` - App-level configuration managed by ConfigManager
- `logs/` - Rotating log files for main process
- `artifacts/<sessionId>/` - Session artifacts (e.g., images)
- `sockets/` - IPC socket files for permission server
- Automatically created on first application run

### 3. Git Worktrees

Location: `<project_path>/.git/worktrees/`

**Structure**:
- Each session creates a worktree named after its branch
- Worktrees are cleaned up when sessions are deleted
- Contains isolated git working directory for each Claude session

## Data Flow and Relationships

```
projects (1) ─────┬──── (∞) sessions
                  │           │
                  │           ├──── (∞) session_outputs
                  │           ├──── (∞) conversation_messages
                  │           ├──── (∞) execution_diffs
                  │           └──── (∞) prompt_markers
                  │
                  └──── git worktrees (file system)
```

## Important Implementation Notes

1. **Timestamp Handling**: All timestamps are stored in UTC format. The frontend utilities handle proper timezone conversion for display.

2. **Transaction Safety**: Database operations use transactions where appropriate to maintain data integrity.

3. **Cascade Deletion**: When a project is deleted, all associated sessions and their related data are automatically removed through foreign key constraints.

4. **Archive vs Delete**: Sessions are typically archived (`archived = 1`) rather than deleted to preserve history. True deletion only occurs when explicitly requested.

5. **Performance Considerations**: 
   - Session outputs can grow large; pagination may be needed for very long sessions
   - Indexes are crucial for responsive UI with many sessions
   - The `formatted_data` column in session_outputs is used sparingly to balance storage vs computation

## Migration System

The application uses a simple migration system located in `main/src/database/migrations/`. Each migration is a SQL file numbered sequentially (e.g., `001_initial_schema.sql`, `002_add_prompt_markers.sql`).

Migrations are applied automatically on application startup if the database version is behind the latest migration.

## Backup Recommendations

Users should periodically backup:
1. `~/.crystal/crystal.db` - Contains all session data
2. The Electron Store config file - Contains application settings
3. Project directories - Contains the actual code and git history

## Security Considerations

1. **API Keys**: The Anthropic API key is stored in the Electron Store with platform-specific encryption
2. **File Paths**: All file paths are stored as absolute paths; care should be taken when sharing databases
3. **Sensitive Data**: Session outputs may contain sensitive information and should be treated accordingly