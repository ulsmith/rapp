// Config
var PORT = 80;
var express = require('express');
var app = express();
var path = require("path");

/* Application */

// Static files
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/build', express.static(__dirname + '/build'));
app.use('/src', express.static(__dirname + '/src'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

// Routing - Index
app.get('*', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Start
app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
