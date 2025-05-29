import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Weather API",
			version: "1.0.0",
			description:
				"API for retrieving weather data with historical average temperature information",
			contact: {
				name: "API Support",
				email: "support@weatherapp.com",
			},
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
		],
		components: {
			schemas: {
				WeatherAverageResponse: {
					type: "object",
					properties: {
						overallAverageTemperature: {
							type: "number",
							description:
								"Average temperature across the requested time period",
							example: 18.3,
						},
						dailyTemperatures: {
							type: "array",
							items: {
								type: "object",
								properties: {
									date: {
										type: "string",
										format: "date",
										description: "Date in YYYY-MM-DD format",
										example: "2025-05-25",
									},
									temperature: {
										type: "number",
										description: "Average temperature for this day in Celsius",
										example: 19.2,
									},
								},
							},
						},
						fetchedLocationName: {
							type: "string",
							description:
								"Name of the location as resolved by the geocoding service",
							example: "London",
						},
						daysFetched: {
							type: "integer",
							description: "Number of days for which data was fetched",
							example: 7,
						},
						startDate: {
							type: "string",
							format: "date",
							description: "Start date of the data period",
							example: "2025-05-19",
						},
						endDate: {
							type: "string",
							format: "date",
							description: "End date of the data period",
							example: "2025-05-25",
						},
					},
				},
				ErrorResponse: {
					type: "object",
					properties: {
						error: {
							type: "string",
							description: "Error message",
							example: "Invalid query parameters",
						},
						details: {
							type: "object",
							description: "Detailed validation errors",
						},
					},
				},
			},
		},
	},
	apis: ["./src/routers/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
