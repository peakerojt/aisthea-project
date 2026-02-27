
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/products?search=' + encodeURIComponent('áo'),
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Search Results for "ao":', JSON.stringify(JSON.parse(data), null, 2));
    });
});

req.on('error', (error) => {
    console.error('Search failed:', error.message);
});

req.end();
