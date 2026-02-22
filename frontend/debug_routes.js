const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/provider/dashboard',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (data.includes('Dashboard Overview')) {
            console.log('SUCCESS: content contains "Dashboard Overview"');
        } else if (data.includes('Join as a Professional')) {
            console.log('FAILURE: content contains "Join as a Professional" (Register Page)');
        } else {
            console.log('UNKNOWN CONTENT:');
            console.log(data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
