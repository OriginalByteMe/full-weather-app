import { publicProcedure } from "../lib/orpc";
import { z } from "zod";
import axios from "axios";
import express, { type Router, type Request, type Response, type NextFunction } from 'express';

const GetWeatherAverageQuerySchema = z.object({
  city: z.string().min(1, "City name is required."),
  days: z.coerce.number().int().min(1).max(365, "Days must be an integer between 1 and 365."),
});

export const weatherRouter: Router = express.Router();

async function handleGetWeatherAverage(req: Request, res: Response, next: NextFunction) {
  try {
    const validationResult = GetWeatherAverageQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid query parameters", details: validationResult.error.format() });
    }

    const { city, days } = validationResult.data;

    let lat: number, lon: number;
    let geocodedLocationName: string = city;

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search`;
    const geoResponse = await axios.get(geoUrl, {
      params: {
        name: city,
        count: 1,
        language: 'en',
        format: 'json',
      },
    });

    if (geoResponse.data && geoResponse.data.results && geoResponse.data.results.length > 0) {
      const topResult = geoResponse.data.results[0];
      lat = topResult.latitude;
      lon = topResult.longitude;
      geocodedLocationName = topResult.name;
    } else {
      return res.status(404).json({ error: `Could not find location: ${city} using Open-Meteo Geocoding.` });
    }

    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    const today = new Date();
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() - 6);
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(endDateObj.getDate() - (days - 1));

    const startDate = formatDate(startDateObj);
    const endDate = formatDate(endDateObj);

    // Fetch historical weather data (Open-Meteo Archive API)
    const weatherUrl = `https://archive-api.open-meteo.com/v1/archive`;
    const weatherResponse = await axios.get(weatherUrl, {
      params: {
        latitude: lat,
        longitude: lon,
        start_date: startDate,
        end_date: endDate,
        daily: 'temperature_2m_mean',
        timezone: 'auto',
      },
    });

    if (!weatherResponse.data || !weatherResponse.data.daily || !weatherResponse.data.daily.time || !weatherResponse.data.daily.temperature_2m_mean) {
      return res.status(500).json({ error: "Could not fetch historical weather data or data is incomplete from Open-Meteo." });
    }

    const dailyTimes = weatherResponse.data.daily.time as string[];
    const dailyMeanTemps = weatherResponse.data.daily.temperature_2m_mean as (number | null)[];

    if (!dailyTimes || !dailyMeanTemps || dailyTimes.length === 0 || dailyMeanTemps.length !== dailyTimes.length) {
      return res.status(500).json({ error: `Historical weather data is incomplete or mismatched for the period ${startDate} to ${endDate}.` });
    }

    const dailyTemperatures = dailyTimes.map((date, index) => ({
      date,
      temperature: dailyMeanTemps[index] !== null && dailyMeanTemps[index] !== undefined ? parseFloat(dailyMeanTemps[index]!.toFixed(2)) : null,
    }));

    const validTemps = dailyMeanTemps.filter(
      (temp): temp is number => temp !== null && temp !== undefined
    );

    let overallAverageTemperatureCalc: number | null = null;
    if (validTemps.length > 0) {
      const sumTemp = validTemps.reduce((acc, temp) => acc + temp, 0);
      overallAverageTemperatureCalc = parseFloat((sumTemp / validTemps.length).toFixed(2));
    } else {
      return res.status(404).json({
        error: `No temperature data points found for ${geocodedLocationName} between ${startDate} and ${endDate}.`
      });
    }

    res.json({
      overallAverageTemperature: overallAverageTemperatureCalc,
      dailyTemperatures,
      fetchedLocationName: geocodedLocationName,
      daysFetched: dailyTemperatures.length,
      startDate: dailyTemperatures[0]?.date || startDate,
      endDate: dailyTemperatures[dailyTemperatures.length - 1]?.date || endDate,
    });

  } catch (error: any) {
    console.error("Error in GET /weather/average:", error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Axios error details:", error.response.data);
      const apiErrorMessage = error.response.data?.reason || error.response.data?.message || 'Error communicating with external weather service.';
      return res.status(error.response.status || 500).json({ error: apiErrorMessage });
    }
    res.status(500).json({ error: error.message || "Failed to fetch weather data due to an internal server error." });
  }
}

weatherRouter.get('/average', handleGetWeatherAverage);

export const appRouter = {
  healthcheck: publicProcedure.handler(() => {
    return "OK";
  }),
};

export type AppRouter = typeof appRouter;
