import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { getValidatedSupabaseConfig } from '@/lib/supabase-config';

const { supabaseUrl, supabasePublishableKey } = getValidatedSupabaseConfig();

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit',
  }
});
