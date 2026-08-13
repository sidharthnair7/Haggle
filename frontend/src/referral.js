import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Pull procedure / body part / contrast out of free text.
 * Only returns fields it actually found — callers merge, they don't wipe the spec.
 */
export function extractSpecFromOrder(text) {
  const t = (text || '').toLowerCase();
  const out = { procedure: null, bodyPart: null, contrast: null };

  if (/\bct\b|computed tomography/.test(t)) out.procedure = 'CT';
  else if (/ultrasound|sonogram/.test(t)) out.procedure = 'Ultrasound';
  else if (/x[\s-]?ray/.test(t)) out.procedure = 'X-ray';
  else if (/\bmri\b|magnetic resonance/.test(t)) out.procedure = 'MRI';

  if (/lumbar|l4[\s-]?s1|l1[\s-]?s1|lower back|\bspine\b/.test(t)) out.bodyPart = 'Lumbar Spine';
  else if (/\bknee\b/.test(t)) out.bodyPart = 'Knee';
  else if (/\bshoulder\b/.test(t)) out.bodyPart = 'Shoulder';
  else if (/\bbrain\b|\bhead\b/.test(t)) out.bodyPart = 'Brain';
  else if (/abdomen|abdominal/.test(t)) out.bodyPart = 'Abdomen';

  if (/without contrast|no contrast|non[\s-]?contrast/.test(t)) out.contrast = 'Without Contrast';
  else if (/with contrast/.test(t)) out.contrast = 'With Contrast';

  return out;
}

export function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isTextReferral(file) {
  if (!file) return false;
  return file.type.startsWith('text/') || /\.(txt|md|rtf)$/i.test(file.name);
}

export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    if (line.trim()) pages.push(line.trim());
  }
  return pages.join('\n').trim();
}
