const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const ZIP_LOCAL_FILE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ZIP_CENTRAL_DIR = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
const ZIP_END = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const SVG_MARKERS = [/\<svg[\s>]/i, /\<script[\s>]/i, /on\w+\s*=/i, /javascript:/i, /data:text\/html/i];
const EXECUTABLE_MARKERS = [Buffer.from('MZ'), Buffer.from('\x7fELF', 'binary'), Buffer.from('<?php'), Buffer.from('#!/bin/sh'), Buffer.from('#!/usr/bin/env')];
const defaultMaxFileSize = 12 * 1024 * 1024;

async function sha256File(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function detectImageType(buffer) {
  if (!buffer || buffer.length < 3) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buffer.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { mime: 'image/png', ext: '.png' };
  if (buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  return null;
}

async function readHead(filePath, bytes = 8192) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function looksLikeTextPayload(buffer) {
  const text = buffer
    .subarray(0, Math.min(buffer.length, 512))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  return text.startsWith('<') || text.startsWith('data:text/');
}

async function assertNoEmbeddedPayload(filePath, { type } = {}) {
  const stat = await fs.stat(filePath);
  const configuredMaxFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 0);
  const maxFileSize = Math.max(configuredMaxFileSize, defaultMaxFileSize);
  if (stat.size > maxFileSize) {
    throw new AppError('Uploaded file exceeds configured security limit', 413, 'UPLOAD_TOO_LARGE');
  }
  const data = await fs.readFile(filePath);
  const binaryHead = data.subarray(0, 512);

  if (!type || looksLikeTextPayload(binaryHead)) {
    const textHead = data.subarray(0, Math.min(data.length, 65536)).toString('utf8');
    for (const pattern of SVG_MARKERS) {
      if (pattern.test(textHead)) throw new AppError('SVG/script-like upload payload rejected', 400, 'ACTIVE_CONTENT_REJECTED');
    }
    const htmlMarkers = ['<html', '<iframe', '<object', '<embed', 'document.cookie'];
    if (htmlMarkers.some(marker => textHead.toLowerCase().includes(marker))) {
      throw new AppError('HTML-capable upload payload rejected', 400, 'HTML_PAYLOAD_REJECTED');
    }
  }

  for (const marker of EXECUTABLE_MARKERS) {
    if (binaryHead.indexOf(marker) === 0) {
      throw new AppError('Executable content marker detected in upload', 400, 'EXECUTABLE_UPLOAD_REJECTED');
    }
  }
  const zipMarkers = [ZIP_LOCAL_FILE, ZIP_CENTRAL_DIR, ZIP_END].filter(marker => binaryHead.indexOf(marker) >= 0).length;
  if (zipMarkers > 0) throw new AppError('Archive/polyglot upload rejected', 400, 'ARCHIVE_POLYGLOT_REJECTED');
}

async function scanWithClamAv(filePath) {
  const enabled = process.env.ENABLE_UPLOAD_AV_SCAN === 'true';
  if (!enabled) return { scanner: 'disabled', clean: true };
  const command = process.env.UPLOAD_AV_COMMAND || 'clamscan';
  const args = (process.env.UPLOAD_AV_ARGS || '--no-summary').split(' ').filter(Boolean).concat(filePath);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: Number(process.env.UPLOAD_AV_TIMEOUT_MS || 15000) });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('error', error => reject(new AppError(`Upload scanner unavailable: ${error.message}`, 503, 'UPLOAD_SCANNER_UNAVAILABLE')));
    child.on('close', code => {
      const payload = { scanner: command, code, output: `${out}\n${err}`.trim().slice(0, 1000) };
      if (code === 0) return resolve({ ...payload, clean: true });
      if (code === 1) return reject(new AppError('Uploaded file failed malware scanning', 400, 'UPLOAD_MALWARE_DETECTED'));
      reject(new AppError('Upload scanner failed closed', 503, 'UPLOAD_SCANNER_FAILED'));
    });
  });
}

async function auditUpload({ req, file, status, reason, sha256, metadata = {} }) {
  metrics.inc(`upload_${status}_total`);
  try {
    await db.query(
      `INSERT INTO upload_audit_logs (user_id, request_id, original_name, stored_name, mime_type, size_bytes, sha256, status, reason, ip_address, user_agent, metadata)
       VALUES (:user_id,:request_id,:original_name,:stored_name,:mime_type,:size_bytes,:sha256,:status,:reason,:ip_address,:user_agent,:metadata)`,
      {
        user_id: req?.user?.id || null,
        request_id: req?.id || null,
        original_name: file?.originalname || null,
        stored_name: file?.filename || null,
        mime_type: file?.mimetype || null,
        size_bytes: file?.size || null,
        sha256: sha256 || null,
        status,
        reason: reason || null,
        ip_address: req?.ip || null,
        user_agent: req?.headers?.['user-agent'] || null,
        metadata: JSON.stringify(metadata || {})
      }
    );
  } catch (error) {
    logger.warn('Upload audit log failed', { error: error.message, status, requestId: req?.id });
  }
}

async function validateImageFile({ req, file, allowedMime }) {
  const sha256 = await sha256File(file.path);
  try {
    const head = await readHead(file.path, 64);
    const type = detectImageType(head);
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new AppError('Unsupported file extension', 400, 'INVALID_FILE_EXTENSION');
    if (!type || type.mime !== file.mimetype || !allowedMime.has(type.mime)) throw new AppError('MIME, extension, and magic bytes do not match', 400, 'FILE_SIGNATURE_INVALID');
    await assertNoEmbeddedPayload(file.path, { type });
    let metadata;
    try {
      metadata = await sharp(file.path, {
        limitInputPixels: Number(process.env.UPLOAD_MAX_PIXELS || 24000000),
        animated: false,
        failOn: 'none'
      }).metadata();
    } catch {
      throw new AppError('Image could not be decoded. Upload a valid JPG, PNG, or WebP image.', 400, 'IMAGE_DECODE_FAILED');
    }
    if (!metadata.width || !metadata.height) throw new AppError('Image metadata missing dimensions', 400, 'IMAGE_METADATA_INVALID');
    if (metadata.pages && metadata.pages > 1) throw new AppError('Animated/multi-frame images are not allowed', 400, 'ANIMATED_IMAGE_REJECTED');
    if (metadata.width * metadata.height > Number(process.env.UPLOAD_MAX_PIXELS || 24000000)) throw new AppError('Image dimensions exceed safety limits', 400, 'IMAGE_TOO_LARGE');
    const scan = await scanWithClamAv(file.path);
    await auditUpload({ req, file, status: 'accepted', sha256, metadata: { type, width: metadata.width, height: metadata.height, scan } });
    return { type, sha256, metadata };
  } catch (error) {
    await auditUpload({ req, file, status: 'rejected', reason: error.code || error.message, sha256 });
    throw error;
  }
}

module.exports = { validateImageFile, auditUpload, detectImageType, scanWithClamAv };
