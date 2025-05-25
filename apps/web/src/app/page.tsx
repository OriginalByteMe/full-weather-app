"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as RechartsPrimitive from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const healthCheck = useQuery({
    queryKey: ['healthcheck'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3000/healthcheck', {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return await response.text();
    }
  });

  const [location, setLocation] = useState<string>("");
  const [days, setDays] = useState<number[]>([7]);
  const [overallAverageTemperature, setOverallAverageTemperature] = useState<number | null>(null);
  const [dailyChartData, setDailyChartData] = useState<Array<{ date: string; temperature: number | null; }>>([]);
  const [fetchedLocationName, setFetchedLocationName] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  interface DailyTemperaturePoint {
    date: string;
    temperature: number | null;
  }
  interface WeatherDataResponse {
    overallAverageTemperature: number | null;
    dailyTemperatures: DailyTemperaturePoint[];
    fetchedLocationName: string;
    daysFetched: number;
    startDate: string;
    endDate: string;
  }
  interface WeatherVariables {
    location: string;
    days: number;
  }

  const chartConfig = {
    temperature: {
      label: "Temperature",
      color: "hsl(221.2 83.2% 53.3%)", // A nice blue color
    },
  } satisfies ChartConfig;

    const fetchWeatherData = async (variables: WeatherVariables): Promise<WeatherDataResponse> => {
    const { location, days } = variables;
    // TODO: Use environment variable for API base URL instead of hardcoding
    const response = await fetch(`http://localhost:3000/weather/average?city=${encodeURIComponent(location)}&days=${days}`);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Request failed with status ${response.status}. Could not parse error response.`);
      }
      throw new Error(errorData?.error || errorData?.message || `Request failed with status ${response.status}`);
    }
    return response.json();
  };

  const weatherMutation = useMutation<WeatherDataResponse, Error, WeatherVariables>({
    mutationFn: fetchWeatherData,
    onMutate: () => {
      setOverallAverageTemperature(null);
      setDailyChartData([]);
      setWeatherError(null);
      setFetchedLocationName(null);
    },
    onSuccess: (data) => {
      setOverallAverageTemperature(data.overallAverageTemperature);
      setDailyChartData(data.dailyTemperatures.map(p => ({ ...p, date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })));
      setFetchedLocationName(data.fetchedLocationName);
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
                  data-testid="api-status-indicator"
                  className={`h-3 w-3 rounded-full transition-colors ${
                    healthCheck.data ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span 
                  data-testid="api-status-text"
                  className="text-sm text-muted-foreground"
                >
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
                data-testid="location-input"
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={weatherMutation.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="days">
                <span data-testid="days-display">Past Days: {days[0]}</span>
                {weatherMutation.data && weatherMutation.data.startDate && weatherMutation.data.endDate && (
                  <span data-testid="date-range" className="text-sm text-muted-foreground ml-2">
                    (Range: {weatherMutation.data.startDate} - {weatherMutation.data.endDate})
                  </span>
                )}
              </Label>
              <Slider
                data-testid="days-slider"
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
              data-testid="submit-button"
              onClick={handleFetchWeather}
              disabled={weatherMutation.isPending || !location}
              className="w-full"
            >
              {weatherMutation.isPending ? "Calculating..." : "Get Average Temperature"}
            </Button>

            {weatherMutation.isPending && (
              <div data-testid="loading-indicator" className="mt-4 w-full rounded-md border bg-muted p-4 text-center">
                <p className="text-lg font-semibold">Calculating average...</p>
                <p className="text-sm text-muted-foreground">Please wait a moment.</p>
              </div>
            )}

            {weatherError && !weatherMutation.isPending && !weatherMutation.isSuccess && (
              <div data-testid="error-message" className="mt-4 w-full rounded-md border border-red-500 bg-destructive/10 p-3 text-center">
                <p className="text-sm font-semibold text-destructive">
                  Error: {weatherError}
                </p>
              </div>
            )}

            {weatherMutation.isSuccess && fetchedLocationName && !weatherMutation.isPending && !weatherError && (
              <Card className="mt-4 w-full">
                <CardHeader>
                  <CardTitle>Historical Weather</CardTitle>
                  <CardDescription>
                    Historical daily average temperatures for {fetchedLocationName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {overallAverageTemperature !== null && (
                    <div data-testid="temperature-result" className="text-center mb-4">
                      <p className="text-2xl font-bold">Overall Average: {overallAverageTemperature}°C</p>
                      <p className="text-xs text-muted-foreground">
                        For period: {weatherMutation.data?.startDate} to {weatherMutation.data?.endDate} ({weatherMutation.data?.daysFetched} days)
                      </p>
                    </div>
                  )}
                  {dailyChartData.length > 0 && (
                    <div data-testid="temperature-chart" className="w-full">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                          <RechartsPrimitive.AreaChart data={dailyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-temperature)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <RechartsPrimitive.XAxis 
                              dataKey="date" 
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                            />
                            <RechartsPrimitive.YAxis 
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) => `${value}°C`}
                              domain={['auto', 'auto']}
                            />
                            <ChartTooltip 
                              cursor={true} 
                              content={<ChartTooltipContent indicator="line" nameKey="temperature" hideLabel />} 
                            />
                            <RechartsPrimitive.Area 
                              dataKey="temperature" 
                              type="monotone" 
                              stroke="var(--color-temperature)" 
                              fillOpacity={1}
                              fill="url(#colorTemperature)"
                              strokeWidth={2} 
                              dot={false} 
                              activeDot={{ r: 6, strokeWidth: 2 }}
                            />
                          </RechartsPrimitive.AreaChart>
                        </RechartsPrimitive.ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}
                  {dailyChartData.length === 0 && overallAverageTemperature === null && (
                     <p className="text-center text-muted-foreground">No temperature data available for the selected period.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
