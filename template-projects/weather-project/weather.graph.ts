import { agent, agentGraph, mcpTool, agentMcp } from '@inkeep/agents-sdk';

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
    'You are a helpful assistant. When the user asks about the weather in a given location, first ask the geocoder agent for the coordinates, and then pass those coordinates to the weather forecast agent to get the weather forecast. If the user does not ask about weather related questions, politely decline to answer and redirect the user to a weather related question.',
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
export const weatherGraph = agentGraph({
  id: 'weather-graph',
  name: 'Weather graph',
  defaultAgent: weatherAssistant,
  agents: () => [weatherAssistant, weatherForecaster, geocoderAgent],
});