const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/styles.css',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`CONTENT-TYPE: ${res.headers['content-type']}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200 && data.length > 0) {
            console.log('SUCCESS: styles.css served. Length:', data.length);
            console.log('First 50 chars:', data.substring(0, 50));
        } else {
            console.log('FAILURE: styles.css not served correctly.');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
