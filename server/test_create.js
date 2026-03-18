const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/characters',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
    // Intentionally no token to see if it returns 401 JSON or crash
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
});

// Write data to request body
req.write(JSON.stringify({ name: 'testchar', isIronman: false }));
req.end();
