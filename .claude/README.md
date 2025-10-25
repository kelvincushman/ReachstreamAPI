# Claude Code Agent Skills for ReachstreamAPI

This directory contains specialized Agent Skills that enable Claude Code to build the entire ReachstreamAPI platform. Each skill provides domain-specific expertise using Claude's Agent Skills architecture.

## 🎯 What are Agent Skills?

Agent Skills are filesystem-based resources that provide Claude with specialized capabilities. Unlike traditional prompts, Skills:

- **Load on-demand**: Only activated when relevant to the task
- **Progressive disclosure**: Load information in stages (metadata → instructions → resources)
- **Execute code**: Can run scripts and utilities without consuming context
- **Compose**: Multiple skills can work together for complex workflows

## 📁 Directory Structure

```
.claude/
├── README.md                    # This file
├── agents/                      # Agent skill directories
│   ├── nodejs-skill/
│   │   ├── SKILL.md            # Main skill instructions
│   │   ├── TESTING.md          # Testing guidelines (optional)
│   │   └── REFERENCE.md        # API reference (optional)
│   ├── express-skill/
│   ├── lambda-skill/
│   ├── supabase-skill/
│   ├── stripe-skill/
│   ├── cdk-skill/
│   ├── astro-skill/
│   ├── react-skill/
│   └── *-legacy.md             # Legacy agent configs (for reference)
└── SKILL_TEMPLATE.md            # Template for creating new skills
```

## 🤖 Available Skills

### Technology-Specific Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **nodejs-skill** | Node.js development, async patterns, performance | Working with Node.js runtime, event loop, streams |
| **express-skill** | Express.js API development, middleware, routing | Building REST APIs, web servers |
| **lambda-skill** | AWS Lambda functions, serverless optimization | Creating scraper functions, serverless apps |
| **supabase-skill** | PostgreSQL, row-level security, Supabase features | Database operations, auth integration |
| **stripe-skill** | Payment processing, webhooks, subscriptions | Implementing billing, payments |
| **cdk-skill** | AWS CDK infrastructure as code | Provisioning AWS resources |
| **astro-skill** | Astro static site generation, SEO | Building marketing website |
| **react-skill** | React development, hooks, state management | Building dashboard, interactive UIs |

### General-Purpose Skills (Legacy Format)

These are in the legacy format and will be migrated to the new Skills architecture:

- **infra-agent** - Infrastructure provisioning
- **backend-agent** - Backend API development
- **scraper-agent** - Social media scrapers
- **frontend-agent** - Frontend development
- **db-agent** - Database management
- **doc-agent** - Documentation
- **qa-engineer** - Testing and QA
- **code-quality-agent** - Code reviews
- **git-expert** - Git operations

## 🚀 How Skills Work

### Level 1: Metadata (Always Loaded)

Each SKILL.md file starts with YAML frontmatter:

```yaml
---
name: nodejs-expert
description: Use for Node.js development, async patterns, performance optimization. Invoke when working with Node.js runtime.
---
```

Claude loads this at startup (~100 tokens per skill). This lets Claude know when to use each skill without context penalty.

### Level 2: Instructions (Loaded When Triggered)

When you request something matching a skill's description, Claude reads the SKILL.md body:

```markdown
# Node.js Expert Skill

## Quick Start
Basic usage examples...

## Core Workflows
Step-by-step instructions...

## Best Practices
Guidelines and patterns...
```

This content enters the context window only when needed (<5k tokens).

### Level 3: Resources (Loaded As Needed)

Skills can include additional files:

- **TESTING.md** - Testing strategies
- **REFERENCE.md** - Complete API documentation
- **ADVANCED.md** - Advanced patterns
- **scripts/** - Executable utilities

Claude accesses these only when referenced, using bash commands.

## 💡 Using Skills

### In Claude Code

1. **Load the repository**:
   ```bash
   git clone https://github.com/kelvincushman/ReachstreamAPI.git
   cd ReachstreamAPI
   ```

2. **Claude automatically discovers skills** from `.claude/agents/`

3. **Request a task**:
   ```
   "Create a Node.js Express API endpoint for user authentication"
   ```

4. **Claude invokes relevant skills**:
   - `nodejs-skill` for Node.js best practices
   - `express-skill` for Express routing and middleware
   - `supabase-skill` for database operations

### In the API

Skills can be uploaded via the Claude API:

```python
import anthropic

client = anthropic.Anthropic()

# Upload a skill
with open('.claude/agents/nodejs-skill/SKILL.md', 'rb') as f:
    skill = client.skills.create(
        name="nodejs-expert",
        file=f
    )

# Use in a message
message = client.messages.create(
    model="claude-4-5-sonnet-20250514",
    max_tokens=4096,
    skills=[skill.id],
    messages=[{
        "role": "user",
        "content": "Create a Node.js server with Express"
    }]
)
```

## 📝 Creating New Skills

Use the `SKILL_TEMPLATE.md` as a starting point:

```bash
cp .claude/agents/SKILL_TEMPLATE.md .claude/agents/new-skill/SKILL.md
```

### Skill Structure

```markdown
---
name: skill-name
description: When to use this skill (be specific!)
---

# Skill Name

## Overview
What this skill does

## Quick Start
Basic example to get started

## Core Workflows
Step-by-step instructions for common tasks

## Best Practices
Guidelines and patterns

## Common Patterns
Reusable patterns with examples

## Troubleshooting
Common issues and solutions
```

### Best Practices for Skills

1. **Clear descriptions**: Be specific about when to invoke the skill
2. **Progressive detail**: Quick start → workflows → advanced topics
3. **Code examples**: Include working code snippets
4. **Link to resources**: Reference additional files for deep dives
5. **Keep focused**: One skill per technology or domain

## 🔄 Migration from Legacy Format

The legacy agent files (`*-legacy.md`) use a simpler format with YAML frontmatter:

```yaml
---
name: backend-agent
description: Backend development
tools: shell, file
model: sonnet
---
```

These will be migrated to the new Skills format with:
- Richer instruction content
- Executable scripts
- Reference materials
- Progressive disclosure

## 📚 Resources

- [Agent Skills Documentation](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Agent Skills Cookbook](https://github.com/anthropics/anthropic-cookbook/tree/main/skills)
- [Code Execution Tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/code-execution-tool)
- [Engineering Blog: Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

## 🎯 Development Workflow

1. **Understand the task** from `docs/prd.md`
2. **Claude loads relevant skills** based on task description
3. **Skills provide workflows** and best practices
4. **Claude executes code** using skill instructions
5. **Additional resources** loaded as needed
6. **Testing and quality** ensured by QA and code quality skills

## 🔧 Troubleshooting

### Skill Not Loading

- Check YAML frontmatter syntax
- Ensure `description` clearly indicates when to use
- Verify file is in `.claude/agents/skill-name/SKILL.md`

### Too Much Context

- Move detailed content to separate files (REFERENCE.md, ADVANCED.md)
- Use executable scripts instead of inline code
- Keep SKILL.md focused on workflows

### Skill Conflicts

- Make descriptions more specific
- Use clear naming conventions
- Compose skills instead of duplicating functionality

---

**Built for Claude Code** 🤖 | **Progressive Disclosure** 📊 | **Filesystem-Based** 📁

