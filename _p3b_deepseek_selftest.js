#!/usr/bin/env node
/* =============================================================================
 * _p3b_deepseek_selftest.js —— 03b DeepSeek 加固自检（无依赖，直接 node 跑）
 *
 * 这个自检做两件事：
 *   甲）静态接线：断言新模块在位、三处接线（取词 / 执行前 / 发送前）都在该在的位置，
 *       以及四个地方的版本号 / 文件名 / 说明彼此一致（改一处忘了另一处 = 失败）。
 *   乙）行为单测：把**真正要发布的源码**（03b 模块 + 取词那段函数）抽出来，在
 *       vm 里配桩 DOM 跑：思考区子树必须不进正文、innerText 兜底不能把思考区兜回来、
 *       闸门在 DeepSeek 上会拦、超时一定放行留痕、冷却生效、非 DeepSeek 一律直通。
 *
 * 跑法：node _p3b_deepseek_selftest.js
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let failures = 0;
let checks = 0;

function ok(cond, what) {
    checks++;
    if (cond) { console.log('  ✓ ' + what); return true; }
    failures++;
    console.log('  ✗ ' + what);
    return false;
}
function group(name) { console.log('\n' + name); }
function must(re, s) { return typeof s === 'string' && re.test(s); }

// ------------------------------------------------------------------ 找到脚本
function findScript() {
    const files = fs.readdirSync(ROOT).filter(function (f) { return /^dsw-vfs-.*\.user\.js$/.test(f); });
    if (files.length !== 1) {
        console.log('✗ 期望恰好一个 dsw-vfs-*.user.js，实际：' + JSON.stringify(files));
        process.exit(1);
    }
    return files[0];
}
const FILE = findScript();
const SRC = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
const META_VERSION = (SRC.match(/^\/\/ @version\s+(\S+)\s*$/m) || [])[1] || '';
const CONST_VERSION = (SRC.match(/const VERSION = '([^']+)';/) || [])[1] || '';
const DESCRIBE = SRC.split('\n').find(function (l) { return l.indexOf('// @description') === 0; }) || '';

function slice(startMarker, endMarker, what) {
    const a = SRC.indexOf(startMarker);
    const b = SRC.indexOf(endMarker, a + 1);
    if (a < 0 || b < 0 || b <= a) { console.log('✗ 取源码区间失败：' + what); process.exit(1); }
    return SRC.slice(a, b);
}

// ============================================================ 甲 · 静态接线
group('甲 · 静态接线');

const moduleSrc = slice('/* >>> 03b-deepseek.js */', '/* <<< 03b-deepseek.js */', '03b 模块');
ok(/function dsStabilityGate\(/.test(moduleSrc), '03b 模块里有 dsStabilityGate');
ok(/function isThinkRegionNode\(/.test(moduleSrc), '03b 模块里有 isThinkRegionNode');

const gateDefs = (SRC.match(/function dsStabilityGate\(/g) || []).length;
const gateExec = (SRC.match(/dsStabilityGate\('执行前'\)/g) || []).length;
const gateSend = (SRC.match(/dsStabilityGate\('发送前'\)/g) || []).length;
ok(gateDefs === 1, 'dsStabilityGate 只定义一次（实际 ' + gateDefs + '）');
ok(gateExec === 1, '执行前闸门接了一处（实际 ' + gateExec + '）');
ok(gateSend === 1, '发送前闸门接了一处（实际 ' + gateSend + '）');

const thinkCall = (SRC.match(/if \(isThinkRegionNode\(child, depth\)\)/g) || []).length;
ok(thinkCall === 1, 'renderedText 里跳过思考区的判断只有一处、且边界是当前深度（实际 ' + thinkCall + '）');
ok(SRC.indexOf('isThinkRegionNode(child, depth + 1)') < 0, '没有把 root 自己算进思考区（防平台状态类名吃整条回复）');
const iRender = SRC.indexOf('function renderedText(root) {');
const iReset = SRC.indexOf('richSkippedThink = false;', iRender);
ok(iRender > 0 && iReset > iRender && iReset < SRC.indexOf('let out = \'\';', iRender),
    'renderedText 开头重置 richSkippedThink（在 let out 之前）');

const iRichSkip = SRC.indexOf('if (richSkippedThink) return rich;');
const iInner = SRC.indexOf('try { inner = el.innerText; }');
ok(iRichSkip > 0 && iInner > iRichSkip, 'extractFullText 先看 richSkippedThink，再考虑 innerText');

// 执行前闸门：必须在 runsSomething 算完之后、judgeBirth 之前
const iRuns = SRC.indexOf('const runsSomething = !!(runParsed.hasDomain');
const iExecGate = SRC.indexOf("dsStabilityGate('执行前')");
const iVerdict = SRC.indexOf('const verdict = judgeBirth(msgEl, fullText);');
ok(iRuns > 0 && iExecGate > iRuns && iVerdict > iExecGate, '执行前闸门位于 runsSomething 之后、judgeBirth 之前');
ok(/if \(runsSomething\) \{\s*\n\s*const dsGate = dsStabilityGate\('执行前'\);\s*\n\s*if \(!dsGate\.ok\) \{\s*\n\s*waited = true;/.test(SRC),
    '执行前闸门会置 waited 并走 deferUntilReplySettled（不静默停摆）');
ok(/if \(!dsGate\.ok\) \{[^}]*deferUntilReplySettled\('页面正在重渲染/.test(SRC), '执行前闸门把等待理由交给既有的节流提示');

// 发送前闸门：必须在 triggerSend 之内、且点下去之前
const iTrigger = SRC.indexOf('function triggerSend(composerEl) {');
const iSendGate = SRC.indexOf("dsStabilityGate('发送前')");
const iClick = SRC.indexOf('dispatchedMethod = picked.method;');
const iNextFn = SRC.indexOf('const recentSendTimes = [];');
ok(iSendGate > iTrigger && iSendGate < iNextFn, '发送前闸门在 triggerSend 函数体内');
ok(iSendGate < iClick, '发送前闸门在真正点击之前');
ok(/if \(now - startAt > SEND_HARD_LIMIT_MS\) \{\s*\n\s*resolve\(\{ ok: false, reason: '页面一直未安定/.test(SRC),
    '发送前闸门自己带硬上限，不会无限等');

ok(/try \{ dsStabilityReset\(\); \} catch \(e\) \{\}/.test(SRC), '换会话时清闸门记忆');
ok(/function renderedText\(root\) \{\n\s+richSkippedThink = false;/.test(SRC), '取词函数与模块的契约名未漂移');

// 版本 / 文件 / 说明四处一致
group('甲2 · 版本一致性');
const fileVer = (FILE.match(/dsw-vfs-(.+)\.user\.js/) || [])[1];
ok(/^\d+\.\d+\.\d+$/.test(fileVer), '文件名里带版本号且格式正常（' + fileVer + '）');
ok(META_VERSION === CONST_VERSION && META_VERSION === fileVer,
    'metadata @version / const VERSION / 文件名三者一致（' + [META_VERSION, CONST_VERSION, fileVer].join(' / ') + '）');
ok(DESCRIBE.indexOf('2.14.4') > 0, '@description 里写了 2.14.4 的改动');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
ok(readme.indexOf(FILE) > 0, 'README 的安装步骤指着当前文件名');
ok(readme.indexOf('deepseek') > 0 || readme.indexOf('DeepSeek') > 0, 'README 里有 DeepSeek 相关说明');

// ============================================================ 乙 · 行为单测
const textSrc = slice('    const TEXT_SKIP_TAGS = {', '    function isUserMessage(el) {', '取词函数段');

// ---- 桩 DOM ----
function mkText(v) { return { nodeType: 3, nodeValue: v }; }
function mkEl(tag, cls, kids, opts) {
    opts = opts || {};
    const node = {
        nodeType: 1,
        tagName: String(tag).toUpperCase(),
        className: cls || '',
        childNodes: kids || [],
        children: [],
        parentElement: null,
        dataset: opts.dataset || {},
        _attrs: opts.attrs || {},
        getAttribute: function (name) {
            if (name === 'class') return node.className;
            return node._attrs[name] == null ? null : node._attrs[name];
        }
    };
    node.children = node.childNodes.filter(function (n) { return n.nodeType === 1; });
    let text = '';
    (function collect(n) {
        n.childNodes.forEach(function (c) {
            if (c.nodeType === 3) text += c.nodeValue;
            else collect(c);
        });
    })(node);
    node.textContent = text;
    node.childNodes.forEach(function (c) { if (c.nodeType === 1) c.parentElement = node; });
    return node;
}

const OOPS = '```dsw\nwrite /oops.md <<<\n思考草稿\n<<<\n```';
const ANSWER = '好的，我读一下\n```dsw\nread /notes.md\n```\n◆';

// 夹具①：思考区（含 .ds-markdown）+ 答案正文（含代码块）——DeepSeek R1 的真实形状
const thinkInner = mkEl('div', 'ds-markdown', [mkText(OOPS)]);
const think = mkEl('div', 'ds-think-content', [mkText('我在想：'), thinkInner]);
const answer = mkEl('div', 'ds-markdown ds-assistant-message-main-content',
    [mkText('好的，我读一下'), mkEl('pre', '', [mkText('    indented_line = 1')]), mkText('\n```dsw\nread /notes.md\n```\n◆')]);
const root1 = mkEl('div', 'chat-message', [think, answer]);
root1.innerText = '我在想：' + OOPS + '\n' + ANSWER;      // 可见文本里**有**思考区

// 夹具②：整棵子树只有思考区
const root2 = mkEl('div', 'chat-message', [mkEl('div', 'ds-think-content', [mkEl('div', 'ds-markdown', [mkText(OOPS)])])]);
root2.innerText = OOPS;

// 夹具③：普通回复（没有思考区）——回归检查
const root3 = mkEl('div', 'chat-message', [
    mkEl('div', 'ds-markdown', [mkText('普通回复\n```dsw\nread /a.md\n```\n◆'),
        mkEl('pre', '', [mkText('    keep_me = 1')])])
]);
root3.innerText = '普通回复\n```dsw\nread /a.md\n```\n◆';

// ---- 桩环境 ----
let clock = 1000000;
const logs = [];
const ctx = {
    console: console,
    PLATFORM: { matched: true, id: 'deepseek', name: 'DeepSeek' },
    __composer: null,
    findComposer: function () { return ctx.__composer; },
    pushLog: function (m, t) { logs.push({ msg: m, type: t }); },
    errlog: function () {},
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    Date: { now: function () { return clock; } }
};
vm.createContext(ctx);
vm.runInContext(
    moduleSrc + '\n' + textSrc +
    '\n;globalThis.__DS = { isThinkRegionNode: isThinkRegionNode, dsStabilityGate: dsStabilityGate,'
    + ' dsStabilityReset: dsStabilityReset, dsProbeStability: dsProbeStability,'
    + ' renderedText: renderedText, extractFullText: extractFullText,'
    + ' richSkipped: function () { return richSkippedThink; } };',
    ctx, { filename: '03b-deepseek.js' });
const DS = ctx.__DS;

function mkComposer() {
    return {
        isConnected: true,
        getBoundingClientRect: function () { return { width: 320, height: 44, top: 60, bottom: 104, left: 100, right: 420 }; }
    };
}

group('乙 · isThinkRegionNode（思考区识别）');
ok(DS.isThinkRegionNode(mkEl('div', 'ds-think-content'), 0) === true, 'ds-think-content → 是思考区');
ok(DS.isThinkRegionNode(mkEl('div', 'ds-markdown ds-assistant-message-main-content'), 0) === false, '答案正文不算思考区');
ok(DS.isThinkRegionNode(mkEl('div', '', [], { dataset: { thinking: 'true' } }), 0) === true, 'data-thinking=true → 是思考区');
const deepThink = mkEl('div', 'ds-think-content', [mkEl('div', 'inner', [])]);
ok(DS.isThinkRegionNode(deepThink.children[0], 0) === false, 'maxUp=0 时看不到 root 以内的祖先（不越界）');
ok(DS.isThinkRegionNode(deepThink.children[0], 1) === true, 'maxUp=1 时能看到最近一层祖先');

group('乙 · 取词：思考区不进正文');
const rich1 = DS.renderedText(root1);
ok(rich1.indexOf('read /notes.md') >= 0, '答案正文被取到');
ok(rich1.indexOf('oops.md') < 0, '思考草稿里的 ```dsw 没进正文（渲染前就排除）');
ok(rich1.indexOf('indented_line') >= 0, '答案里的代码块照旧保留（没被误伤）');
ok(DS.richSkipped() === true, 'renderedText 如实回报「跳过了思考区」');
const full1 = DS.extractFullText(root1);
ok(full1.indexOf('oops.md') < 0, 'extractFullText 不会用 innerText 把思考区兜回来');
ok(full1.indexOf('read /notes.md') >= 0, 'extractFullText 仍能拿到命令');

group('乙 · 取词：平台给整条消息挂的「思考中」类名不该吃空正文');
const rootState = mkEl('div', 'ds-think-content', [mkEl('div', 'ds-markdown', [mkText(ANSWER)])]);
rootState.innerText = ANSWER;
ok(DS.renderedText(rootState).indexOf('read /notes.md') >= 0,
    'root 自己带状态类名时照旧取正文（边界：root 不算思考区）');
const innerState = mkEl('div', 'chat-message', [mkEl('div', 'ds-think-content', [mkEl('div', 'body', [mkEl('div', '', [mkText(OOPS)])])])]);
ok(DS.renderedText(innerState).trim() === '', 'root 以内的思考区容器仍被整块排除');


group('乙 · 取词：整条只有思考区');
const rich2 = DS.renderedText(root2);
ok(rich2.trim() === '', '只剩思考区 → 取词为空');
ok(DS.extractFullText(root2) === '', '只剩思考区 → extractFullText 返回空（不回落 innerText）');

group('乙 · 取词：普通回复不受影响（回归）');
const rich3 = DS.renderedText(root3);
ok(rich3.indexOf('read /a.md') >= 0 && rich3.indexOf('keep_me') >= 0, '普通回复的正文与代码块都还在');
ok(DS.richSkipped() === false, '没有思考区时不置标志');
ok(DS.extractFullText(root3).indexOf('keep_me') >= 0, '普通回复走原路径');

group('乙 · 闸门：非 DeepSeek 直通');
ctx.PLATFORM.id = 'chatgpt';
ctx.__composer = null;
let g = DS.dsStabilityGate('执行前');
ok(g.ok === true, '非 DeepSeek：即使没有输入区也直通（行为与 2.14.3 一致）');

group('乙 · 闸门：DeepSeek 输入区没就绪 → 拦，超时必放行');
ctx.PLATFORM.id = 'deepseek';
DS.dsStabilityReset();
logs.length = 0;
g = DS.dsStabilityGate('执行前');
ok(g.ok === false && g.reason === '输入区还没就绪', '没有输入区 → 先等一等（' + g.reason + '）');
clock += 1000;
ok(DS.dsStabilityGate('执行前').ok === false, '还在没就绪 → 继续等');
clock += 6000;
const gRelease = DS.dsStabilityGate('执行前');
ok(gRelease.ok === true && gRelease.reason === '超时放行', '超过上限 → 强制放行（' + gRelease.reason + '）');
ok(logs.some(function (l) { return l.type === 'warn' && /未安定/.test(l.msg); }), '放行时留了痕（不许静默停摆）');
const logCountAfterRelease = logs.length;
clock += 5000;
ok(DS.dsStabilityGate('执行前').ok === true, '冷却期内不再拦（不会每 6 秒卡一次）');
ok(logs.length === logCountAfterRelease, '冷却期内不重复刷日志');
clock += 61000;
ok(DS.dsStabilityGate('执行前').ok === false, '冷却过后重新开始拦（页面还是不行的话）');

group('乙 · 闸门：输入区安定 / 刚被重挂');
DS.dsStabilityReset();
clock += 1000;
ctx.__composer = mkComposer();
ok(DS.dsStabilityGate('执行前').ok === true, '输入区在、可见 → 放行');
ctx.__composer = mkComposer();          // 换了节点 = 重挂
clock += 1000;
const gChurn = DS.dsStabilityGate('发送前');
ok(gChurn.ok === false && /重挂/.test(gChurn.reason), '输入区刚被重挂 → 拦一次（' + gChurn.reason + '）');
clock += 1000;
ok(DS.dsStabilityGate('发送前').ok === true, '同一个新输入区站稳后 → 放行');
ctx.__composer = { isConnected: true, getBoundingClientRect: function () { return { width: 20, height: 5, top: 0, bottom: 0 }; } };
clock += 1000;
const gInvisible = DS.dsStabilityGate('执行前');
ok(gInvisible.ok === false && /不可见/.test(gInvisible.reason), '输入区被收起/不可见 → 拦（' + gInvisible.reason + '）');

// ------------------------------------------------------------------ 汇总
console.log('\n' + (failures ? '✗ 失败 ' + failures + ' 项' : '✓ 全部通过') + '（共 ' + checks + ' 项检查）');
process.exit(failures ? 1 : 0);
