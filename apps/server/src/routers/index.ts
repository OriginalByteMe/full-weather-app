import { publicProcedure } from "../lib/orpc";
import { z } from "zod";
import axios from "axios";

const GetWeatherDataInput = z.object({
  location: z.string().min(1, "Location is required."),
  days: z.number().int().min(1).max(365, "Days must be between 1 and 365 for historical data."),
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),

  getWeatherData: publicProcedure
    .input(GetWeatherDataInput)
    .handler(async ({ input }) => {
      const { location, days } = input;
      // Open-Meteo does not require an API key for geocoding or weather data for non-commercial use.

      try {
        let lat: number, lon: number;
        let geocodedLocationName: string = location; // Default to user input if geocoding fails to find a better name

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search`;
        const geoResponse = await axios.get(geoUrl, {
          params: {
            name: location, // The location query string
            count: 1,       // We only want the top result
            language: 'en', // Optional: for English names
            format: 'json',   // Default, but explicit
          },
        });

        if (geoResponse.data && geoResponse.data.results && geoResponse.data.results.length > 0) {
          const topResult = geoResponse.data.results[0];
          lat = topResult.latitude;
          lon = topResult.longitude;
          geocodedLocationName = topResult.name; // Use the name from Open-Meteo's geocoding result
        } else {
          throw new Error(`Could not find location: ${location} using Open-Meteo Geocoding.`);
        }

        // Calculate date range for Open-Meteo
        const formatDate = (date: Date): string => date.toISOString().split('T')[0];
        
        const today = new Date();
        const endDateObj = new Date(today);
        endDateObj.setDate(today.getDate() - 6); 
        
        const startDateObj = new Date(endDateObj);
        startDateObj.setDate(endDateObj.getDate() - (days - 1)); 

        const startDate = formatDate(startDateObj);
        const endDate = formatDate(endDateObj);
        const weatherUrl = `https://archive-api.open-meteo.com/v1/archive`;
        const weatherResponse = await axios.get(weatherUrl, {
          params: {
            latitude: lat,
            longitude: lon,
            start_date: startDate,
            end_date: endDate,
            daily: 'temperature_2m_mean', // Request daily mean temperature at 2 meters
            timezone: 'auto', // Automatically detect timezone
          },
        });

        if (!weatherResponse.data || !weatherResponse.data.daily || !weatherResponse.data.daily.time || !weatherResponse.data.daily.temperature_2m_mean) {
          throw new Error("Could not fetch historical weather data or data is incomplete from Open-Meteo.");
        }

        const dailyTimes = weatherResponse.data.daily.time as string[];
        const dailyMeanTemps = weatherResponse.data.daily.temperature_2m_mean as number[];

        if (dailyMeanTemps.length === 0) {
          throw new Error(`No historical temperature data available for the period ${startDate} to ${endDate}.`);
        }

        // Filter out any null or non-numeric temperatures if Open-Meteo can return them
        const validTemps = dailyMeanTemps.filter(temp => typeof temp === 'number' && !isNaN(temp));
        
        if (validTemps.length === 0) {
          throw new Error(`All temperature data for the period ${startDate} to ${endDate} was invalid.`);
        }

        const averageTemperature = validTemps.reduce((sum, temp) => sum + temp, 0) / validTemps.length;

        return {
          averageTemperature: parseFloat(averageTemperature.toFixed(2)),
          fetchedLocationName: geocodedLocationName, // Use the name from geocoding API
          daysFetched: validTemps.length,
          startDate,
          endDate,
        };

      } catch (error: any) {
        console.error("Error in getWeatherData:", error.message);
        if (axios.isAxiosError(error) && error.response) {
          console.error("Axios error details:", error.response.data);
          throw new Error(`API Error: ${error.response.data.message || error.message}`);
        }
        throw new Error(error.message || "Failed to fetch weather data.");
      }
    }),
};

export type AppRouter = typeof appRouter;
