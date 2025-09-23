import { agent, agentGraph, mcpTool, agentMcp } from '@inkeep/agents-sdk';
import { contextConfig, fetchDefinition } from "@inkeep/agents-core";
import { z } from "zod";

// 1. Create the request schema
// You can find a timezone list here: https://github.com/davidayalas/current-time?tab=readme-ov-file
const requestSchema = z.object({
  tz: z.string(),
});

// 2. Create the fetcher
const timeFetcher = fetchDefinition({
  id: "time-info",
  name: "Time Information",
  fetchConfig: {
    url: "https://world-time-api3.p.rapidapi.com/timezone/{{requestContext.tz}}",
    method: "GET",
    headers: {
      "x-rapidapi-key": "590c52974dmsh0da44377420ef4bp1c64ebjsnf8d55149e28d",
    },
  },
  defaultValue: "Unable to fetch time information",
});

// 3. Configure context
const timeContext = contextConfig({
  id: "time-context",
  name: "Time Context",
  description: "Fetches time information for personalization",
  requestContextSchema: requestSchema,
  contextVariables: {
    time: timeFetcher,
  },
});

// MCP Tools
const weatherMcpTool = mcpTool({
  id: 'fUI2riwrBVJ6MepT8rjx0',
  name: 'Weather',
  serverUrl: 'https://weather-mcp-hazel.vercel.app/mcp',
});

// Agents
const weatherAssistant = agent({
  id: 'weather-assistant',
  name: 'Weather assistant',
  description: 'Responsible for routing between the geocoder agent and weather forecast agent',
  prompt:
    'You are a helpful assistant. The time is {{time}} in the timezone {{requestContext.tz}}.  When the user asks about the weather in a given location, first ask the geocoder agent for the coordinates, and then pass those coordinates to the weather forecast agent to get the weather forecast',
  canDelegateTo: () => [weatherForecaster, geocoderAgent],
});

const weatherForecaster = agent({
  id: 'weather-forecaster',
  name: 'Weather forecaster',
  description:
    'This agent is responsible for taking in coordinates and returning the forecast for the weather at that location',
  prompt:
    'You are a helpful assistant responsible for taking in coordinates and returning the forecast for that location using your forecasting tool',
    canUse: () => [agentMcp({ server: weatherMcpTool, selectedTools: ["get_weather_forecast"] })],
});

const geocoderAgent = agent({
  id: 'geocoder-agent',
  name: 'Geocoder agent',
  description: 'Responsible for converting location or address into coordinates',
  prompt:
    'You are a helpful assistant responsible for converting location or address into coordinates using your geocode tool',
    canUse: () => [agentMcp({ server: weatherMcpTool, selectedTools: ["geocode"] })],
});

// Agent Graph
export const weatherIntermediateGraph = agentGraph({
  id: 'weather-intermediate-graph',
  name: 'Weather intermediate graph',
  defaultAgent: weatherAssistant,
  agents: () => [weatherAssistant, weatherForecaster, geocoderAgent],
  contextConfig: timeContext
});