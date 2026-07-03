// Type definitions for the FrameFetch client.

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'pinterest' | 'reddit';
export type Field = 'metadata' | 'insights' | 'transcript' | 'frames' | 'text_overlay';

export interface FrameSpec {
  /** 'all' | 'everyNth' | 'fps' | 'range' */
  mode?: string;
  n?: number;
  fps?: number;
  startSec?: number;
  endSec?: number;
  width?: number;
}

export interface ExtractRequest {
  url: string;
  fields?: Field[];
  frames?: FrameSpec;
}

export interface Metadata {
  title: string | null;
  uploader: string | null;
  durationSec: number | null;
  uploadDate: string | null;
  sourceFps: number | null;
}

export interface Insights {
  views?: number;
  likes?: number;
  commentCount?: number;
}

export interface FrameRef { index: number; url: string; tSec: number; }

export interface OcrLine { text: string; confidence: number; bbox: [number, number, number, number]; }
export interface TextOverlayRef { index: number; text: string; lines: OcrLine[]; }

export interface ExtractResult {
  platform: string;
  url: string;
  metadata?: Metadata;
  insights?: Insights;
  transcript?: { text: string; source: 'captions' | 'whisper' };
  frames?: { count: number; first?: FrameRef; last?: FrameRef; items?: FrameRef[] };
  /** On-screen text per frame (OCR) — requires "frames" to also be requested. */
  textOverlay?: TextOverlayRef[];
  cost: { totalMicros: number };
  cached?: boolean;
}

export interface PublicStatus {
  status: 'operational' | 'degraded' | 'down';
  checkedAt: string | null;
  components: Record<string, { status: string; [k: string]: unknown }>;
  platforms: Record<string, Record<string, boolean>>;
}

export interface FrameFetchOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class FrameFetchError extends Error {
  status?: number;
  code?: string;
  hint?: string;
}

export class FrameFetch {
  constructor(opts?: FrameFetchOptions);
  apiKey?: string;
  baseUrl: string;
  extract(req: ExtractRequest): Promise<ExtractResult>;
  metadata(url: string): Promise<ExtractResult>;
  transcript(url: string): Promise<ExtractResult>;
  frames(url: string, spec?: FrameSpec): Promise<ExtractResult>;
  platforms(): Promise<Record<string, Record<string, boolean>>>;
  status(): Promise<PublicStatus>;
  demo(url: string): Promise<Partial<ExtractResult> & { demo: true }>;
  createKey(email: string): Promise<{ key: string }>;
}

export default FrameFetch;
