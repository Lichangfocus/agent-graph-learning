/* Standalone renderer. No server, module loader, or network is needed. */
(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('preview-data').textContent);
  const app = document.getElementById('app');
  const graph = DATA.graph;
  const units = new Map(DATA.units.map(unit => [unit.frontmatter.id, unit]));
  const PROGRESS_KEY = 'scholar-engine:progress:v1';
  const NOTES_KEY = 'scholar-engine:notes:v1';
  const EMPTY = () => ({ version: 1, units: {} });
  const INTENTS = { change: '要改', question: '有疑问', confirm: '认可', resource: '补资料' };
  const EDGE_LABELS = { hard: '理解所需', soft: '建议先学', cross: '跨域联系' };
  const palette = ['#52756b', '#8c7156', '#667d91', '#8b6875', '#747456', '#756c91'];
  const colors = new Map(graph.domains.map((domain, i) => [domain.id, domain.color || palette[i % palette.length]]));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const image = reference => DATA.imageList[DATA.imageRefs[reference]];
  const picture = (src, alt, extra = '') => `<img src="${escape(image(src))}" alt="${escape(alt)}" ${extra}>`;
  let currentId = null;
  let selectedId = graph.nodes[0].id;
  let noteTarget = null;
  let toastTimer;
  const attempts = new Map();

  function toast(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { status.hidden = true; }, 5000);
  }
  const validId = id => typeof id === 'string' && id.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(id);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keysOnly = (value, keys) => Object.keys(value).every(key => keys.includes(key));
  function validateProgress(value) {
    if (!object(value) || !keysOnly(value, ['version', 'units']) || value.version !== 1 || !object(value.units)) throw new Error('进度 JSON 格式不正确');
    for (const [id, record] of Object.entries(value.units)) {
      if (!validId(id) || !object(record) || !keysOnly(record, ['lit', 'litAt', 'retelling', 'answers']) || typeof record.lit !== 'boolean' || !object(record.answers)) throw new Error('单元进度格式不正确');
      if (record.retelling !== undefined && (typeof record.retelling !== 'string' || record.retelling.length > 200)) throw new Error('复述需在 200 字以内');
      if (record.litAt !== undefined && (typeof record.litAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(record.litAt) || !Number.isFinite(Date.parse(record.litAt)))) throw new Error('点亮时间格式不正确');
      if (!Object.entries(record.answers).every(([qid, correct]) => validId(qid) && typeof correct === 'boolean')) throw new Error('答题记录格式不正确');
    }
    return value;
  }
  function readProgress() {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw === null ? EMPTY() : validateProgress(JSON.parse(raw));
  }
  function snapshot() { try { return readProgress(); } catch { return EMPTY(); } }
  let progress = snapshot();
  function saveProgress(value) {
    validateProgress(value);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(value));
    progress = value;
  }
  function updateProgress(id, patch) {
    const latest = readProgress();
    const record = latest.units[id] || { lit: false, answers: {} };
    saveProgress({ version: 1, units: { ...latest.units, [id]: { ...record, ...patch, answers: { ...record.answers, ...patch.answers } } } });
  }
  function mergeProgress(prior, incoming) {
    const merged = { ...prior.units };
    for (const [id, next] of Object.entries(incoming.units)) {
      const old = merged[id];
      if (!old) { merged[id] = next; continue; }
      const newer = Date.parse(next.litAt || '') > Date.parse(old.litAt || '') || !old.litAt;
      const answers = { ...old.answers };
      for (const [qid, correct] of Object.entries(next.answers)) answers[qid] = answers[qid] === true || correct;
      merged[id] = { lit: old.lit || next.lit, answers,
        litAt: newer ? (next.litAt || old.litAt) : (old.litAt || next.litAt),
        retelling: newer ? (next.retelling || old.retelling) : (old.retelling || next.retelling) };
    }
    return { version: 1, units: merged };
  }
  function download(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function readNotes() {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return { version: 1, notes: [] };
    const value = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !Array.isArray(value.notes) || !value.notes.every(note => object(note) &&
      ['id', 'unit', 'anchor', 'text', 'createdAt'].every(key => typeof note[key] === 'string') &&
      Object.hasOwn(INTENTS, note.intent) && note.anchor.startsWith(`${note.unit}#`))) throw new Error('批注记录格式不正确');
    return value;
  }
  function noteCount(anchor) { try { return readNotes().notes.filter(note => !anchor || note.anchor === anchor).length; } catch { return 0; } }
  function refreshNoteCounts() {
    document.getElementById('notes-count').textContent = noteCount();
    document.querySelectorAll('[data-note]').forEach(button => {
      const count = noteCount(button.dataset.note);
      button.textContent = `批注${count ? ` · ${count}` : ''}`;
    });
  }
  const annotate = anchor => `<button class="annotate" data-note="${escape(anchor)}" aria-label="批注 ${escape(anchor)}">批注${noteCount(anchor) ? ` · ${noteCount(anchor)}` : ''}</button>`;
  const askAI = concept => `<button class="ask-ai" data-ai="${escape(concept || '')}">问 AI</button>`;

  // Port of src/lib/utils/graph-layout.ts: only hard + soft affect depth.
  function layoutGraph() {
    const layers = new Map(graph.nodes.map(node => [node.id, 0]));
    const incoming = new Map(graph.nodes.map(node => [node.id, 0]));
    const outgoing = new Map(graph.nodes.map(node => [node.id, new Set()]));
    for (const edge of graph.edges) {
      if (edge.type === 'cross' || outgoing.get(edge.from).has(edge.to)) continue;
      outgoing.get(edge.from).add(edge.to);
      incoming.set(edge.to, incoming.get(edge.to) + 1);
    }
    const queue = graph.nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const next of outgoing.get(id)) {
        layers.set(next, Math.max(layers.get(next), layers.get(id) + 1));
        incoming.set(next, incoming.get(next) - 1);
        if (incoming.get(next) === 0) queue.push(next);
      }
    }
    if (queue.length !== graph.nodes.length) throw new Error('先修图中有环');
    const columns = Array.from({ length: Math.max(0, ...layers.values()) + 1 }, (_, layer) => graph.nodes.filter(node => layers.get(node.id) === layer).sort((a, b) => a.week - b.week));
    const rows = Math.max(1, ...columns.map(column => column.length));
    return { width: 48 + (columns.length - 1) * 216 + 164, height: 96 + rows * 150,
      nodes: columns.flatMap((column, layer) => column.map((node, row) => ({ ...node, layer, x: 24 + layer * 216, y: 76 + (rows - column.length) * 75 + row * 150 }))) };
  }
  const layout = layoutGraph();
  const positions = new Map(layout.nodes.map(node => [node.id, node]));
  const stateLabel = node => node.status !== 'built' ? '即将上线' : progress.units[node.id]?.lit ? '已点亮' : '可学习';
  function mapSVG() {
    const paths = graph.edges.map((edge, index) => {
      const from = positions.get(edge.from), to = positions.get(edge.to);
      const x1 = from.x + 164, x2 = to.x, y1 = from.y + 53, y2 = to.y + 53;
      const cross = edge.type === 'cross';
      const lane = 20 + (index % 4) * 11;
      const d = to.layer - from.layer > 1 || cross
        ? `M ${from.x + 82} ${from.y} C ${from.x + 82} ${lane}, ${to.x + 82} ${lane}, ${to.x + 82} ${to.y}`
        : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
      const relevant = edge.to === selectedId || edge.from === selectedId;
      return `<path d="${d}" fill="none" stroke="${cross ? '#a78a59' : '#8f9f91'}" stroke-width="${relevant ? 2 : 1.3}" opacity="${relevant ? 1 : .55}" ${edge.type !== 'hard' ? `stroke-dasharray="${cross ? '1 5' : '6 4'}"` : ''} ${cross ? '' : 'marker-end="url(#arrow)"'}><title>${escape(EDGE_LABELS[edge.type] + '：' + edge.why)}</title></path>`;
    }).join('');
    const nodes = layout.nodes.map(node => {
      const active = selectedId === node.id, built = node.status === 'built', lit = built && progress.units[node.id]?.lit;
      return `<g transform="translate(${node.x},${node.y})">
        <g class="node" role="button" tabindex="0" data-select="${escape(node.id)}" aria-pressed="${active}" aria-label="${escape(node.id.toUpperCase() + ' ' + node.name + '，' + stateLabel(node))}">
          <rect class="node-body" width="164" height="106" rx="9" fill="${lit ? '#eaf1e6' : built ? '#fffefa' : '#f1f2ed'}" stroke="${colors.get(node.domain)}" stroke-opacity="${built || active ? 1 : .5}" stroke-width="${active ? 2 : 1}"/>
          <rect y="12" width="3" height="82" rx="1" fill="${colors.get(node.domain)}" opacity="${built ? 1 : .5}"/>
          <text x="13" y="24" font-size="10" fill="#74806e">${escape(node.id.toUpperCase())} · 第 ${node.week} 周 · ${escape(node.module)}</text>
          <text x="13" y="49" font-size="13" font-weight="500" fill="${built ? '#263832' : '#76806f'}">${escape(node.icon + ' ' + node.name)}</text>
          <text x="13" y="70" font-size="10" fill="#687966">${stateLabel(node)}</text>
        </g>
        ${built ? `<a href="#/unit/${encodeURIComponent(node.id)}" aria-label="打开 ${escape(node.name)}"><text x="13" y="92" font-size="11" fill="#355f50">打开单元 →</text></a>` : ''}
      </g>`;
    }).join('');
    return `<svg width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="group" aria-label="课程知识地图"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8f9f91"/></marker></defs>${paths}${nodes}</svg>`;
  }
  function panelHTML() {
    const node = positions.get(selectedId);
    const prerequisites = graph.edges.filter(edge => edge.to === selectedId && edge.type !== 'cross');
    const outgoing = graph.edges.filter(edge => edge.from === selectedId && edge.type !== 'cross');
    const associations = graph.edges.filter(edge => edge.type === 'cross' && (edge.to === selectedId || edge.from === selectedId));
    const missing = prerequisites.filter(edge => !progress.units[edge.from]?.lit);
    return `<small>${escape(node.id.toUpperCase())} · 第 ${node.week} 周 · ${escape(node.module)}</small><h3>${escape(node.name)}</h3>
      <p class="description">${escape(node.desc)}</p><span class="badge">${stateLabel(node)}</span>
      ${missing.length ? `<p class="hint-box">建议先学：${missing.map(edge => escape(edge.from.toUpperCase() + ' ' + positions.get(edge.from).name)).join('、')}。也可以按自己的问题探索。</p>` : ''}
      ${node.status === 'built' ? `<a class="primary" href="#/unit/${encodeURIComponent(node.id)}">打开单元 →</a>` : ''}
      <h4>理解的联系</h4>${!prerequisites.length ? '<small>可从这里开始。</small>' : ''}
      ${[...prerequisites, ...associations, ...outgoing].map(edge => {
        const other = positions.get(edge.to === selectedId ? edge.from : edge.to);
        return `<div class="edge-detail"><strong>${EDGE_LABELS[edge.type]} · ${escape(other.id.toUpperCase() + ' ' + other.name)}</strong><p>${escape(edge.why)}</p><small>${(edge.status || graph.status) === 'draft' ? 'AI 推断，待确认' : '已确认'}${outgoing.includes(edge) ? ' · 后续单元' : ''}</small></div>`;
      }).join('')}`;
  }
  function selectNode(id) {
    selectedId = id;
    document.querySelectorAll('[data-select]').forEach(node => {
      const active = node.dataset.select === id;
      node.setAttribute('aria-pressed', active);
      node.querySelector('.node-body').setAttribute('stroke-width', active ? '2' : '1');
      node.querySelector('.node-body').setAttribute('stroke-opacity', active || positions.get(node.dataset.select).status === 'built' ? '1' : '.5');
    });
    document.getElementById('map-panel').innerHTML = panelHTML();
    // Updating edge highlights preserves the scroll position and keyboard focus.
    const svg = document.querySelector('.map-surface svg');
    svg.querySelectorAll(':scope > path').forEach((path, i) => {
      const edge = graph.edges[i], relevant = edge.from === id || edge.to === id;
      path.setAttribute('opacity', relevant ? '1' : '.55');
      path.setAttribute('stroke-width', relevant ? '2' : '1.3');
    });
  }
  function renderMap() {
    currentId = null;
    document.title = graph.title + ' · 学习预览';
    app.innerHTML = `<div class="map-page"><div class="map-heading"><div><p class="eyebrow">2026 Q4 · HUMANITIES & ARTS</p><h1>从看见，到理解世界</h1><p class="intro">${escape(graph.title)}<br>从左到右，按理解依赖展开。选择一个问题，开始自己的观看之旅。</p></div><div class="season"><strong>12 个周末</strong>每次一个问题 · 每周一份产出</div></div>
      <div class="legend">${graph.domains.map(domain => `<span><i class="dot" style="background:${colors.get(domain.id)}"></i>${escape(domain.name)}</span>`).join('')}</div>
      <div class="legend"><span><i class="edge-line"></i>理解所需</span><span><i class="edge-line soft"></i>建议先学</span><span><i class="edge-line cross"></i>跨域联系</span><span>${graph.status === 'draft' ? '教学关系草案 · AI 推断，待确认' : '教学关系已确认'}</span></div>
      <div class="map-grid"><div class="map-surface" tabindex="0" aria-label="可横向滚动的课程地图">${mapSVG()}</div><aside id="map-panel" class="panel" aria-label="单元详情" aria-live="polite">${panelHTML()}</aside></div>
      <details class="reorder"><summary>为什么不按教科书顺序</summary><p>${escape(graph.reorder)}</p><p>依据：${escape(graph.sources_ref)}</p></details>
      <p class="other-units">${DATA.units.filter(unit => !positions.has(unit.frontmatter.id)).map(unit => `<a href="#/unit/${encodeURIComponent(unit.frontmatter.id)}">${escape(unit.frontmatter.title)} →</a>`).join(' · ')}</p></div>`;
  }
  const SECTION_META = {
    'Hook Question': ['hook-question', '先想一个问题'], 'hook question': ['hook-question', '先想一个问题'],
    'Core Narrative': ['core-narrative', '沿着主线理解'],
    'Key Concepts': ['key-concepts', '把理解挂在概念上'], '关键概念': ['key-concepts', '把理解挂在概念上'],
    'Artworks': ['artworks', '回到作品，慢慢看'], '作品与图片清单': ['artworks', '回到作品，慢慢看'],
    'Video Storyboard': ['video-storyboard', '课程视频与讲解'], '视频脚本': ['video-storyboard', '课程视频与讲解'],
    'Interactive Components': ['interactive-components', '亲手验证你的直觉'], '交互组件': ['interactive-components', '亲手验证你的直觉'], '交互组件规格': ['interactive-components', '亲手验证你的直觉'],
    'Mastery Evidence': ['mastery-evidence', '怎样算真的懂了'],
    'Check Yourself': ['check-yourself', '关上材料，检查理解'], '自测题': ['check-yourself', '关上材料，检查理解'],
    'Link to AI & Future Human Life': ['ai-and-future-life', '连接 AI 与未来生活'], '和 AI、未来人类生活的联系': ['ai-and-future-life', '连接 AI 与未来生活']
  };
  function shuffleOptions(options, id) {
    let seed = 2166136261;
    for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  function questionHTML(unit, question, i) {
    const id = unit.frontmatter.id;
    const solved = progress.units[id]?.answers[question.id] === true;
    const options = question.options ? shuffleOptions(question.options, question.id) : [];
    const selected = attempts.get(`${id}/${question.id}`);
    const chosen = selected === undefined ? null : options[selected];
    const correct = options.find(option => option.correct);
    return `<div class="card question" data-question="${escape(question.id)}"><div class="question-head"><h3>${i + 1}. ${escape(question.question)}</h3>${annotate(`${id}#check-yourself/${question.id}`)}</div>
      ${options.length ? `<div class="options">${options.map((option, index) => `<button class="option ${solved && option.correct ? 'correct' : chosen === option ? 'wrong' : ''}" data-answer="${escape(question.id)}" data-option="${index}" aria-pressed="${solved ? option.correct === true : chosen === option}" ${solved ? 'disabled' : ''}>${escape(option.text)}</button>`).join('')}</div>
      <div class="feedback ${solved ? 'correct' : 'wrong'}" aria-live="polite">${solved ? `答对了。${escape(correct.why || question.explanation || question.answer)}` : chosen ? `再想一想：${escape(question.hint || chosen.why || '回到概念，看看这个解释能否与观察相符。')}${chosen.why && question.hint ? `<br>${escape(chosen.why)}` : ''} 可以重新选择。` : ''}</div>
      ${chosen || solved ? `<button class="retry" data-retry="${escape(question.id)}">重新尝试</button>` : ''}`
      : `${question.choices ? `<ul>${question.choices.map(choice => `<li>${escape(choice)}</li>`).join('')}</ul>` : ''}<details class="canon"><summary>查看参考答案</summary><p>${escape(question.answer)}</p><p>${escape(question.explanation || '')}</p></details>`}</div>`;
  }
  function litHTML(unit) {
    const id = unit.frontmatter.id;
    const record = progress.units[id];
    const mcqs = unit.sections.checkYourself.filter(question => question.options?.length);
    const allCorrect = mcqs.length > 0 && mcqs.every(question => record?.answers[question.id] === true);
    if (!allCorrect) return `<p class="lit-locked">${record?.lit ? '这个单元已点亮。' : ''}${mcqs.length ? '逐一答对选择题后，可对照掌握证据，点亮这个单元。' : '本演示仅提供参考答案，未设置点亮过关题。'}</p>`;
    return `<div class="card lit-box"><strong>${record?.lit ? '这个单元已点亮' : '选择题已逐一答对'}</strong><p class="muted">对照掌握证据，再用自己的话整理一次。</p><label for="retelling">用自己的话复述（可选，≤200 字）</label><textarea id="retelling" rows="4" maxlength="200" placeholder="关上材料，写下你理解的主线……">${escape(record?.retelling || '')}</textarea><button class="primary" data-light>${record?.lit ? '保存复述' : '点亮这个单元'}</button></div>`;
  }
  function interactiveHTML(unit) {
    const spec = unit.sections.interactive;
    const artworkSrc = id => unit.artworkImages[id];
    let html = spec.predictReveals.map(item => `<div class="card interactive-card predict"><h3>先预测，再揭示</h3><p>${escape(item.prompt)}</p><textarea rows="2" aria-label="写下你的预测" placeholder="先写下你的判断，再打开答案……"></textarea><details><summary>揭示答案</summary><p>${escape(item.answer)}</p><p class="muted">${escape(item.explanation || '')}</p></details></div>`).join('');
    html += spec.luminanceExplorers.map((item, i) => `<div class="card interactive-card" data-luminance="${i}"><h3>明度探索器 · 太阳去哪儿了？</h3><p class="muted">拖动滑块，逐渐移除颜色。点击画面，比较太阳与天空的明度。</p><canvas class="luminance" aria-label="莫奈作品：可点击取样的明度画布">明度画布</canvas><label class="range-row">彩色<input type="range" min="0" max="100" value="0" aria-label="彩色到明度的混合"><span>明度 L*</span></label><p class="sample" aria-live="polite">点击太阳或天空取样（压缩图估算）。</p>${item.measuredLstar ? `<p class="fixation">源材料测量：太阳 L* ${escape(item.measuredLstar.sun)} · 天空均值 ${escape(item.measuredLstar.skyMean)}${item.measuredLstar.skySd === undefined ? '' : ` ± ${escape(item.measuredLstar.skySd)}`}。本画布数值会受图片压缩影响。</p>` : ''}${item.fixationPoint ? '<label class="fixation"><input type="checkbox" data-fixation> 显示船上人物注视点 · 可慢看 30–60 秒，观察余光里的太阳</label>' : ''}</div>`).join('');
    html += spec.frequencyToggles.map((item, i) => `<div class="card interactive-card" data-frequency="${i}"><h3>空间频率 · 笑容的开关</h3><p class="muted">切换细节与大块明暗，再把注视点移到眼睛与嘴部。</p><canvas aria-label="蒙娜丽莎的空间频率对比">频率对比画布</canvas><div class="toggle-row">${(item.labels || ['只留细节（高通）', '原图', '只留大块明暗（低通）']).map((label, index) => `<button data-frequency-index="${index}" aria-pressed="${index === 1}">${escape(label)}</button>`).join('')}</div></div>`).join('');
    html += spec.imageComparisons.map(item => `<div class="card interactive-card" data-comparison><h3>${escape(item.prompt || '作品对比')}</h3><div class="compare-frame">${picture(artworkSrc(item.rightArtworkId), item.labelRight || '右侧作品')}${picture(artworkSrc(item.leftArtworkId), item.labelLeft || '左侧作品', 'class="compare-left" style="clip-path:inset(0 50% 0 0)"')}</div><label class="range-row">${escape(item.labelLeft || '左图')}<input type="range" min="0" max="100" value="50" aria-label="作品对比滑块">${escape(item.labelRight || '右图')}</label></div>`).join('');
    html += spec.zoomAnnotates.map((item, i) => `<div class="card interactive-card" data-zoom="${i}"><h3>缩放与热点标注</h3><div class="hotspot-frame"><div class="zoom-image">${picture(artworkSrc(item.artworkId), '可缩放的标注作品')}${item.hotspots.map((spot, index) => `<button style="left:${spot.xPct}%;top:${spot.yPct}%" data-hotspot="${index}" aria-label="${escape(spot.title)}">${index + 1}</button>`).join('')}</div></div><label class="range-row">缩放<input type="range" min="100" max="250" value="100" aria-label="作品缩放"></label><p class="sample">点击标记查看细节。</p></div>`).join('');
    html += (spec.functionMaps || []).map((item, i) => {
      const works = item.works.map(work => {
        const src = artworkSrc(work.artworkId);
        return `<button type="button" class="fmap-work" draggable="true" data-work="${escape(work.artworkId)}" aria-pressed="false">${picture(src, work.label || work.artworkId)}<span><strong>${escape(work.label || work.artworkId)}</strong><small data-assign-label>未放置</small></span></button>`;
      }).join('');
      const bins = item.bins.map(bin => `<div class="fmap-bin" data-bin="${escape(bin.id)}"><div class="fmap-bin-title">${escape(bin.label)}</div>${bin.description ? `<p class="muted">${escape(bin.description)}</p>` : ''}<div class="fmap-bin-slots" data-slots></div></div>`).join('');
      const scholars = item.scholarViews.map(view => {
        const work = item.works.find(w => w.artworkId === view.artworkId);
        const claim = ({fact:'可测量事实',consensus:'学界共识',disputed:'有争议','ai-inferred':'AI 推断'})[view.claimType] || view.claimType;
        const primary = view.primary.map(id => (item.bins.find(b => b.id === id) || {label:id}).label).join('、');
        const also = (view.also || []).map(id => (item.bins.find(b => b.id === id) || {label:id}).label).join('、');
        return `<article class="fmap-scholar" data-scholar-for="${escape(view.artworkId)}"><div><strong>${escape((work && work.label) || view.artworkId)}</strong> <span class="claim">${escape(claim)}</span></div><p class="muted">你的主功能：<span data-yours>—</span> · 学者主功能：${escape(primary)}${also ? `；也常见：${escape(also)}` : ''}</p><p>${escape(view.summary)}</p>${view.source ? `<p class="muted">出处：${escape(view.source)}</p>` : ''}</article>`;
      }).join('');
      return `<div class="card interactive-card fmap" data-fmap="${i}"><h3>${escape(item.title || '功能地图')}</h3><p class="muted">${escape(item.instruction || '把作品放到主功能格子里。功能常常叠加，没有唯一正确答案。')}</p><p class="muted">先点选作品再点格子，或直接拖入。</p><div class="fmap-works">${works}</div><div class="fmap-bins">${bins}</div><div class="fmap-actions"><button type="button" class="primary" data-fmap-reveal disabled>看学者们怎么分</button><span class="muted" data-fmap-status>还没全部放置</span></div><div class="fmap-reveal" hidden><h4>学者视图（功能常叠加）</h4>${scholars}${item.reflectPrompt ? `<p class="frame">${escape(item.reflectPrompt)}</p>` : ''}</div></div>`;
    }).join('');
    if (spec.timeline) html += `<div class="card interactive-card"><h3>${escape(spec.timeline.title || '互动时间轴')}</h3>${spec.timeline.items.map(item => `<details class="canon"><summary>${escape(item.date + ' · ' + item.label)}</summary><p>${escape(item.description || '')}</p></details>`).join('')}</div>`;
    return html;
  }
  function sectionBody(unit, key, body) {
    const s = unit.sections, id = unit.frontmatter.id;
    if (key === 'hook-question') return `<p class="hook">${escape(s.hookQuestion)}</p>`;
    if (key === 'core-narrative') return s.coreNarrative.map(paragraph => `<p class="prose">${escape(paragraph)}</p>`).join('');
    if (key === 'key-concepts') return s.keyConcepts.map(concept => `<article class="card concept"><div class="concept-head"><h3>${escape(concept.term)}</h3>${annotate(`${id}#key-concepts/${concept.term}`)}</div><p class="explanation">${escape(concept.explanation)}</p>${concept.analogy ? `<p class="analogy">类比：${escape(concept.analogy)}</p>` : ''}${concept.analogyLimit ? `<p class="limit">类比的边界：${escape(concept.analogyLimit)}</p>` : ''}${concept.canon ? `<details class="canon"><summary>📖 原典怎么说</summary><div class="canon-body"><small>${concept.canon.quote ? '原文引用' : '转述，非原文引用'}</small><p>${escape(concept.canon.formal)}</p><p class="muted">出处：${escape(concept.canon.source)}</p>${concept.canon.textbook ? `<p class="muted">教材对应：${escape(concept.canon.textbook)}</p>` : ''}</div></details>` : ''}${askAI(concept.term)}</article>`).join('');
    if (key === 'artworks') return `<div class="art-grid">${s.artworks.map(artwork => `<figure>${picture(artwork.sourceUrl, artwork.title, 'loading="lazy"')}<figcaption><strong>${escape(artwork.title)}</strong>${escape(artwork.caption || '')}<small>${escape([artwork.creator, artwork.year].filter(Boolean).join(' · '))}<br>${escape(artwork.license)}</small><a class="source-link" href="${escape(artwork.sourceUrl)}" target="_blank" rel="noreferrer">素材来源 ↗</a></figcaption></figure>`).join('')}</div>`;
    if (key === 'video-storyboard') return `${unit.video ? `<video controls preload="none" src="${escape(unit.video)}" poster="${escape(image(s.artworks[0].sourceUrl))}" aria-label="课程视频"></video>` : '<p class="muted">课程视频尚未生成，可阅读下方讲解脚本。</p>'}<details class="storyboard"><summary>查看完整视频脚本</summary><ol>${s.storyboard.map(scene => `<li><strong>${escape(scene.title || scene.id)} · ${scene.durationSec} 秒 · ${escape(scene.transition)}</strong><p>${escape(scene.narration)}</p><small>画面：${escape(scene.images.join('、'))}</small>${scene.subtitles?.length ? `<p>${scene.subtitles.map(cue => escape(`${cue.startSec}–${cue.endSec} 秒：${cue.text}`)).join('<br>')}</p>` : ''}</li>`).join('')}</ol></details>`;
    if (key === 'interactive-components') return interactiveHTML(unit);
    if (key === 'mastery-evidence') return `<ul class="evidence">${(s.masteryEvidence || []).map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    if (key === 'check-yourself') return `${s.checkYourself.map((question, i) => questionHTML(unit, question, i)).join('')}<div id="lit-flow">${litHTML(unit)}</div>${askAI()}`;
    if (key === 'ai-and-future-life') return `<p class="prose">${escape(s.aiAndFutureLife)}</p>`;
    return `<p class="prose">${escape(body)}</p>`;
  }
  function renderUnit(id) {
    const unit = units.get(id);
    if (!unit) { app.innerHTML = '<div class="unit-page"><h1>单元尚未上线</h1><p><a href="#/map">返回知识地图 →</a></p></div>'; currentId = null; return; }
    currentId = id;
    document.title = unit.frontmatter.title + ' · 学习预览';
    const node = positions.get(id);
    const next = node ? graph.edges.filter(edge => edge.from === id && edge.type !== 'cross').map(edge => positions.get(edge.to).name) : [];
    app.innerHTML = `<div class="unit-page"><a class="back" href="#/map">← 课程知识地图</a><div class="unit-hero"><p class="eyebrow">${escape(id.toUpperCase())} · ${node ? '第 ' + node.week + ' 周' : '演示单元'}</p><h1>${escape(unit.frontmatter.title)}</h1><p class="meta">${escape(unit.frontmatter.module)} · 预计 ${unit.frontmatter.estTimeMinutes} 分钟 · <span id="unit-state">${progress.units[id]?.lit ? '已点亮' : '可学习'}</span> ${annotate(`${id}#frontmatter`)}</p><div class="frame">${node ? `${escape(node.desc)}${next.length ? `<br><span class="muted">这条主线将通向：${escape([...new Set(next)].join('、'))}</span>` : ''}` : '从作品出发，把观察挂在概念与证据上。'}</div></div>
      ${unit.sourceSections.map((section, i) => {
        const [key, title] = SECTION_META[section.heading] || [section.heading.toLowerCase().replace(/\s+/g, '-'), section.heading];
        return `<section class="section" data-anchor="${escape(`${id}#${key}`)}"><div class="section-title"><h2><span class="section-number">${String(i + 1).padStart(2, '0')}</span>${escape(title)}</h2>${annotate(`${id}#${key}`)}</div>${sectionBody(unit, key, section.body)}</section>`;
      }).join('')}
      <section class="section"><div class="section-title"><h2>阅读出处</h2>${annotate(`${id}#sources`)}</div><ul class="muted">${unit.frontmatter.sources.map(source => `<li>${escape(source)}</li>`).join('')}</ul></section></div>`;
    mountInteractives(unit);
  }
  function mountInteractives(unit) {
    document.querySelectorAll('[data-luminance]').forEach(element => {
      const spec = unit.sections.interactive.luminanceExplorers[Number(element.dataset.luminance)];
      const canvas = element.querySelector('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      const slider = element.querySelector('input[type=range]');
      let colorData, lumData;
      const srgbToLin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
      const rgbToLstar = (r, g, b) => { const y = .2126 * srgbToLin(r) + .7152 * srgbToLin(g) + .0722 * srgbToLin(b); return 116 * (y > .008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116) - 16; };
      function paint() {
        if (!colorData) return;
        const mix = slider.value / 100, out = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < out.data.length; i++) out.data[i] = i % 4 === 3 ? 255 : Math.round(colorData.data[i] * (1 - mix) + lumData.data[i] * mix);
        ctx.putImageData(out, 0, 0);
        if (spec.fixationPoint && element.querySelector('[data-fixation]')?.checked) {
          const x = spec.fixationPoint[0] * canvas.width, y = spec.fixationPoint[1] * canvas.height;
          ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#263832'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 880 / img.width);
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        colorData = ctx.getImageData(0, 0, canvas.width, canvas.height); lumData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < colorData.data.length; i += 4) {
          const l = rgbToLstar(colorData.data[i], colorData.data[i + 1], colorData.data[i + 2]);
          lumData.data[i] = lumData.data[i + 1] = lumData.data[i + 2] = Math.max(0, Math.min(255, Math.round(l / 100 * 255))); lumData.data[i + 3] = 255;
        }
        paint();
      };
      img.src = image(spec.imageUrl);
      slider.addEventListener('input', paint);
      element.querySelector('[data-fixation]')?.addEventListener('change', paint);
      canvas.addEventListener('click', event => {
        if (!colorData) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) / rect.width * canvas.width)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) / rect.height * canvas.height)));
        const i = (y * canvas.width + x) * 4, [r, g, b] = colorData.data.slice(i, i + 3);
        element.querySelector('.sample').textContent = `取样 (${x}, ${y}) · RGB(${r}, ${g}, ${b}) · L* ≈ ${rgbToLstar(r, g, b).toFixed(1)}`;
      });
    });
    document.querySelectorAll('[data-frequency]').forEach(element => {
      const spec = unit.sections.interactive.frequencyToggles[Number(element.dataset.frequency)];
      const canvas = element.querySelector('canvas'), ctx = canvas.getContext('2d');
      const img = new Image(); let index = 1;
      function paint() {
        if (!img.naturalWidth) return;
        const width = img.width / 3;
        canvas.width = Math.round(width); canvas.height = img.height;
        ctx.drawImage(img, index * width, 0, width, img.height, 0, 0, canvas.width, canvas.height);
      }
      img.onload = paint; img.src = image(spec.combinedImage);
      element.addEventListener('click', event => {
        const button = event.target.closest('[data-frequency-index]');
        if (!button) return;
        index = Number(button.dataset.frequencyIndex);
        element.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', item === button));
        paint();
      });
    });
    document.querySelectorAll('[data-comparison]').forEach(element => {
      element.querySelector('input').addEventListener('input', event => { element.querySelector('.compare-left').style.clipPath = `inset(0 ${100 - event.target.value}% 0 0)`; });
    });
    document.querySelectorAll('[data-zoom]').forEach(element => {
      const spec = unit.sections.interactive.zoomAnnotates[Number(element.dataset.zoom)];
      const target = element.querySelector('.zoom-image'); target.style.position = 'relative';
      element.querySelector('input').addEventListener('input', event => { target.style.width = `${event.target.value}%`; });
      element.addEventListener('click', event => {
        const button = event.target.closest('[data-hotspot]'); if (!button) return;
        const spot = spec.hotspots[Number(button.dataset.hotspot)];
        element.querySelector('.sample').textContent = `${spot.title}：${spot.description}`;
      });
    });
    document.querySelectorAll('[data-fmap]').forEach(element => {
      const spec = unit.sections.interactive.functionMaps[Number(element.dataset.fmap)];
      const assignments = {};
      let selected = null;
      let dragging = null;
      const binLabel = id => (spec.bins.find(bin => bin.id === id) || { label: id }).label;
      function refresh() {
        element.querySelectorAll('.fmap-work').forEach(button => {
          const id = button.dataset.work;
          button.setAttribute('aria-pressed', selected === id ? 'true' : 'false');
          button.classList.toggle('selected', selected === id);
          const label = button.querySelector('[data-assign-label]');
          label.textContent = assignments[id] ? `已放入：${binLabel(assignments[id])}` : '未放置';
        });
        element.querySelectorAll('.fmap-bin').forEach(bin => {
          const slots = bin.querySelector('[data-slots]');
          const placed = spec.works.filter(work => assignments[work.artworkId] === bin.dataset.bin);
          slots.innerHTML = placed.length
            ? placed.map(work => `<div class="fmap-chip">${escape(work.label || work.artworkId)}</div>`).join('')
            : '<span class="muted">拖入或点选放入</span>';
        });
        const remaining = spec.works.filter(work => !assignments[work.artworkId]).length;
        const revealBtn = element.querySelector('[data-fmap-reveal]');
        const status = element.querySelector('[data-fmap-status]');
        revealBtn.disabled = remaining > 0;
        status.textContent = remaining > 0 ? `还差 ${remaining} 件` : '已全部放置。学者视图是解释模型，不是标准答案。';
        element.querySelectorAll('[data-scholar-for]').forEach(article => {
          const yours = assignments[article.dataset.scholarFor];
          const span = article.querySelector('[data-yours]');
          if (span) span.textContent = yours ? binLabel(yours) : '未放置';
        });
      }
      function assign(workId, binId) {
        assignments[workId] = binId;
        selected = null;
        refresh();
      }
      element.querySelectorAll('.fmap-work').forEach(button => {
        button.addEventListener('click', () => {
          selected = selected === button.dataset.work ? null : button.dataset.work;
          refresh();
        });
        button.addEventListener('dragstart', () => { dragging = button.dataset.work; });
        button.addEventListener('dragend', () => { dragging = null; });
      });
      element.querySelectorAll('.fmap-bin').forEach(bin => {
        bin.addEventListener('dragover', event => event.preventDefault());
        bin.addEventListener('drop', () => { if (dragging) assign(dragging, bin.dataset.bin); });
        bin.addEventListener('click', () => { if (selected) assign(selected, bin.dataset.bin); });
      });
      element.querySelector('[data-fmap-reveal]').addEventListener('click', () => {
        element.querySelector('.fmap-reveal').hidden = false;
        refresh();
      });
      refresh();
    });
  }
  function refreshQuiz(questionId) {
    const unit = units.get(currentId), index = unit.sections.checkYourself.findIndex(question => question.id === questionId);
    const question = [...document.querySelectorAll('[data-question]')].find(element => element.dataset.question === questionId);
    const retelling = document.getElementById('retelling')?.value;
    question.outerHTML = questionHTML(unit, unit.sections.checkYourself[index], index);
    document.getElementById('lit-flow').innerHTML = litHTML(unit);
    if (retelling !== undefined && document.getElementById('retelling')) document.getElementById('retelling').value = retelling;
  }
  async function copyPrompt(concept) {
    const lit = Object.entries(progress.units).filter(([, value]) => value.lit).map(([id]) => id.toUpperCase());
    const prompt = ['请作为我的学习伙伴，结合以下学习背景引导我：',
      ...DATA.profileHighlights.slice(0, 4).map(item => `- ${item}`),
      `当前单元：${units.get(currentId).frontmatter.title}`, ...(concept ? [`当前概念：${concept}`] : []),
      `已点亮单元：${lit.length ? lit.join('、') : '暂无'}`,
      '请只用追问引导我，不要直接给出答案；如果我说错了，指出矛盾让我自己发现。',
      '每次只追问一个点，先从我对当前内容的理解问起。'].join('\n');
    try { await navigator.clipboard.writeText(prompt); toast('已复制问 AI 提示词'); }
    catch {
      const field = document.getElementById('ai-prompt'); field.value = prompt;
      document.getElementById('ai-dialog').showModal(); field.focus(); field.select();
    }
  }
  function renderNotes() {
    const notes = readNotes().notes.filter(note => !noteTarget || note.anchor === noteTarget.anchor);
    document.getElementById('notes-list').innerHTML = notes.length ? notes.map(note => `<article class="note-entry"><strong>[${INTENTS[note.intent]}]</strong><small>${escape(note.anchor)} · ${escape(new Date(note.createdAt).toLocaleString('zh-CN'))}</small><p>${escape(note.text)}</p><button data-delete-note="${escape(note.id)}">删除批注</button></article>`).join('') : '<p class="muted" style="margin-top:20px">还没有批注。</p>';
  }
  function openNotes(anchor) {
    noteTarget = anchor ? { unit: currentId, anchor } : null;
    document.getElementById('note-anchor').textContent = anchor ? `units/${currentId}/source.md → ${anchor}` : '全部单元的批注 · 可在正文旁添加反馈';
    document.getElementById('note-form').hidden = !noteTarget;
    document.getElementById('note-form').reset();
    try { renderNotes(); document.getElementById('notes-dialog').showModal(); }
    catch { toast('无法读取批注，请检查本地存储中的记录。'); }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, [data-select]'); if (!target) return;
    if (target.hasAttribute('data-select')) { selectNode(target.dataset.select); return; }
    if (target.hasAttribute('data-note')) { openNotes(target.dataset.note); return; }
    if (target.hasAttribute('data-ai')) { copyPrompt(target.dataset.ai); return; }
    try {
      if (target.hasAttribute('data-answer')) {
        const qid = target.dataset.answer, index = Number(target.dataset.option);
        const question = units.get(currentId).sections.checkYourself.find(item => item.id === qid);
        const option = shuffleOptions(question.options, qid)[index];
        updateProgress(currentId, { answers: { [qid]: option.correct === true } });
        attempts.set(`${currentId}/${qid}`, index); refreshQuiz(qid);
      }
      if (target.hasAttribute('data-retry')) {
        const qid = target.dataset.retry;
        updateProgress(currentId, { answers: { [qid]: false } }); attempts.delete(`${currentId}/${qid}`); refreshQuiz(qid);
      }
      if (target.hasAttribute('data-light')) {
        const retelling = document.getElementById('retelling').value;
        updateProgress(currentId, { lit: true, litAt: progress.units[currentId]?.litAt || new Date().toISOString(), retelling });
        document.getElementById('unit-state').textContent = '已点亮';
        document.getElementById('lit-flow').innerHTML = litHTML(units.get(currentId)); toast('已点亮并保存学习记录');
      }
      if (target.hasAttribute('data-delete-note')) {
        const store = readNotes(); store.notes = store.notes.filter(note => note.id !== target.dataset.deleteNote);
        localStorage.setItem(NOTES_KEY, JSON.stringify(store)); renderNotes(); refreshNoteCounts();
      }
    } catch { toast('暂时无法保存，请检查浏览器本地存储和已有记录，再试一次。'); }
  });
  app.addEventListener('keydown', event => {
    const node = event.target.closest('[data-select]');
    if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectNode(node.dataset.select); }
  });
  // Selection stays explicit on touch; keyboard focus previews the same panel.
  app.addEventListener('focusin', event => {
    const node = event.target.closest('[data-select]'); if (node) selectNode(node.dataset.select);
  });
  document.getElementById('notes-open').onclick = () => openNotes();
  document.getElementById('notes-close').onclick = () => document.getElementById('notes-dialog').close();
  document.getElementById('ai-close').onclick = () => document.getElementById('ai-dialog').close();
  document.getElementById('ai-prompt').onfocus = event => event.target.select();
  document.getElementById('note-form').onsubmit = event => {
    event.preventDefault();
    const text = document.getElementById('note-text').value.trim(); if (!text || !noteTarget) return;
    try {
      const store = readNotes();
      store.notes.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...noteTarget,
        intent: document.getElementById('note-intent').value, text, createdAt: new Date().toISOString() });
      localStorage.setItem(NOTES_KEY, JSON.stringify(store)); document.getElementById('note-text').value = '';
      renderNotes(); refreshNoteCounts(); toast('已保存批注');
    } catch { toast('无法保存批注，请检查本地存储和已有记录。'); }
  };
  function revisionBrief(notes) {
    const grouped = new Map();
    for (const note of notes) {
      if (!grouped.has(note.unit)) grouped.set(note.unit, new Map());
      const anchors = grouped.get(note.unit); if (!anchors.has(note.anchor)) anchors.set(note.anchor, []);
      anchors.get(note.anchor).push(note);
    }
    const lines = ['# 学习预览 · 修订简报', '', `导出时间：${new Date().toISOString()}`, '',
      '请根据以下批注修订单元真源 units/<id>/source.md。锚点由单元、段落和条目组成；请保留出处、类比边界及现有数据契约。逐条说明处理结果，有疑问先核实，再更新源文件并重新构建预览。', ''];
    for (const [id, anchors] of grouped) {
      lines.push(`## ${id} · ${units.get(id)?.frontmatter.title || id}`, '', `源文件：\`units/${id}/source.md\``, '');
      for (const [anchor, entries] of anchors) {
        lines.push(`### ${anchor}`, '');
        for (const note of entries) lines.push(`- [${note.intent} / ${INTENTS[note.intent]}] ${note.createdAt}`, ...note.text.split(/\r?\n/).map(line => `  > ${line}`), '');
      }
    }
    return lines.join('\n');
  }
  document.getElementById('brief-export').onclick = () => {
    try {
      const notes = readNotes().notes;
      if (!notes.length) { toast('还没有批注，请先在正文旁添加反馈。'); return; }
      download(revisionBrief(notes), `scholar-engine-修订简报-${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown;charset=utf-8');
    } catch { toast('无法导出，请检查批注记录。'); }
  };
  document.getElementById('progress-export').onclick = () => {
    try { download(JSON.stringify(readProgress(), null, 2), `scholar-engine-progress-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); }
    catch { toast('无法导出，请检查进度记录。'); }
  };
  document.getElementById('progress-import').onclick = () => document.getElementById('progress-file').click();
  document.getElementById('progress-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const incoming = validateProgress(JSON.parse(await file.text()));
      saveProgress(mergeProgress(readProgress(), incoming)); route(); toast('已导入并合并学习记录');
    } catch { toast('导入失败：请检查 JSON 格式、复述长度和浏览器本地存储。'); }
    event.target.value = '';
  };
  function route() {
    progress = snapshot();
    const match = /^#\/unit\/([^/]+)$/.exec(location.hash);
    if (match) {
      try { renderUnit(decodeURIComponent(match[1])); }
      catch { app.innerHTML = '<div class="unit-page"><h1>无法打开这个单元</h1><a href="#/map">返回知识地图</a></div>'; }
    } else renderMap();
    refreshNoteCounts();
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
  window.addEventListener('storage', event => {
    if (event.key === NOTES_KEY || event.key === null) refreshNoteCounts();
    if (event.key === PROGRESS_KEY || event.key === null) route();
  });
  if (!location.hash) location.replace('#/map');
  route();
})();
