require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Define schemas and models...
const weatherSchema = new mongoose.Schema({
    main: String,
    temp: Number,
    feels_like: Number,
    dt: Date,
    city: String
  });
  
  const Weather = mongoose.model('Weather', weatherSchema);
  
  const dailySummarySchema = new mongoose.Schema({
    date: Date,
    avgTemp: Number,
    maxTemp: Number,
    minTemp: Number,
    dominantCondition: String,
    createdAt: { type: Date, default: Date.now }
  });
  
  const DailySummary = mongoose.model('DailySummary', dailySummarySchema);

  // Email setup (optional)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  }
});

// Alert thresholds
const thresholds = {
  temp: 35, // Alert if temperature exceeds 35°C
  condition: 'Rain' // Alert if the weather condition is 'Rain'
};

// Function to send alert emails
const sendAlertEmail = (city, temp) => {
  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'skmuzamil1310@gmail.com', // Change to your recipient email
      subject: `Weather Alert for ${city}`,
      text: `Alert: Temperature in ${city} exceeds the threshold of ${thresholds.temp}°C! Current temperature: ${temp}°C.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          return console.error('Error sending email:', error);
      }
      console.log('Email sent:', info.response);
  });
};

  const fetchWeatherData = async () => {
    const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];
    for (const city of cities) {
      try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
        const { main, dt } = response.data;
  
        const weatherData = new Weather({
          main: response.data.weather[0].main,
          temp: main.temp,
          feels_like: main.feels_like,
          dt: new Date(dt * 1000),
          city: city
        });
  
        await weatherData.save();
        console.log(`Weather data saved for ${city}`);

        if (main.temp > thresholds.temp) {
          console.log(`Alert: Temperature in ${city} exceeds ${thresholds.temp}°C!`);
          sendAlertEmail(city, main.temp); // Send alert email
      }

      if (response.data.weather[0].main === thresholds.condition) {
          console.log(`Alert: Weather condition in ${city} is ${thresholds.condition}!`);
          // You can also send an email alert for weather conditions if needed
      }

      } catch (error) {
        console.error(`Error fetching weather data for ${city}:`, error);
      }
    }
  };
  
  // Schedule the data fetch every 5 minutes
  cron.schedule('*/5 * * * *', fetchWeatherData);
  const calculateDailySummary = async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
    const weatherData = await Weather.find({ dt: { $gte: startOfDay } });
  
    if (weatherData.length > 0) {
      const totalTemp = weatherData.reduce((acc, curr) => acc + curr.temp, 0);
      const maxTemp = Math.max(...weatherData.map(data => data.temp));
      const minTemp = Math.min(...weatherData.map(data => data.temp));
  
      const conditionCounts = {};
      weatherData.forEach(data => {
        conditionCounts[data.main] = (conditionCounts[data.main] || 0) + 1;
      });
  
      const dominantCondition = Object.keys(conditionCounts).reduce((a, b) => conditionCounts[a] > conditionCounts[b] ? a : b);
  
      const dailySummary = new DailySummary({
        date: startOfDay,
        avgTemp: totalTemp / weatherData.length,
        maxTemp: maxTemp,
        minTemp: minTemp,
        dominantCondition: dominantCondition
      });
  
      await dailySummary.save();
      console.log('Daily summary saved:', dailySummary);
    }
  };
  
  // Schedule daily summary calculation
  cron.schedule('59 23 * * *', calculateDailySummary);
  app.get('/daily-summaries', async (req, res) => {
    try {
      const summaries = await DailySummary.find().sort({ date: -1 });
      res.json(summaries);
    } catch (error) {
      res.status(500).send('Error retrieving daily summaries');
    }
  });

  //add trigger
  app.post('/trigger-summary', async (req, res) => {
    try {
      await calculateDailySummary();
      res.send('Daily summary calculated.');
    } catch (error) {
      res.status(500).send('Error calculating daily summary');
    }
  });
  
  //test email
  app.get('/send-test-email', (req, res) => {
    const testCity = "Delhi"; // Example city
    const testTemp = 36; // Example temperature to trigger the alert
    sendAlertEmail(testCity, testTemp);
    res.send('Test email sent!');
});

  
  
  // Add alerting logic here as needed...
  if (require.main === module) {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
  
  // Export the app for testing
  module.exports = app;
        