import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Drive Upload Endpoint
 * 
 * KONFIGURASI GOOGLE DRIVE:
 * ========================
 * 
 * 1. OAUTH CREDENTIALS
 *    - Buat OAuth Client ID di Google Cloud Console
 *    - Ambil refresh token untuk akun Google pribadi Anda
 * 
 * 2. ENVIRONMENT VARIABLES
 *    Tambahkan ke file .env.local:
 *    
 *    GOOGLE_DRIVE_CLIENT_ID=your-oauth-client-id
 *    GOOGLE_DRIVE_CLIENT_SECRET=your-oauth-client-secret
 *    GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
 *    GOOGLE_DRIVE_FOLDER_ID=your-folder-id
 * 
 * 3. FOLDER ID
 *    - Copy ID dari folder Google Drive pribadi Anda
 *    - Upload akan masuk ke folder itu menggunakan akses akun Google pribadi
 */

// ===== KONFIGURASI: GANTI FOLDER_ID DENGAN MILIK ANDA =====
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'your-folder-id-here';
const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

/**
 * Generate Google Drive API access token
 * Menggunakan OAuth refresh token milik akun Google pribadi
 */
async function getGoogleDriveToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth token request failed: ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Google OAuth token request did not return an access token');
  }

  return data.access_token;
}

/**
 * Upload file ke Google Drive
 */
async function uploadFileToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  accessToken: string
): Promise<{ fileId: string; fileUrl: string; isPublic: boolean; permissionDetails: string | null }> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Drive upload failed: ${error}`);
  }

  const result = await response.json();
  const fileId = result.id;

  // Make the file readable by anyone with the link so it can be embedded/viewed
  let permissionOk: boolean = false;
  let permissionBody: string | null = null;
  try {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    permissionOk = permRes.ok;
    permissionBody = await permRes.text().catch(() => '');
  } catch (e) {
    // Non-fatal: permission change failed; continue and return the file id/url anyway
    console.warn('Failed to set public permission on uploaded Drive file', e);
  }

  const fileUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    fileId: fileId,
    fileUrl: fileUrl,
    isPublic: typeof permissionOk !== 'undefined' ? permissionOk : false,
    permissionDetails: typeof permissionBody !== 'undefined' ? permissionBody : null,
  };
}

/**
 * POST /api/upload-to-drive
 * Upload gambar ke Google Drive
 * 
 * Body: FormData dengan:
 *   - file: File object
 *   - fileName: string (nama file)
 */
export async function POST(request: NextRequest) {
  try {
    // Validasi environment variables
    if (
      !GOOGLE_DRIVE_CLIENT_ID ||
      !GOOGLE_DRIVE_CLIENT_SECRET ||
      !GOOGLE_DRIVE_REFRESH_TOKEN ||
      GOOGLE_DRIVE_FOLDER_ID === 'your-folder-id-here'
    ) {
      return NextResponse.json(
        {
          error: 'Google Drive tidak dikonfigurasi. Silakan atur environment variables.',
          details: 'GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, dan GOOGLE_DRIVE_FOLDER_ID diperlukan',
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = (formData.get('fileName') as string) || file?.name || 'unknown';

    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan dalam request' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get access token
    const accessToken = await getGoogleDriveToken();

    // Upload ke Google Drive
    const { fileId, fileUrl, isPublic, permissionDetails } = await uploadFileToDrive(
      fileName,
      buffer,
      file.type || 'application/octet-stream',
      accessToken
    );

    return NextResponse.json(
      {
        success: true,
        fileId: fileId,
        fileUrl: fileUrl,
        isPublic: isPublic,
        permissionDetails: permissionDetails,
        fileName: fileName,
        message: 'Gambar berhasil diupload ke Google Drive',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload to Google Drive error:', error);
    return NextResponse.json(
      {
        error: 'Gagal upload ke Google Drive',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload-to-drive
 * Return konfigurasi yang diperlukan (debugging)
 */
export async function GET() {
  return NextResponse.json({
    configured: {
      hasClientId: !!GOOGLE_DRIVE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_DRIVE_CLIENT_SECRET,
      hasRefreshToken: !!GOOGLE_DRIVE_REFRESH_TOKEN,
      hasFolderId: GOOGLE_DRIVE_FOLDER_ID !== 'your-folder-id-here',
      folderId: GOOGLE_DRIVE_FOLDER_ID,
    },
    instructions: {
      step1: 'Siapkan OAuth Client ID dan Client Secret di https://console.cloud.google.com',
      step2: 'Ambil refresh token untuk akun Google pribadi Anda',
      step3: 'Tentukan Google Drive folder ID di akun pribadi Anda',
      step4: 'Pastikan akun Google yang punya refresh token punya akses ke folder tujuan',
    },
  });
}
