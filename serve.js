const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the public directory
app.use(express.static('public'));

// Handle routes that end with .html
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.params.page + '.html'));
});

// Handle the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle blog routes
app.get('/blog/*', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', req.path), err => {
        if (err) next();
    });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
}); 