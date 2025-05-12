const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', d => {
    console.log('Response:', d.toString());
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end(); 