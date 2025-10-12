import { agent, subAgent, mcpTool, agentMcp } from "@inkeep/agents-sdk";
import { contextConfig, fetchDefinition, headers } from "@inkeep/agents-core";
import { z } from "zod";
import { weatherMcpTool } from "../tools/weather-mcp";
import { temperatureDataJsonSchema } from "../schemas/temperature-schema";

/**
 * Advanced Weather Graph with Time Context & Rich UI Rendering
 * 
 * This graph extends the basic weather graph with two key enhancements:
 * 1. Time-aware responses: Provides current time context to the weather assistant for more accurate, date-specific forecasts
 * 2. Structured data components: Outputs temperature data in a structured format compatible with Inkeep's React component library for rich UI rendering
 * 
 * Frontend Integration: Download the companion React frontend at https://github.com/inkeep/weather-advanced-graph
 */

// You can find a timezone list here: https://github.com/davidayalas/current-time?tab=readme-ov-file
// Example: US/Pacific, US/Eastern, etc.
const headersSchema = headers({
  schema: z.object({
    tz: z.string(),
  })
});

// 2. Context fetcher for time information
const timeFetcher = fetchDefinition({
  id: "time-info",
  name: "Time Information",
  trigger: "invocation",
  fetchConfig: {
    url: `https://world-time-api3.p.rapidapi.com/timezone/{{${headersSchema.toTemplate("tz")}}}`,
    method: "GET",
    headers: {
      "x-rapidapi-key": "590c52974dmsh0da44377420ef4bp1c64ebjsnf8d55149e28d",
    },
  },
  responseSchema: z.object({
    datetime: z.string(),
    timezone: z.string().optional(),
  }),
  defaultValue: "Unable to fetch time information",
});

// Configure context for time information
const weatherAdvancedGraphContext = contextConfig({
  headers: headersSchema,
  contextVariables: {
    time: timeFetcher,
  },
});

const weatherAssistant = subAgent({
  id: "weather-assistant-advanced",
  name: "Weather assistant",
  description:
    "Responsible for routing between the coordinates agent and using the weather forecast tool",
  prompt: `You are a helpful assistant. The time is {{time}} in the timezone {{requestContext.tz}}.  When the user asks about the weather in a given location, first ask the coordinates agent for the coordinates, 
    and then pass those coordinates to the weather forecast agent to get the weather forecast. Be sure to pass todays date to the weather forecaster.`,
  canDelegateTo: () => [coordinatesAgent],
  canUse: () => [
    agentMcp({
      server: weatherMcpTool,
      selectedTools: ["get_weather_forecast_for_date_range"],
    }),
  ],
  models: {
    base: {
      model: "anthropic/claude-sonnet-4-20250514",
    },
    structuredOutput: {
      model: "anthropic/claude-sonnet-4-20250514",
    },
    summarizer: {
      model: "anthropic/claude-3-5-haiku-20241022",
    },
  },
  dataComponents: () => [
    {
      id: "temperature-data",
      name: "Temperature data",
      description: "Temperature data",
      props: temperatureDataJsonSchema,
    },
  ],
});

const coordinatesAgent = subAgent({
  id: "coordinates-agent-advanced",
  name: "Coordinates agent",
  description:
    "Responsible for converting location or address into coordinates",
  prompt:
    "You are a helpful assistant responsible for converting location or address into coordinates using your coordinate converter tool",
  canUse: () => [
    agentMcp({ server: weatherMcpTool, selectedTools: ["get_coordinates"] }),
  ],
});

// Agent Graph
export const weatherAdvanced = agent({
  id: "weather-graph-advanced",
  name: "Weather graph advanced",
  description: "Asks for the weather forecast for the given location with time context and rich UI rendering",
  defaultSubAgent: weatherAssistant,
  subAgents: () => [weatherAssistant, coordinatesAgent],
  contextConfig: weatherAdvancedGraphContext,
});
