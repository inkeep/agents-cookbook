import { agent, agentGraph, mcpTool, agentMcp } from '@inkeep/agents-sdk';
import { contextConfig, fetchDefinition } from "@inkeep/agents-core";
import { z } from "zod";
import { weatherMcpTool } from '../tools/weather-mcp';

// 1. Create the request schema
// You can find a timezone list here: https://github.com/davidayalas/current-time?tab=readme-ov-file
// Example: US/Pacific, US/Eastern, etc.
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

// Agents
const weatherAssistant = agent({
  id: 'weather-assistant',
  name: 'Weather assistant',
  description: 'Responsible for routing between the geocoder agent and weather forecast agent',
  prompt:
    'You are a helpful assistant. The time is {{time}} in the timezone {{requestContext.tz}}.  When the user asks about the weather in a given location, first ask the geocoder agent for the coordinates, and then pass those coordinates to the weather forecast agent to get the weather forecast. Be sure to pass todays date to the weather forecaster.',
  canDelegateTo: () => [weatherForecaster, geocoderAgent],
});

const weatherForecaster = agent({
  id: 'weather-intermediate-forecaster',
  name: 'Weather forecaster',
  description:
    'This agent is responsible for taking in coordinates and returning the forecast for the weather at that location',
  prompt:
    'You are a helpful assistant responsible for taking in coordinates and returning the forecast for that location using your forecasting tool. Pass in todays date as the start date if the user does not specify a date and 7 days from today as the end date.',
  canUse: () => [agentMcp({ server: weatherMcpTool, selectedTools: ["get_weather_forecast_for_date_range"] })],
});

const geocoderAgent = agent({
  id: 'geocoder-intermediate-agent',
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