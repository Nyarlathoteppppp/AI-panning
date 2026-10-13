/* Markdown + KaTeX + callouts + code highlighting for chapter prose.
 * Supported extras:
 *   $...$ and $$...$$ math (protected before markdown parsing)
 *   :::kind Title  ...  :::   callout blocks (kind: note | tip | warn | key | example | source)
 *   ```python fenced code with a tiny local highlighter */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  let md = null;

  const PY_KEYWORDS = /\b(def|return|for|in|if|elif|else|while|and|or|not|import|from|as|True|False|None|break|continue|lambda|range|max|min|sum|len|with)\b/g;
  function escapeHTML(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  /** Token-based highlighter: comments, strings, numbers, keywords. */
  function highlight(code, lang) {
    if (!/^(python|py|pseudo|text)$/.test(lang || 'python')) return escapeHTML(code);
    const out = [];
    const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/gm;
    let m;
    while ((m = re.exec(code))) {
      if (m[1]) out.push('<span class="tok-com">' + escapeHTML(m[1]) + '</span>');
      else if (m[2]) out.push('<span class="tok-str">' + escapeHTML(m[2]) + '</span>');
      else if (m[3]) out.push('<span class="tok-num">' + m[3] + '</span>');
      else if (m[4]) out.push(PY_KEYWORDS.test(m[4]) ? '<span class="tok-kw">' + m[4] + '</span>' : (/^[A-Z]/.test(m[4]) ? '<span class="tok-var">' + m[4] + '</span>' : m[4]));
      else out.push(escapeHTML(m[5]));
      PY_KEYWORDS.lastIndex = 0;
    }
    return out.join('');
  }

  function parser() {
    if (md) return md;
    md = root.markdownit({ html: true, linkify: false, typographer: false,
      highlight: (str, lang) => '<pre class="code"><code class="lang-' + (lang || 'text') + '">' + highlight(str.replace(/\n$/, ''), lang) + '</code></pre>' });
    return md;
  }

  const LABELS = { note: '说明', tip: '直觉', warn: '注意', key: '关键结论', example: '例子', source: '课件对应', ext: '延伸（课件未覆盖）' };

  /** Render a markdown string to HTML. */
  function render(src) {
    if (!src) return '';
    // 1. callout containers (non-nested), rendered recursively.
    // callouts are rendered on their own and kept as placeholders, so later passes never touch their HTML
    const blocks = [];
    src = src.replace(/^:::(\w+)[ \t]*(.*)\n([\s\S]*?)\n:::[ \t]*$/gm, (_, kind, title, body) => {
      const head = title.trim() || LABELS[kind] || '';
      blocks.push('<div class="callout callout-' + kind + '">' + (head ? '<div class="callout-title">' + render(head).replace(/^<p>|<\/p>\s*$/g, '') + '</div>' : '') +
        render(body) + '</div>');
      return '\n\n@@C' + (blocks.length - 1) + '@@\n\n'; // own paragraph, so it never ends up inside a <p>
    });
    // 2. protect math (skip fenced code blocks).
    const math = [];
    const parts = src.split(/(```[\s\S]*?```)/g).map((chunk, i) => {
      if (i % 2) return chunk;
      return chunk
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => { math.push([t, true]); return '@@M' + (math.length - 1) + '@@'; })
        .replace(/\$([^\n$]+?)\$/g, (_, t) => { math.push([t, false]); return '@@M' + (math.length - 1) + '@@'; });
    }).map((chunk, i) => (i % 2 || !RL.terms ? chunk : RL.terms.apply(chunk)));
    let html = parser().render(parts.join(''));
    html = html.replace(/<p>@@M(\d+)@@<\/p>/g, (_, i) => RL.dom.texHTML(math[i][0], true));
    html = html.replace(/@@M(\d+)@@/g, (_, i) => RL.dom.texHTML(math[i][0], math[i][1]));
    html = html.replace(/<p>@@C(\d+)@@<\/p>/g, (_, i) => blocks[i]).replace(/@@C(\d+)@@/g, (_, i) => blocks[i]);
    return html;
  }
  function renderInline(src) { return render(src).replace(/^<p>|<\/p>\s*$/g, ''); }

  RL.md = { render, renderInline, highlight, escapeHTML };
})(window);
