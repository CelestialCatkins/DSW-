#!/usr/bin/env node
/* =============================================================================
 * _p3_doubao_selftest.js —— 豆包适配自检（无依赖，node 直接跑）
 *
 * 甲）证据对账：豆包平台定义里的每个 data-testid / 类令牌，必须能在
 *     _fixtures/doubao-evidence.txt（从豆包前端产物抓的原文）里找到 —— 选择器不许凭空写。
 * 乙）行为单测：把**要发布的源码**抽出来，配桩 DOM 跑：
 *     输入框/发送键/停止键的「平台声明优先」、正在生成的判定、用户气泡与思考区的识别，
 *     以及思考区不进正文（豆包的 message_thinking 和 DeepSeek 的 ds-think-content 同一套保护）。
 *
 * 跑法：node _p3_doubao_selftest.js
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let checks = 0;
let failures = 0;
function ok(cond, what) {
    checks++;
    if (cond) { console.log('  ✓ ' + what); return true; }
    failures++;
    console.log('  ✗ ' + what);
    return false;
}
function group(name) { console.log('\n' + name); }

const FILE = fs.readdirSync(ROOT).filter(function (f) { return /^dsw-vfs-.*\.user\.js$/.test(f); })[0];
if (!FILE) { console.log('✗ 找不到 dsw-vfs-*.user.js'); process.exit(1); }
const SRC = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
const EVIDENCE = fs.readFileSync(path.join(ROOT, '_fixtures', 'doubao-evidence.txt'), 'utf8');

function slice(a, b, what) {
    const i = SRC.indexOf(a);
    const j = SRC.indexOf(b, i + 1);
    if (i < 0 || j < 0 || j <= i) { console.log('✗ 取源码区间失败：' + what); process.exit(1); }
    return SRC.slice(i, j);
}

// ============================================================ 甲 · 证据对账
group('甲 · 豆包平台定义与证据对账');

const doubaoBlock = (SRC.match(/id: 'doubao'[\s\S]*?\n        \},\n/) || [''])[0];
ok(!!doubaoBlock, '脚本里有豆包平台定义');
function hasField(name) { return new RegExp(name + ':').test(doubaoBlock); }
ok(hasField('composerSelector'), '声明了输入框选择器 composerSelector');
ok(hasField('sendSelector'), '声明了发送键选择器 sendSelector');
ok(hasField('stopSelector'), '声明了「停止生成」键选择器 stopSelector');
ok(hasField('thinkingSelector'), '声明了思考区选择器 thinkingSelector');
ok(/attach: \{ fileInput:/.test(doubaoBlock), '声明了附件入口 fileInput');

const testids = (doubaoBlock.match(/data-testid="([^"]+)"/g) || []).map(function (s) {
    return (s.match(/data-testid="([^"]+)"/) || [])[1];
});
ok(testids.length >= 5, '豆包定义里有多个 data-testid 选择器（实际 ' + testids.length + ' 个）');
const missing = testids.filter(function (t) {
    return EVIDENCE.indexOf('"' + t + '"') < 0;
});
ok(missing.length === 0, '每个 data-testid 都能在证据快照里找到' + (missing.length ? '（缺：' + missing.join(',') + '）' : ''));
ok(/send-msg-bubble/.test(doubaoBlock) && EVIDENCE.indexOf('send-msg-bubble') >= 0,
    '用户气泡令牌 send-msg-bubble 有证据支撑');
ok(/"upload-file-input"/.test(doubaoBlock) && EVIDENCE.indexOf('upload-file-input') >= 0,
    '附件入口 upload-file-input 有证据支撑');

group('甲2 · 钩子接线（每个只接一处，别的平台不受影响）');
const hooks = [
    { field: 'composerSelector', local: 'declaredComposer', where: 'findComposer' },
    { field: 'sendSelector', local: 'declaredSend', where: 'pickSendButton' },
    { field: 'stopSelector', local: 'declaredStop', where: 'hasStopControlNearComposer' },
    { field: 'thinkingSelector', local: 'declaredThink', where: 'isInThinkingRegion' }
];
for (const h of hooks) {
    const used = (SRC.match(new RegExp('PLATFORM\\.' + h.field, 'g')) || []).length;
    ok(used >= 1, 'PLATFORM.' + h.field + ' 被真正使用（' + used + ' 处）');
    ok(SRC.indexOf('const ' + h.local + ' = ') > 0, h.field + ' 的消费点在 ' + h.where + '（' + h.local + '）');
    const at = SRC.indexOf('function ' + h.where + '(');
    const local = SRC.indexOf('const ' + h.local + ' = ');
    const nextFn = SRC.indexOf('\n    function ', local + 1);
    ok(at > 0 && local > at && (nextFn < 0 || local < nextFn),
        h.field + ' 的消费点确实写在 ' + h.where + ' 函数体内');
}
const onlyDoubao = (SRC.match(/composerSelector:/g) || []).length;
ok(onlyDoubao === 1, 'composerSelector 只有豆包声明了（实际 ' + onlyDoubao + ' 处）');
ok((SRC.match(/function resolveEditableTarget\(/g) || []).length === 1, 'resolveEditableTarget 只定义一次');
ok(SRC.indexOf('el = resolveEditableTarget(el) || el;') > SRC.indexOf('function setComposerText(el, text) {'),
    'setComposerText 开头先下钻到真可编辑层（豆包容器 chat_input_input 自己不可编辑）');
ok(/querySelector\('\[contenteditable="true"\]'\)/.test(SRC), '下钻用 [contenteditable="true"] 选择器（真机实测那层）');
ok(/PLATFORM\.userMsgSelector && el\s*\n?\s*&& typeof el\.matches/.test(SRC.replace(/\s+\n/g, '\n')) ||
    /PLATFORM\.userMsgSelector && el/.test(SRC), 'isUserMessage 会先问平台声明的用户消息选择器');
ok(/dsThinkSelectorMatch/.test(SRC) && (SRC.match(/dsThinkSelectorMatch\(/g) || []).length >= 2,
    '03b 的取词排除也认平台思考区（函数定义 + 调用）');

group('甲3 · 版本与文档一致');
const fileVer = (FILE.match(/dsw-vfs-(.+)\.user\.js/) || [])[1];
const metaVer = (SRC.match(/^\/\/ @version\s+(\S+)\s*$/m) || [])[1];
const constVer = (SRC.match(/const VERSION = '([^']+)';/) || [])[1];
ok(fileVer === metaVer && metaVer === constVer,
    '文件名 / @version / const VERSION 三者一致（' + [fileVer, metaVer, constVer].join(' / ') + '）');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
ok(readme.indexOf(FILE) > 0, 'README 的安装步骤指着当前文件名');

// ============================================================ 桩 DOM
function descendants(root) {
    const out = [];
    (function walk(n) {
        (n.children || []).forEach(function (c) { out.push(c); walk(c); });
    })(root);
    return out;
}
function matchSimple(el, part) {
    if (!part || !el) return false;
    const m = part.match(/^([a-zA-Z][\w-]*)?((?:\[[^\]]+\])*)$/);
    if (!m) return false;
    if (m[1] && String(el.tagName).toLowerCase() !== m[1].toLowerCase()) return false;
    const attrs = m[2].match(/\[[^\]]+\]/g) || [];
    for (const a of attrs) {
        const body = a.slice(1, -1);
        const eq = body.match(/^([\w-]+)(?:([*^$~|]?=)"?([^"]*)"?)?$/);
        if (!eq) return false;
        const actual = eq[1] === 'class' ? el.className : (el.attrs ? el.attrs[eq[1]] : null);
        if (eq[2] === undefined) { if (actual == null) return false; }
        else if (eq[2] === '=') { if (String(actual) !== String(eq[3])) return false; }
        else if (eq[2] === '*=') { if (actual == null || String(actual).indexOf(eq[3]) === -1) return false; }
        else return false;
    }
    return true;
}
function matchSel(el, sel) {
    return String(sel || '').split(',').some(function (p) { return matchSimple(el, p.trim()); });
}
function mkEl(tag, opts) {
    opts = opts || {};
    const node = {
        nodeType: 1,
        tagName: String(tag).toUpperCase(),
        className: opts.cls || '',
        attrs: opts.attrs || {},
        dataset: opts.dataset || {},
        isConnected: opts.connected !== false,
        isContentEditable: !!opts.contentEditable,
        textContent: opts.text == null ? '' : opts.text,
        childNodes: [],
        children: [],
        parentElement: null,
        _rect: opts.rect || { width: 300, height: 44, top: 200, bottom: 244, left: 100, right: 400 },
        _hidden: !!opts.hidden,
        _clicks: 0,
        getAttribute: function (n) { if (n === 'class') return node.className; return node.attrs[n] == null ? null : node.attrs[n]; },
        hasAttribute: function (n) { return node.attrs[n] != null; },
        getBoundingClientRect: function () { return node._rect; },
        getClientRects: function () { return node._hidden ? [] : [node._rect]; },
        matches: function (sel) { return matchSel(node, sel); },
        closest: function (sel) {
            let c = node;
            while (c) { if (matchSel(c, sel)) return c; c = c.parentElement; }
            return null;
        },
        querySelector: function (sel) {
            const d = descendants(node);
            for (const n of d) if (matchSel(n, sel)) return n;
            return null;
        },
        querySelectorAll: function (sel) { return descendants(node).filter(function (n) { return matchSel(n, sel); }); },
        contains: function (other) { let c = other; while (c) { if (c === node) return true; c = c.parentElement; } return false; },
        click: function () { node._clicks++; },
        addEventListener: function () {},
        focus: function () {},
        dispatchEvent: function () {},
        appendChild: function (c) { node.children.push(c); node.childNodes.push(c); c.parentElement = node; return c; }
    };
    (opts.kids || []).forEach(function (c) { node.appendChild(c); });
    return node;
}

let lastRange = null;
const doc = {
    _nodes: [],
    querySelectorAll: function (sel) { return doc._nodes.filter(function (n) { return matchSel(n, sel); }); },
    querySelector: function (sel) { return doc.querySelectorAll(sel)[0] || null; },
    addEventListener: function () {},
    // contenteditable 写入路径需要的三个桩（与真浏览器同形状：range 选定 → execCommand 插入）
    createRange: function () {
        return { _n: null, selectNodeContents: function (n) { this._n = n; lastRange = this; } };
    },
    execCommand: function (cmd, ui, text) {
        if (lastRange && lastRange._n) {
            lastRange._n.textContent = String(lastRange._n.textContent || '') + String(text);
            return true;
        }
        return false;
    }
};

// ============================================================ 取源码 + 评估
const code = [
    slice('    const STOP_LABEL_RE = ', '/* >>> 05-fs.js */', '停止键文案与流式标记'),
    slice('    /* ------------------------- 输入框 / 发送 ------------------------- */',
        '    function triggerSend(composerEl) {', '输入框与发送键'),
    slice('    const TEXT_SKIP_TAGS = {', '    function isUserMessage(el) {', '取词函数段'),
    slice('    function isUserMessage(el) {', '    function looksLikeLastMessage(el) {', '用户消息与思考区'),
    slice('    function isVisibleEl(el) {', '    function hasGlobalStreamMarker() {', '可见性 / 停止键 / 流式标记'),
    slice('    let genCache = { at: 0, val: false };', '    function isReplyComplete(el, text) {', '正在生成判定'),
    slice('/* >>> 03b-deepseek.js */', '/* <<< 03b-deepseek.js */', '03b 模块'),
    slice('    const PLATFORM_DEFS = [', '    const PLATFORM = (function detectPlatform() {', '平台定义表')
].join('\n');

let clock = 1000000;
const sandbox = {
    console: console,
    Date: { now: function () { return clock; } },
    CONFIG: { THINKING_MAX_DEPTH: 25, STREAM_MARKER_MAX_DEPTH: 6 },
    GENERATING_CACHE_MS: 300,          // 与 14-runtime 里的常量一致（只供 isGenerating 的缓存判断）
    document: doc,
    window: { innerHeight: 900, getSelection: function () { return { removeAllRanges: function () {}, addRange: function () {} }; } },
    pushLog: function () {},
    errlog: function () {},
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    PLATFORM: {}
};
vm.createContext(sandbox);
vm.runInContext(code + `
;globalThis.__DS = {
    PLATFORM_DEFS: PLATFORM_DEFS,
    setPlatform: function (def) { Object.keys(PLATFORM).forEach(function (k) { delete PLATFORM[k]; }); Object.assign(PLATFORM, def); },
    findComposer: findComposer, pickSendButton: pickSendButton, isBtnDisabled: isBtnDisabled,
    isUserMessage: isUserMessage, isInThinkingRegion: isInThinkingRegion,
    hasStopControlNearComposer: hasStopControlNearComposer, isGenerating: isGenerating,
    isThinkRegionNode: isThinkRegionNode, renderedText: renderedText,
    dsThinkSelectorMatch: dsThinkSelectorMatch,
    setComposerText: setComposerText, resolveEditableTarget: resolveEditableTarget
};`, sandbox, { filename: 'dsw-vfs-doubao.js' });
const DS = sandbox.__DS;

const defs = DS.PLATFORM_DEFS;
const doubao = defs.filter(function (d) { return d.id === 'doubao'; })[0];
ok(!!doubao, '平台定义表里有 doubao 一条');
ok(doubao && doubao.hosts.indexOf('doubao.com') >= 0, '豆包 hosts 认 doubao.com');
ok(doubao && (('/chat/38447504123175426'.match(doubao.convMatch) || [])[1]) === '38447504123175426',
    'convMatch 能从 /chat/<id> 里取出会话 id');

// 直接把豆包那条拍进 PLATFORM（含各选择器）
function useDoubao() {
    const p = Object.assign({ matched: true, host: 'www.doubao.com' }, doubao);
    DS.setPlatform(p);
}
function resetDoc() { doc._nodes.length = 0; }
function add(n) { doc._nodes.push(n); return n; }

// ============================================================ 乙 · 行为
group('乙 · 输入框：平台声明优先');
useDoubao();
resetDoc();
const composer = add(mkEl('textarea', {
    attrs: { 'data-testid': 'chat_input_input', type: 'textarea' },
    rect: { width: 600, height: 60, top: 120, bottom: 180, left: 0, right: 600 }
}));
// 通用启发式会挑「最靠下的可见可编辑元素」——这里放一个更靠下的搜索框来抢
const searchBox = add(mkEl('div', {
    cls: 'input-engine-search-inline-hint',
    contentEditable: true,
    rect: { width: 400, height: 40, top: 600, bottom: 640, left: 0, right: 400 }
}));
ok(DS.findComposer() === composer, 'findComposer 选的是 chat_input_input，不是更靠下的可编辑元素');
searchBox.isConnected = false;
composer.isConnected = false;
const fallbackBox = add(mkEl('textarea', {
    rect: { width: 400, height: 40, top: 700, bottom: 740, left: 0, right: 400 }
}));
ok(DS.findComposer() === fallbackBox, '声明的输入框不在时退回通用启发式（不会找不到输入框）');

group('乙 · 豆包输入框：容器下钻到真可编辑层（真机实测回归）');
resetDoc();
const dwOuter = add(mkEl('div', {
    cls: 'flex min-h-24 w-full items-stretch flex-1',
    attrs: { 'data-testid': 'chat_input_input' },
    rect: { width: 600, height: 48, top: 400, bottom: 448, left: 0, right: 600 }
}));
const dwInner = mkEl('div', {
    contentEditable: true,
    attrs: { 'contenteditable': 'true' },
    rect: { width: 580, height: 40, top: 404, bottom: 444, left: 8, right: 588 }
});
dwOuter.appendChild(dwInner);
ok(DS.resolveEditableTarget(dwOuter) === dwInner, '容器自己不可编辑 → 下钻到内层 contenteditable');
ok(DS.resolveEditableTarget(dwInner) === dwInner, '内层自己就是可编辑的 → 原样返回');
const wr = DS.setComposerText(dwOuter, 'dsw-x');
ok(wr && wr.ok === true, '往容器上写也能成功（不再报「不是 textarea/contenteditable」）');
ok(dwInner.textContent === 'dsw-x', '文字真正落进了内层 contenteditable（实际: ' + JSON.stringify(dwInner.textContent) + '）');
const dwPlain = add(mkEl('div', { rect: { width: 300, height: 40, top: 500, bottom: 540, left: 0, right: 300 } }));
ok(DS.resolveEditableTarget(dwPlain) === null, '没有可编辑子层 → 下钻返回 null（不乱找）');
const wrPlain = DS.setComposerText(dwPlain, 'x');
ok(wrPlain && wrPlain.ok === false, '无可编辑层时保持旧行为：明确报错而不是静默假装写入');

group('乙 · 发送键：平台声明优先');
resetDoc();
const wrap = add(mkEl('div', { attrs: { 'data-testid': 'chat_input_send_button' }, rect: { width: 32, height: 32, top: 210, bottom: 242, left: 560, right: 592 } }));
const innerBtn = mkEl('button', { rect: { width: 32, height: 32, top: 210, bottom: 242, left: 560, right: 592 } });
wrap.appendChild(innerBtn);
let picked = DS.pickSendButton();
ok(picked.method === 'platform' && picked.btn === innerBtn, 'testid 挂在包裹层时，往下拿到真正的 button');
wrap._hidden = true;
picked = DS.pickSendButton();
ok(picked.method !== 'platform', '发送键被藏起来（生成中的 !hidden）时不再把它当发送键');

group('乙 · 「正在生成」：靠停止生成键（纯图标，没文字）');
resetDoc();
const breakBtn = add(mkEl('div', { attrs: { 'data-testid': 'chat_input_local_break_button' }, rect: { width: 32, height: 32, top: 210, bottom: 242, left: 520, right: 552 } }));
clock += 1000;
ok(DS.isGenerating() === true, '正在生成：页面级判定为真（图标按钮无文字也认得出来）');
breakBtn._hidden = true;
clock += 1000;
ok(DS.isGenerating() === false, '停止生成键藏起来 → 页面级判定归位为「没在生成」');
breakBtn._hidden = false;
clock += 1000;
ok(DS.isGenerating() === true, '键又出现 → 再次认为正在生成');

group('乙 · 用户气泡 vs AI 正文');
const userBubble = mkEl('div', {
    cls: 'rounded-s-radius-s s-font-base sm:text-15 max-w-450 px-16 py-9 w-fit min-w-0 bg-g-send-msg-bubble-bg text-g-send-msg-bubble-text',
    attrs: { 'data-testid': 'message_text_content' }
});
const aiText = mkEl('div', {
    cls: 'w-fit s-font-base sm:text-15',
    attrs: { 'data-testid': 'message_text_content' }
});
ok(DS.isUserMessage(userBubble) === true, '带 send-msg-bubble 的是用户消息');
ok(DS.isUserMessage(aiText) === false, '不带的是 AI 正文');

group('乙 · 思考区（真文本节点，不是空壳）');
resetDoc();
function mkText(v) { return { nodeType: 3, nodeValue: v }; }
const thinking = add(mkEl('div', { attrs: { 'data-testid': 'message_thinking' }, cls: 'loading-container-AGJEWI' }));
const thinkText = mkEl('div', { cls: 'text-content-x_CdmC', kids: [mkText('我在想：```dsw write /oops.md <<< 草稿 <<< ```')] });
thinking.appendChild(thinkText);
const normalText = mkEl('div', {
    attrs: { 'data-testid': 'message_text_content' }, cls: 'w-fit',
    kids: [mkText('好的\n```dsw\nread /a.md\n```\n◆')]
});
const bothRoot = mkEl('div', { cls: 'chat-message', kids: [thinking, normalText] });
ok(DS.isInThinkingRegion(thinkText) === true, 'message_thinking 里面的节点算思考区');
ok(DS.isInThinkingRegion(normalText) === false, '正文不算思考区');
ok(DS.isThinkRegionNode(thinkText, 1) === true, '03b 取词里也认这个思考区（豆包与 DeepSeek 同一套保护）');
const richBoth = DS.renderedText(bothRoot);
ok(richBoth.indexOf('read /a.md') >= 0, '同一条消息里的正文照旧取全');
ok(richBoth.indexOf('oops.md') < 0, '思考区里的 ```dsw 不进正文（草稿不会被当命令）');
ok(DS.renderedText(normalText).indexOf('read /a.md') >= 0, '单纯正文元素取全');

console.log('\n' + (failures ? '✗ 失败 ' + failures + ' 项' : '✓ 全部通过') + '（共 ' + checks + ' 项检查）');
process.exit(failures ? 1 : 0);
