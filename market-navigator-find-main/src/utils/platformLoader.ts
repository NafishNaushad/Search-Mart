import { supabase } from '@/integrations/supabase/client';

console.log("🔥 PLATFORM LOADER FILE IS BEING LOADED - THIS SHOULD APPEAR IN CONSOLE 🔥");
console.log("Supabase client loaded:", !!supabase);

export async function listPlatforms() {
  // List folders in 'Scrap data' bucket
  const { data, error } = await supabase
    .storage
    .from('scrapdata')
    .list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
  if (error) {
    console.error('[PLATFORM LOADER] Error listing platforms:', error);
    throw error;
  }
  console.log('[PLATFORM LOADER] Raw .list("") result:', data);

  // If nothing is returned, try listing inside a known folder (e.g., 'Meesho/')
  if (!data || data.length === 0) {
    const testFolder = 'Meesho';
    const { data: meeshoData, error: meeshoError } = await supabase
      .storage
      .from('scrapdata')
      .list(testFolder, { limit: 100, offset: 0 });
    if (meeshoError) {
      console.error(`[PLATFORM LOADER] Error listing inside ${testFolder}:`, meeshoError);
    }
    console.log(`[PLATFORM LOADER] Listing inside '${testFolder}':`, meeshoData);
    
    // Instead of throwing an error, return empty array to prevent hanging
    console.warn('[PLATFORM LOADER] No folders found at root, returning empty array to prevent hanging');
    return [];
  }

  return (data || []).filter((item: any) => item.metadata?.mimetype === undefined && item.name !== '.emptyFolderPlaceholder').map((folder: any) => folder.name);
}

// Recursively list all .xlsx files in a platform folder, handling pagination and nested folders
export async function listAllFiles(platformFolder: string, prefix: string = ''): Promise<any[]> {
  let allFiles: any[] = [];
  let offset = 0;
  const limit = 100;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .storage
      .from('scrapdata')
      .list(platformFolder + (prefix ? `/${prefix}` : ''), { limit, offset });
    if (error) {
      console.error(`[PLATFORM LOADER] Error listing files in '${platformFolder}${prefix ? '/' + prefix : ''}':`, error);
      throw error;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.metadata?.mimetype === undefined) {
        // This is a folder, recurse into it
        const subfolder = prefix ? `${prefix}/${item.name}` : item.name;
        const subFiles = await listAllFiles(platformFolder, subfolder);
        allFiles = allFiles.concat(subFiles);
      } else if (item.name.endsWith('.xlsx')) {
        // Only add .xlsx files
        allFiles.push({
          ...item,
          fullPath: prefix ? `${prefix}/${item.name}` : item.name
        });
      }
    }

    // Pagination: if we got less than limit, we're done
    if (data.length < limit) {
      keepGoing = false;
    } else {
      offset += limit;
    }
  }

  console.log(`[PLATFORM LOADER] All .xlsx files in '${platformFolder}${prefix ? '/' + prefix : ''}':`, allFiles.map(f => f.fullPath));
  return allFiles;
}

export function getExcelFileUrl(platformFolder: string, fileName: string) {
  const { data } = supabase
    .storage
    .from('scrapdata')
    .getPublicUrl(`${platformFolder}/${fileName}`);
  return data.publicUrl;
}

export async function loadAllPlatformsAndFiles() {
  try {
    console.log('Loading platforms from Supabase Storage...');
    const platforms = await listPlatforms();
    console.log('Found platforms:', platforms);

    const result = [];
    for (const platform of platforms) {
      console.log(`Loading files for platform: ${platform}`);
      let files = [];
      try {
        files = await listAllFiles(platform);
        console.log(`Found ${files.length} files for ${platform}:`, files.map(f => f.fullPath));
      } catch (fileErr) {
        console.error(`[PLATFORM LOADER] Error loading files for platform '${platform}':`, fileErr);
      }
      result.push({
        platform,
        files: files.map(file => ({
          name: file.fullPath, // use fullPath for uniqueness
          url: getExcelFileUrl(platform, file.fullPath),
          mimetype: file.metadata?.mimetype
        }))
      });
    }
    console.log('Final result for UI consumption:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in loadAllPlatformsAndFiles:', error);
    return [];
  }
}
