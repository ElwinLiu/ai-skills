# AI Skills Extension

Manage your AI Skills for Claude Code. Configure your skills folders, create new SKILL.md files, and manage your skills with a beautiful UI.

## Features

- **Create Custom Skills**: Define your own AI skills with custom instructions following the official [Claude Skills specification](https://code.claude.com/docs/en/skills)
- **Smart Skill Selection**: AI automatically chooses the right skill based on your conversation using semantic routing
- **Manage Skills**: View, create, edit, and delete skills through a beautiful UI
- **Multiple Skills Folders**: Organize skills across multiple folders (personal, project-specific, etc.)
- **Semantic Routing**: Uses fast AI models to intelligently select the most relevant skill for your request
- **Enable/Disable Skills**: Toggle skills on/off to control which ones are available in AI Chat

## Installation

1. Open the terminal and navigate to the extension directory:

   ```bash
   cd ai-skills
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

### Via AI Chat (Recommended)

1. Open Raycast and start AI Chat (press `Cmd + I` or type "AI Chat")
2. Type `@ai-skills` followed by your request
3. Examples:
   - `@ai-skills List all my skills`
   - `@ai-skills Create a skill that summarizes text`
   - `@ai-skills Edit the summarizer skill`
   - `@ai-skills Delete the test-skill`
   - `@ai-skills Add ~/custom-skills as a skills folder`

### Via Manage Skills Command

1. Open Raycast root search
2. Type "Manage Skills"
3. View all your skills in a list
4. Press `Cmd + N` to create a new skill
5. Click on a skill to view details, edit it, or delete it
6. Use `Cmd + T` to enable/disable skills

## Understanding AI Skills

### What are AI Skills?

AI Skills are markdown files (`SKILL.md`) that teach AI how to do specific tasks. Each skill is a directory containing a `SKILL.md` file with YAML frontmatter.

### Skill Structure

```
my-skill/
└── SKILL.md
```

**SKILL.md format:**

```yaml
---
name: my-skill
description: Summarizes long text into key points
---
# My Skill

## Instructions

Provide clear instructions for Claude...
```

### Skill Fields

- **name** (required): Skill identifier (lowercase, numbers, hyphens only, max 64 chars)
- **description** (required): What the skill does and when to use it (max 1024 chars)
- **content** (required): The markdown instructions that follow the frontmatter

## Creating Skills

### Via AI Chat

```
@ai-skills Create a skill called summarizer that summarizes long text into key points
```

The AI will ask for:

- **Name**: The skill identifier (lowercase with hyphens)
- **Description**: Clear description of what the skill does
- **Instructions**: The actual skill instructions in markdown

### Via Manage Skills UI

1. Open "Manage Skills" command
2. Press `Cmd + N` or click "+" button
3. Fill in the form:
   - **Skill Name**: lowercase-with-hyphens
   - **Description**: What the skill does
   - **Instructions**: The markdown instructions

## Example Skills

### Text Summarizer

**Skill Name**: `summarizer`
**Description**: Summarizes long text into concise key points

```markdown
---
name: summarizer
description: Summarizes long text into 3-5 key points
---

# Text Summarizer

## Instructions

When asked to summarize text:

1. Read and understand the full content
2. Extract the most important points
3. Summarize into 3-5 key points
4. Keep each point concise and clear
5. Preserve the original meaning
6. Use bullet points for readability
```

### Code Explainer

**Skill Name**: `code-explainer`
**Description**: Explains code snippets in simple terms

```markdown
---
name: code-explainer
description: Explains code in simple, easy-to-understand language
---

# Code Explainer

## Instructions

When asked to explain code:

1. Identify the programming language
2. Explain what the code does overall
3. Break down each part/function
4. Use simple language and analogies
5. Highlight any important patterns or concepts
```

### Email Writer

**Skill Name**: `email-writer`
**Description**: Writes professional emails on any topic

```markdown
---
name: email-writer
description: Drafts professional emails for various purposes
---

# Email Writer

## Instructions

When writing an email:

1. Understand the purpose and recipient
2. Use appropriate tone (formal/casual)
3. Structure clearly: greeting, purpose, details, call-to-action
4. Keep it concise and friendly
5. Include a professional sign-off
```

## Semantic Routing

The extension uses AI-powered semantic routing to automatically select the most relevant skill based on your request.

### How It Works

1. You ask: "Can you summarize this long article?"
2. The system analyzes your request
3. It compares against all enabled skills
4. Selects the best matching skill (e.g., "summarizer")
5. Applies that skill's instructions to your request

### Configuring the Routing Model

1. Open "Manage Skills" command
2. Click the gear icon (⚙️) or press `Cmd + M`
3. Select your preferred routing model
4. **Recommended models**:
   - Gemini 2.5 Flash Lite (fastest, free)
   - Claude 3.5/4.5 Haiku (fast, large context)
   - GPT-4o/5 Mini (fast and intelligent)

**Note**: Make sure your chosen model is enabled in Raycast AI settings.

## Skills Folders

### Default Locations

- **Personal**: `~/.claude/skills/`
- **Project**: `./.claude/skills/`

### Managing Folders

1. Open "Manage Skills" → Press `Cmd + F`
2. View all configured folders
3. Add new folders with `Cmd + N`
4. Edit folder paths with `Cmd + E`
5. Remove folders (must keep at least one)

**Use cases for multiple folders**:

- Separate personal and project-specific skills
- Team skills vs individual skills
- Different client projects

## Tools Reference

The extension provides the following AI tools:

### `use-skills`

Uses AI-powered semantic routing to select and apply the most relevant skill.

**Parameters:**

- `request` (required): The user's request or question

### `list-skills`

Lists all available skills with their details.

**No parameters required**

### `add-skill`

Creates a new skill.

**Parameters:**

- `name` (required): Skill name (lowercase, numbers, hyphens only, max 64 chars)
- `description` (required): What the skill does (max 1024 chars)
- `content` (required): The markdown instructions

### `edit-skill`

Edits an existing skill. Only provide the fields you want to change.

**Parameters:**

- `name` (required): The skill name to edit
- `description` (optional): New description
- `content` (optional): New instructions

### `remove-skill`

Deletes a skill by removing its entire directory.

**Parameters:**

- `name` (required): The skill name to remove

### `set-skills-folder`

Adds a folder to search for skills.

**Parameters:**

- `folderPath` (required): Path to the skills folder

### `list-skills-folders`

Lists all configured skills folder paths.

**No parameters required**

### `remove-skills-folder`

Removes a folder from the list (won't delete files).

**Parameters:**

- `folderPath` (required): Path to remove

## Best Practices

### Skill Names

- Use lowercase letters, numbers, and hyphens only
- Keep it descriptive but concise
- Max 64 characters
- Examples: `summarizer`, `code-explainer`, `email-writer`

### Descriptions

- Clearly state what the skill does
- Mention when to use it
- Max 1024 characters
- Examples: "Summarizes long text into 3-5 key points", "Explains code in simple terms"

### Instructions

- Be specific and clear
- Use markdown formatting
- Include examples if helpful
- Keep essential info in SKILL.md
- Use supporting files for detailed reference

### Organization

- Create multiple skills folders for different contexts
- Enable/disable skills based on current needs
- Use progressive disclosure: essential info in SKILL.md, details in supporting files

## Technical Details

- **Storage**: LocalStorage (encrypted, local to your machine)
- **Platform**: macOS only (AI Extensions are not available on Windows)
- **Requirement**: Raycast Pro subscription for AI features
- **Skills Format**: YAML frontmatter with markdown content
- **Routing**: Configurable fast AI models for skill selection

## Development

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint
```

## AI Behavior

The AI assistant is configured to:

- List skills when you ask to see them
- Create skills when you want to add new ones
- Edit skills when you want to modify them
- Delete skills when you want to remove them
- Use semantic routing to select relevant skills
- Guide you through creating or editing skills if none match your needs

## License

MIT
