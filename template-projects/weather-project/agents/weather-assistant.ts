import { agent, subAgent, agentMcp } from '@inkeep/agents-sdk';
import { weatherMcpTool } from '../tools/weather-mcp';

// Sub-agents (individual agents within the graph)
const weatherAssistant = subAgent({
  id: 'weather-assistant',
  name: 'Weather assistant',
  description: 'Responsible for routing between the geocoder agent and weather forecast agent',
  prompt:
    'You are a helpful assistant. When the user asks about the weather in a given location, first ask the geocoder agent for the coordinates, and then pass those coordinates to the weather forecast agent to get the weather forecast. If the user does not ask about weather related questions, politely decline to answer and redirect the user to a weather related question.',
  canDelegateTo: () => [weatherForecaster, geocoderAgent],
});

const weatherForecaster = subAgent({
  id: 'weather-forecaster',
  name: 'Weather forecaster',
  description:
    'This agent is responsible for taking in coordinates and returning the forecast for the weather at that location',
  prompt:
    'You are a helpful assistant responsible for taking in coordinates and returning the forecast for that location using your forecasting tool',
  canUse: () => [agentMcp({ server: weatherMcpTool, selectedTools: ["get_weather_forecast"] })],
});

const geocoderAgent = subAgent({
  id: 'geocoder-agent',
  name: 'Geocoder agent',
  description: 'Responsible for converting location or address into coordinates',
  prompt:
    'You are a helpful assistant responsible for converting location or address into coordinates using your geocode tool',
  canUse: () => [agentMcp({ server: weatherMcpTool, selectedTools: ["geocode"] })],
});

// Agent (replaces agentGraph - this is the orchestrator)
export const weatherGraph = agent({
  id: 'weather-graph',
  name: 'Weather graph',
  defaultSubAgent: weatherAssistant,
  subAgents: () => [weatherAssistant, weatherForecaster, geocoderAgent],
});