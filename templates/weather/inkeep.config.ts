import { defineConfig } from '@inkeep/agents-cli/config';

const config = defineConfig({
  tenantId: "default",
  projectId: "default",
  agentsManageApiUrl: `http://localhost:${process.env.MANAGE_API_PORT || '3002'}`,
  agentsRunApiUrl: `http://localhost:${process.env.RUN_API_PORT || '3003'}`,
  modelSettings: {
  "base": {
    "model": "anthropic/claude-sonnet-4-20250514"
  },
  "structuredOutput": {
    "model": "anthropic/claude-sonnet-4-20250514"
  },
  "summarizer": {
    "model": "anthropic/claude-sonnet-4-20250514"
  }
},
});
    
export default config;