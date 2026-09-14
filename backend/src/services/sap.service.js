const axios = require('axios');
const https = require('https');

const sapClient = axios.create({
  baseURL: process.env.SAP_ODATA_URL,
  auth: {
    username: process.env.SAP_USER,
    password: process.env.SAP_PASSWORD
  },
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000,

  // Fix self-signed certificate issue (DEV ONLY)
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const callSap = async (method, url, data = null, isBinary = false) => {
  try {
    let headers = {};

    // Fetch CSRF token for POST / PUT / DELETE
    if (method.toLowerCase() !== 'get') {
      try {
        const csrfRes = await sapClient.get('/', {
          headers: { 'x-csrf-token': 'fetch' }
        });

        headers['x-csrf-token'] =
          csrfRes.headers['x-csrf-token'] || 'fetch';

        // Send cookies if available
        if (csrfRes.headers['set-cookie']) {
          headers['Cookie'] = csrfRes.headers['set-cookie'].join('; ');
        }
      } catch (csrfErr) {
        console.warn(
          'CSRF token fetch failed, proceeding without token:',
          csrfErr.message
        );
      }
    }

    const config = {
      method,
      url,
      data,
      headers,
      responseType: isBinary ? 'arraybuffer' : 'json'
    };

    const response = await sapClient(config);
    return response;
  } catch (error) {
    console.error(
      'SAP API Error:',
      method.toUpperCase(),
      url,
      error.message
    );
    throw error;
  }
};

module.exports = { callSap };