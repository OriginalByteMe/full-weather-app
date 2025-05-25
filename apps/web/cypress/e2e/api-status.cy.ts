describe('API Status Component', () => {
  beforeEach(() => {
    // Reset the network interception before each test
    cy.intercept('GET', 'http://localhost:3000/healthcheck').as('healthCheckDefault');
  });

  it('should display green status when backend is healthy', () => {
    // Intercept the health check API request and respond with success
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      statusCode: 200,
      body: 'OK',
      delay: 0 
    }).as('healthCheck');

    cy.visit('/');
    
    cy.wait('@healthCheck');

    cy.wait(100);

    // Check if the status indicator is green
    cy.get('[data-testid="api-status-indicator"]')
      .should('have.class', 'bg-green-500')
      .and('not.have.class', 'bg-red-500');
    
    // Check if the status text shows "Connected"
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Connected')
      .and('not.contain.text', 'Disconnected')
      .and('not.contain.text', 'Checking...');

    cy.get('[data-testid="api-status-indicator"]')
      .should('be.visible')
      .should('have.css', 'border-radius').and('not.equal', '0px');
  });

  it('should display red status when backend is unhealthy', () => {
    // Intercept the health check API request and respond with an error
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      statusCode: 500,
      body: 'Error',
      delay: 0 
    }).as('healthCheckError');

    cy.visit('/');
    
    cy.wait('@healthCheckError');

    // Give the UI a moment to update after the health check completes, as it may take a moment to render
    cy.wait(100);

    cy.get('[data-testid="api-status-indicator"]')
      .should('have.class', 'bg-red-500')
      .and('not.have.class', 'bg-green-500');
    
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Disconnected')
      .and('not.contain.text', 'Connected')
      .and('not.contain.text', 'Checking...');
  });

  it('should display loading state when health check is pending', () => {
    // Intercept health check request but don't resolve it immediately
    cy.intercept('GET', 'http://localhost:3000/healthcheck', (req) => {
      // Delay the response to simulate loading state
      req.on('response', (res) => {
        res.setDelay(2000); // 2 second delay
      });
    }).as('delayedHealthCheck');

    cy.visit('/');

    cy.wait(100);
    
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Checking...');
      
    // Wait for the delayed health check to complete
    cy.wait('@delayedHealthCheck', { timeout: 3000 });
  });

  it('should update status when backend health changes', () => {
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      statusCode: 200,
      body: 'OK',
      delay: 0
    }).as('healthyCheck');

    cy.visit('/');
    cy.wait('@healthyCheck');
    cy.wait(100);

    cy.get('[data-testid="api-status-indicator"]')
      .should('have.class', 'bg-green-500');
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Connected');

    // Change intercept: API becomes unhealthy
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      statusCode: 500,
      body: 'Error',
      delay: 0
    }).as('unhealthyCheck');

    // Trigger a re-check (by reloading the page)
    cy.reload();
    cy.wait('@unhealthyCheck');
    cy.wait(100); 

    // Verify disconnected status
    cy.get('[data-testid="api-status-indicator"]')
      .should('have.class', 'bg-red-500');
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Disconnected');
  });

  it('should handle network failures gracefully', () => {
    // Simulate a network failure
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      forceNetworkError: true,
      delay: 0 
    }).as('networkError');

    cy.visit('/');
    cy.wait('@networkError');
    cy.wait(100); 

    // Should show as disconnected
    cy.get('[data-testid="api-status-indicator"]')
      .should('have.class', 'bg-red-500')
      .and('not.have.class', 'bg-green-500');
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Disconnected')
      .and('not.contain.text', 'Connected')
      .and('not.contain.text', 'Checking...');
  });

  it('should display "Checking..." during API status check', () => {
    cy.intercept('GET', 'http://localhost:3000/healthcheck', {
      delay: 1000, 
      statusCode: 200,
      body: 'OK'
    }).as('delayedHealthCheck');

    cy.visit('/');
    
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Checking...');
    
    cy.wait('@delayedHealthCheck');
    
    cy.get('[data-testid="api-status-text"]')
      .should('contain.text', 'Connected');
  });
});
