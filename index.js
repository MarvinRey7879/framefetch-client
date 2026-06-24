// FrameFetch — tiny zero-dependency client for the agent-first video data API.
// One social-video URL in -> metadata, transcript, insights, parametric frames out.
// Docs: https://framefetch.net/docs

const DEFAULT_BASE = 'https://framefetch.net';

export class FrameFetchError extends Error {
  constructor(message, { status, code, hint } = {}) {
    super(message);
    this.name = 'FrameFetchError';
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

export class FrameFetch {
  /**
   * @param {{ apiKey?: string, baseUrl?: string, fetch?: typeof fetch, timeoutMs?: number }} [opts]
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey ?? process?.env?.FRAMEFETCH_API_KEY;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
    this._fetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
    if (typeof this._fetch !== 'function') {
      throw new FrameFetchError('global fetch is unavailable; pass opts.fetch (Node 18+ has it built in)');
    }
  }

  async _post(path, payload, { auth = true } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (auth) {
      if (!this.apiKey) throw new FrameFetchError('missing API key — set FRAMEFETCH_API_KEY or pass { apiKey } (free key: https://framefetch.net)');
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await this._fetch(`${this.baseUrl}${path}`, {
        method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal,
      });
    } catch (e) {
      throw new FrameFetchError(`request to ${path} failed: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }
    return this._parse(res, path);
  }

  async _get(path) {
    const res = await this._fetch(`${this.baseUrl}${path}`);
    return this._parse(res, path);
  }

  async _parse(res, path) {
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) {
      const err = json?.error ?? {};
      throw new FrameFetchError(err.message ?? `HTTP ${res.status} from ${path}`, {
        status: res.status, code: err.code, hint: err.hint,
      });
    }
    return json;
  }

  /** Full extract — request any subset of fields in one call. */
  extract({ url, fields, frames } = {}) {
    const body = { url };
    if (fields) body.fields = fields;
    if (frames) body.frames = frames;
    return this._post('/v1/extract', body);
  }

  /** Metadata + engagement insights only. */
  metadata(url) { return this._post('/v1/metadata', { url }); }

  /** Transcript (captions, else Whisper). */
  transcript(url) { return this._post('/v1/transcript', { url }); }

  /** Parametric frames. spec e.g. { mode: 'fps', fps: 1, width: 512 }. */
  frames(url, spec) { return this._post('/v1/frames', { url, ...(spec ? { frames: spec } : {}) }); }

  /** Capability matrix per platform (no auth). */
  platforms() { return this._get('/v1/platforms'); }

  /** Live service status (no auth). */
  status() { return this._get('/v1/status'); }

  /** No-signup metadata demo (rate-limited, no auth). */
  demo(url) { return this._post('/v1/demo', { url }, { auth: false }); }

  /** Create a self-serve API key with a small free credit. Returns { key }. */
  createKey(email) { return this._post('/v1/keys', { email }, { auth: false }); }
}

export default FrameFetch;

// When run as a script (e.g. `node index.js`, or Glama's `tsx index.js`), boot the local
// stdio MCP bridge. Importing this module as a library does NOT trigger this.
import { argv } from 'node:process';
import { pathToFileURL } from 'node:url';
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  import('./mcp.js');
}
