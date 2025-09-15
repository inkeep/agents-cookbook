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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Missing required parameter: --dataset-id');
    console.error('Usage: pnpm langfuse --dataset-id <id>');
    process.exit(1);
  }

  // Parse command line arguments and merge with environment variables
  const config: Partial<RunConfig> = {
    // Set defaults from environment variables
    tenantId: process.env.INKEEP_TENANT_ID,
    projectId: process.env.INKEEP_PROJECT_ID,
    graphId: process.env.INKEEP_GRAPH_ID,
    runName: process.env.INKEEP_RUN_NAME,
    baseUrl: process.env.INKEEP_AGENTS_RUN_API_URL,
    apiKey: process.env.INKEEP_AGENTS_RUN_API_KEY,
  };

  // Parse dataset-id from command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    switch (flag) {
      case '--dataset-id':
        config.datasetId = value;
        break;
      default:
        console.error(`Unknown flag: ${flag}. Only --dataset-id is supported.`);
        console.error('Usage: pnpm langfuse --dataset-id <id>');
        process.exit(1);
    }
  }

  // Validate required parameters
  const required = ['datasetId', 'tenantId', 'projectId', 'graphId'];
  const missing = required.filter((key) => !config[key as keyof RunConfig]);

  if (missing.length > 0) {
    console.error(`Missing required parameters: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate all required environment variables
  const requiredEnvVars = [
    'LANGFUSE_PUBLIC_KEY',
    'LANGFUSE_SECRET_KEY',
    'LANGFUSE_BASE_URL',
    'INKEEP_AGENTS_RUN_API_KEY',
    'INKEEP_AGENTS_RUN_API_URL',
  ];

  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }

  try {
    await runDatasetEvaluation(config as RunConfig);
    console.log('Dataset evaluation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error(
      'Dataset evaluation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
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

  const runLabel = `dataset-run:${new Date().toISOString()}`;
  for (const item of dataset.items) {
    const itemLogger = getLogger(`dataset-item:${item.id}`);

    try {
      itemLogger.info({ item }, 'Processing dataset item through agent graph');

      const userMessage = extractInputFromDatasetItem(item);
      if (!userMessage) {
        itemLogger.warn({ item }, 'No input text found in dataset item, skipping');
        continue;
      }

      // Run the dataset item through the chat API
      const result = await runDatasetItemThroughChatAPI({
        userMessage,
        datasetItem: item,
        baseUrl,
        authKey,
        executionContext: {
          tenantId,
          projectId,
          graphId,
        },
        langfuse,
        datasetId,
      });

      // Link the execution trace to the dataset item using cross-tools approach
      if (result.traceId && result.trace) {
        await langfuse.flushAsync();
        await item.link(result.trace, runLabel, {
          description: 'Dataset run via Inkeep Agent Framework (correlated via x-request-id)',
          metadata: {
            xRequestId: result.xRequestId,
            datasetId,
            tenantId,
            projectId,
            graphId,
            ...metadata,
          },
        });
        await langfuse.flushAsync();
      }

      itemLogger.info(
        {
          traceId: result.traceId,
          xRequestId: result.xRequestId,
        },
        'Completed processing dataset item and linked trace via cross-tools correlation'
      );
    } catch (error) {
      itemLogger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Error processing dataset item'
      );
    }
  }

  logger.info({ datasetId }, 'Dataset evaluation completed');
}

// Helper function to extract input text from a dataset item
function extractInputFromDatasetItem(item: any): string | null {
  if (item.input && typeof item.input.message === 'string') {
    return item.input.message;
  }
  logger.warn({ item }, 'Could not extract input text from dataset item');
  return null;
}

// Helper function to run a dataset item through the chat API
async function runDatasetItemThroughChatAPI({
  userMessage,
  datasetItem,
  baseUrl,
  authKey,
  executionContext,
  langfuse,
  datasetId,
}: {
  userMessage: string;
  datasetItem: any;
  baseUrl: string;
  authKey: string;
  executionContext: {
    tenantId: string;
    projectId: string;
    graphId: string;
  };
  langfuse: any;
  datasetId: string;
}): Promise<{
  response?: string;
  error?: string;
  traceId?: string;
  trace?: any;
  xRequestId?: string;
  traceparent?: string;
}> {
  try {
    // Prepare the chat request payload (let API generate conversationId)
    const chatPayload = {
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    };

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`,
      'x-inkeep-tenant-id': executionContext.tenantId,
      'x-inkeep-project-id': executionContext.projectId,
      'x-inkeep-graph-id': executionContext.graphId,
    };

    // Make request to chat endpoint
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: reqHeaders,
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

      return {
        error: `Chat API error: ${response.status} ${response.statusText}`,
      };
    }

    // Extract headers from response for cross tools correlation
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      headers[k] = v;
    });

    const responseText = await response.text();
    const assistantResponse = parseSSEResponse(responseText);
    logger.info({ response }, 'response from chat API');

    // Create a Langfuse trace using the trace ID from response
    const traceparent = headers['traceparent'];
    const extractedTraceId = extractTraceIdFromTraceparent(traceparent);
    const trace = langfuse.trace({
      id: extractedTraceId,
      name: `Dataset Item Execution: ${datasetItem.id}`,
      input: userMessage,
      output: assistantResponse || 'No response generated',
      metadata: {
        datasetId,
        datasetItemId: datasetItem.id,
        traceparent,
      },
      tags: ['dataset-evaluation'],
    });

    await langfuse.flushAsync();

    return {
      response: assistantResponse || 'No response generated',
      traceId: trace.id,
      trace,
      traceparent,
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        datasetItemId: datasetItem.id,
      },
      'Error running dataset item through chat API'
    );

    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper function to extract trace ID from W3C traceparent header
function extractTraceIdFromTraceparent(traceparent: string | undefined): string | undefined {
  if (!traceparent) return undefined;
  const parts = traceparent.split('-');
  if (parts.length >= 2) {
    return parts[1]; // Return the trace_id part
  }
  return undefined;
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
