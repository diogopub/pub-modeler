import axios from 'axios';
import FormData from 'form-data';

// ── Constantes ──────────────────────────────────────────────
const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";
const TRIPO_CDN_PREFIX = "https://tripo-data.rg1.data.tripo3d.com";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function (req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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

    if (!tripoKey) {
      return res.status(500).json({ error: 'TRIPO_API_KEY não configurada.' });
    }

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Ação não especificada.' });
    }

    const tripoHeaders = {
      "Authorization": `Bearer ${tripoKey}`,
      "Content-Type": "application/json"
    };

    // ── Upload de imagem ────────────────────────────────────
    if (action === "upload") {
      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Imagem não fornecida.' });
      }

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

    // ── Criar tarefa 3D ─────────────────────────────────────
    if (action === "create-task") {
      const { original_task_id, file_token, mode } = req.body;

      let taskPayload;

      if (mode === 'direct') {
        // Modo direto: imagem → modelo (melhor fidelidade)
        if (!file_token || typeof file_token !== 'string') {
          return res.status(400).json({ error: 'file_token obrigatório no modo direto.' });
        }
        taskPayload = {
          type: "image_to_model",
          file: { type: "image", file_token },
          model_version: "default",
          texture: true,
          pbr: true
        };
      } else if (original_task_id) {
        // Modo multiview: usa vistas geradas anteriormente
        if (!UUID_REGEX.test(original_task_id)) {
          return res.status(400).json({ error: 'original_task_id inválido.' });
        }
        taskPayload = {
          type: "multiview_to_model",
          original_task_id,
          model_version: "default",
          texture: true,
          pbr: true
        };
      } else {
        return res.status(400).json({ error: 'Modo ou file_token não especificado.' });
      }

      const response = await axios.post(`${TRIPO_BASE}/task`, taskPayload, { headers: tripoHeaders });
      return res.status(200).json(response.data);
    }

    // ── Multiview (mantido para uso futuro) ──────────────────
    if (action === "create-multiview") {
      const { file_token } = req.body;
      if (!file_token || typeof file_token !== 'string') {
        return res.status(400).json({ error: 'file_token obrigatório.' });
      }

      const response = await axios.post(`${TRIPO_BASE}/task`, {
        type: "generate_multiview_image",
        file: { type: "image", file_token }
      }, { headers: tripoHeaders });
      return res.status(200).json(response.data);
    }

    // ── Polling de tarefa ────────────────────────────────────
    if (action === "poll") {
      const { task_id } = req.body;
      if (!task_id || !UUID_REGEX.test(task_id)) {
        return res.status(400).json({ error: 'task_id inválido.' });
      }

      const response = await axios.get(`${TRIPO_BASE}/task/${task_id}`, {
        headers: { "Authorization": `Bearer ${tripoKey}` }
      });
      return res.status(200).json(response.data);
    }

    // ── Consultar saldo ─────────────────────────────────────
    if (action === "get-balance") {
      const response = await axios.get(`${TRIPO_BASE}/user/balance`, {
        headers: { "Authorization": `Bearer ${tripoKey}` }
      });
      return res.status(200).json(response.data);
    }

    // ── Proxy do modelo (bypass CORS) ───────────────────────
    if (action === "proxy-model") {
      const { url } = req.body;
      if (!url || typeof url !== 'string' || !url.startsWith(TRIPO_CDN_PREFIX)) {
        return res.status(400).json({ error: 'URL inválida — somente CDN Tripo é permitido.' });
      }

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { "Authorization": `Bearer ${tripoKey}` }
      });

      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Content-Disposition', 'attachment; filename="model.glb"');
      return res.status(200).send(Buffer.from(response.data));
    }

    res.status(400).json({ error: `Ação desconhecida: ${action}` });
    
  } catch (error) {
    const errorData = error.response?.data || {};
    const message = typeof errorData === 'string' 
      ? errorData 
      : errorData.message || error.message;
    console.error('Tripo Error:', message);
    res.status(error.response?.status || 500).json({ error: message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
