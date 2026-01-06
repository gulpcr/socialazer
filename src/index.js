// src/index.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const scraperRoutes = require('./routes/scraper.routes');
const reelscriptRoutes = require('./routes/script.routes');
const reelgenRoutes = require('./routes/reelgen.routes');
const soraRoutes = require('./routes/sora.routes.js');
const configRoutes = require('./routes/config.routes.js');
const infoRoutes = require('./routes/info.routes.js');
const suggestionsRoutes = require('./routes/suggestions.routes');
const voiceoverRoutes = require('./routes/voice.routes');
const path = require('path');



const app = express();
const PORT = process.env.PORT;

/**
 * GLOBAL CORS CONFIG
 * Allow requests from ANY origin (demo only)
*/
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Scrape Website Routes
app.use('/api/v1', scraperRoutes);
// Config Routes
app.use('/api/v1', configRoutes);
// Info Routes
app.use('/api/v1', infoRoutes);
// Reel Script Routes
app.use('/api/v1', reelscriptRoutes);
// Reel Gen Routes
app.use('/api/v1', reelgenRoutes);
// Sora routes
app.use('/api/v1', soraRoutes);
// Register routes
app.use('/api/v1', suggestionsRoutes);
// Register routes
app.use('/api/v1', voiceoverRoutes);

// IMPORTANT: Serve voiceover files as static assets
app.use('/voiceovers', express.static(path.join(__dirname, 'assets/voiceovers')));

// Simple root endpoint
app.get("/", (req, res) => {
  res.send("Express app is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});