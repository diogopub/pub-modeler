import axios from 'axios';
import FormData from 'form-data';

export default async function (req, res) {
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
      return res.status(500).json({ error: 'Configuração incompleta: TRIPO_API_KEY não encontrada.' });
    }

    const tripoHeaders = {
      "Authorization": `Bearer ${tripoKey}`,
      "Content-Type": "application/json"
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
          "Authorization": `Bearer ${tripoKey}`
        },
      });
      return res.status(200).json(response.data);
    }

    if (action === "create-multiview") {
      const { file_token } = req.body;
      const response = await axios.post(`${TRIPO_BASE}/task`, {
        type: "generate_multiview_image",
        file: {
          type: "image",
          file_token: file_token
        }
      }, { headers: tripoHeaders });
      return res.status(200).json(response.data);
    }

    if (action === "create-task") {
      const { original_task_id, file_token } = req.body;
      
      let taskPayload;
      if (original_task_id) {
        taskPayload = {
          type: "multiview_to_model",
          original_task_id: original_task_id
        };
      } else {
        taskPayload = {
          type: "image_to_model",
          file: {
            type: "image",
            file_token: file_token
          }
        };
      }

      const response = await axios.post(`${TRIPO_BASE}/task`, taskPayload, { headers: tripoHeaders });
      return res.status(200).json(response.data);
    }

    if (action === "poll") {
      const { task_id } = req.body;
      const response = await axios.get(`${TRIPO_BASE}/task/${task_id}`, {
        headers: { "Authorization": `Bearer ${tripoKey}` }
      });
      return res.status(200).json(response.data);
    }

    if (action === "get-balance") {
      const response = await axios.get(`${TRIPO_BASE}/user/balance`, {
        headers: { "Authorization": `Bearer ${tripoKey}` }
      });
      return res.status(200).json(response.data);
    }

    res.status(400).json({ error: 'Invalid action' });
    
  } catch (error) {
    const errorData = error.response?.data || {};
    console.error('Tripo Error:', JSON.stringify(errorData));
    res.status(error.response?.status || 500).json({ 
      error: errorData.message || error.message,
      code: errorData.code
    });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
