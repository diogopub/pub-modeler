const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.body;
    const tripoKey = process.env.TRIPO_API_KEY;
    const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

    if (!tripoKey) {
      return res.status(500).json({ error: 'TRIPO_API_KEY not configured' });
    }

    const tripoHeaders = {
      "Authorization": `Bearer ${tripoKey}`,
    };

    if (action === "upload") {
      const { image } = req.body;
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      const formData = new FormData();
      formData.append('file', buffer, 'image.png');

      const response = await axios.post(`${TRIPO_BASE}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...tripoHeaders,
        },
      });
      return res.status(200).json(response.data);
    }

    if (action === "create-task") {
      const { file_token } = req.body;
      const response = await axios.post(`${TRIPO_BASE}/task`, {
        type: "image_to_model",
        file: { type: "image", file_token },
      }, {
        headers: {
          ...tripoHeaders,
          "Content-Type": "application/json",
        },
      });
      return res.status(200).json(response.data);
    }

    if (action === "poll") {
      const { task_id } = req.body;
      const response = await axios.get(`${TRIPO_BASE}/task/${task_id}`, {
        headers: tripoHeaders,
      });
      return res.status(200).json(response.data);
    }

    res.status(400).json({ error: 'Invalid action' });
    
  } catch (error) {
    console.error('generate-3d error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
