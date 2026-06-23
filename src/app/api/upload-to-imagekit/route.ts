import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

/**
 * ImageKit Upload Endpoint
 * 
 * KONFIGURASI IMAGEKIT:
 * ====================
 * 
 * 1. Buat akun di https://imagekit.io
 * 2. Dapatkan credentials dari Dashboard → Settings → API Keys
 * 3. Tambahkan ke .env.local:
 * 
 *    IMAGEKIT_PUBLIC_KEY=your-public-key
 *    IMAGEKIT_PRIVATE_KEY=your-private-key
 *    IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
 */

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate credentials
    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
      return NextResponse.json(
        { error: 'ImageKit credentials are not configured. Please add IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT to .env.local' },
        { status: 500 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: fileName || file.name,
      folder: '/kain-samples', // Folder di ImageKit
      overwriteFile: false,
      isPrivateFile: false,
    });

    return NextResponse.json({
      success: true,
      fileId: uploadResponse.fileId,
      fileUrl: uploadResponse.url,
      fileName: uploadResponse.name,
      size: uploadResponse.size,
    });
  } catch (error) {
    console.error('ImageKit upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { error: `ImageKit upload error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
