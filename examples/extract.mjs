// Run: FRAMEFETCH_API_KEY=ff_... node examples/extract.mjs
// (or no key — falls back to the public demo)
import { FrameFetch } from 'framefetch';

const url = process.argv[2] ?? 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const ff = new FrameFetch(); // reads FRAMEFETCH_API_KEY from the environment if set

if (!ff.apiKey) {
  // no key: show the no-signup demo (metadata only)
  const d = await ff.demo(url);
  console.log('demo:', d.metadata?.title, '·', d.insights);
} else {
  const r = await ff.extract({
    url,
    fields: ['metadata', 'transcript', 'frames', 'text_overlay'],
    frames: { mode: 'fps', fps: 1, width: 480 },
  });
  console.log('title    :', r.metadata?.title);
  console.log('views    :', r.insights?.views);
  console.log('words    :', r.transcript?.text?.split(/\s+/).length);
  console.log('frames   :', r.frames?.count);
  console.log('on-screen:', r.textOverlay?.find((t) => t.text)?.text ?? '(no text detected)');
  console.log('cost µ   :', r.cost?.totalMicros);
}
