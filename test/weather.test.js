// test/weather.test.js

const request = require('supertest');
const app = require('../server'); // Adjust the path based on your project structure

describe('Weather API Tests', () => {
  it('should respond with a 200 status code for daily summaries', async () => {
    const response = await request(app).get('/daily-summaries');
    expect(response.statusCode).toBe(200);
  });

  it('should return an array of daily summaries', async () => {
    const response = await request(app).get('/daily-summaries');
    expect(Array.isArray(response.body)).toBe(true);
  });
});
