import { supabase, isSupabaseConfigured } from './supabase';

export const DOCUMENT_ATTACHMENTS_BUCKET = 'document-attachments';

export type AttachmentKind = 'pdf' | 'image' | 'other';

export interface UploadedDocumentAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  storagePath?: string;
  storedInBucket: boolean;
}

/**
 * Converts a File to a data URL string (`data:<mime>;base64,...`).
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a `data:<mime>;base64,...` URL into a browser `Blob` object.
 * Crucial because Chrome/Edge block top-frame navigation and sometimes PDF iframe rendering for raw `data:` URLs,
 * whereas `blob:` object URLs work everywhere for previewing, opening in new tabs, and downloading.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid data URL');
  }
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/^data:([^;]+)/i);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';

  const binaryStr = window.atob(base64.replace(/\s/g, ''));
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
  };
}

/**
 * Resolves any stored `attachment_url` value from `public.vehicle_documents`:
 * - Full HTTP/HTTPS URL -> returned as-is
 * - `data:` or `blob:` URL -> returned as-is
 * - Relative Supabase Storage path (e.g. `permits/...` or `document-attachments/permits/...`)
 *   -> resolved to a public Supabase Storage URL
 */
export function resolveAttachmentUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (isSupabaseConfigured && supabase) {
    const cleanPath = trimmed.startsWith(`${DOCUMENT_ATTACHMENTS_BUCKET}/`)
      ? trimmed.slice(DOCUMENT_ATTACHMENTS_BUCKET.length + 1)
      : trimmed.replace(/^\/+/, '');
    const { data } = supabase.storage.from(DOCUMENT_ATTACHMENTS_BUCKET).getPublicUrl(cleanPath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  return trimmed;
}

/**
 * Extracts a storage path inside `document-attachments` if the URL points to Supabase Storage.
 */
export function extractStoragePathFromUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  const marker = `/storage/v1/object/public/${DOCUMENT_ATTACHMENTS_BUCKET}/`;
  const signedMarker = `/storage/v1/object/sign/${DOCUMENT_ATTACHMENTS_BUCKET}/`;
  if (trimmed.includes(marker)) {
    const after = trimmed.split(marker)[1];
    return after ? decodeURIComponent(after.split('?')[0]) : null;
  }
  if (trimmed.includes(signedMarker)) {
    const after = trimmed.split(signedMarker)[1];
    return after ? decodeURIComponent(after.split('?')[0]) : null;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.startsWith(`${DOCUMENT_ATTACHMENTS_BUCKET}/`)
      ? trimmed.slice(DOCUMENT_ATTACHMENTS_BUCKET.length + 1)
      : trimmed.replace(/^\/+/, '');
  }
  return null;
}

/**
 * Detects whether an attachment is a PDF, an image, or another file type.
 */
export function detectAttachmentKind(rawUrl?: string | null, fileName?: string): AttachmentKind {
  const value = (rawUrl || '').trim().toLowerCase();
  const name = (fileName || '').trim().toLowerCase();

  if (
    value.startsWith('data:application/pdf') ||
    /\.pdf(\?|#|$)/i.test(value) ||
    name.endsWith('.pdf')
  ) {
    return 'pdf';
  }

  if (
    value.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(value) ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
  ) {
    return 'image';
  }

  return 'other';
}

/**
 * Infers a clean file extension (`.pdf`, `.png`, `.jpg`, etc.) from a URL or MIME type.
 */
export function inferAttachmentExtension(rawUrl?: string | null, fileName?: string): string {
  const name = (fileName || '').trim();
  const extMatch = name.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (extMatch) return `.${extMatch[1].toLowerCase()}`;

  const value = (rawUrl || '').trim();
  if (value.startsWith('data:')) {
    const mimeMatch = value.match(/^data:([^;]+)/i);
    const mime = (mimeMatch?.[1] || '').toLowerCase();
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
  } else {
    const urlPath = value.split('?')[0].split('#')[0];
    const urlExt = urlPath.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (urlExt) return `.${urlExt[1].toLowerCase()}`;
  }

  return '.pdf';
}

/**
 * Extracts a human-readable file name from a URL or document metadata.
 */
export function getReadableAttachmentFileName(
  rawUrl?: string | null,
  docNumber?: string,
  docType?: string
): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
    try {
      const clean = trimmed.split('?')[0].split('#')[0];
      const lastSegment = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
      if (lastSegment && lastSegment.includes('.')) {
        // Strip leading numeric timestamp prefix if present (e.g. 1731654000000_istimara.pdf -> istimara.pdf)
        return lastSegment.replace(/^\d{10,15}_/, '');
      }
    } catch {
      // ignore
    }
  }

  const ext = inferAttachmentExtension(trimmed);
  const safeBase = (docNumber || docType || 'vehicle-document')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safeBase || 'document'}${ext}`;
}

/**
 * Uploads a vehicle/trailer permit or Istimara attachment to Supabase Storage (`document-attachments` bucket)
 * and returns the stored URL.
 *
 * If the Supabase Storage bucket `document-attachments` is not yet created or storage RLS blocks direct bucket upload,
 * it automatically falls back to a data URL so the attachment is still reliably saved in `vehicle_documents.attachment_url`.
 */
export async function uploadDocumentAttachment(
  file: File,
  meta?: {
    documentNumber?: string;
    documentType?: string;
    vehicleId?: string;
    trailerId?: string;
  }
): Promise<UploadedDocumentAttachment> {
  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const assetFolder = meta?.vehicleId || meta?.trailerId || 'general';
  const docPrefix = (meta?.documentNumber || meta?.documentType || 'doc')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 40);
  const storagePath = `permits/${assetFolder}/${Date.now()}_${docPrefix}_${safeOriginalName}`;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(DOCUMENT_ATTACHMENTS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (!uploadError && uploadData?.path) {
        const { data: pubData } = supabase.storage
          .from(DOCUMENT_ATTACHMENTS_BUCKET)
          .getPublicUrl(uploadData.path);

        if (pubData?.publicUrl) {
          return {
            url: pubData.publicUrl,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            storagePath: uploadData.path,
            storedInBucket: true,
          };
        }
      } else if (uploadError) {
        console.warn(
          '[attachmentUtils] Supabase Storage bucket upload returned an error; falling back to inline data URL persistence:',
          uploadError.message
        );
      }
    } catch (err) {
      console.warn(
        '[attachmentUtils] Supabase Storage upload exception; falling back to inline data URL persistence:',
        err
      );
    }
  }

  const dataUrl = await fileToDataUrl(file);
  return {
    url: dataUrl,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    storedInBucket: false,
  };
}

/**
 * Resolves a stored attachment into a browser-renderable preview URL (converting `data:` URLs or private storage objects
 * into a temporary `blob:` URL when needed so `<iframe>` and `<img>` render cleanly in all browsers).
 * Returns `{ previewUrl, revoke }`.
 */
export async function createRenderablePreviewUrl(
  rawUrl?: string | null
): Promise<{ previewUrl: string | null; revoke: () => void }> {
  const resolved = resolveAttachmentUrl(rawUrl);
  if (!resolved) {
    return { previewUrl: null, revoke: () => {} };
  }

  // Convert data: URLs to blob: URLs so PDFs and large images render without browser data-URL limits
  if (resolved.startsWith('data:')) {
    try {
      const { blob } = dataUrlToBlob(resolved);
      const objectUrl = URL.createObjectURL(blob);
      return {
        previewUrl: objectUrl,
        revoke: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (e) {
      console.error('[attachmentUtils] Failed to convert data URL to Blob:', e);
      return { previewUrl: resolved, revoke: () => {} };
    }
  }

  // If it's a Supabase Storage path and the bucket might require a signed URL or blob download, test or sign if needed
  const storagePath = extractStoragePathFromUrl(rawUrl);
  if (storagePath && isSupabaseConfigured && supabase) {
    try {
      const { data: blobData, error } = await supabase.storage
        .from(DOCUMENT_ATTACHMENTS_BUCKET)
        .download(storagePath);
      if (!error && blobData) {
        const objectUrl = URL.createObjectURL(blobData);
        return {
          previewUrl: objectUrl,
          revoke: () => URL.revokeObjectURL(objectUrl),
        };
      }
    } catch {
      // Fall back to resolved public URL
    }
  }

  return { previewUrl: resolved, revoke: () => {} };
}

/**
 * Opens an attachment in a new browser tab.
 * Safely converts `data:` URLs to `blob:` URLs so Chrome/Edge do not block top-frame navigation (`about:blank#blocked`).
 */
export async function openAttachmentInNewTab(rawUrl?: string | null): Promise<void> {
  const resolved = resolveAttachmentUrl(rawUrl);
  if (!resolved) return;

  if (resolved.startsWith('data:')) {
    try {
      const { blob } = dataUrlToBlob(resolved);
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Fallback if popup blocked
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    } catch (err) {
      console.error('[attachmentUtils] Failed to open data URL in new tab:', err);
    }
  }

  const storagePath = extractStoragePathFromUrl(rawUrl);
  if (storagePath && isSupabaseConfigured && supabase) {
    try {
      const { data: signedData } = await supabase.storage
        .from(DOCUMENT_ATTACHMENTS_BUCKET)
        .createSignedUrl(storagePath, 3600);
      if (signedData?.signedUrl) {
        window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch {
      // Fall back to public URL
    }
  }

  window.open(resolved, '_blank', 'noopener,noreferrer');
}

/**
 * Downloads an attachment file to the user's device with a meaningful filename.
 */
export async function downloadAttachment(
  rawUrl?: string | null,
  suggestedFileName?: string
): Promise<void> {
  const resolved = resolveAttachmentUrl(rawUrl);
  if (!resolved) return;

  const finalName =
    suggestedFileName && suggestedFileName.includes('.')
      ? suggestedFileName
      : `${suggestedFileName || 'document'}${inferAttachmentExtension(resolved, suggestedFileName)}`;

  try {
    if (resolved.startsWith('data:')) {
      const { blob } = dataUrlToBlob(resolved);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      return;
    }

    const storagePath = extractStoragePathFromUrl(rawUrl);
    if (storagePath && isSupabaseConfigured && supabase) {
      const { data: blobData, error } = await supabase.storage
        .from(DOCUMENT_ATTACHMENTS_BUCKET)
        .download(storagePath);
      if (!error && blobData) {
        const blobUrl = URL.createObjectURL(blobData);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
        return;
      }
    }

    const response = await fetch(resolved);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      return;
    }
  } catch (err) {
    console.warn('[attachmentUtils] Direct blob download fallback to link click:', err);
  }

  const a = document.createElement('a');
  a.href = resolved;
  a.download = finalName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
