#!/usr/bin/env node
/* collect-doubao-dom-selftest.js — 采集脚本的自检（无浏览器时也能确认脚本本身逻辑自洽） */

'use strict';

const fs = require('fs');
const path = require('path');

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

const FILE = 'collect-doubao-dom.js';
const SRC = fs.readFileSync(path.join(ROOT, FILE), 'utf8');

ok(/function collect\(/.test(SRC), 'collect 函数存在');
ok(/data-testid="message_text_content"/.test(SRC), '收集消息正文 testid');
ok(/data-testid="chat_input_input"/.test(SRC), '收集输入框 testid');
ok(/data-testid="chat_input_send_button"/.test(SRC), '收集发送键 testid');
ok(/data-testid="chat_input_local_break_button"/.test(SRC), '收集停止键 testid');
ok(/message_thinking.*message_loading/.test(SRC) || /message_thinking"\],\[data-testid="message_loading/.test(SRC), '收集思考/加载 testid');
ok(/upload-file-input/.test(SRC), '收集附件 testid');

// 输入框 extra 分析字段存在
ok(/isContentEditable/.test(SRC), '输入框分析里有 isContentEditable');
ok(/firstEditableChild/.test(SRC), '输入框分析里有 firstEditableChild（结构化编辑器包层检测）');
ok(/childEditableCount/.test(SRC), '输入框分析里有 childEditableCount');

// 发送键 extra 分析字段存在
ok(/findRealButton/.test(SRC), '发送键分析里有 findRealButton（往下取 button）');
ok(/buttonAriaLabel/.test(SRC), '发送键分析里有 aria-label');
ok(/buttonText/.test(SRC), '发送键分析里有 按钮文字（纯图标按钮将为空）');

// 停止键 extra 分析字段存在
ok(/buttonSvgCount/.test(SRC), '停止键分析里有 svg 数（图标按钮鉴别）');

// 公开快照接口
ok(/getSnapshot/.test(SRC), '暴露了 getSnapshot（outerHTML 快照出口）');

// 不包含任何可发送/可改输入框的操作（只读）
ok(/\.value\s*=|\.value\s*!==/.test(SRC) === false, '脚本没有给输入框赋值（只读探索）');
ok(/\.click\s*\(/.test(SRC) === false, '脚本没有调用点击（只读探索）');

console.log('\n' + (failures ? '✗ 失败 ' + failures + ' 项' : '✓ 全部通过') + '（共 ' + checks + ' 项检查）');
process.exit(failures ? 1 : 0);
