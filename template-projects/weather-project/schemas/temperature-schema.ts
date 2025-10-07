import type { FromSchema } from "json-schema-to-ts";

export const temperatureDataJsonSchema = {
  type: 'object',
  properties: {
    temperature_data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date of the temperature data',
          },
          temperature: {
            type: 'number',
            description: 'The temperature in degrees Fahrenheit',
          },
          weather_code: {
            type: 'number',
            description: 'The weather code',
          },
        },
        required: ['date', 'temperature', 'weather_code'],
      },
    },
  },
  required: ['temperature_data'],
} as const;

export type TemperatureDataProps = FromSchema<typeof temperatureDataJsonSchema>;
