# Template Projects

This directory contains template projects for use with the Inkeep Agent Framework.

## Adding a New Template Project

To add a new template project, follow these guidelines:

### Folder Structure
Create a new folder with your project name (e.g., `template-project`).

### Required Files

#### `index.ts`
This file must export a project with the following structure:
- **id**: Must exactly match the project folder name
- **name**: Human-readable name for the project
- **description**: Brief description of what the project does
- **graphs**: Function that returns an array of all graphs defined in the folder

#### Graph Files
Define your agents graphs in separate `.ts` files and import them into your `index.ts`.

### Example Structure

```
template-projects/
├── my-project/
│   ├── index.ts
│   ├── graphs
│       └── my-agent-graph.ts
```

### Example `index.ts`

```typescript
import { myAgentGraph } from './my-agent-graph.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'my-project', // Must match folder name
  name: 'My Project',
  description: 'Description of what this project does',
  graphs: () => [myProjectGraph], // Include all graphs from this folder
});
```

### Example Graph File (`my-project.graph.ts`)

```typescript
import { agent, agentGraph } from '@inkeep/agents-sdk';

const myAgent = agent({
  id: 'my-agent',
  name: 'My Agent',
  description: 'Agent description',
  prompt: 'Your agent prompt here',
});

export const myProjectGraph = agentGraph({
  id: 'my-project-graph',
  name: 'My Project Graph',
  defaultAgent: myAgent,
  agents: () => [myAgent],
});
```

## Key Requirements

1. **Project ID**: The `id` in your project export must exactly match your folder name
2. **All Graphs**: Include all graphs defined in your project folder in the `graphs` array
3. **Export**: Your `index.ts` must export the project as a named export