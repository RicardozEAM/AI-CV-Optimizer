import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dkhulxaasobefwgasacr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraHVseGFhc29iZWZ3Z2FzYWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQzNzYsImV4cCI6MjA4OTc5MDM3Nn0.RTQE-N5uGLqYaP0lSuyHsUgAAn4hfBw2N6A2LIi2lj0'
);

async function test() {
  const { data, error } = await supabase.functions.invoke('save-analysis-session', {
    body: {
      position: 'FullStack Web Developer Senior',
      candidate_name: 'Ana Pérez',
      initial_score: 68,
      anonimized: true,
    },
  });
  console.log('data:', data);
  console.log('error:', error);
}

test();
