describe('Weather Form Functionality', () => {
  beforeEach(() => {
    // Setup intercepts for both the healthcheck and weather API calls
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      statusCode: 200,
      body: 'OK',
      delay: 0
    }).as('healthCheck');
    
    // Visit the homepage before each test
    cy.visit('/');
    cy.wait('@healthCheck');
    cy.wait(100);
  });

  it('should update days display when slider is moved', () => {
    // Initial value should be 7
    cy.get('[data-testid="days-display"]').should('contain', 'Past Days: 7');
    
    // Find the slider container and get its dimensions
    cy.get('[data-testid="days-slider"]').then($slider => {
      const sliderRect = $slider[0].getBoundingClientRect();
      const sliderWidth = sliderRect.width;
      
      // Calculate a position that's about 80% along the slider
      // This should give us a higher value than the default (7)
      const x = sliderRect.left + (sliderWidth * 0.8);
      const y = sliderRect.top + (sliderRect.height / 2);
      
      // Perform a click at that position on the slider track
      cy.get('[data-testid="days-slider"]')
        .click(x - sliderRect.left, y - sliderRect.top);
    });
    
    // Wait for UI to update
    cy.wait(200);
    
    // We can't assert an exact value since the click position doesn't guarantee
    // a specific value, but we can check that it's no longer at the default value
    cy.get('[data-testid="days-display"]')
      .should('not.contain', 'Past Days: 7')
      .invoke('text')
      .then((text) => {
        // Check that the text includes a number greater than 7
        const matches = text.match(/Past Days: (\d+)/);
        if (matches && matches[1]) {
          const daysValue = parseInt(matches[1], 10);
          expect(daysValue).to.be.greaterThan(7);
        }
      });
  });

  it('should display loading state when submitting a valid city', () => {
    // Setup intercepts for successful geocoding and weather data
    cy.intercept('GET', 'http://localhost:3000/weather/average*', req => {
      // Delay response to show loading state
      req.reply({
        delay: 1000,
        statusCode: 200,
        body: {
          overallAverageTemperature: 15.7,
          dailyTemperatures: [
            { date: '2025-05-18', temperature: 15.2 },
            { date: '2025-05-19', temperature: 16.1 },
            { date: '2025-05-20', temperature: 15.8 }
          ],
          fetchedLocationName: 'London',
          daysFetched: 7,
          startDate: '2025-05-18',
          endDate: '2025-05-24'
        }
      });
    }).as('weatherRequest');

    // Enter a city name
    cy.get('[data-testid="location-input"]')
      .type('London');
    
    // Click the submit button
    cy.get('[data-testid="submit-button"]').click();
    
    // Check loading state appears
    cy.get('[data-testid="loading-indicator"]').should('be.visible');
    cy.get('[data-testid="submit-button"]').should('be.disabled');
    
    // Wait for API response
    cy.wait('@weatherRequest');
    
    // Check loading disappears and results appear
    cy.get('[data-testid="loading-indicator"]').should('not.exist');
    cy.get('[data-testid="temperature-result"]').should('be.visible');
    cy.get('[data-testid="temperature-chart"]').should('be.visible');
  });

  it('should display temperature results for a valid location with default days', () => {
    // Mock successful weather request
    cy.intercept('GET', 'http://localhost:3000/weather/average*', {
      statusCode: 200,
      body: {
        overallAverageTemperature: 22.5,
        dailyTemperatures: [
          { date: '2025-05-18', temperature: 21.5 },
          { date: '2025-05-19', temperature: 22.0 },
          { date: '2025-05-20', temperature: 23.0 },
          { date: '2025-05-21', temperature: 22.7 },
          { date: '2025-05-22', temperature: 22.8 },
          { date: '2025-05-23', temperature: 23.1 },
          { date: '2025-05-24', temperature: 22.4 }
        ],
        fetchedLocationName: 'San Francisco',
        daysFetched: 7,
        startDate: '2025-05-18',
        endDate: '2025-05-24'
      }
    }).as('weatherRequest');

    // Enter a location
    cy.get('[data-testid="location-input"]')
      .type('San Francisco');
    
    // Submit the form
    cy.get('[data-testid="submit-button"]').click();
    
    // Wait for API response
    cy.wait('@weatherRequest');
    
    // Verify results displayed
    cy.get('[data-testid="temperature-result"]')
      .should('be.visible')
      .should('contain', '22.5°C');
    
    // Verify date range is displayed
    cy.get('[data-testid="date-range"]')
      .should('be.visible')
      .should('contain', '2025-05-18')
      .should('contain', '2025-05-24');
    
    // Verify chart is displayed
    cy.get('[data-testid="temperature-chart"]').should('be.visible');
  });

  it('should display error message for an invalid location', () => {
    // Mock failed weather request for non-existent location
    cy.intercept('GET', 'http://localhost:3000/weather/average*', {
      statusCode: 404,
      body: {
        error: 'Location not found'
      }
    }).as('weatherRequestFailed');

    // Enter an invalid location
    cy.get('[data-testid="location-input"]')
      .type('NonExistentPlace123');
    
    // Submit the form
    cy.get('[data-testid="submit-button"]').click();
    
    // Wait for API response
    cy.wait('@weatherRequestFailed');
    
    // Verify error message is displayed
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .should('contain', 'Location not found');
    
    // Verify results are not displayed
    cy.get('[data-testid="temperature-result"]').should('not.exist');
    cy.get('[data-testid="temperature-chart"]').should('not.exist');
  });

  it('should submit form with custom days value and show correct data', () => {
    // Mock successful weather request that handles any days parameter
    cy.intercept('GET', /\/weather\/average\?.*/, req => {
      // Extract the 'days' parameter from the URL
      const daysParam = new URLSearchParams(req.url.split('?')[1]).get('days');
      
      const mockResponse = {
        overallAverageTemperature: 18.3,
        dailyTemperatures: Array(parseInt(daysParam || '7')).fill(null).map((_, i) => ({
          date: `2025-04-${25 + i}`,
          temperature: 18 + Math.random() * 2
        })),
        fetchedLocationName: 'Tokyo',
        daysFetched: parseInt(daysParam || '7'),
        startDate: '2025-04-25',
        endDate: '2025-05-24'
      };
      
      req.reply({
        statusCode: 200,
        body: mockResponse
      });
    }).as('weatherRequest');

    // Enter a location
    cy.get('[data-testid="location-input"]')
      .type('Tokyo');
    
    // Use the same click approach to set the slider to a higher value
    cy.get('[data-testid="days-slider"]').then($slider => {
      const sliderRect = $slider[0].getBoundingClientRect();
      const sliderWidth = sliderRect.width;
      
      // Calculate a position that's about 80% along the slider to get around 30 days
      const x = sliderRect.left + (sliderWidth * 0.8);
      const y = sliderRect.top + (sliderRect.height / 2);
      
      // Click at the calculated position
      cy.get('[data-testid="days-slider"]')
        .click(x - sliderRect.left, y - sliderRect.top);
    });
    
    cy.wait(200); // Give the UI time to update
    
    // Verify days display is updated to a higher value than default
    cy.get('[data-testid="days-display"]')
      .should('not.contain', 'Past Days: 7')
      .invoke('text')
      .then((text) => {
        // Extract the days value and confirm it increased from default
        const matches = text.match(/Past Days: (\d+)/);
        if (matches && matches[1]) {
          const daysValue = parseInt(matches[1], 10);
          expect(daysValue).to.be.greaterThan(7);
          // Store the actual days value for the API test
          cy.wrap(daysValue).as('actualDaysValue');
        }
      });
    
    // Submit the form
    cy.get('[data-testid="submit-button"]').click();
    
    // Wait for API response
    cy.wait('@weatherRequest');
    
    // Verify results with 30 days of data
    cy.get('[data-testid="temperature-result"]')
      .should('be.visible')
      .should('contain', '18.3°C');
    
    cy.get('[data-testid="date-range"]')
      .should('contain', 'Range: 2025-04-25 - 2025-05-24');
    
    // Verify chart is displayed
    cy.get('[data-testid="temperature-chart"]').should('be.visible');
  });
  
  it('should disable submit button when location is empty', () => {
    // Check button is initially disabled when location is empty
    cy.get('[data-testid="submit-button"]').should('be.disabled');
    
    // Enter location and verify button becomes enabled
    cy.get('[data-testid="location-input"]')
      .type('Berlin');
    cy.get('[data-testid="submit-button"]').should('not.be.disabled');
    
    // Clear location and verify button becomes disabled again
    cy.get('[data-testid="location-input"]')
      .clear();
    cy.get('[data-testid="submit-button"]').should('be.disabled');
  });
});
