(function (root) {
  function timecode(ms, separator) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const milli = Math.floor(ms % 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${separator}${String(milli).padStart(3, '0')}`;
  }

  function normalizeText(segments) {
    if (!Array.isArray(segments)) return '';
    return segments.map(segment => typeof segment?.utf8 === 'string' ? segment.utf8 : '').join('')
      .replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
  }

  function parseJson3(raw) {
    let document;
    try { document = JSON.parse(raw); }
    catch { throw new Error('This is not valid JSON. Check the file or pasted text and try again.'); }
    if (!document || !Array.isArray(document.events)) {
      throw new Error('No JSON3 events array was found. Open a YouTube JSON3 caption file.');
    }
    const result = [];
    for (const event of document.events) {
      if (typeof event?.tStartMs !== 'number' || typeof event?.dDurationMs !== 'number') continue;
      const start = event.tStartMs;
      const duration = event.dDurationMs;
      const text = normalizeText(event?.segs);
      if (!text || !Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || duration <= 0) continue;
      result.push({start: Math.round(start), end: Math.round(start + duration), text});
    }
    result.sort((a, b) => a.start - b.start);
    if (!result.length) throw new Error('No timed text cues were found. This file may contain only timing markers.');
    return result;
  }

  function serialize(items, selectedFormat) {
    const separator = selectedFormat === 'srt' ? ',' : '.';
    const blocks = items.map((cue, index) => `${selectedFormat === 'srt' ? `${index + 1}\n` : ''}${timecode(cue.start, separator)} --> ${timecode(cue.end, separator)}\n${cue.text}`);
    return `${selectedFormat === 'vtt' ? 'WEBVTT\n\n' : ''}${blocks.join('\n\n')}\n`;
  }

  const api = {parseJson3, serialize};
  root.CueLiftConverter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
