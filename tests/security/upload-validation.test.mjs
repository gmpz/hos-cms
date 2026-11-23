import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import JSZip from 'jszip';
import { validatedUploadBytes, InvalidUploadError } from '../../src/server/media/validate-upload.ts';
const file = (bytes, type) => new File([bytes], 'test', { type });
test('real images pass; forged MIME and truncated images fail', async () => {
  for (const [format, mime] of [['png','image/png'], ['jpeg','image/jpeg'], ['webp','image/webp'], ['gif','image/gif']]) {
    const bytes = await sharp({create:{width:2,height:2,channels:3,background:'red'}}).toFormat(format).toBuffer();
    assert.deepEqual(Buffer.from(await validatedUploadBytes(file(bytes,mime))), bytes);
    await assert.rejects(validatedUploadBytes(file(bytes.subarray(0,12),mime)), InvalidUploadError);
    await assert.rejects(validatedUploadBytes(file('plain text',mime)), InvalidUploadError);
    await assert.rejects(validatedUploadBytes(file(bytes,mime === 'image/png' ? 'image/jpeg':'image/png')), InvalidUploadError);
  }
});
test('Office ZIP must contain the matching document parts', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml','<Types/>'); zip.file('_rels/.rels','<Relationships/>'); zip.file('word/document.xml','<document/>');
  const bytes = await zip.generateAsync({type:'nodebuffer'});
  await validatedUploadBytes(file(bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  await assert.rejects(validatedUploadBytes(file(bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),InvalidUploadError);
  await assert.rejects(validatedUploadBytes(file(bytes,'application/msword')),InvalidUploadError);
});
test('PDF requires header and end marker; unsupported content fails', async () => {
  await validatedUploadBytes(file('%PDF-1.7\n%%EOF','application/pdf'));
  for (const type of ['application/pdf','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint','text/html'])
    await assert.rejects(validatedUploadBytes(file('plain text',type)),InvalidUploadError);
});
