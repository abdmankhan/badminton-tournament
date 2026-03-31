import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Upload to ImgBB
    const imgbbFormData = new FormData();
    imgbbFormData.append('key', process.env.IMGBB_API_KEY);
    imgbbFormData.append('image', base64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData,
    });

    const data = await response.json();

    if (!data.success) {
      console.error('ImgBB error:', data);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      url: data.data.url,
      thumb: data.data.thumb?.url || data.data.url,
      deleteUrl: data.data.delete_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
