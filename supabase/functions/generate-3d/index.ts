import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action, x-task-id',
};

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TRIPO_API_KEY = Deno.env.get('TRIPO_API_KEY');
    if (!TRIPO_API_KEY) {
      throw new Error('TRIPO_API_KEY not configured');
    }

    const tripoHeaders = {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
    };

    const action = req.headers.get('x-action') || new URL(req.url).searchParams.get('action');

    // Action: upload image to Tripo
    if (action === 'upload') {
      const formData = await req.formData();
      const imageFile = formData.get('image') as File;
      if (!imageFile) {
        return new Response(JSON.stringify({ error: 'No image provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tripoForm = new FormData();
      tripoForm.append('file', imageFile);

      const uploadRes = await fetch(`${TRIPO_BASE}/upload`, {
        method: 'POST',
        headers: tripoHeaders,
        body: tripoForm,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`Tripo upload error [${uploadRes.status}]: ${err}`);
      }

      const uploadData = await uploadRes.json();
      return new Response(JSON.stringify(uploadData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: create task
    if (action === 'create-task') {
      const body = await req.json();
      const { file_token, model_version, face_limit } = body;

      const taskRes = await fetch(`${TRIPO_BASE}/task`, {
        method: 'POST',
        headers: { ...tripoHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image_to_model',
          file: { type: 'image', file_token },
          ...(model_version && { model_version }),
          ...(face_limit && { face_limit }),
        }),
      });

      if (!taskRes.ok) {
        const err = await taskRes.text();
        throw new Error(`Tripo create-task error [${taskRes.status}]: ${err}`);
      }

      const taskData = await taskRes.json();
      return new Response(JSON.stringify(taskData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: poll task status
    if (action === 'poll') {
      const taskId = req.headers.get('x-task-id') || new URL(req.url).searchParams.get('task_id');
      if (!taskId) {
        return new Response(JSON.stringify({ error: 'task_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pollRes = await fetch(`${TRIPO_BASE}/task/${taskId}`, {
        headers: tripoHeaders,
      });

      if (!pollRes.ok) {
        const err = await pollRes.text();
        throw new Error(`Tripo poll error [${pollRes.status}]: ${err}`);
      }

      const pollData = await pollRes.json();
      return new Response(JSON.stringify(pollData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: upload, create-task, poll' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('generate-3d error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
