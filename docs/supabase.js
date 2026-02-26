import { createClient } from '../node_modules/@supabase/supabase-js';

export const supabase = createClient(
  'https://obiknpwjgiuxqskneuqx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaWtucHdqZ2l1eHFza25ldXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDIwNTEsImV4cCI6MjA4NzUxODA1MX0.cPWcdQI9VzK0bo2lL_8ZDAVruLq5mGzMY7ljHY-LdRI'
);