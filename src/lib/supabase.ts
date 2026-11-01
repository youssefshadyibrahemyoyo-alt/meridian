import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zavtplsoyomtkxqldsnr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphdnRwbHNveW9tdGt4cWxkc25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NjY0OTEsImV4cCI6MjEwOTA0MjQ5MX0.8Ad7XgyFolCltym4Xo1YiR6ObhqOWPtkkS3lDC0oK10';

export const MERIDIAN_AI_ENDPOINT = `${SUPABASE_URL}/functions/v1/meridian-intelligence`;
export const HEVY_SYNC_ENDPOINT = `${SUPABASE_URL}/functions/v1/hevy-sync`;

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'meridian_supabase_auth_v1',
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
}
