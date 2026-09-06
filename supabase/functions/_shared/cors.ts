export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-internal-secret, x-twilio-signature, x-vapi-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}
