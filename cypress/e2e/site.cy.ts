describe('get-fable public site', () => {
  it('renders the core positioning and documentation entry point', () => {
    cy.visit('/');
    cy.get('h1').should('contain.text', 'What if the model you already use');
    cy.get('a[href="docs.html"]').first().should('be.visible');
    cy.request('/docs.html').its('status').should('eq', 200);
  });

  it('updates the terminal simulator when a command tab is selected', () => {
    cy.visit('/');
    cy.get('.term-tab[data-cmd="serve"]').click();
    cy.get('.term-tab[data-cmd="serve"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#terminal-body').should('contain.text', 'bun ./bin/get-fable.js serve 8080');
    cy.get('#terminal-body').should('contain.text', 'POST /v1/chat/completions');
  });
});
