import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zsxbuhqhblradmabreof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeGJ1aHFoYmxyYWRtYWJyZW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTk3NzUsImV4cCI6MjEwNTM5NTc3NX0.bIFTJSsD_1q5K5MrE9pR1OSwTuQo93r6S4ZaZoknzjI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);