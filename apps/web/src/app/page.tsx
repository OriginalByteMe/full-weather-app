"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  const [location, setLocation] = useState<string>("");
  const [days, setDays] = useState<number[]>([7]);
  const [averageTemperature, setAverageTemperature] = useState<number | null>(null);
  const [fetchedLocationName, setFetchedLocationName] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  interface WeatherDataResponse {
    averageTemperature: number;
    fetchedLocationName: string;
    daysFetched: number;
    startDate: string;
    endDate: string;
  }
  interface WeatherVariables {
    location: string;
    days: number;
  }

  const weatherMutation = useMutation<WeatherDataResponse, Error, WeatherVariables>({
    ...orpc.getWeatherData.mutationOptions(),
    onMutate: () => {
      setAverageTemperature(null);
      setWeatherError(null);
      setFetchedLocationName(null);
    },
    onSuccess: (data) => {
      setAverageTemperature(data.averageTemperature);
      setFetchedLocationName(data.fetchedLocationName || location); 
    },
    onError: (error: Error) => {
      console.error("Error fetching weather data:", error);
      setWeatherError(error.message || "An unknown error occurred.");
    },
  });

  const handleFetchWeather = async () => {
    const daysToSend = Math.min(Math.max(days[0], 1), 365);
    if (days[0] !== daysToSend) {
        setDays([daysToSend]);
    }
    weatherMutation.mutate({ location, days: daysToSend });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Weather Wise</CardTitle>
            <CardDescription>
              Get the average temperature for any location (up to 365 days).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between rounded-md border bg-card p-3">
              <h3 className="text-sm font-medium">API Status</h3>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full transition-colors ${
                    healthCheck.data ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {healthCheck.isLoading
                    ? "Checking..."
                    : healthCheck.data
                    ? "Connected"
                    : "Disconnected"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={weatherMutation.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="days">
                Past Days: {days[0]}
                {weatherMutation.data && weatherMutation.data.startDate && weatherMutation.data.endDate && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Range: {weatherMutation.data.startDate} - {weatherMutation.data.endDate})
                  </span>
                )}
              </Label>
              <Slider
                id="days"
                min={1}
                max={365}
                step={1}
                value={days}
                onValueChange={setDays}
                disabled={weatherMutation.isPending}
                className="py-2"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              onClick={handleFetchWeather}
              disabled={weatherMutation.isPending || !location}
              className="w-full"
            >
              {weatherMutation.isPending ? "Calculating..." : "Get Average Temperature"}
            </Button>

            {weatherError && !weatherMutation.isPending && (
              <div className="mt-4 w-full rounded-md border border-red-500 bg-destructive/10 p-3 text-center">
                <p className="text-sm font-semibold text-destructive">
                  Error: {weatherError}
                </p>
              </div>
            )}

            {weatherMutation.data && !weatherError && !weatherMutation.isPending && (
              <div className="mt-4 w-full rounded-md border bg-muted p-4 text-center">
                  <p className="text-lg">
                    Average Temperature:{" "}
                    <span className="font-semibold">
                      {weatherMutation.data.averageTemperature}°C
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location: {weatherMutation.data.fetchedLocationName}
                  </p>
                  {weatherMutation.data.startDate && weatherMutation.data.endDate && (
                    <p className="text-sm text-muted-foreground">
                      Period: {weatherMutation.data.startDate} to {weatherMutation.data.endDate}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Actual days with data: {weatherMutation.data.daysFetched}
                  </p>
              </div>
            )}
            {weatherMutation.isPending && (
                 <div className="mt-4 w-full rounded-md border bg-muted p-4 text-center">
                    <p className="text-lg font-semibold">Calculating average...</p>
                    <p className="text-sm text-muted-foreground">Please wait a moment.</p>
                 </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
