import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import express from 'express';
import supertest from 'supertest';
import axios from 'axios';
import { weatherRouter } from '../index';

describe('Weather API Endpoints', () => {
  const app = express();
  app.use('/weather', weatherRouter);
  const request = supertest(app);

  describe('GET /weather/average - Input Validation', () => {
    test('should return 400 if city parameter is missing', async () => {
      const response = await request.get('/weather/average?days=7');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
    });

    test('should return 400 if days parameter is missing', async () => {
      const response = await request.get('/weather/average?city=London');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
    });

    test('should return 400 if days parameter is invalid (below minimum)', async () => {
      const response = await request.get('/weather/average?city=London&days=0');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
    });

    test('should return 400 if days parameter is invalid (above maximum)', async () => {
      const response = await request.get('/weather/average?city=London&days=366');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
    });

    test('should return 400 if days parameter is not a number', async () => {
      const response = await request.get('/weather/average?city=London&days=abc');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
    });
  });

  describe('GET /weather/average - Unit Tests (Mocked APIs)', () => {
    // Store original axios.get to restore after tests
    const originalGet = axios.get;
    let axiosGetMock: ReturnType<typeof mock>;
    
    beforeEach(() => {
      // Create a fresh mock for each test using bun (buns wrapper for the jest mock function)
      axiosGetMock = mock(function mockAxiosGet(url: string, config?: any) {
        return Promise.resolve({ data: {} });
      });
      // Replace axios.get with our mock
      axios.get = axiosGetMock;
    });
    
    afterEach(() => {
      // Restore original axios.get after each test
      axios.get = originalGet;
    });

    test('should calculate correct average temperature with integer values', async () => {
      const city = 'TestCity';
      const days = 5;
      const temperatures = [10, 20, 30, 40, 50]; 
      
      axiosGetMock.mockImplementation((url: string, config?: any) => {
        if (url.includes('geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            data: {
              results: [{
                name: city,
                latitude: 40.7128,
                longitude: -74.0060
              }]
            }
          });
        }
        
        return Promise.resolve({
          data: {
            daily: {
              time: ['2025-05-19', '2025-05-20', '2025-05-21', '2025-05-22', '2025-05-23'],
              temperature_2m_mean: temperatures
            }
          }
        });
      });
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body.overallAverageTemperature).toBe(30); 
      expect(response.body.daysFetched).toBe(days);
      expect(response.body.fetchedLocationName).toBe(city);
    });

    test('should calculate correct average temperature with decimal values', async () => {
      const city = 'TestCity';
      const days = 4;
      const temperatures = [10.5, 20.5, 30.5, 40.5]; 
      
      axiosGetMock.mockImplementation((url: string, config?: any) => {
        if (url.includes('geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            data: {
              results: [{
                name: city,
                latitude: 40.7128,
                longitude: -74.0060
              }]
            }
          });
        }

        return Promise.resolve({
          data: {
            daily: {
              time: ['2025-05-19', '2025-05-20', '2025-05-21', '2025-05-22'],
              temperature_2m_mean: temperatures
            }
          }
        });
      });
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body.overallAverageTemperature).toBe(25.5); 
      expect(response.body.daysFetched).toBe(days);
    });

    test('should handle null temperature values in calculation', async () => {
      const city = 'TestCity';
      const days = 5;
      const temperatures = [10, null, 30, null, 50]; 
      
      axiosGetMock.mockImplementation((url: string, config?: any) => {
        if (url.includes('geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            data: {
              results: [{
                name: city,
                latitude: 40.7128,
                longitude: -74.0060
              }]
            }
          });
        }
        
        return Promise.resolve({
          data: {
            daily: {
              time: ['2025-05-19', '2025-05-20', '2025-05-21', '2025-05-22', '2025-05-23'],
              temperature_2m_mean: temperatures
            }
          }
        });
      });
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body.overallAverageTemperature).toBe(30); 
      expect(response.body.daysFetched).toBe(days);
    });
    
    test('should round average temperature to 2 decimal places', async () => {
      const city = 'TestCity';
      const days = 3;
      const temperatures = [10, 20, 30.555]; 
      
      axiosGetMock.mockImplementation((url: string, config?: any) => {
        if (url.includes('geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            data: {
              results: [{
                name: city,
                latitude: 40.7128,
                longitude: -74.0060
              }]
            }
          });
        }
        
        return Promise.resolve({
          data: {
            daily: {
              time: ['2025-05-19', '2025-05-20', '2025-05-21'],
              temperature_2m_mean: temperatures
            }
          }
        });
      });
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body.overallAverageTemperature).toBe(20.18); 
    });
  });

  describe('GET /weather/average - Integration Tests (Real API Calls)', () => {

    test('should return valid weather data for a real city with 7 days', async () => {
      const city = 'London';
      const days = 7;
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallAverageTemperature');
      expect(typeof response.body.overallAverageTemperature).toBe('number');
      expect(response.body).toHaveProperty('fetchedLocationName');
      expect(response.body).toHaveProperty('daysFetched');
      expect(response.body.daysFetched).toBe(days);
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      
      expect(response.body).toHaveProperty('dailyTemperatures');
      expect(Array.isArray(response.body.dailyTemperatures)).toBe(true);
      expect(response.body.dailyTemperatures.length).toBe(days);
      
      const firstDay = response.body.dailyTemperatures[0];
      expect(firstDay).toHaveProperty('date');
      expect(firstDay).toHaveProperty('temperature');
    });
    
    test('should return valid weather data for a real city with 30 days', async () => {
      const city = 'Tokyo';
      const days = 30;
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallAverageTemperature');
      expect(typeof response.body.overallAverageTemperature).toBe('number');
      expect(response.body.daysFetched).toBe(days);
      expect(response.body.dailyTemperatures.length).toBe(days);
    });

    test('should handle cities with special characters', async () => {
      const city = 'São Paulo';
      const days = 7;
      
      const response = await request.get(`/weather/average?city=${encodeURIComponent(city)}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallAverageTemperature');
      expect(response.body.fetchedLocationName).toContain('Paulo'); // May not match exactly due to API normalization
    });

    test('should handle very recent data request (1 day)', async () => {
      const city = 'Berlin';
      const days = 1; 
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallAverageTemperature');
      expect(response.body.daysFetched).toBe(days);
      expect(response.body.dailyTemperatures.length).toBe(days);
    });

    test('should handle longer historical period (365 days)', async () => {
      const city = 'Sydney';
      const days = 365; 
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overallAverageTemperature');
      expect(response.body.daysFetched).toBeGreaterThan(300); 
      expect(response.body.dailyTemperatures.length).toBeGreaterThan(300);
      expect(response.body.overallAverageTemperature).toBeGreaterThan(-100);
      expect(response.body.overallAverageTemperature).toBeLessThan(100);
    });

    test('should return 404 for non-existent locations', async () => {
      const city = 'XyZabCdEfGhIjKlMnOpQrStUvWxYz123456789';
      const days = 7;
      
      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Could not find location');
    });

    test('should handle ambiguous city names with best match', async () => {
      // 'Springfield' exists in multiple locations
      const city = 'Springfield';
      const days = 7;
      

      const response = await request.get(`/weather/average?city=${city}&days=${days}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fetchedLocationName');
      expect(response.body.fetchedLocationName).toContain('Springfield');
    });
  });
});
