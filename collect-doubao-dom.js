/* collect-doubao-dom.js
 *
 * 用法（浏览器控制台）：
 *   1) 先复制这整段粘进豆包聊天页控制台（F12 → Console），回车。
 *   2) 控制台会把收集结果用 console.table + JSON 打印，方便你复制成快照。
 *   3) 想要完整 outerHTML 备份时再跑 collect.dumpOuter()。
 *
 * 它只读 DOM / 属性，不发任何请求、不改输入框内容、不点任何按钮。
 */

(function () {
    'use strict';

    var host = (location && location.hostname) || '';
    console.group('【豆包 DOM 采集】页面 host = ' + host);

    // ---- 小工具 ----
    function visible(el) {
        try { return el && el.offsetParent !== null && el.getClientRects && el.getClientRects().length > 0; } catch (e) { return false; }
    }
    function rectOf(el) {
        try { return el.getBoundingClientRect(); } catch (e) { return null; }
    }
    function li(el) {
        if (!el) return null;
        try {
            return {
                tag: el.tagName,
                id: el.id || '',
                cls: (el.className && (typeof el.className === 'string' ? el.className : el.className.baseVal || '')) || '',
                attrs: attrMap(el),
                dataTestid: el.getAttribute ? el.getAttribute('data-testid') : '',
                dataset: el.dataset ? attrMap(el.dataset) : {},
                rect: rectOf(el),
                visible: visible(el),
                // 属性上的流式标记
                streamAttr: streamAttrOf(el)
            };
        } catch (e) { return { tag: el.tagName, err: String(e) }; }
    }
    function attrMap(o) {
        try {
            var m = {};
            var n = o ? Object.keys(o) : [];
            for (var i = 0; i < n.length; i++) {
                var k = n[i];
                try { m[k] = o[k]; } catch (e) {}
            }
            return m;
        } catch (e) { return {}; }
    }
    function streamAttrOf(el) {
        try {
            var ds = el.dataset || {};
            if (ds.isStreaming === 'true' || ds.isStreaming === '1') return 'data-is-streaming';
            if (ds.streaming === 'true' || ds.streaming === '1') return 'data-streaming';
            var a = el.getAttribute ? el.getAttribute('data-is-streaming') : undefined;
            if (a === 'true') return 'data-is-streaming=true';
            a = el.getAttribute ? el.getAttribute('data-streaming') : undefined;
            if (a === 'true') return 'data-streaming=true';
            return '';
        } catch (e) { return ''; }
    }

    // ---- 候选元素收集器 ----
    // 消息正文
    var msgSel = '[data-testid="message_text_content"]';
    // 输入框
    var inputSel = '[data-testid="chat_input_input"]';
    // 发送 / 停止按钮容器
    var sendSel = '[data-testid="chat_input_send_button"]';
    var breakSel = '[data-testid="chat_input_local_break_button"]';
    // 思考 / 加载
    var thinkSel = '[data-testid="message_thinking"],[data-testid="message_loading"]';
    // 附件
    var fileSel = 'input[type="file"][data-testid="upload-file-input"]';
    // 通用滚动 / 会话
    var scrollSel = '[data-testid="scroll_view"]';
    var chatLinkSel = 'a[href*="/chat/"]';

    function collect(sel, label) {
        var nodes = [];
        try {
            var all = document.querySelectorAll(sel);
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                var info = li(el);
                if (!info) continue;
                info.label = label;
                info.idx = i;
                info.parentChain = parentChain(el);
                nodes.push(info);
            }
        } catch (e) {
            console.warn('collect 抓 [' + label + '] 出错：' + e);
        }
        return nodes;
    }
    function parentChain(el, max) {
        max = max || 6;
        var out = [];
        var cur = el;
        for (var i = 0; cur && i < max; i++) {
            var t = cur.tagName || '';
            var cls = (cur.className && (typeof cur.className === 'string' ? cur.className : (cur.className.baseVal || ''))) || '';
            var id = cur.id || '';
            var td = cur.getAttribute ? cur.getAttribute('data-testid') : '';
            out.push(t + (id ? '#' + id : '') + (td ? '[testid=' + td + ']' : '') + (cls ? '.' + cls.split(/\s+/).slice(0, 2).join('.') : ''));
            cur = cur.parentElement;
        }
        return out.join(' <= ');
    }

    console.log('正在收集…');
    var rows = [];
    rows = rows.concat(collect(msgSel, 'message_text_content'));
    rows = rows.concat(collect(inputSel, 'chat_input_input'));
    rows = rows.concat(collect(sendSel, 'chat_input_send_button'));
    rows = rows.concat(collect(breakSel, 'chat_input_local_break_button'));
    rows = rows.concat(collect(thinkSel, 'thinking/loading'));
    rows = rows.concat(collect(fileSel, 'upload-file-input'));
    rows = rows.concat(collect(scrollSel, 'scroll_view'));
    rows = rows.concat(collect(chatLinkSel, 'chat-link'));

    // ---- 输入框的进一步分析（textarea / contenteditable / 内部可编辑节点） ----
    var inputRows = rows.filter(function (r) { return r.label === 'chat_input_input'; });
    inputRows.forEach(function (r) {
        var el = null;
        try {
            var all = document.querySelectorAll(inputSel);
            if (all && all[r.idx] && all[r.idx] === r) el = all[r.idx];
        } catch (e) {}
        r.extra = inputExtra(el);
    });

    function inputExtra(el) {
        if (!el) return { err: '找不到元素' };
        var out = {
            tag: el.tagName,
            isContentEditable: !!el.isContentEditable,
            isTextarea: el instanceof HTMLTextAreaElement ? true : false,
            value: (el.value != null) ? el.value : undefined,
            textContentLen: (el.textContent != null) ? el.textContent.length : undefined,
            childEditableCount: countEditableDesc(el),
            // 输入框里的第 1 个可编辑子元素（结构化编辑器常把可编辑层包在外面）
            firstEditableChild: firstEditableChild(el)
        };
        try {
            out.buttonCount = (el.querySelectorAll ? el.querySelectorAll('button, [role="button"]').length : 0);
        } catch (e) { out.buttonCount = 0; }
        return out;
    }
    function countEditableDesc(el) {
        if (!el || !el.querySelectorAll) return 0;
        try {
            var n = 0;
            var all = el.querySelectorAll('[contenteditable="true"]');
            for (var i = 0; i < all.length; i++) { if (all[i].isConnected) n++; }
            return n;
        } catch (e) { return 0; }
    }
    function firstEditableChild(el) {
        if (!el || !el.querySelector) return null;
        try {
            var c = el.querySelector('[contenteditable="true"]');
            return c ? li(c) : null;
        } catch (e) { return null; }
    }

    // ---- 发送键：定位真正可点的 button ----
    var sendRows = rows.filter(function (r) { return r.label === 'chat_input_send_button'; });
    sendRows.forEach(function (r) {
        var el = null;
        try {
            var all = document.querySelectorAll(sendSel);
            if (all && all[r.idx] && all[r.idx] === r) el = all[r.idx];
        } catch (e) {}
        r.extra = sendExtra(el);
    });

    function sendExtra(el) {
        if (!el) return { err: '找不到元素' };
        var btn = findRealButton(el);
        return {
            tag: el.tagName,
            buttonTag: btn ? btn.tagName : '',
            buttonIsVisible: btn ? visible(btn) : false,
            buttonAttrHash: btn ? attrMap(btn) : {},
            buttonAriaLabel: btn ? (btn.getAttribute ? btn.getAttribute('aria-label') : '') : '',
            buttonTitle: btn ? (btn.getAttribute ? btn.getAttribute('title') : '') : '',
            buttonText: btn ? (btn.textContent || '').trim() : '',
            wrapperHidden: isHidden(el)
        };
    }
    function findRealButton(el) {
        if (!el) return null;
        if (el.tagName === 'BUTTON' || (el.getAttribute && el.getAttribute('role') === 'button')) return el;
        try {
            var b = el.querySelector('button') || el.querySelector('[role="button"]');
            return b;
        } catch (e) { return null; }
    }
    function isHidden(el) {
        if (!el) return false;
        try {
            if (el.offsetParent === null && !el.getClientRects().length) return true;
        } catch (e) {}
        try {
            var s = window.getComputedStyle && window.getComputedStyle(el);
            if (s) {
                if (s.display === 'none') return true;
                if (s.visibility === 'hidden') return true;
            }
        } catch (e) {}
        return false;
    }

    // ---- 停止键详情 ----
    var breakRows = rows.filter(function (r) { return r.label === 'chat_input_local_break_button'; });
    breakRows.forEach(function (r) {
        var el = null;
        try {
            var all = document.querySelectorAll(breakSel);
            if (all && all[r.idx] && all[r.idx] === r) el = all[r.idx];
        } catch (e) {}
        r.extra = breakExtra(el);
    });

    function breakExtra(el) {
        if (!el) return { err: '找不到元素' };
        var btn = findRealButton(el);
        return {
            tag: el.tagName,
            buttonTag: btn ? btn.tagName : '',
            buttonIsVisible: btn ? visible(btn) : false,
            buttonAriaLabel: btn ? (btn.getAttribute ? btn.getAttribute('aria-label') : '') : '',
            buttonTitle: btn ? (btn.getAttribute ? btn.getAttribute('title') : '') : '',
            buttonText: btn ? (btn.textContent || '').trim() : '',
            buttonSvgCount: btn ? (btn.querySelectorAll ? btn.querySelectorAll('svg').length : 0) : 0,
            wrapperHidden: isHidden(el)
        };
    }

    // ---- 思考 / 加载节点的内容形状 ----
    var thinkRows = rows.filter(function (r) { return r.label === 'thinking/loading'; });
    thinkRows.forEach(function (r) {
        var el = null;
        try {
            var all = document.querySelectorAll(thinkSel);
            if (all && all[r.idx] && all[r.idx] === r) el = all[r.idx];
        } catch (e) {}
        r.extra = thinkExtra(el);
    });
    function thinkExtra(el) {
        if (!el) return { err: '找不到元素' };
        try {
            return {
                innerTextLen: (el.innerText != null) ? el.innerText.length : undefined,
                textContentLen: (el.textContent != null) ? el.textContent.length : undefined,
                childCount: el.childNodes ? el.childNodes.length : 0,
                firstClassName: (el.firstElementChild ? (el.firstElementChild.className && (typeof el.firstElementChild.className === 'string' ? el.firstElementChild.className : '')) : ''),
                hasMessageTextContentChild: hasChildTestid(el, 'message_text_content')
            };
        } catch (e) { return { err: String(e) }; }
    }
    function hasChildTestid(el, testid) {
        if (!el || !el.querySelector) return false;
        try { return !!el.querySelector('[' + (testid.indexOf('=') >= 0 ? '' : 'data-testid=') + (testid.indexOf('=') >= 0 ? '' : '') + ']') || !!el.querySelector('[data-testid="' + testid + '"]'); } catch (e) { return false; }
    }

    // ---- 附件 input ----
    var fileRows = rows.filter(function (r) { return r.label === 'upload-file-input'; });
    fileRows.forEach(function (r) {
        var el = null;
        try {
            var all = document.querySelectorAll(fileSel);
            if (all && all[r.idx] && all[r.idx] === r) el = all[r.idx];
        } catch (e) {}
        r.extra = fileExtra(el);
    });
    function fileExtra(el) {
        if (!el) return { err: '找不到元素' };
        try {
            return {
                tag: el.tagName,
                accept: el.getAttribute ? el.getAttribute('accept') : '',
                multiple: !!el.getAttribute ? !!el.getAttribute('multiple') : false,
                isHidden: isHidden(el),
                filesCount: el.files ? el.files.length : 0
            };
        } catch (e) { return { err: String(e) }; }
    }

    // ---- 打印结果 ----
    console.groupEnd();
    console.group('【采集结果】共 ' + rows.length + ' 个节点（可复制这些 JSON 走证据对账）');
    console.log('平台 host: ' + host + '  |  location.pathname: ' + (location && location.pathname));
    console.table(rows.map(function (r) {
        var x = {
            label: r.label,
            idx: r.idx,
            tag: r.tag,
            dataTestid: r.dataTestid,
            cls: r.cls,
            parentChain: r.parentChain,
            visible: r.visible,
            rect: r.rect ? { w: Math.round(r.rect.width), h: Math.round(r.rect.height), top: Math.round(r.rect.top), left: Math.round(r.rect.left) } : null,
            streamAttr: r.streamAttr
        };
        if (r.extra) {
            try { Object.assign(x, r.extra); } catch (e) {}
        }
        return x;
    }));

    //  focused: 输入框相关额外信息
    if (inputRows.length) {
        console.group('输入框详细');
        inputRows.forEach(function (r) { console.log('输入框 [' + r.idx + ']:', JSON.parse(JSON.stringify(r.extra || {}))); });
        console.groupEnd();
    }
    if (sendRows.length) {
        console.group('发送键详细');
        sendRows.forEach(function (r) { console.log('发送键 [' + r.idx + ']:', JSON.parse(JSON.stringify(r.extra || {}))); });
        console.groupEnd();
    }
    if (breakRows.length) {
        console.group('停止生成键详细');
        breakRows.forEach(function (r) { console.log('停止键 [' + r.idx + ']:', JSON.parse(JSON.stringify(r.extra || {}))); });
        console.groupEnd();
    }
    if (thinkRows.length) {
        console.group('思考/加载节点详细');
        thinkRows.forEach(function (r) { console.log('思考节点 [' + r.idx + ']:', JSON.parse(JSON.stringify(r.extra || {}))); });
        console.groupEnd();
    }
    if (fileRows.length) {
        console.group('附件 input 详细');
        fileRows.forEach(function (r) { console.log('附件 input [' + r.idx + ']:', JSON.parse(JSON.stringify(r.extra || {}))); });
        console.groupEnd();
    }

    console.groupEnd();
    console.log('【命令】dump 完整 DOM 快照（outerHTML）到这个变量：');
    console.log('  window.__dswDoubaoDOM = collect.getSnapshot();');
    console.log('然后复制：copy(window.__dswDoubaoDOM)');
    console.groupEnd();

    // 公开几个后门，方便你在控制台手动探
    window.collect = {
        rows: rows,
        inputRows: inputRows,
        sendRows: sendRows,
        breakRows: breakRows,
        thinkRows: thinkRows,
        fileRows: fileRows,
        getSnapshot: function () {
            try {
                var body = document.body ? document.body.cloneNode(true) : null;
                var snap = {
                    host: host,
                    pathname: location && location.pathname,
                    search: location && location.search,
                    href: location && location.href,
                    collected: rows.map(function (r) { return { label: r.label, idx: r.idx, tag: r.tag, dataTestid: r.dataTestid, cls: r.cls, parentChain: r.parentChain, visible: r.visible, rect: r.rect ? { w: Math.round(r.rect.width), h: Math.round(r.rect.height), top: Math.round(r.rect.top), left: Math.round(r.rect.left) } : null, streamAttr: r.streamAttr, extra: r.extra }; }),
                    bodyOuterHTML: body ? body.outerHTML : null,
                    bodyInnerHTMLLen: body ? body.innerHTML.length : 0
                };
                return snap;
            } catch (e) { return { err: String(e) }; }
        }
    };
})();
