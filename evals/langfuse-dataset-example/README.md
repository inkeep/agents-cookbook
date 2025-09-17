# Langfuse Dataset Evaluation

This project provides two complementary scripts for working with Langfuse datasets:

1. **Dataset Runner** (`langfuse-script.ts`) - Runs dataset items through a chat API and creates traces
2. **Dataset Evaluator** (`dataset-eval.ts`) - Evaluates the generated traces and assigns scores

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables in a `.env` file:
   ```bash
   # Langfuse configuration (required for both scripts)
   LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
   LANGFUSE_SECRET_KEY=your_langfuse_secret_key
   LANGFUSE_BASE_URL=https://cloud.langfuse.com

   # Chat API configuration (for dataset runner only)
   INKEEP_AGENTS_RUN_API_KEY=your_api_key
   INKEEP_AGENTS_RUN_API_URL=your_chat_api_base_url

   # Execution context (for dataset runner only)
   INKEEP_TENANT_ID=your_tenant_id
   INKEEP_PROJECT_ID=your_project_id
   INKEEP_GRAPH_ID=your_graph_id
   INKEEP_RUN_NAME=optional_run_name

   # Evaluation configuration (for dataset evaluator only)
   DATASET_NAME=your_dataset_name
   RUN_NAME=your_run_name
   SCORE_NAME=name_of_score
   SPAN_NAME=target_span
   TARGET_ATTRIBUTE=target_attribute
   ```

## Usage

### 1. Running Dataset Items (Dataset Runner)

Run dataset items through your chat API to generate traces:

```bash
pnpm start your_dataset_name
```

For example:
```bash
pnpm start testing-dataset
```

**How it works:**
1. Fetches a dataset from Langfuse using the provided dataset ID
2. For each item in the dataset:
   - Extracts the input message
   - Sends it to the configured chat API
   - Creates a trace in Langfuse with the response
   - Links the trace to the original dataset item for evaluation

The script uses cross-tool correlation via W3C trace headers to properly link execution traces with dataset items.

### 2. Evaluating Dataset Results (Dataset Evaluator)

After running your dataset, evaluate the generated traces and assign scores:

```bash
pnpm eval
```

**How it works:**
1. Fetches all run items for the specified dataset and run name
2. For each run item with a linked trace:
   - Analyzes the trace observations for specific span patterns
   - Checks if the target tool was called (e.g., weather forecast tool)
   - Assigns a binary score (1 if tool was used, 0 if not)
   - Posts the score back to Langfuse for analysis

The evaluator looks for spans matching the configured `SPAN_NAME` pattern and checks if they contain the target attribute in their metadata.

## Workflow

1. **Prepare your dataset** in Langfuse with test inputs
2. **Run the dataset** using `pnpm start dataset_name` to generate traces
3. **Evaluate the results** using `pnpm eval` to score the traces
4. **Analyze the scores** in the Langfuse dashboard to assess performance
