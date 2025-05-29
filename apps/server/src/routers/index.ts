import { publicProcedure } from "../lib/orpc";
import { z } from "zod";
import axios from "axios";
import express, {
	type Router,
	type Request,
	type Response,
} from "express";

const GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API_URL = "https://archive-api.open-meteo.com/v1/archive";

const GetWeatherAverageQuerySchema = z.object({
	city: z.string().min(1, "City name is required."),
	days: z.coerce
		.number()
		.int()
		.min(1)
		.max(365, "Days must be an integer between 1 and 365."),
});

type GeoData = {
	lat: number;
	lon: number;
	geocodedLocationName: string;
};

type TimelineData = {
	startDate: string;
	endDate: string;
};

type DailyTemperature = {
	date: string;
	temperature: number | null;
};

type WeatherResponse = {
	overallAverageTemperature: number;
	dailyTemperatures: DailyTemperature[];
	fetchedLocationName: string;
	daysFetched: number;
	startDate: string;
	endDate: string;
};

export const weatherRouter: Router = express.Router();

/**
 * @swagger
 * /weather/average:
 *   get:
 *     summary: Get average temperature data for a location
 *     description: Retrieves historical average temperature data for a specified city over a number of past days
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name for which to fetch weather data
 *         example: London
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: Number of past days to fetch (1-365)
 *         example: 7
 *     responses:
 *       200:
 *         description: Average temperature data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WeatherAverageResponse'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Could not find location
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
async function handleGetWeatherAverage(req: Request, res: Response) {
	try {
		const validationResult = GetWeatherAverageQuerySchema.safeParse(req.query);
		if (!validationResult.success) {
			return res
				.status(400)
				.json({
					error: "Invalid query parameters",
					details: validationResult.error.format(),
				});
		}

		const { city, days } = validationResult.data;

		let geoData: GeoData;
		try {
			geoData = await getGeoData(city);
		} catch (error) {
			return handleLocationNotFoundError(res, city, error);
		}

		const timelineData = getTimelineData(days);

		let weatherData;
		try {
			weatherData = await fetchWeatherData(geoData, timelineData);
		} catch (error) {
			return handleWeatherFetchError(res, error, timelineData);
		}

		const { dailyTemperatures, overallAverageTemperature } =
			processTemperatureData(weatherData);

		if (overallAverageTemperature === null) {
			return res.status(404).json({
				error: `No temperature data points found for ${geoData.geocodedLocationName} between ${timelineData.startDate} and ${timelineData.endDate}.`,
			});
		}

		return res.json(
			formatWeatherResponse(
				overallAverageTemperature,
				dailyTemperatures,
				geoData.geocodedLocationName,
				timelineData,
			),
		);
	} catch (error) {
		return handleGenericError(res, error);
	}
}

async function getGeoData(city: string): Promise<GeoData> {
	const geoResponse = await axios.get(GEO_API_URL, {
		params: {
			name: city,
			count: 1,
			language: "en",
			format: "json",
		},
	});

	if (geoResponse.data?.results?.length > 0) {
		const topResult = geoResponse.data.results[0];
		return {
			lat: topResult.latitude,
			lon: topResult.longitude,
			geocodedLocationName: topResult.name,
		};
	}

	throw new Error(
		`Could not find location: ${city} using Open-Meteo Geocoding.`,
	);
}

function getTimelineData(days: number): TimelineData {
	const formatDate = (date: Date): string => date.toISOString().split("T")[0];
	const today = new Date();
	const endDateObj = new Date(today);
	endDateObj.setDate(today.getDate() - 6);
	const startDateObj = new Date(endDateObj);
	startDateObj.setDate(endDateObj.getDate() - (days - 1));

	return {
		startDate: formatDate(startDateObj),
		endDate: formatDate(endDateObj),
	};
}

async function fetchWeatherData(geoData: GeoData, timelineData: TimelineData) {
	const { lat, lon } = geoData;
	const { startDate, endDate } = timelineData;

	const weatherResponse = await axios.get(WEATHER_API_URL, {
		params: {
			latitude: lat,
			longitude: lon,
			start_date: startDate,
			end_date: endDate,
			daily: "temperature_2m_mean",
			timezone: "auto",
		},
	});

	if (
		!weatherResponse.data?.daily?.time ||
		!weatherResponse.data?.daily?.temperature_2m_mean
	) {
		throw new Error(
			"Could not fetch historical weather data or data is incomplete from Open-Meteo.",
		);
	}

	const dailyTimes = weatherResponse.data.daily.time as string[];
	const dailyMeanTemps = weatherResponse.data.daily.temperature_2m_mean as (
		| number
		| null
	)[];

	if (
		!dailyTimes ||
		!dailyMeanTemps ||
		dailyTimes.length === 0 ||
		dailyMeanTemps.length !== dailyTimes.length
	) {
		throw new Error(
			`Historical weather data is incomplete or mismatched for the period ${startDate} to ${endDate}.`,
		);
	}

	return { dailyTimes, dailyMeanTemps };
}

function processTemperatureData(
	weatherData: { dailyTimes: string[]; dailyMeanTemps: (number | null)[] },
) {
	const { dailyTimes, dailyMeanTemps } = weatherData;

	const dailyTemperatures: DailyTemperature[] = dailyTimes.map(
		(date, index) => ({
			date,
			temperature:
				dailyMeanTemps[index] !== null && dailyMeanTemps[index] !== undefined
					? parseFloat(dailyMeanTemps[index]!.toFixed(2))
					: null,
		}),
	);

	const validTemps = dailyMeanTemps.filter(
		(temp): temp is number => temp !== null && temp !== undefined,
	);

	let overallAverageTemperature: number | null = null;
	if (validTemps.length > 0) {
		const sumTemp = validTemps.reduce((acc, temp) => acc + temp, 0);
		overallAverageTemperature = parseFloat(
			(sumTemp / validTemps.length).toFixed(2),
		);
	}

	return { dailyTemperatures, overallAverageTemperature };
}

function formatWeatherResponse(
	overallAverageTemperature: number,
	dailyTemperatures: DailyTemperature[],
	locationName: string,
	timelineData: TimelineData,
): WeatherResponse {
	return {
		overallAverageTemperature,
		dailyTemperatures,
		fetchedLocationName: locationName,
		daysFetched: dailyTemperatures.length,
		startDate: dailyTemperatures[0]?.date || timelineData.startDate,
		endDate:
			dailyTemperatures[dailyTemperatures.length - 1]?.date ||
			timelineData.endDate,
	};
}

function handleLocationNotFoundError(res: Response, city: string, error: any) {
	console.error(`Location not found error for city: ${city}`, error);
	return res.status(404).json({
		error: `Could not find location: ${city} using Open-Meteo Geocoding.`,
	});
}

function handleWeatherFetchError(
	res: Response,
	error: any,
	timelineData: TimelineData,
) {
	console.error(
		`Weather fetch error for period ${timelineData.startDate} to ${timelineData.endDate}:`,
		error,
	);
	return res.status(500).json({
		error: error.message || "Could not fetch historical weather data.",
	});
}

function handleGenericError(res: Response, error: any) {
	console.error("Error in GET /weather/average:", error);

	if (axios.isAxiosError(error) && error.response) {
		console.error("Axios error details:", error.response.data);
		const apiErrorMessage =
			error.response.data?.reason ||
			error.response.data?.message ||
			"Error communicating with external weather service.";
		return res
			.status(error.response.status || 500)
			.json({ error: apiErrorMessage });
	}

	return res.status(500).json({
		error:
			error.message ||
			"Failed to fetch weather data due to an internal server error.",
	});
}

weatherRouter.get("/average", handleGetWeatherAverage);

export const appRouter = {
	healthcheck: publicProcedure.handler(() => {
		return "OK";
	}),
};

export type AppRouter = typeof appRouter;
