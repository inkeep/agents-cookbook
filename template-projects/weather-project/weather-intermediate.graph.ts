import { agent, agentGraph, mcpTool } from '@inkeep/agents-sdk';
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
    url: "https://script.google.com/macros/s/AKfycbyd5AcbAnWi2Yn0xhFRbyzS4qMq1VucMVgVvhul5XqS9HkAyJY/exec?tz={{requestContext.tz}}",
    method: "GET",
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
const forecastWeatherTool = mcpTool({
  id: 'fUI2riwrBVJ6MepT8rjx0',
  name: 'Forecast weather',
  serverUrl: 'https://weather-forecast-mcp.vercel.app/mcp',
});

const geocodeAddressTool = mcpTool({
  id: 'fdxgfv9HL7SXlfynPx8hf',
  name: 'Geocode address',
  serverUrl: 'https://geocoder-mcp.vercel.app/mcp',
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
  canUse: () => [forecastWeatherTool],
});

const geocoderAgent = agent({
  id: 'geocoder-agent',
  name: 'Geocoder agent',
  description: 'Responsible for converting location or address into coordinates',
  prompt:
    'You are a helpful assistant responsible for converting location or address into coordinates using your geocode tool',
  canUse: () => [geocodeAddressTool],
});

// Agent Graph
export const weatherGraph = agentGraph({
  id: 'weather-graph',
  name: 'Weather graph',
  defaultAgent: weatherAssistant,
  agents: () => [weatherAssistant, weatherForecaster, geocoderAgent],
  contextConfig: timeContext
});