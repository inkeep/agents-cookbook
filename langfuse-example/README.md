# Langfuse Dataset Evaluation Script

This script runs Langfuse datasets through a chat API and correlates the traces for evaluation purposes.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   # Langfuse configuration
   LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
   LANGFUSE_SECRET_KEY=your_langfuse_secret_key
   LANGFUSE_BASE_URL=https://cloud.langfuse.com

   # Chat API configuration
   INKEEP_AGENTS_RUN_API_KEY=your_api_key
   INKEEP_AGENTS_RUN_API_URL=your_chat_api_base_url

   # Execution context
   INKEEP_TENANT_ID=your_tenant_id
   INKEEP_PROJECT_ID=your_project_id
   INKEEP_GRAPH_ID=your_graph_id
   INKEEP_RUN_NAME=optional_run_name
   ```

## Usage

Run the script with a dataset ID:

```bash
pnpm start your_dataset_id
```

For example:
```bash
pnpm start testing-dataset
```

## How it works

1. Fetches a dataset from Langfuse using the provided dataset ID
2. For each item in the dataset:
   - Extracts the input message
   - Sends it to the configured chat API
   - Creates a trace in Langfuse with the response
   - Links the trace to the original dataset item for evaluation

The script uses cross-tool correlation via W3C trace headers to properly link execution traces with dataset items.
