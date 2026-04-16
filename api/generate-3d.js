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
      console.error('TRIPO_API_KEY is missing');
      return res.status(500).json({ error: 'Configuração incompleta: TRIPO_API_KEY não encontrada no Vercel (Environment Variables).' });
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

    // NOVA AÇÃO: Gerar Vistas (Multi-view)
    if (action === "create-multiview") {
      const { file_token } = req.body;
      const response = await axios.post(`${TRIPO_BASE}/task`, {
        type: "image_to_multiview",
        file: { type: "image", file_token },
      }, {
        headers: {
          ...tripoHeaders,
          "Content-Type": "application/json",
        },
      });
      return res.status(200).json(response.data);
    }

    // AÇÃO ATUALIZADA: Gerar Modelo 3D a partir das vistas
    if (action === "create-task") {
      const { original_task_id, file_token } = req.body;
      
      // Se tivermos um ID de tarefa de multiview anterior, usamos ele para melhor qualidade
      const body = original_task_id 
        ? { type: "multiview_to_model", original_task_id }
        : { type: "image_to_model", file: { type: "image", file_token } };

      const response = await axios.post(`${TRIPO_BASE}/task`, body, {
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
    console.error('generate-3d error:', error.response?.data || error.message);
    
    // Tratamento especial para erro 403 (provavelmente créditos)
    if (error.response?.status === 403) {
      const tripoError = error.response?.data?.message || "";
      let msg = "Erro 403 na Tripo: Acesso Negado.";
      if (tripoError.toLowerCase().includes("balance") || tripoError.toLowerCase().includes("credit")) {
        msg = "Saldo insuficiente na Tripo 3D. Verifique seus créditos.";
      } else {
        msg = "Chave de API da Tripo inválida ou bloqueada.";
      }
      return res.status(403).json({ error: msg, details: tripoError });
    }

    res.status(500).json({ error: 'Erro na API Tripo: ' + (error.response?.data?.message || error.message) });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
