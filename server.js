const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Standard middleware to pass JSON payloads safely
app.use(express.json());

// Tell Node.js to serve your index.html and app.js static files
app.use(express.static(path.join(__dirname, './')));

// Fallback routing rule to display the web application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fire up the pipeline
app.listen(PORT, () => {
    console.log(`Server executing seamlessly on port ${PORT}`);
});
