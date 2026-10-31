import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oiqlvxzpbioeeibeghhz.supabase.co';
// Paste your public "anon" API key from Supabase -> Project Settings -> API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcWx2eHpwYmlvZWVpYmVnaGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDY1NDQsImV4cCI6MjEwODk4MjU0NH0.MZhqcMqVD-MD3P5nlbBQOpRQEGhuFAeMf3jpMJkPly8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});