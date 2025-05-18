module.exports = {
  testDir: './Automations/tests',
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results' }]
  ],
  timeout: 60000,
};
