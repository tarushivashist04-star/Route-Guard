const axios = require('axios');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRyaXZlcl91dWlkX3BsYWNlaG9sZGVyIiwiZHJpdmVyX2lkIjoiRFYtMDAyIiwibmFtZSI6IlRlc3QgRHJpdmVyIiwicm9sZSI6ImRyaXZlciIsImlhdCI6MTc3NzAwODkwMH0.957Y1jVEaMWZxzKAFzIQlDvBJuHEheh1'; 

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/issues', {
            issue_type: 'accident',
            description: 'Test issue from script',
            lat: 19.0760,
            lng: 72.8777
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}
test();
