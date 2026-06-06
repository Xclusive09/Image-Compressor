# NYSC Image Compressor

NYSC Image Compressor is a production-ready image compression web app for resizing passport photos and similar images to a selected target file size. It is designed for small portal limits such as 7KB, 10KB, and 12KB while keeping the best possible quality under the selected target size.

This tool uses best-effort lossy compression. Very small target sizes like 7KB may require visible quality reduction depending on the original image.

## Features

- Upload JPG, JPEG, PNG, or WebP images.
- Compress to a custom target between 5KB and 500KB.
- Quick presets for 7KB, 10KB, 12KB, and 20KB.
- Balanced, aggressive, and max compression modes.
- Original and compressed previews.
- Result details for file size, dimensions, quality, and compression ratio.
- Download compressed JPEG output.
- In-memory backend processing only.
- Clean validation and safe error messages.

## Tech Stack

- Monorepo with npm workspaces
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Image processing: sharp
- Upload handling: multer
- Tests: Jest, Supertest, Testing Library

## Folder Structure

```text
apps/
  web/
    app/
    components/
    lib/
    public/
    tests/
  api/
    src/
      image/
        dto/
        utils/
      common/
    test/
```

## Setup

```bash
npm install
```

## Environment Variables

Frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Backend:

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

For production, set these to your deployed URLs:

```bash
NEXT_PUBLIC_API_URL=https://your-api-url.com
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-url.com
```

## Development

Run both apps:

```bash
npm run dev
```

Run individually:

```bash
npm run dev:web
npm run dev:api
```

URLs:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Compression endpoint: http://localhost:4000/api/images/compress

## Testing

```bash
npm run test
npm run test:api
npm run test:web
```

Backend tests include compression engine unit tests and an e2e multipart upload test.

## Production Build

```bash
npm run build
npm run build:web
npm run build:api
```

## API

### `POST /api/images/compress`

Request type: `multipart/form-data`

Fields:

- `image`: JPG, JPEG, PNG, or WebP image, max 10MB
- `targetKb`: number from 5 to 500
- `mode`: optional, one of `balanced`, `aggressive`, `max`

Success response:

```json
{
  "success": true,
  "message": "Image compressed successfully.",
  "data": {
    "originalSizeKb": 58.4,
    "compressedSizeKb": 11.8,
    "targetSizeKb": 12,
    "compressionRatio": 79.8,
    "width": 300,
    "height": 292,
    "format": "jpeg",
    "quality": 47,
    "mode": "balanced",
    "warning": null,
    "fileName": "compressed-image.jpg",
    "mimeType": "image/jpeg",
    "base64": "data:image/jpeg;base64,..."
  }
}
```

Impossible target response:

```json
{
  "success": false,
  "message": "This image cannot be compressed to the selected target size without becoming too poor in quality. Try a higher target size or use aggressive mode.",
  "error": {
    "code": "TARGET_TOO_SMALL",
    "targetSizeKb": 7,
    "minimumPossibleSizeKb": 9.4
  }
}
```

## Compression Algorithm

The backend uses sharp to normalize rotation, strip metadata, convert output to JPEG, and try multiple maximum dimensions for the selected mode. For each dimension, it uses binary search to find the highest JPEG quality that fits under the target size. Candidates are scored by dimension preservation, JPEG quality, and closeness to the target size. The highest-scoring candidate under the target is returned.

If balanced or aggressive mode cannot hit the target, the service tries max mode internally once. If that still cannot reach the target, it returns `TARGET_TOO_SMALL`.

## Security And Privacy

- Uploaded images are never stored permanently.
- Processing happens in memory only.
- Uploads are limited to 10MB.
- MIME types are validated.
- Actual image metadata is validated with sharp.
- Output metadata is stripped.
- Base64 image data and uploaded file contents are not logged.

## Limitations

- Output defaults to JPEG for broad portal compatibility.
- Extremely tiny targets can visibly reduce quality.
- Some detailed or noisy images may not be able to reach 5KB to 12KB while staying usable.
- The JSON response includes base64 data, which is convenient for this app but not ideal for very large outputs.

## Deployment

Frontend on Vercel:

1. Deploy `apps/web`.
2. Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
3. Build command: `npm run build:web`.

Backend on Render or Railway:

1. Deploy `apps/api`.
2. Set `PORT=4000` or use the platform-provided port.
3. Set `FRONTEND_ORIGIN` to the deployed frontend URL.
4. Build command: `npm run build:api`.
5. Start command: `npm run start --workspace @nysc-image-compressor/api`.
