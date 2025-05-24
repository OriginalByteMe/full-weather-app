"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  const [location, setLocation] = useState<string>("");
  const [days, setDays] = useState<number[]>([7]); // Slider value is an array
  const [averageTemperature, setAverageTemperature] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFetchWeather = async () => {
    setIsLoading(true);
    setAverageTemperature(null);
    console.log("Fetching weather for:", location, "for", days[0], "days");
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // In a real scenario, you'd call your backend here:
    // try {
    //   const result = await orpc.getAverageTemperature.mutate({ location, days: days[0] });
    //   setAverageTemperature(result.averageTemp);
    // } catch (error) {
    //   console.error("Error fetching weather data:", error);
    //   // Handle error display to user, e.g., using a toast notification
    // }
    setAverageTemperature(Math.floor(Math.random() * 15) + 5); // Placeholder result
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Weather Wise</CardTitle>
            <CardDescription>
              Get the average temperature for any location.
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
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="days">Number of Days: {days[0]}</Label>
              <Slider
                id="days"
                min={1}
                max={30}
                step={1}
                value={days}
                onValueChange={setDays}
                disabled={isLoading}
                className="py-2"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              onClick={handleFetchWeather}
              disabled={isLoading || !location}
              className="w-full"
            >
              {isLoading ? "Calculating..." : "Get Average Temperature"}
            </Button>
            {averageTemperature !== null && !isLoading && (
              <div className="mt-4 w-full rounded-md border bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Average temperature for {location} over {days[0]} days:
                </p>
                <p className="text-3xl font-bold">{averageTemperature}°C</p>
              </div>
            )}
            {isLoading && (
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
