import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REMOVEBG_API_KEY = Deno.env.get('REMOVEBG_API_KEY');
    if (!REMOVEBG_API_KEY) {
      throw new Error('REMOVEBG_API_KEY not configured');
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const removeBgForm = new FormData();
    removeBgForm.append('image_file', imageFile);
    removeBgForm.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': REMOVEBG_API_KEY },
      body: removeBgForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`remove.bg API error [${response.status}]: ${errorText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    console.error('remove-bg error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
