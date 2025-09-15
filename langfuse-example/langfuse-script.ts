#!/usr/bin/env tsx
import 'dotenv/config';
import { Langfuse } from 'langfuse';
import { getLogger } from './logger.js';

const logger = getLogger('langfuse-dataset-runner');

interface RunConfig {
  datasetId: string;
  tenantId: string;
  projectId: string;
  graphId: string;
  runName?: string;
  baseUrl?: string;
  apiKey?: string;
  metadata?: Record<string, any>;
}

interface ChatAPIResponse {
  error?: string;
  trace?: any;
  traceId?: string;
}

const REQUIRED_CONFIG_FIELDS = ['datasetId', 'tenantId', 'projectId', 'graphId'] as const;
const REQUIRED_ENV_VARS = [
  'LANGFUSE_PUBLIC_KEY',
  'LANGFUSE_SECRET_KEY', 
  'LANGFUSE_BASE_URL',
  'INKEEP_AGENTS_RUN_API_KEY',
  'INKEEP_AGENTS_RUN_API_URL',
] as const;

async function main() {
  try {
    const config = parseAndValidateConfig();
    await runDatasetEvaluation(config);
    logger.info({}, 'Dataset evaluation completed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'Dataset evaluation failed');
    process.exit(1);
  }
}

function parseAndValidateConfig(): RunConfig {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    throw new Error('Missing required parameter: dataset-id\nUsage: pnpm start <dataset-id>');
  }

  const config: Partial<RunConfig> = {
    tenantId: process.env.INKEEP_TENANT_ID,
    projectId: process.env.INKEEP_PROJECT_ID,
    graphId: process.env.INKEEP_GRAPH_ID,
    runName: process.env.INKEEP_RUN_NAME,
    baseUrl: process.env.INKEEP_AGENTS_RUN_API_URL,
    apiKey: process.env.INKEEP_AGENTS_RUN_API_KEY,
    datasetId: args[0],
  };

  validateRequiredConfig(config);
  validateRequiredEnvVars();

  return config as RunConfig;
}

function validateRequiredConfig(config: Partial<RunConfig>): void {
  const missing = REQUIRED_CONFIG_FIELDS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

function validateRequiredEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function runDatasetEvaluation(config: RunConfig): Promise<void> {
  const { datasetId, tenantId, projectId, graphId, runName, baseUrl, apiKey, metadata } = config;

  logger.info(
    {
      datasetId,
      tenantId,
      projectId,
      graphId,
      runName,
    },
    'Starting Langfuse dataset evaluation'
  );

  // Get API key from config or environment
  const authKey = apiKey || process.env.INKEEP_AGENTS_RUN_API_KEY;
  if (!authKey) {
    throw new Error('API key is required. Set INKEEP_AGENTS_RUN_API_KEY environment variable');
  }

  if (!baseUrl) {
    throw new Error('Base URL is required. Set INKEEP_AGENTS_RUN_API_URL environment variable');
  }

  logger.info({ baseUrl }, 'Starting dataset evaluation run');

  // Initialize Langfuse client
  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  });

  // Get the dataset
  const dataset = await langfuse.getDataset(datasetId);
  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found in Langfuse`);
  }

  logger.info(
    {
      datasetId,
      datasetName: dataset.name,
      itemCount: dataset.items?.length || 0,
    },
    'Successfully fetched dataset from Langfuse'
  );

  // Confirm items exist just before the loop
  if (!Array.isArray(dataset.items) || dataset.items.length === 0) {
    throw new Error('Dataset has no items; cannot link runs. Verify SDK call returns items.');
  }

  const chatClient = new ChatAPIClient(baseUrl, authKey, { tenantId, projectId, graphId });
  const runLabel = `dataset-run:${new Date().toISOString()}`;
  
  await processDatasetItems(dataset.items, {
    chatClient,
    langfuse,
    datasetId,
    runLabel,
    metadata: { tenantId, projectId, graphId, ...metadata },
  });

  logger.info({ datasetId }, 'Dataset evaluation completed');
}

async function processDatasetItems(
  items: any[],
  context: {
    chatClient: ChatAPIClient;
    langfuse: any;
    datasetId: string;
    runLabel: string;
    metadata: Record<string, any>;
  }
) {
  for (const item of items) {
    const itemLogger = getLogger(`dataset-item:${item.id}`);
    
    try {
      itemLogger.info({ itemId: item.id }, 'Processing dataset item');

      const userMessage = extractInputFromDatasetItem(item);
      if (!userMessage) {
        itemLogger.warn({ item }, 'No input text found in dataset item, skipping');
        continue;
      }

      const result = await context.chatClient.processDatasetItem(
        userMessage, 
        item, 
        context.langfuse, 
        context.datasetId
      );

      // Link the execution trace to the dataset item
      if (result.trace) {
        await context.langfuse.flushAsync();
        await item.link(result.trace, context.runLabel, {
          description: 'Dataset run via Inkeep Agent Framework',
          metadata: {
            datasetId: context.datasetId,
            ...context.metadata,
          },
        });
        await context.langfuse.flushAsync();
        
         itemLogger.info(
           {
             traceId: result.trace.id,
             directTraceId: result.traceId,
           },
           'Completed processing dataset item and linked trace via cross-tools correlation'
         );
      }
    } catch (error) {
      itemLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Error processing dataset item'
      );
    }
  }
}


// Helper function to extract input text from a dataset item
function extractInputFromDatasetItem(item: any): string | null {
  if (item.input && typeof item.input.message === 'string') {
    return item.input.message;
  }
  logger.warn({ item }, 'Could not extract input text from dataset item');
  return null;
}

class ChatAPIClient {
  constructor(
    private baseUrl: string,
    private authKey: string,
    private executionContext: {
      tenantId: string;
      projectId: string;
      graphId: string;
    }
  ) {}

  async processDatasetItem(
    userMessage: string,
    datasetItem: any,
    langfuse: any,
    datasetId: string
  ): Promise<ChatAPIResponse> {
    try {
      const chatPayload = {
        messages: [{ role: 'user', content: userMessage }],
      };

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authKey}`,
        'x-inkeep-tenant-id': this.executionContext.tenantId,
        'x-inkeep-project-id': this.executionContext.projectId,
        'x-inkeep-graph-id': this.executionContext.graphId,
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chatPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            errorText,
            datasetItemId: datasetItem.id,
          },
          'Chat API request failed'
        );
        return { error: `Chat API error: ${response.status} ${response.statusText}` };
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });

      const responseText = await response.text();
      const assistantResponse = parseSSEResponse(responseText);
      logger.info({ response: assistantResponse }, 'Received response from chat API');

      // Create Langfuse trace using the trace ID from response
      const traceId = responseHeaders['trace-id'];
      const trace = langfuse.trace({
        id: traceId,
        name: `Dataset Item Execution: ${datasetItem.id}`,
        input: userMessage,
        output: assistantResponse || 'No response generated',
        metadata: {
          datasetId,
          datasetItemId: datasetItem.id,
          traceId,
        },
        tags: ['dataset-evaluation'],
      });

      await langfuse.flushAsync();

      return {
        trace,
        traceId,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          datasetItemId: datasetItem.id,
        },
        'Error processing dataset item through chat API'
      );
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}


// Helper function to parse SSE response and extract assistant message
function parseSSEResponse(sseText: string): string {
  const lines = sseText.split('\n');
  let assistantResponse = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));

        // Handle Vercel AI data stream format (from /api/chat endpoint)
        if (data.type === 'text-delta' && data.delta) {
          assistantResponse += data.delta;
        }
      } catch {}
    }
  }

  return assistantResponse.trim();
}

// Run the main function
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
