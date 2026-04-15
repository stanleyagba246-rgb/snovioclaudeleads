import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const BUCKET = 'audits';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function uploadPdf(filePath, filename) {
  const supabase = getSupabase();
  const fileBuffer = readFileSync(filePath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if re-running for same company
    });

  if (error) {
    throw new Error(`Supabase upload failed for ${filename}: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
