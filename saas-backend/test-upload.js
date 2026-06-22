const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function test() {
    try {
        const formData = new FormData();
        formData.append('title', 'Test');
        formData.append('platforms', 'all');
        formData.append('cloud_name', 'test');
        formData.append('upload_preset', 'test');
        formData.append('webhook_url', 'http://example.com');
        formData.append('video', fs.createReadStream('package.json'));

        const res = await axios.post('http://localhost:4000/api/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': 'test'
            }
        });
        console.log(res.data);
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
