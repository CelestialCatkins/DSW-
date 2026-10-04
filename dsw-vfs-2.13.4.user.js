// ==UserScript==
// @name         DSW 容器工作区 2.0
// @namespace    dsw-vfs
// @version      2.13.4
// @description  AI 对话容器工作区 2.0：执行域协议 ```dsw 围栏（或 <dsw>…</dsw>）+ 锚点令牌 + 错误即答案 + 降级阶梯 + 出站节奏器（多平台通用）；2.1.0 修复批内 undo/redo 丢数据、文件查看页改文本编辑器布局（全选/复制/粘贴）；2.2.0 会话状态（锚点/路径令牌/幂等/检查点/账本/计划/注入记录）迁入 IndexedDB——这些键天生按会话（即按平台）隔离，IDB 的 origin 隔离恰好等于它们该有的可见范围，GM 存储只留容器元数据与跨平台小状态；无 IDB 时自动退回 GM，行为与旧版一致；2.3.0 文件内容哈希改在写入那一刻算一次并缓存在节点上（唯一写入漏斗 setFileContent），落盘时不再对全容器内容重复哈希——修掉「一个 2MB 文件 + 每轮一条命令 = 每轮白算 4MB 哈希」这个最大的卡顿来源，另加两道哨兵防止缓存与内容脱节；2.4.0 容器树持久化改成「快照 + 增量日志 + 提交指针」：每批只写 O(改动) 的增量而不是整棵树，提交指针单键翻转即原子提交，崩溃最多丢最后一批而绝不读到半截状态；存储读不回来时进入只读保护而不是清空容器；内容在存储里缺失不再被静默洗成空文件；2.5.0 内容（blob）的存哪里收敛成可替换介质层：默认 GM（与旧版一致），可切 OPFS（大容量、读进内存后仍同步可读、写为异步落盘），不可用自动退回；元数据永远留在同步介质上——提交协议的失败语义必须同步，这条不能动；2.6.0 撤销档从「每档一份全树」改成「基线档 + 增量档（fwd/bwd ops）」，稳态每批只写 O(本批改动)（实测省 16 倍），可达集不必再解析历史全树，撤销/重做的存储与 GC 成本同时降下来；旧格式档只要带 tree 就照旧可用；2.7.0 容器内容可以存进你自己的手机文件夹（File System Access）：绑定后内容自动搬过去（搬家前后逐块核对，确认无误才回收旧介质），清浏览器数据不再丢、可备份、可跨平台复用；权限到期时**进入只读保护而不是悄悄降级**——否则新内容会分裂到两个介质里、那部分将永久读不到；面板「设置 → 容器存放位置」一键绑定/授权/解绑，解绑不删你文件夹里的东西；2.8.0 绑定的文件夹里现在能**直接看到容器文件**——活文件按原路径一一镜像（容器的 /src/a.js = 文件夹里的 src/a.js），可用文件管理器查看/修改/备份；你在文件夹里改了或新增的文件，下次打开会自动读回容器（系统区 /__sys 只出不进，避免旧手册把新版顶回去）；2.9.0 绑定文件夹后不再需要手动授权：页面加载时先静默检查（权限还在就直接接上，刷新页面不丢），真掉了就在你下一次碰屏幕的手势里自动补授权（浏览器还记得就不会弹窗，切回前台也会先复查一次），明确点「不允许」则本页不再打扰；同时修掉一个会丢可见性的启动顺序 bug——之前 init 把「用哪个介质」的配置读在 FsMedia.ready() **之后**，导致绑过文件夹却在用油猴存储（内容读不到、写入还会分裂），现在以「句柄在不在」为准；权限在落盘途中到期时任务放回队列等授权回来补写，不再静默丢弃；文件页顶部新增一行纯文字显示容器当前存放位置（油猴储存 / 你自己的文件夹名）；2.9.1 重写系统提示词与手册并逐条对照代码核实：修掉 10 处与程序不符的表述（域外「永不执行」其实有只读兜底、幂等只覆盖 write/edit/patch 而不是所有写命令、每个 delete 都要执行域而不只是 recursive、计划进度是独立附块不在回执内、「■ 后暂停」有条件、dry 不在回执首行、单段正文 edit 也吃、提示词里的「手册已附在下方」是有开关的、拼写自愈要求名字 ≥4 字母），提示词压到 15 行且可单独使用，手册去掉重复陈述、加小节交叉引用；新增 _p6_manual_selftest.js 把文档里的数字与代码常量绑死（改常量不改文档就测试失败），并检查小节编号、§引用、Markdown 强调符号落单等静态歧义源；2.9.2 修掉「自愈不透明」两类问题：冒险型自愈（锚点重定位 / edit 模糊匹配）额度**按命令**重算，不再整批共用一次（前一条用掉后，后一条不再被连坐）；会改树的命令各自带单命令存点，写到一半失败时只回滚这一条（回执加 `⤺` 行），非 atomic 批不再留下半写副作用；可疑正文的 `**`/`__` 检测改为只认**词边界的强调标记**（不再把 `a__b__c__d` 这类标识符误报）；手册与首发提示词把「正文必须再包一层三反引号围栏」写成硬规则，并点明 `[i]→iii` 这类渲染改写与 `base64` 通道；2.10.0 系统区（/__sys）不再镜像进你的手机文件夹——系统文件（手册/计划）由容器自己管，落到手机存储里会被文件管理器误删，而容器的「内部区只读」保护只作用于容器内、管不到容器外那份副本，所以干脆不写出去；升级后首次打开会顺手清掉旧版留在文件夹里的 __sys 目录（含空目录），用户自己的文件一个不动；2.11.0 手册改成**按需投喂**：首轮默认只发自足提示词 + 一张目录卡（手册分几节、怎么按节取），不再把几千字全文一次灌进去（记不住、记不准）；随时 `help` 看目录、`help §2`/`help 关键词` 现取**那一节**、`read /__sys/手册.md` 取全文；哪一轮踩了坑，回执附一行「手册§N」（指向真正相关的那节，带冷却不刷屏）；会话头几轮每轮再轮播一条最小契约（有限次），少量多次地固化。整本注入仍可在设置里打开；2.12.0 系统提示词与手册要求：AI 交给程序识别/执行的内容（整段执行域）一律用代码围栏（```dsw）包住，平台不再渲染围栏内字符，正文因此不必再自己套内层围栏；程序识别同步支持「围栏即执行域」与「围栏内 [[dsw]]」，围栏闭合改成校验同字符且长度 ≥ 开始符（修掉四反引号域里正文的 ``` 被误当闭合、正文被截断的 bug）；修掉 append 命中 base64 提示时引用未声明变量 out 的 TDZ 崩溃；启动时在第一个 await 之前先显示「程序正在启动…」提示，就绪或失败后收起；2.13.0 按「文件文件系统优化清单」重做一批交互：执行域标记换成主流 Agent 已适配的形状（**带 dsw 标签的代码围栏**为主、`<dsw> … </dsw>` 标签为等价写法，旧标记 `[[dsw]]` / `⟦dsw⟧` / `===dsw===` 不再识别也不兼容 —— 写到时明确报错并给新写法，绝不静默；围栏语言标签后可直接跟修饰符）；`grep -n "x" /a.html` 这类参数顺序写反不再降级为全容器搜索，直接报错并给正确写法（`find` 同理），不认识的参数一律把整条回执降为 PARTIAL 而不再报成成功；`plan done last`（同批 `plan add` 后可直接标最后一条）；对计划文件用 write/edit 会被 DENY 并明确指向 plan 命令；上下文里已有的提示词/目录卡/微课不再重复投喂；正文强调标记告警改为「计数 + 落单位置」双条件并提供 `--no-warn`；`read /f full`（等价 `--no-elide`）一次读全，省一次 outbox 二次读取；`expect` 断言失败联动回滚本批已写内容（回执列出被回滚路径，并建议改用 expect 而不是难定位的 atomic）；`AUTO` 回执必附 diff（脚本自动改了什么都逐行给）；`upload /目录` 或 `upload /a /b` 一次打成 zip 附件发出（面板文件页也能一键打包当前目录），并在提示词/手册里优先推荐批量命令与批量附件以减少交互、降低风控；面板头部在「更多」旁边新增「收起工作区」图标按钮；提示词与手册全文同步重写（提示词 14 行）；2.13.1 修「换了新符号反而认不出命令」：协议归一的斜杠组写成了必选（`(\/{1,2})`），导致 `<DSW>` 这类开标记压根匹配不上、整域被当成域外文本；执行域改为**围栏 + `<dsw>`/`</dsw>` 双保险**（围栏让平台原样保留内容，标签是纯文本标记 —— 平台只保留代码内容、丢掉围栏标记时仍能识别）；补上全角 `＜dsw＞` 归一；「命令写在代码块里却没识别出执行域」不再静默，而是回一条 NOOP 直接告诉 AI 正确的域写法；2.13.3 首次运行会弹一层「个性化设置 + 使用说明」：当场选内容存在哪里（油猴存储 / 浏览器沙盒 OPFS / 手机或电脑文件夹，gm↔opfs 现在也能直接互切，内容自动搬过去并逐块核对）、选五套配色与浅/深/跟随系统、勾行为偏好（自动回传 / 新对话注入 / 节奏器 / 震动 / 提示音 / 终止符后暂停 / 计划模式），并把悬浮球单击·双击·长按·拖动、面板头部 ✕ 与 ⋮ 各自的入口位置、AI 下命令的写法一次说清；点「稍后再说」不记已看过（下次开页面还会再问），点「完成」才写入标记；引导层随时能从「⋮ → 首次运行设置与说明」或「设置 → 概览」重新打开。引导层里的点击不往下传给面板委托，不会误关面板或弹两次确认框；2.13.4 重做引导层的自适应与排版：不再在页面一加载就自己掉下来（那层遮罩会挡住正在看的对话），改成球旁一句「点球打开工作区」，**用户主动点开工作区时才弹**；存储位置从三段描述文字改成三个可点按钮 + 只解释当前选中的那一个；悬浮球手势与面板入口从两列表格改成自适应网格（窄屏自动变一列）；抽屉改成「头部 / 可滚主体 / 常驻底部按钮」三段式，头尾不随内容滚走，最大高度用 dvh 避开手机地址栏跳动；可见文案从 1400 余字压到 400 字内，每条偏好副标题 ≤14 字，长的只留关键词（“首次使用”这种引导层不该讲细节，细节留给设置页与手册）
// @author       dsw-vfs
// @match        https://chat.deepseek.com/*
// @match        https://deepseek.com/*
// @match        https://www.deepseek.com/*
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @match        https://copilot.microsoft.com/*
// @match        https://poe.com/*
// @match        https://kimi.com/*
// @match        https://www.kimi.com/*
// @match        https://kimi.moonshot.cn/*
// @match        https://www.doubao.com/*
// @match        https://doubao.com/*
// @match        https://www.qianwen.com/*
// @match        https://qianwen.com/*
// @match        https://tongyi.aliyun.com/*
// @match        https://yuanbao.tencent.com/*
// @match        https://grok.com/*
// @match        https://aistudio.google.com/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

/* =============================================================================
 * DSW-VFS 2.0 —— 按《DSW-VFS 2.0 · 脚本机制设计》实现
 *
 * 五条底层原则：
 *   P1 执行域显式化：只有 ```dsw 围栏（或 <dsw> … </dsw>）内的行才会被执行，域外永不执行。
 *   P2 单一语法 + 定界正文：域内每行一条 `操作 路径 [参数]`，多行内容用 <<< … <<<。
 *   P3 锚点优先：可定位结果带 #令牌，定位与内容解耦，失效自动重定位。
 *   P4 契约在眼前：新对话**不自动发消息**——用户第一次点发送时把触发句 + 手册全文
 *      与用户那句话合成一条发出（也可随时 read /__sys/手册.md）；出错轮就地纠错。
 *   P5 错误即答案：错误自带候选与正确写法；能自愈的根本不进错误区。
 *
 * 硬约束：
 *   1) 能合并就一条：纠错/计划进度只搭车在本来就要发的回执里，绝不单独发消息；
 *   2) 稳态回执 ≤6 行（连续 ≥2 轮无错时 1~3 行）；
 *   3) 静默停摆次数必须为 0——任何「没执行」都有回执说明；
 *   4) 危险命令（**所有** delete / upload / restore / undo / redo）永不放宽，必须显式执行域。
 *
 * 手势（悬浮球）：单击 = 开/收面板；双击 = 暂停/恢复（只改状态条，不弹浮层）；
 *   长按 550ms = 重新识别命令；按住拖动 = 移动。监听统一走 pointerdown/pointermove/pointerup
 *   （老 WebView 回退 touch+mouse，并用时间窗丢弃合成 mousedown，否则手机上一次单击会被算成两次）。
 *
 * 其余细节（节奏器 6 档、等待与「输出完」判据、终止符 ■ 与暂停边界、计划模式、
 * 回收站/内部区只读、新对话注入判定、设置页排版）一律见对应模块头注释 —— 单一出处，避免两处漂移。
 * ========================================================================== */

(function () {
    'use strict';

/* >>> 01-config.js */
    /* =========================================================================
     * 01 配置 / 常量 / 存储层
     * ====================================================================== */

    const VERSION = '2.13.4';
    const PROTO_VERSION = 'DSW2';

    const CONFIG = {
        // —— 观察与流式 ——

        THINKING_MAX_DEPTH: 25,

        // —— 「等回复输出完」闸门（§9.2 闸3 加强）——

        REPLY_END_SETTLE_MS: 400,     // #3 收到收尾符号（◆/■）后只需静止这么久就算「说完了」

        STREAM_MARKER_MAX_DEPTH: 6,   // 向上找流式标记的层数（不再一路找到 body，避免残留类名误判）

        // —— 文件系统 ——
        MAX_FILE_SIZE: 1024 * 1024 * 1024,   // v2.0.1 解除单文件大小限制(原 512KB → 1GB)
        MAX_PATH_LEN: 200,
        GREP_MAX_HITS: 120,

        // P3b：内容介质。'gm' = 油猴存储（默认，与旧版一致）；'opfs' = 沙盒文件系统（大容量，
        // 读了进内存后仍然同步可读，写是异步落盘）。元数据永远留在 GM —— 提交协议要求同步。
        FS_MEDIA: 'gm',

        TRASH_PREFIX: '/__trash/',
        SYS_PREFIX: '/__sys/',

        // —— 锚点（§3.5）——

        // —— 幂等（§7）——
        IDEMPOTENT_WINDOW_MS: 90000,
        MSG_LEDGER_PREFIX: 'dsw2:msgs:',   // 「已处理回复」账本：按会话存，见 14-runtime 的 A 根因修复

        // —— 自愈额度（§5）——
        // 冒险型自愈 = 锚点漂移重定位、edit 模糊匹配（都会「猜」）。
        // 额度**按命令**计：整批共用一次时，一条命令用掉后，同批后面本该自愈的命令只能直接失败
        // （反馈：一批里前一条锚点漂移，后面那条 edit 就再也等不到模糊匹配）。
        RISKY_HEALS_PER_CMD: 1,

        // —— 出生证明（§7）——

        // —— 降级阶梯（§5.1）——
        READ_FALLBACK: true,            // 读兜底：域外只读命令是否放行（写命令永远不放行）

        // —— 出站节奏器（§9.2）——

        // #2 节奏器等待 = 6 个固定档位：3s → 5s → 8s → 12s → 20s → 30s（最高 30s）。
        //   **完全由固定条件决定，不随机**；判定从最高档往下、先命中先取（见 15-outbox 的 pacerLevel）：
        //     30s 平台提示太频繁 / 429 / 请求过于频繁；或 1 分钟 ≥10 条；或 10 分钟 ≥25 条  ← 要求最高
        //     20s 1 分钟内 ≥8 条，或 10 分钟内 ≥18 条
        //     12s 1 分钟内 ≥6 条，或 30 秒内 ≥6 条
        //      8s 1 分钟内 ≥4 条，或 30 秒内 ≥4 条
        //      5s 1 分钟内 ≥3 条，或 30 秒内 ≥3 条
        //      3s 其余情况（1 分钟内已发 ≤2 条）                                    ← 最宽松
        PACER_TIERS: [
            { ms: 3000, need: '其余情况：1 分钟内已发 ≤2 条' },
            { ms: 5000, need: '1 分钟内已发 ≥3 条，或 30 秒内已发 ≥3 条' },
            { ms: 8000, need: '1 分钟内已发 ≥4 条，或 30 秒内已发 ≥4 条' },
            { ms: 12000, need: '1 分钟内已发 ≥6 条，或 30 秒内已发 ≥6 条' },
            { ms: 20000, need: '1 分钟内已发 ≥8 条，或 10 分钟内已发 ≥18 条' },
            { ms: 30000, need: '平台提示太频繁 / 429 / 请求过于频繁，或 1 分钟内已发 ≥10 条，或 10 分钟内已发 ≥25 条' }
        ],
        OUTBOX_MIN_INTERVAL_MS: 3000,   // = 最小档：低于它才算「这一轮必须等」（等多久看档位）
        OUTBOX_MAX_PER_MIN: 10,         // #2 30s 档硬条件：1 分钟内满 10 条
        OUTBOX_MAX_PER_10MIN: 25,       // #2 30s 档硬条件：10 分钟内满 25 条
        OUTBOX_STREAM_GUARD_MS: 2500,
        PACER_MAX_WAIT_MS: 30000,   // #2 节奏器单次等待上限 30s（任何等待都必须落在这个上限内）
        PACER_REJECT_WAIT_MS: 30000, // #2 平台限流提示并入「节奏器等待」的单次窗口（不做独立冷却、不叠加倒计时）
        // #2 各档的触发阈值（固定条件，判定从最高档往下逐条比较，先命中先取）

        // 30 秒窗口 ⊂ 1 分钟窗口，所以下面三条「30 秒」阈值取与各自 1 分钟阈值同级（3/4/6）：
        // 它们是「连发保护」的另一种说法，不会比 1 分钟条款更早命中 —— 这样 1 分钟里能发到 8~10 条
        // （连发实测 3/3/3/5/8/8s，1 分钟 8 条）；把阈值调小（2/3/4）会让连发只剩 7 条/分钟。
        PACER_LV12_PER_30S: 6,     // 12s 档：30 秒内 ≥6 条（= 1 分钟阈值）

        PACER_LV8_PER_30S: 4,      // 8s 档：30 秒内 ≥4 条（= 1 分钟阈值）

        PACER_LV5_PER_30S: 3,      // 5s 档：30 秒内 ≥3 条（= 1 分钟阈值）

        // —— 循环熔断 ——
        LOOP_WINDOW_MS: 60000,

        LOOP_BREAK_MS: 300000,

        // —— 提示词 / 注入 ——
        AUTO_BOOTSTRAP: true,      // 新对话注入（不再自动发送，随用户首次发送一并注入）
        // 2.11.0 投喂策略：默认只发**目录卡**（手册分节 + 按节取法），不发全文 ——
        // 全文一次性灌进去 AI 记不住、记不准；真要全文可自行打开「注入手册全文」。
        INJECT_MANUAL: false,

        // —— 节奏器（§9.2）——
        RATE_LIMIT_ENABLED: true,  // 关闭后不再有最小间隔/每分钟上限/平台限流等待

        // —— 收尾符号 / 终止符号（§9.3）——
        // #3 回复结束符：AI 每条回复的最后一行写它 → 容器立刻认定「这条说完了」，不必再猜平台流式标记
        REPLY_END_MARKS: ['◆', '⟪DSW_END⟫'],
        // #4 终止符号：只在「整个任务全部跑完」或「需要用户介入」时出现 → 震动/提示音提醒用户
        TERMINATE_MARK: '■',
        // 只扫描回复尾部这么多字符找终止符号（避免把文件正文里的 ■ 当提醒）

        // —— #4 计划模式 ——

        PLAN_RECEIPT_MAX_ITEMS: 12,   // 计划命令回执里回显的条目上限

    };

    const SYS_PREFIX = CONFIG.SYS_PREFIX;
    const TRASH_PREFIX = CONFIG.TRASH_PREFIX;
    const SYS_MANUAL_PATH = SYS_PREFIX + '手册.md';
    const SYS_PLAN_PATH = SYS_PREFIX + 'plan.md';
    const INTERNAL_PREFIXES = [SYS_PREFIX, TRASH_PREFIX];

    // #3/#4 符号常量放在配置层：11-manual（提示词/手册）与 13b-notify（识别）都要用，
    // 且提示词是在脚本装载过程中就拼好的，不能等到 13b 才定义（TDZ）。
    const END_MARKS = (CONFIG.REPLY_END_MARKS || ['◆']).slice();
    const TERMINATE_MARK = CONFIG.TERMINATE_MARK || '■';

    // §10 状态与持久化键
    const STORE_TREE = 'dsw2:fs:tree';
    const BLOB_PREFIX = 'dsw2:fs:blob:';
    const STORE_UNDO_IDX = 'dsw2:undo:idx';
    const UNDO_PREFIX = 'dsw2:undo:';
    const STORE_TRASH = 'dsw2:trash';
    const ANCHOR_PREFIX = 'dsw2:anchor:';
    const PATHTOK_PREFIX = 'dsw2:pathtok:';
    const GATE_PREFIX = 'dsw2:gate:';
    const CKPT_PREFIX = 'dsw2:ckpt:';
    const STORE_OUTBOX = 'dsw2:outbox';
    const STORE_RATE = 'dsw2:rate';
    const STORE_BOOT_PREFIX = 'dsw2:bootstrap:';
    const STORE_BOOT_GLOBAL = 'dsw2:bootstrap:last';   // #5 全局注入记录（跨 URL 变更/刷新防重复注入）
    const STORE_BALL_POS = 'dsw2:ui:ball-pos';
    const STORE_UI_CFG = 'dsw2:ui:cfg';
    const STORE_UI_ONBOARD = 'dsw2:ui:onboard';   // 2.13.3：首次运行引导已完整看过
    const STORE_MANUAL_VER = 'dsw2:manual:ver';
    const STORE_MANUAL_HASH = 'dsw2:manual:hash';   // 容器自己写下的那版手册的指纹（判断「手册是否被人改过」）

    function log() { if (DEBUG) console.log.apply(console, ['%c[DSW2]', 'color:#2563eb;font-weight:bold'].concat(Array.prototype.slice.call(arguments))); }
    function warn() { console.warn.apply(console, ['%c[DSW2]', 'color:#d97706;font-weight:bold'].concat(Array.prototype.slice.call(arguments))); }
    function errlog() { console.error.apply(console, ['%c[DSW2]', 'color:#dc2626;font-weight:bold'].concat(Array.prototype.slice.call(arguments))); }

    /* ---------------------------- 存储层 ---------------------------- */

    const Store = (function () {
        const mem = Object.create(null);
        let gmOk = true;
        try { gmOk = (typeof GM_getValue === 'function' && typeof GM_setValue === 'function'); } catch (e) { gmOk = false; }

        function rawGet(key, def) {
            try {
                if (gmOk) {
                    const v = GM_getValue(key, undefined);
                    if (v !== undefined && v !== null) return v;
                }
            } catch (e) { warn('GM_getValue 失败：', e && e.message); }
            return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : def;
        }

        function rawSet(key, value) {
            try {
                if (gmOk) { GM_setValue(key, value); mem[key] = value; return true; }
            } catch (e) { warn('GM_setValue 失败：', e && e.message); }
            mem[key] = value;
            return !gmOk;
        }

        function rawDel(key) {
            try {
                if (gmOk && typeof GM_deleteValue === 'function') GM_deleteValue(key);
            } catch (e) {}
            delete mem[key];
        }

        return {
            // 字符串键值（文本/JSON 均以字符串落盘，跨脚本管理器一致）
            get(key, def) {
                if (isSessionKey(key)) return SessionState.get(key, def);
                const v = rawGet(key, undefined);
                if (v === undefined || v === null) return def;
                if (typeof v === 'string') {
                    try { return JSON.parse(v); } catch (e) { return v; }
                }
                return v;
            },
            set(key, value) {
                if (isSessionKey(key)) return SessionState.set(key, value);
                try { return rawSet(key, JSON.stringify(value)); }
                catch (e) { return false; }
            },
            rawGet: rawGet,
            rawSet: rawSet,
            rawDel: rawDel,      // 不过路由的原始删除（会话状态层迁移/清理要用；对称于 rawGet/rawSet）
            del(key) {
                if (isSessionKey(key)) { SessionState.del(key); return; }
                rawDel(key);
            },
            keys() {
                let out = [];
                try { if (typeof GM_listValues === 'function') out = (GM_listValues() || []).slice(); } catch (e) {}
                for (const k of Object.keys(mem)) if (out.indexOf(k) === -1) out.push(k);
                return out;
            }
        };
    })();

    /* ---------------------- 会话状态层（IndexedDB / P1） ----------------------
     * 为什么有这一层：`dsw2:anchor:*` / `pathtok:*` / `gate:*` / `ckpt:*` / `msgs:*` /
     * `plan:*` / `bootstrap:*` 这些键里都带**会话 ID**，而会话 ID 本身就按平台生成
     * （currentConversationKey = PLATFORM.id + ':' + id）—— 它们天生只该在一个平台内可见。
     * 放进按 origin 隔离的 IndexedDB，隔离范围**恰好等于**数据的可见范围：这是正确语义，
     * 不是妥协（见《容器存储分层方案》§2 原则一）。
     *
     * 另外三个好处：
     *   1) GM 存储里不再有随时间无限增长的会话键（以前每开一个新会话就多几个键，永不回收）；
     *   2) IDB 有事务与索引，过期回收不再靠各处手工 filter+slice；
     *   3) IDB 存结构化克隆，锚点/账本这些对象不用再 JSON 往返。
     *
     * **关键约束：Store.get/set/del 的同步签名一个字都不改。** 做法是「内存权威 + 写behind」：
     *   ready() 之前 → 全部透传 GM（与旧版行为完全一致，ready() 里再由迁移器搬进 IDB）
     *   ready() 之后 → 读内存（同步）、写内存 + 入队异步落盘
     * 于是所有调用点（约 30 处）以及 VirtualFS 的 batchRemember / restoreBatchStore
     * 那套 dry 域回滚机制**零改动** —— 它们只是照旧调 Store.get/set/del，路由在这里发生。
     *
     * 降级：没有 IDB / 打开失败 / 被其它标签页阻塞 → backend='gm'，直接透传 Store.raw*，
     * 行为与今天完全一致；面板会写明当前落在哪一层。
     * ====================================================================== */

    const SESSION_KEY_PREFIXES = [
        'dsw2:anchor:', 'dsw2:pathtok:', 'dsw2:gate:',
        'dsw2:ckpt:', 'dsw2:msgs:', 'dsw2:plan:', 'dsw2:bootstrap:'
    ];
    // 例外：注入总记录是**跨 URL / 跨页**的全局键，必须留在 GM（见 STORE_BOOT_GLOBAL）
    const SESSION_GM_EXCEPTION = 'dsw2:bootstrap:last';

    function isSessionKey(key) {
        if (typeof key !== 'string' || !key) return false;
        if (key === SESSION_GM_EXCEPTION) return false;
        for (let i = 0; i < SESSION_KEY_PREFIXES.length; i++) {
            if (key.indexOf(SESSION_KEY_PREFIXES[i]) === 0) return true;
        }
        return false;
    }

    function sessionKindOf(key) {
        for (let i = 0; i < SESSION_KEY_PREFIXES.length; i++) {
            const p = SESSION_KEY_PREFIXES[i];
            if (key.indexOf(p) === 0) return p.slice(5, -1);
        }
        return '';
    }

    const SessionState = (function () {
        const DB_NAME = 'dsw2';
        const DB_VERSION = 1;
        const OS_NAME = 'session_state';
        const OPEN_TIMEOUT_MS = 2000;
        const FLUSH_DEBOUNCE_MS = 60;
        const RETRY_MS = 2000;
        // 过期回收**只碰纯缓存性质的两类**：幂等窗口只有 90 秒、账本只是判重缓存。
        // 锚点 / 检查点 / 计划 / 注入记录体积小、更可能被人回看 —— 保守起见不回收。
        const SWEEP_MAX_AGE_MS = { gate: 30 * 86400000, msgs: 30 * 86400000 };

        const mem = new Map();        // key -> 值（权威内存视图）
        const atMap = new Map();      // key -> 最后写入时间
        const dirty = new Map();      // key -> 值 | undefined(删除)，待落盘
        const migrated = new Set();   // 本次从 GM 搬进来的键（落盘成功后才删 GM 老键）

        let backend = 'pending';      // 'pending' | 'idb' | 'gm'
        let db = null;
        let readyPromise = null;
        let flushPromise = null;
        let flushTimer = null;
        let lastError = '';
        let putCount = 0;
        let dropCount = 0;

        function idbFactory() {
            try { if (typeof indexedDB !== 'undefined' && indexedDB) return indexedDB; } catch (e) {}
            try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow && unsafeWindow.indexedDB) return unsafeWindow.indexedDB; } catch (e) {}
            return null;
        }

        // 与旧 Store.get 完全相同的解析口径（GM 里存的是 JSON 字符串）
        function parseRaw(v) {
            if (v === undefined || v === null) return undefined;
            if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return v; } }
            return v;
        }

        function openDB(factory) {
            return new Promise(function (resolve, reject) {
                let req;
                try { req = factory.open(DB_NAME, DB_VERSION); }
                catch (e) { reject(e); return; }
                req.onupgradeneeded = function () {
                    try {
                        const d = req.result;
                        if (!d.objectStoreNames.contains(OS_NAME)) {
                            const os = d.createObjectStore(OS_NAME, { keyPath: 'k' });
                            os.createIndex('by_at', 'at');
                        }
                    } catch (e) {}
                };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error || new Error('indexedDB 打开失败')); };
                req.onblocked = function () { reject(new Error('indexedDB 被其它标签页阻塞')); };
            });
        }

        function withTimeout(p, ms) {
            return new Promise(function (resolve, reject) {
                let done = false;
                const t = setTimeout(function () {
                    if (done) return;
                    done = true;
                    reject(new Error('indexedDB 打开超时（' + ms + 'ms）'));
                }, ms);
                p.then(function (v) {
                    if (done) return;
                    done = true; clearTimeout(t); resolve(v);
                }, function (e) {
                    if (done) return;
                    done = true; clearTimeout(t); reject(e);
                });
            });
        }

        function os(mode) { return db.transaction(OS_NAME, mode).objectStore(OS_NAME); }

        function txDone(o) {
            return new Promise(function (resolve, reject) {
                const t = o.transaction;
                t.oncomplete = function () { resolve(); };
                t.onerror = function () { reject(t.error || new Error('事务失败')); };
                t.onabort = function () { reject(t.error || new Error('事务中止')); };
            });
        }

        function readAll() {
            return new Promise(function (resolve, reject) {
                const out = [];
                let req;
                try { req = os('readonly').openCursor(); }
                catch (e) { reject(e); return; }
                req.onsuccess = function () {
                    const c = req.result;
                    if (!c) { resolve(out); return; }
                    out.push(c.value);
                    try { c.continue(); } catch (e) { resolve(out); }
                };
                req.onerror = function () { reject(req.error || new Error('读取失败')); };
            });
        }

        /* 把 GM 里遗留的会话键搬进内存。**先不删老键** —— 等这批落盘成功（flush 里）
         * 才删，失败则老键原样留着，下次再试，绝不出现"两边都没有"。 */
        function adoptLegacy() {
            let keys = [];
            try { keys = Store.keys(); } catch (e) { keys = []; }
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (!isSessionKey(k) || mem.has(k)) continue;
                const v = parseRaw(Store.rawGet(k, undefined));
                if (v === undefined) continue;
                mem.set(k, v);
                atMap.set(k, Date.now());
                dirty.set(k, v);
                migrated.add(k);
            }
        }

        function flush() {
            if (backend !== 'idb') return Promise.resolve();
            if (flushPromise) return flushPromise;      // 收尾钩子会补一次，这里不重复排程
            if (!dirty.size) return Promise.resolve();
            const batch = new Map(dirty);
            dirty.clear();
            const now = Date.now();
            flushPromise = (async function () {
                const o = os('readwrite');
                batch.forEach(function (v, k) {
                    if (v === undefined) o.delete(k);
                    else o.put({ k: k, data: v, at: now });
                });
                await txDone(o);
                batch.forEach(function (v, k) {
                    atMap.set(k, now);
                    if (migrated.has(k)) {
                        migrated.delete(k);
                        try { Store.rawDel(k); }
                        catch (e) { warn('SessionState：删除 GM 旧键失败（下次启动会重试）：', k, e && e.message); }
                    }
                });
                putCount += batch.size;
            })().catch(function (e) {
                lastError = '会话状态落盘失败：' + (e && e.message ? e.message : String(e));
                warn('SessionState 落盘失败，稍后重试：', e);
                dropCount += batch.size;
                batch.forEach(function (v, k) { if (!dirty.has(k)) dirty.set(k, v); });
                scheduleFlush(RETRY_MS);
            }).then(function () {
                flushPromise = null;
                if (dirty.size && backend === 'idb') scheduleFlush(FLUSH_DEBOUNCE_MS);
            });
            return flushPromise;
        }

        function scheduleFlush(delay) {
            if (flushTimer) return;
            flushTimer = setTimeout(function () {
                flushTimer = null;
                flush();
            }, delay == null ? FLUSH_DEBOUNCE_MS : delay);
        }

        function ready() {
            if (readyPromise) return readyPromise;
            readyPromise = (async function () {
                const factory = idbFactory();
                if (!factory) {
                    backend = 'gm';
                    lastError = '本环境没有 IndexedDB（会话状态退回 GM 存储）';
                    return backend;
                }
                try {
                    db = await withTimeout(openDB(factory), OPEN_TIMEOUT_MS);
                    backend = 'idb';
                    const rows = await readAll();
                    for (let i = 0; i < rows.length; i++) {
                        const r = rows[i];
                        if (r && typeof r.k === 'string') {
                            mem.set(r.k, r.data);
                            atMap.set(r.k, typeof r.at === 'number' ? r.at : Date.now());
                        }
                    }
                    adoptLegacy();
                    if (dirty.size) flush();
                } catch (e) {
                    // 降级：memory 里可能已经装过东西，清空后完全回到 GM 口径
                    db = null;
                    backend = 'gm';
                    lastError = '会话状态层降级到 GM：' + (e && e.message ? e.message : String(e));
                    warn('SessionState 降级到 GM：', e);
                    mem.clear(); atMap.clear(); dirty.clear(); migrated.clear();
                }
                return backend;
            })();
            return readyPromise;
        }

        // 过期回收（只在 ready 之后调一次）。只按 at 回收 SWEEP_MAX_AGE_MS 里登记的两类。
        function sweep() {
            if (backend !== 'idb') return 0;
            const now = Date.now();
            let removed = 0;
            atMap.forEach(function (at, k) {
                const maxAge = SWEEP_MAX_AGE_MS[sessionKindOf(k)];
                if (!maxAge || now - at <= maxAge) return;
                mem.delete(k);
                atMap.delete(k);
                dirty.set(k, undefined);
                removed++;
            });
            if (removed) {
                log('SessionState: 回收过期会话状态', removed, '条');
                flush();
            }
            return removed;
        }

        function get(key, def) {
            if (backend !== 'idb') {
                const v = parseRaw(Store.rawGet(key, undefined));
                return v === undefined ? def : v;
            }
            return mem.has(key) ? mem.get(key) : def;
        }

        function set(key, value) {
            if (backend !== 'idb') {
                try { return Store.rawSet(key, JSON.stringify(value)); } catch (e) { return false; }
            }
            mem.set(key, value);
            dirty.set(key, value);
            scheduleFlush();
            return true;
        }

        function del(key) {
            if (backend !== 'idb') { try { Store.rawDel(key); } catch (e) {} return; }
            mem.delete(key);
            dirty.set(key, undefined);
            scheduleFlush();
        }

        function clearAll() {
            mem.clear(); atMap.clear(); dirty.clear(); migrated.clear();
            if (backend === 'idb' && db) {
                try { os('readwrite').clear(); } catch (e) {}
                return;
            }
            let keys = [];
            try { keys = Store.keys(); } catch (e) { keys = []; }
            for (let i = 0; i < keys.length; i++) {
                if (isSessionKey(keys[i])) { try { Store.rawDel(keys[i]); } catch (e) {} }
            }
        }

        function status() {
            return {
                backend: backend, error: lastError,
                keys: mem.size, dirty: dirty.size,
                puts: putCount, drops: dropCount
            };
        }

        return {
            ready: ready, get: get, set: set, del: del,
            flush: flush, flushNow: function () { return flush(); },
            sweep: sweep, clearAll: clearAll, status: status,
            isSessionKey: isSessionKey, kindOf: sessionKindOf,
            _mem: mem
        };
    })();

    /* ---------------------- 容器内容介质层（P3b 接缝） ----------------------
     * 容器的持久化只有两类东西，它们的约束**完全不同**，所以介质也必须分开选：
     *
     *   元数据  base / log / head  —— 小、且**必须同步落盘**
     *          提交协议的失败语义（写日志失败 / 翻指针失败 → 回滚）建立在同步之上，
     *          一旦变异步，回执就没法诚实地说"存住了"。所以这一层永远留在同步介质（GM）。
     *
     *   内容    blob:<hash>        —— 可能很大，是唯一值得换介质的部分
     *
     * 这里把「内容存哪里」收敛成一层。将来的 OPFS / 用户真实目录实现只要满足契约：
     *   · 读同步：ready() 之后 blobHas/blobGet 必须立刻返回（实现负责先把内容读进内存）
     *   · 写可异步：blobPut 先落内存 + 入队，真正落盘由 flush 完成（失败要能被 status() 说出来）
     *   · 存在性判断以本层为准，外部不再自己维护一份 presentBlobs
     * 默认实现 'gm' = 与旧版逐字节一致（同步写穿），所以这次改动对用户零行为变化。
     * ====================================================================== */

    const FsMedia = (function () {
        const known = new Set();      // 已存在的内容 hash（便宜的存在性判断）
        let seeded = false;
        let impl = null;
        let implName = 'gm';
        let readyPromise = null;
        let lastError = '';
        let putCount = 0, delCount = 0, failCount = 0;

        /* ---- GM 实现：同步写穿，等同旧行为 ---- */
        function gmImpl() {
            return {
                name: 'gm',
                async ready() { return true; },
                has(hash) { return Store.rawGet(BLOB_PREFIX + hash, undefined) !== undefined; },
                get(hash) {
                    const v = Store.rawGet(BLOB_PREFIX + hash, undefined);
                    if (v === undefined) return undefined;
                    return typeof v === 'string' ? v : String(v);
                },
                put(hash, content) { return Store.rawSet(BLOB_PREFIX + hash, content); },
                del(hash) { Store.rawDel(BLOB_PREFIX + hash); },
                keys() {
                    const out = [];
                    let ks = [];
                    try { ks = Store.keys(); } catch (e) { ks = []; }
                    for (const k of ks) {
                        if (typeof k === 'string' && k.indexOf(BLOB_PREFIX) === 0) out.push(k.slice(BLOB_PREFIX.length));
                    }
                    return out;
                }
            };
        }

        /* ---- OPFS 实现：内存权威 + 异步落盘（读全部来自内存，所以读仍然同步） ---- */
        function opfsImpl() {
            const mem = new Map();
            const queue = [];               // {hash, content}；content === undefined 表示删除
            const queued = new Set();
            const BLOB_DIR = 'blobs';
            let dir = null;
            let flushing = null;
            let timer = null;

            function factory() {
                try {
                    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) return navigator.storage;
                } catch (e) {}
                try {
                    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.navigator && unsafeWindow.navigator.storage
                        && unsafeWindow.navigator.storage.getDirectory) return unsafeWindow.navigator.storage;
                } catch (e) {}
                return null;
            }

            function scheduleFlush(delay) {
                if (timer) return;
                timer = setTimeout(function () { timer = null; flush(); }, delay == null ? 30 : delay);
            }

            async function flush() {
                if (flushing) return flushing;
                flushing = (async function () {
                    while (queue.length) {
                        const job = queue.shift();
                        queued.delete(job.hash);
                        try {
                            if (job.content === undefined) {
                                await dir.removeEntry(job.hash).catch(function () {});
                                delCount++;
                            } else {
                                const fh = await dir.getFileHandle(job.hash, { create: true });
                                const w = await fh.createWritable();
                                await w.write(job.content);
                                await w.close();
                                putCount++;
                            }
                        } catch (e) {
                            failCount++;
                            lastError = '内容落盘失败（' + String(job.hash).slice(0, 6) + '）：' + (e && e.message ? e.message : e);
                            warn('FsMedia(opfs) 内容落盘失败：', e && e.message);
                        }
                    }
                })();
                try { await flushing; } finally { flushing = null; }
                if (queue.length) scheduleFlush(0);
                return true;
            }

            return {
                name: 'opfs',
                async ready() {
                    const st = factory();
                    if (!st) throw new Error('本环境没有 OPFS');
                    const root = await st.getDirectory();
                    dir = await root.getDirectoryHandle(BLOB_DIR, { create: true });
                    // 全量读进内存：读路径必须保持同步（FS 模块是内存权威）
                    if (dir.values) {
                        for await (const entry of dir.values()) {
                            if (!entry || entry.kind !== 'file') continue;
                            try {
                                const f = await entry.getFile();
                                mem.set(entry.name, await f.text());
                            } catch (e) { warn('FsMedia(opfs) 读取失败：', entry.name, e && e.message); }
                        }
                    }
                    return true;
                },
                has(hash) { return mem.has(hash); },
                get(hash) { return mem.get(hash); },
                put(hash, content) {
                    mem.set(hash, content);
                    if (!queued.has(hash)) { queued.add(hash); queue.push({ hash: hash, content: content }); }
                    scheduleFlush();
                    return true;
                },
                del(hash) {
                    mem.delete(hash);
                    if (!queued.has(hash)) { queued.add(hash); queue.push({ hash: hash, content: undefined }); }
                    scheduleFlush();
                    return true;
                },
                keys() { return Array.from(mem.keys()); },
                flush: flush,
                pending: function () { return queue.length; }
            };
        }

        /* ---- 真实文件夹实现（FSA）：内容放在 <你选的文件夹>/.dsw/blobs/<hash> ----
         * 和 OPFS 实现的形状完全一样（内存权威 + 异步落盘），差别只在「介质在哪」。
         * 关键约束有两条，都来自浏览器的安全模型：
         *   · showDirectoryPicker / requestPermission **必须由用户点击触发**，不能自动跑
         *   · 句柄能存 IndexedDB（刷新后还在），但权限只保证到「关掉本站所有标签页」为止 */

        const FSA_DB = 'dsw2-fsa';
        const FSA_STORE = 'h';
        const FSA_KEY = 'container';

        function fsaIdb() {
            return new Promise(function (res, rej) {
                let req;
                try { req = indexedDB.open(FSA_DB, 1); } catch (e) { rej(e); return; }
                req.onupgradeneeded = function () {
                    try { if (!req.result.objectStoreNames.contains(FSA_STORE)) req.result.createObjectStore(FSA_STORE); } catch (e) {}
                };
                req.onsuccess = function () { res(req.result); };
                req.onerror = function () { rej(req.error || new Error('打不开句柄库')); };
            });
        }
        function fsaHandle(op, val) {
            return fsaIdb().then(function (db) {
                return new Promise(function (res, rej) {
                    const t = db.transaction(FSA_STORE, op === 'get' ? 'readonly' : 'readwrite');
                    const os = t.objectStore(FSA_STORE);
                    const r = op === 'get' ? os.get(FSA_KEY) : (op === 'del' ? os.delete(FSA_KEY) : os.put(val, FSA_KEY));
                    r.onsuccess = function () { res(r.result); };
                    r.onerror = function () { rej(r.error || new Error('句柄读写失败')); };
                });
            });
        }

        /* ============ 2.13.2：手机文件夹（File System Access）提速 ============
         * 之前的写法是「一条一条 await」：搬 N 个 blob 要 N 轮 getFileHandle → createWritable
         * → write → close，镜像 N 个文件还要**每个文件重新走一遍 getDirectoryHandle 目录链**。
         * 手机存储上每一步都是真IO（手机上往往一次 5~30ms），串起来就是几十秒起步。
         * 三处改动，都不改变语义（权限失败仍回队、不丢内容）：
         *   1) FSA_CONCURRENCY 路并发：IO 等待彼此重叠，串行变并行；
         *   2) 目录句柄缓存：同一个目录只 getDirectoryHandle 一次，而不是每个文件一次；
         *   3) 批量取（splice 一批再跑），失败只把**真正没完成**的那几条放回队头，顺序不变。 */

        // 手机存储不适合开太大：并发太高反而互相抢 IO，还会同时开太多可写句柄
        const FSA_CONCURRENCY = 6;
        const FSA_BATCH = 64;

        /* 有界并发跑一批任务，并把「权限掉了」和「真失败」分开。
         * 返回 states：2=成功 3=权限失败 4=真失败 0/1=没轮到/刚起步。
         * 调用方据此把 states!==2 的任务原样放回队头（顺序保持不变）。 */
        function poolRun(items, task, onFail) {
            const states = new Array(items.length).fill(0);
            if (!items.length) return Promise.resolve({ stopped: false, states: states });
            let cursor = 0, stopped = false;
            async function loop() {
                for (;;) {
                    if (stopped) return;
                    const i = cursor++;
                    if (i >= items.length) return;
                    states[i] = 1;
                    try {
                        await task(items[i], i);
                        states[i] = 2;
                    } catch (e) {
                        if (isPermErrorShared(e)) { states[i] = 3; stopped = true; return; }
                        states[i] = 4;
                        if (onFail) { try { onFail(items[i], i, e); } catch (x) {} }
                    }
                }
            }
            const n = Math.min(FSA_CONCURRENCY, items.length);
            return Promise.all(Array.from({ length: n }, loop)).then(function () { return { stopped: stopped, states: states }; });
        }

        // poolRun 要在 impl 之外用，所以权限判定也提到模块层（与 fsaImpl 内部那一份同口径）
        function isPermErrorShared(e) {
            const n = String(e && e.name ? e.name : '');
            const m = String(e && e.message ? e.message : e);
            return n === 'NotAllowedError' || n === 'SecurityError'
                || /permission|denied|not allowed|notallowed|security|权限|授权/i.test(m);
        }

        function fsaImpl(handle) {
            const mem = new Map();
            const queue = [];
            const queued = new Set();
            const DSW_DIR = '.dsw';
            const BLOB_DIR = 'blobs';
            let blobDir = null;
            let flushing = null;
            let timer = null;
            // 目录句柄缓存：相对目录路径 -> FileSystemDirectoryHandle。
            // 镜像 200 个文件时以前要 200×深度 次 getDirectoryHandle，现在只跟目录数有关。
            const dirCache = new Map();
            // 真实文件镜像队列：相对路径 -> 内容（undefined 表示删除）
            const mirrorQ = new Map();
            let mirrorTimer = null;
            let mirrorFail = 0;
            let mirrorLastError = '';
            let putCount = 0, delCount = 0, failCount = 0, lastError = '';
            let deferredCount = 0;          // 因为权限到期被「放回队列」没写的次数
            let flushDeferred = false, mirrorDeferred = false;

            /* 逐段拿目录句柄（带缓存）。只建目录、不存在报错 —— getDirectoryHandle(create:true)
             * 幂等，重复调用不会重复落盘，但每次都是一次 IPC 往返，所以缓存很值钱。 */
            async function dirFor(segs) {
                let d = handle, cur = '';
                for (let k = 0; k < segs.length; k++) {
                    cur = cur ? cur + '/' + segs[k] : segs[k];
                    let c = dirCache.get(cur);
                    if (!c) { c = await d.getDirectoryHandle(segs[k], { create: true }); dirCache.set(cur, c); }
                    d = c;
                }
                return d;
            }

            // 目录被删了就连带丢掉它下面的缓存句柄（否则会拿着已删除目录的句柄一直失败）
            function dropDirCache(prefix) {
                for (const k of Array.from(dirCache.keys())) {
                    if (k === prefix || k.indexOf(prefix + '/') === 0) dirCache.delete(k);
                }
            }/* 权限掉了和「写坏了」必须分开对待：
         * 写坏了重试也没用，记一笔继续；权限掉了是**暂时**写不进去，
         * 任务必须放回队里等授权回来再写 —— 直接丢掉的话，内存里还在，
         * 但重新打开页面是从磁盘读的，那份内容就真的没了。
         * （判定函数提到模块层的 isPermErrorShared，供并发池与 impl 共用同一口径。） */

            function scheduleFlush(delay) {
                if (timer) return;
                timer = setTimeout(function () { timer = null; flush(); }, delay == null ? 30 : delay);
            }

            /* 把活文件按**原来的路径**写到用户文件夹里（去掉开头的 /），
             * 用户才能用文件管理器直接看到 src/a.js 这种文件，而不是一堆 hash 名字。 */
            async function mirrorFlush() {
                const jobs = Array.from(mirrorQ.entries());
                mirrorQ.clear();
                mirrorDeferred = false;
                if (!jobs.length) return;
                const res = await poolRun(jobs, async function (job) {
                    const rel = job[0], content = job[1];
                    const segs = String(rel).split('/').filter(Boolean);
                    if (!segs.length) return;
                    const d = await dirFor(segs.slice(0, -1));
                    const leaf = segs[segs.length - 1];
                    if (content === undefined) {
                        // recursive：删除 __sys 这种目录时要连里面的文件一起删
                        const parentPath = segs.slice(0, -1).join('/');
                        if (segs.length > 1) dropDirCache(parentPath + '/' + leaf); else dirCache.delete(leaf);
                        await d.removeEntry(leaf, { recursive: true }).catch(function () {});
                    } else {
                        const fh = await d.getFileHandle(leaf, { create: true });
                        const w = await fh.createWritable();
                        await w.write(content);
                        await w.close();
                    }
                }, function (job, i, e) {
                    mirrorFail++;
                    mirrorLastError = '镜像到文件夹失败（' + job[0] + '）：' + (e && e.message ? e.message : e);
                    warn('FsMedia(fsa) 镜像失败：', job[0], e && e.message);
                });
                // 真正没写成功的（权限失败的 + 还没轮到就停下的）原样放回队头，顺序不变
                const back = [];
                for (let i = 0; i < jobs.length; i++) if (res.states[i] !== 2) back.push(jobs[i]);
                if (back.length) {
                    for (let i = back.length - 1; i >= 0; i--) mirrorQ.set(back[i][0], back[i][1]);
                }
                if (res.stopped) {
                    mirrorDeferred = true;
                    deferredCount++;
                    mirrorLastError = '镜像到文件夹被浏览器拦下（权限到期？），' + back.length + ' 项已放回队列';
                    warn('FsMedia(fsa) 镜像被权限拦下，已放回队列：' + back.length + ' 项');
                }
            }

            function scheduleMirror() {
                if (mirrorTimer) return;
                mirrorTimer = setTimeout(function () {
                    mirrorTimer = null;
                    mirrorFlush();
                }, 60);
            }

            /* 把用户文件夹里的真实文件列出来（跳过 .dsw —— 那是容器的内部记录）。
             * 读取并发跑：目录枚举本身是串行的（for await），但 getFile().text() 是纯 IO，
             * 串着等就是白等 —— 手机上几百个文件能差出十几倍。 */
            async function realList() {
                const out = [];
                async function walk(dir, prefix) {
                    if (!dir || !dir.values) return;
                    const files = [];
                    for await (const e of dir.values()) {
                        if (!e || !e.name) continue;
                        const p = prefix + e.name;
                        if (e.kind === 'directory') {
                            if (p === DSW_DIR) continue;
                            await walk(e, p + '/');          // 子目录必须先建句柄（枚举本身仍是串行的）
                            continue;
                        }
                        files.push({ path: p, entry: e });
                    }
                    if (!files.length) return;
                    await poolRun(files, async function (f) {
                        out.push({ path: f.path, content: await (await f.entry.getFile()).text() });
                    }, function () { /* 单个文件读不到就跳过，与旧行为一致 */ });
                }
                await walk(handle, '');
                return out;
            }

            async function flush() {
                if (flushing) return flushing;
                flushing = (async function () {
                    flushDeferred = false;
                    while (queue.length) {
                        // 一批一批地取：并发跑，但失败时能准确知道**哪几条真的没写完**
                        const batch = queue.splice(0, FSA_BATCH);
                        for (const j of batch) queued.delete(j.hash);
                        const res = await poolRun(batch, async function (job) {
                            if (job.content === undefined) {
                                await blobDir.removeEntry(job.hash).catch(function () {});
                                delCount++;
                            } else {
                                const fh = await blobDir.getFileHandle(job.hash, { create: true });
                                const w = await fh.createWritable();
                                await w.write(job.content);
                                await w.close();
                                putCount++;
                            }
                        }, function (job, i, e) {
                            failCount++;
                            lastError = '内容写入文件夹失败（' + String(job.hash).slice(0, 6) + '）：' + (e && e.message ? e.message : e);
                            warn('FsMedia(fsa) 写入失败：', e && e.message);
                        });
                        // 没写完的（权限失败的 + 还没轮到就停下的）放回队头，顺序不变、绝不丢
                        const back = [];
                        for (let i = 0; i < batch.length; i++) if (res.states[i] !== 2) back.push(batch[i]);
                        if (back.length) {
                            for (let i = back.length - 1; i >= 0; i--) { queue.unshift(back[i]); queued.add(back[i].hash); }
                        }
                        if (res.stopped) {
                            // 权限刚好在落盘途中到期 → 等授权回来再写（flushDeferred 会阻止立刻死循环重试）
                            flushDeferred = true;
                            deferredCount++;
                            lastError = '内容写入文件夹被浏览器拦下（权限到期？），' + back.length + ' 项已放回队列';
                            warn('FsMedia(fsa) 写入被权限拦下，已放回队列：' + back.length + ' 项');
                            break;
                        }
                    }
                })();
                try { await flushing; } finally { flushing = null; }
                // 被权限拦住时**不能**再 scheduleFlush(0)：那会变成「失败→立刻重试→再失败」的死循环
                if (queue.length && !flushDeferred) scheduleFlush(0);
                return true;
            }

            return {
                name: 'fsa',
                async ready() {
                    if (!handle) throw new Error('还没有绑定文件夹');
                    const perm = await handle.queryPermission({ mode: 'readwrite' });
                    if (perm !== 'granted') throw new Error('NEED_PERMISSION');
                    const dswDir = await handle.getDirectoryHandle(DSW_DIR, { create: true });
                    blobDir = await dswDir.getDirectoryHandle(BLOB_DIR, { create: true });
                    dirCache.clear();
                    // 全量读进内存：读路径必须同步（与 OPFS 实现同一条契约）。
                    // 但**并发读** —— 以前一个一个 await，手机上几百个 blob 就是几百次串行等待。
                    if (blobDir.values) {
                        const entries = [];
                        for await (const entry of blobDir.values()) {
                            if (entry && entry.kind === 'file') entries.push(entry);
                        }
                        await poolRun(entries, async function (entry) {
                            mem.set(entry.name, await (await entry.getFile()).text());
                        }, function (entry, i, e) {
                            warn('FsMedia(fsa) 读取失败：', entry.name, e && e.message);
                        });
                    }
                    return true;
                },
                has(hash) { return mem.has(hash); },
                get(hash) { return mem.get(hash); },
                put(hash, content) {
                    mem.set(hash, content);
                    if (!queued.has(hash)) { queued.add(hash); queue.push({ hash: hash, content: content }); }
                    scheduleFlush();
                    return true;
                },
                del(hash) {
                    mem.delete(hash);
                    if (!queued.has(hash)) { queued.add(hash); queue.push({ hash: hash, content: undefined }); }
                    scheduleFlush();
                    return true;
                },
                keys() { return Array.from(mem.keys()); },
                flush: function () {
                    return Promise.all([flush(), mirrorFlush()]).then(function () { return true; });
                },
                pending: function () { return queue.length + mirrorQ.size; },
                // 真实文件镜像（1:1 路径）—— 「能在文件管理器里直接看到文件」就靠它
                realWrite(rel, content) { mirrorQ.set(String(rel), String(content)); scheduleMirror(); return true; },
                realDel(rel) { mirrorQ.set(String(rel), undefined); scheduleMirror(); return true; },
                realList: realList,
                mirrorStats: function () { return { fails: mirrorFail, pending: mirrorQ.size, deferred: deferredCount, error: mirrorLastError }; },
                stats: function () { return { puts: putCount, dels: delCount, fails: failCount, pending: queue.length, deferred: deferredCount, error: lastError }; }
            };
        }

        /* 退回 GM 时**必须把 known 清掉重扫**：known 是「我见过哪些 blob」的缓存，
         * 换介质后它还留着上一个介质的 hash，has() 就会撒谎说「内容在」——
         * 于是「内容缺失」检测失灵，用户看到的是一个个**空文件**（比报错还阴）。
         * 清掉之后 seed() 会按新介质的真实键重新填。 */
        function pickGm() { impl = gmImpl(); implName = 'gm'; known.clear(); seeded = false; return impl; }
        // ready() 之前被调用也要能工作（惰性兜底到 GM）—— 否则任何早于 init 的内容读写
        // 都会炸在「impl 还是 null」上，而且这种炸法很隐蔽（测试里第一批写就没了）
        function ensureImpl() { if (!impl) pickGm(); return impl; }

        /* 介质「用不了」时必须禁止写入，**不能悄悄降级**：
         * 绑定文件夹时内容已经从 GM 搬走了；权限到期再降回 GM，树还在、内容没了 ——
         * 用户看到满屏「内容缺失」；更糟的是此时写入会把新内容写进 GM，形成
         * 「一半在文件夹、一半在 GM」的分裂状态，授权回来后那部分就永久读不到。
         * 所以：想用的介质打不开 → 拦住写入、只读展示，并**自动**在你下一次碰屏幕时续授权。 */
        let blocked = null;      // { where, reason } 或 null

        // 句柄在内存里留一份：手势回调里要**立刻**用，不能再等一次 IndexedDB 往返 ——
        // 用户激活是个几秒的窗口，能省一次异步就省一次。
        let cachedHandle = null;

        function listKeys() { seed(); return Array.from(known); }

        /* 换介质：**必须先把现有内容搬过去**，否则换过去之后每个文件都会「内容缺失」。
         * 搬完逐个核对真的在了，确认无误才清掉旧介质 —— 顺序反了就是在赌。 */
        async function switchTo(next, label, opts) {
            const old = impl;
            const hashes = listKeys();
            let moved = 0;
            for (const h of hashes) {
                const c = old.get(h);
                if (typeof c !== 'string') continue;
                if (next.has(h)) continue;
                if (!next.put(h, c)) throw new Error('内容搬到' + label + '失败：' + String(h).slice(0, 8));
                moved++;
            }
            if (next.flush) await next.flush();
            for (const h of hashes) {
                const c = old.get(h);
                if (typeof c !== 'string') continue;
                if (!next.has(h)) throw new Error('内容搬到' + label + '后核对失败（缺 ' + String(h).slice(0, 8) + '）');
            }
            // 核实无误，才回收旧介质。解绑文件夹时特意不清（用户文件夹里的东西留给他自己处理）
            if (!(opts && opts.keepOld)) {
                for (const h of hashes) { try { old.del(h); } catch (e) {} }
                if (old.flush) { try { await old.flush(); } catch (e) {} }
            }
            impl = next;
            implName = next.name;
            known.clear();
            seeded = false;
            return moved;
        }

        /* ============ P3b-3（2.9.0）：自动无感续授权 ============
         * 浏览器的硬规则是「requestPermission 必须由用户手势触发」。但「必须有手势」不等于
         * 「必须专门去设置里点那一趟」—— 手势遍地都是，用户点输入框、发消息、敲键盘都算。
         * 所以这条路拆成三步，把「手动授权」这件事整个抹掉：
         *   1) 页面加载时先 queryPermission（**不需要手势**）。权限还在就直接接上，用户毫无感觉。
         *      权限只丢在「关掉本站所有标签页」之后，刷新页面是不丢的 —— 绝大多数时候走的就是这条。
         *   2) 真的掉了 → 挂一个**一次性**手势监听：用户随便点哪儿，我们就在那次事件里补一次授权。
         *      浏览器还记得 → 压根不弹窗；真忘了 → 顶多弹一次系统框，而且是在你本来就要点的地方。
         *   3) 页面重新可见 / 窗口重新聚焦时再 query 一次（切出去再回来常常就已经恢复了）。
         * 用户明确点过「不允许」就**本页不再重试**（不骚扰），重新打开页面才恢复尝试。 */
        const AutoGrant = {
            enabled: true,
            state: 'idle',          // idle | granted | stale | asking | denied | unbound | off
            armed: false,
            tries: 0,
            maxTries: 3,
            lastWhy: '',
            lastAt: 0,
            lastError: '',
            deniedThisLoad: false,
            listeners: []
        };
        let onAutoResumeList = [];  // 外层注册的回调：接上之后重新对齐（推队列 → 读回 → 补镜像）

        function autoDisarm() {
            if (!AutoGrant.armed && !AutoGrant.listeners.length) return;
            for (const l of AutoGrant.listeners) {
                try { l.target.removeEventListener(l.type, l.fn, l.opts); } catch (e) {}
            }
            AutoGrant.listeners = [];
            AutoGrant.armed = false;
        }

        function autoDoc() {
            try { return (typeof document !== 'undefined' && document && document.addEventListener) ? document : null; }
            catch (e) { return null; }
        }

        /* 挂「一次性」监听：手指碰哪儿都行。多挂几种是因为不同浏览器认的「用户激活事件」不完全一样。 */
        function autoArm() {
            if (AutoGrant.armed) return false;
            if (!AutoGrant.enabled) { AutoGrant.state = 'off'; return false; }
            if (AutoGrant.deniedThisLoad) return false;
            if (AutoGrant.tries >= AutoGrant.maxTries) return false;
            if (!cachedHandle) return false;          // 没绑定过文件夹就没什么可授权的
            const d = autoDoc();
            if (!d) return false;

            const onGesture = function () { autoDisarm(); autoRequest('手势').catch(function () {}); };
            const onVisible = function () {
                if (AutoGrant.state === 'granted' || AutoGrant.state === 'asking') return;
                autoProbe('回到前台').catch(function () {});
            };
            const add = function (target, type, fn) {
                if (!target || !target.addEventListener) return;
                let opts = { capture: true, passive: true };
                try { target.addEventListener(type, fn, opts); }
                catch (e) {
                    opts = true;
                    try { target.addEventListener(type, fn, opts); } catch (e2) { return; }
                }
                AutoGrant.listeners.push({ target: target, type: type, fn: fn, opts: opts });
            };

            add(d, 'pointerdown', onGesture);
            add(d, 'mousedown', onGesture);
            add(d, 'touchend', onGesture);
            add(d, 'keydown', onGesture);
            add(d, 'click', onGesture);
            add(d, 'visibilitychange', onVisible);
            try { add(window, 'focus', onVisible); } catch (e) {}

            AutoGrant.armed = true;
            return true;
        }

        async function autoProbe(why) {
            if (!AutoGrant.enabled) { AutoGrant.state = 'off'; return 'off'; }
            if (AutoGrant.state === 'asking') return 'asking';
            let h = cachedHandle;
            if (!h) { try { h = await fsaHandle('get'); } catch (e) { h = null; } }
            if (!h) { cachedHandle = null; autoDisarm(); AutoGrant.state = 'unbound'; return 'unbound'; }
            cachedHandle = h;
            let p = 'prompt';
            try { p = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { p = 'prompt'; }
            AutoGrant.lastWhy = why;
            AutoGrant.lastAt = Date.now();
            if (p === 'granted') return await autoResume(why);
            if (p === 'denied') {
                AutoGrant.deniedThisLoad = true;
                autoDisarm();
                AutoGrant.state = 'denied';
                return 'denied';
            }
            AutoGrant.state = 'stale';
            autoArm();
            return 'stale';
        }

        /* 必须在用户手势的调用栈/激活窗口里调用（query 不需要，request 需要）。 */
        async function autoRequest(why) {
            if (!AutoGrant.enabled) { AutoGrant.state = 'off'; return 'off'; }
            if (AutoGrant.state === 'asking') return 'asking';
            if (AutoGrant.tries >= AutoGrant.maxTries) return 'stale';
            let h = cachedHandle;
            if (!h) { try { h = await fsaHandle('get'); } catch (e) { h = null; } }
            if (!h) { AutoGrant.state = 'unbound'; return 'unbound'; }
            cachedHandle = h;

            AutoGrant.tries++;
            AutoGrant.lastWhy = why;
            AutoGrant.lastAt = Date.now();
            AutoGrant.state = 'asking';
            let p = '';
            try {
                p = await h.requestPermission({ mode: 'readwrite' });
            } catch (e) {
                // 没在激活窗口里 / 浏览器不给弹 → 再给几次机会（用户总会再点一下的）
                AutoGrant.lastError = '自动授权没能弹出来（' + (e && e.message ? e.message : e) + '）';
                warn('FsMedia: 自动授权失败：', e && e.message);
                AutoGrant.state = 'stale';
                autoArm();
                return 'error';
            }
            AutoGrant.lastError = '';
            if (p === 'granted') return await autoResume(why);
            if (p === 'denied') {
                AutoGrant.deniedThisLoad = true;
                autoDisarm();
                AutoGrant.state = 'denied';
                return 'denied';
            }
            AutoGrant.state = 'stale';
            autoArm();
            return 'prompt';
        }

        async function autoResume(why) {
            try {
                AutoGrant.state = 'asking';
                readyPromise = null;
                CONFIG.FS_MEDIA = 'fsa';
                const name = await ready();
                if (name !== 'fsa') {
                    AutoGrant.lastError = lastError || '接上后仍然打不开文件夹';
                    AutoGrant.state = 'stale';
                    autoArm();
                    return 'error';
                }
                AutoGrant.lastError = '';
                AutoGrant.deniedThisLoad = false;
                AutoGrant.tries = 0;
                AutoGrant.state = 'granted';
                autoDisarm();
                for (const fn of onAutoResumeList) { try { fn(why); } catch (e) { warn('自动接上后的对齐回调失败：', e && e.message); } }
                return 'granted';
            } catch (e) {
                AutoGrant.lastError = e && e.message ? e.message : String(e);
                AutoGrant.state = 'stale';
                autoArm();
                return 'error';
            }
        }

        function ready() {
            if (readyPromise) return readyPromise;
            readyPromise = (async function () {
                pickGm();
                blocked = null;
                let want = CONFIG.FS_MEDIA || 'gm';
                // 兜底（2.9.0 修的真 bug）：init 里读 uiCfg 的时机如果不巧晚于这里，
                // CONFIG 还是默认的 'gm'，于是「明明绑过文件夹却在用 GM」—— 内容全在文件夹里，
                // 表现为满屏「内容缺失」，更糟的是此时写入会落到 GM 形成分裂。
                // 所以这里不信配置，直接看句柄在不在：句柄在 = 用户确实绑过文件夹。
                if (want === 'gm') {
                    try {
                        const h0 = await fsaHandle('get');
                        if (h0) { cachedHandle = h0; want = 'fsa'; CONFIG.FS_MEDIA = 'fsa'; }
                    } catch (e) {}
                }
                if (want === 'opfs') {
                    try {
                        const o = opfsImpl();
                        await o.ready();
                        impl = o; implName = 'opfs';
                    } catch (e) {
                        warn('FsMedia: OPFS 不可用：', e && e.message);
                        lastError = 'OPFS 不可用，已退回 GM：' + (e && e.message ? e.message : e);
                        // 这里**不 block**：OPFS 打不开通常是「这个环境从来就没有过」，而且它是
                        // origin 沙箱、用户没法自助修，block 只会让容器白白变成只读。
                        // 真实文件夹不一样 —— 句柄在就说明内容多半在里面，而且点一下就能修好。
                        pickGm();
                    }
                } else if (want === 'fsa') {
                    try {
                        const h = await fsaHandle('get');
                        if (!h) {
                            // 从来没绑定过 → 这不是故障，GM 就是对的介质
                            CONFIG.FS_MEDIA = 'gm';
                            cachedHandle = null;
                            lastError = '';
                        } else {
                            cachedHandle = h;
                            const f = fsaImpl(h);
                            await f.ready();
                            impl = f; implName = 'fsa';
                            lastError = '';
                            AutoGrant.state = 'granted';
                            AutoGrant.deniedThisLoad = false;
                            AutoGrant.tries = 0;
                            autoDisarm();
                        }
                    } catch (e) {
                        const needPerm = (e && e.message) === 'NEED_PERMISSION';
                        lastError = needPerm
                            ? '文件夹权限已到期（浏览器只在「关闭本站所有标签页」之前记着它）'
                            : ('文件夹打不开：' + (e && e.message ? e.message : e));
                        warn('FsMedia: ' + lastError);
                        // 句柄在、但用不了 → 内容在文件夹里，绝不能让写入落到 GM（会分裂）
                        blocked = { where: '你的文件夹', reason: lastError };
                        pickGm();
                        // P3b-3：不是「等用户去设置里点」，而是**自动重试** ——
                        // 下一次手指碰屏幕就在那个手势里补授权。浏览器还记得就不会弹窗。
                        AutoGrant.state = 'stale';
                        autoArm();
                    }
                }
                return implName;
            })();
            return readyPromise;
        }

        /* ---- 对外的三个动作：绑定 / 授权 / 解绑 ----
         * 绑定和「立即授权」必须在用户点击的调用栈里；正常情况下连这两个都不用点，
         * AutoGrant 会在加载时、或你下一次碰屏幕时自动把权限续上。 */

        async function bindDirectory() {
            if (typeof showDirectoryPicker !== 'function') throw new Error('这台浏览器不支持选择文件夹');
            const handle = await showDirectoryPicker({ mode: 'readwrite' });   // 必须在点击的调用栈里
            await fsaHandle('put', handle);
            cachedHandle = handle;
            const f = fsaImpl(handle);
            await f.ready();
            const moved = await switchTo(f, '文件夹');
            // 换/重绑可能选到一个旧版用过的文件夹：顺手清掉里面的系统区副本
            try { purgeSystemMirror(true); } catch (e) {}
            CONFIG.FS_MEDIA = 'fsa';
            readyPromise = Promise.resolve('fsa');
            blocked = null;
            AutoGrant.state = 'granted';
            AutoGrant.deniedThisLoad = false;
            AutoGrant.tries = 0;
            AutoGrant.lastError = '';
            autoDisarm();
            return { name: handle.name, moved: moved };
        }

        async function grantDirectory() {
            const wasBlocked = !!blocked;
            let h = cachedHandle;
            if (!h) { h = await fsaHandle('get'); }
            if (!h) throw new Error('还没有绑定文件夹');
            cachedHandle = h;
            // 已经授权了就别再多弹一次框（query 不需要手势，问一下几乎不要钱）
            let p = '';
            try { p = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { p = 'prompt'; }
            if (p !== 'granted') p = await h.requestPermission({ mode: 'readwrite' });   // 必须在点击的调用栈里
            if (p !== 'granted') {
                AutoGrant.state = p === 'denied' ? 'denied' : 'stale';
                if (p === 'denied') AutoGrant.deniedThisLoad = true;
                throw new Error('授权没有通过（' + p + '）');
            }
            readyPromise = null;
            CONFIG.FS_MEDIA = 'fsa';
            const name = await ready();
            if (name !== 'fsa') throw new Error(lastError || '授权后仍然打不开文件夹');
            AutoGrant.state = 'granted';
            AutoGrant.deniedThisLoad = false;
            AutoGrant.lastError = '';
            autoDisarm();
            // 手动授权和自动接上走**同一套**对齐流程（推队列 → 读回 → 补镜像），
            // 否则手动这条路会把权限掉之前攒下的落盘任务漏掉。
            if (wasBlocked && onAutoResumeList.length) {
                for (const fn of onAutoResumeList) { try { fn('手动授权'); } catch (e) { warn('手动授权后的对齐回调失败：', e && e.message); } }
            }
            return { name: h.name };
        }

        async function unbindDirectory() {
            // keepOld：解绑时**不删**用户文件夹里的内容（那是他的文件夹，清理权归他）
            // blocked 时内容读不出来也就搬不走 —— 必须先授权把内容读回来，再解绑。
            if (blocked) throw new Error('先把文件夹授权打开（把内容读回来）再解绑，否则搬不回内容');
            const moved = await switchTo(gmImpl(), 'GM', { keepOld: true });
            CONFIG.FS_MEDIA = 'gm';
            readyPromise = Promise.resolve('gm');
            blocked = null;
            cachedHandle = null;
            AutoGrant.state = 'unbound';
            AutoGrant.tries = 0;
            autoDisarm();
            try { await fsaHandle('del'); } catch (e) {}
            return { moved: moved };
        }

        function handleName() { return fsaHandle('get').then(function (h) { return h ? h.name : ''; }).catch(function () { return ''; }); }

        /* ---- 切介质（2.13.3）：给首次运行的「个性化设置」用。
         * gm / opfs 之间可以自由换（内容自动搬过去）；换 fsa 必须走 bindDirectory，
         * 因为 showDirectoryPicker 只能在用户点击的调用栈里调。
         * 语义与 unbindDirectory 完全一致：搬完核实，再回收旧介质。 */
        async function useMedium(kind) {
            const want = (kind === 'opfs') ? 'opfs' : 'gm';
            if (implName === want) return { media: want, moved: 0, same: true };
            if (blocked) throw new Error('文件夹暂时没接上（' + blocked.reason + '），先把授权打开再换介质');
            let next;
            if (want === 'opfs') {
                next = opfsImpl();
                try { await next.ready(); } catch (e) {
                    throw new Error('浏览器沙盒（OPFS）不可用：' + ((e && e.message) || e));
                }
            } else {
                next = gmImpl();
            }
            const moved = await switchTo(next, want === 'opfs' ? '浏览器沙盒' : '油猴存储');
            CONFIG.FS_MEDIA = want;
            readyPromise = Promise.resolve(want);
            lastError = '';
            return { media: want, moved: moved };
        }

        function seed() {
            if (seeded) return;
            seeded = true;
            ensureImpl();
            try { for (const h of impl.keys()) known.add(h); } catch (e) {}
        }

        return {
            ready: ready,
            name: function () { return ensureImpl().name; },
            status: function () {
                ensureImpl();
                const st = {
                    media: implName, blobs: known.size, puts: putCount, dels: delCount,
                    fails: failCount, pending: impl.pending ? impl.pending() : 0, error: lastError
                };
                if (impl.stats) {
                    const s = impl.stats();
                    st.puts = s.puts; st.dels = s.dels; st.fails = s.fails;
                    st.pending = s.pending;
                    st.deferred = s.deferred || 0;
                    if (s.error) st.error = s.error;
                }
                return st;
            },
            has(hash) {
                seed();
                if (known.has(hash)) return true;
                if (impl.has(hash)) { known.add(hash); return true; }
                return false;
            },
            get(hash) { ensureImpl(); return impl.get(hash); },
            put(hash, content) {
                seed();
                const r = impl.put(hash, content);
                if (r) known.add(hash);
                return r;
            },
            del(hash) { seed(); known.delete(hash); return impl.del(hash); },
            keys() { seed(); return Array.from(known); },
            flush: function () { ensureImpl(); return impl.flush ? impl.flush() : Promise.resolve(true); },
            // P3b-2：真实文件夹（FSA）。三个动作都必须由用户点击调用 —— 浏览器硬性要求
            bindDirectory: bindDirectory,
            // 测试/直测用：等价 bindDirectory 但**不弹选择框、不写 IDB**，直接给定句柄。
            // 用来量「ready 全量读 + 换介质」到底花多久（2.13.2 的提速就是按这条路径量的）。
            adoptDirectory: async function (h) {
                const f = fsaImpl(h);
                await f.ready();
                const moved = await switchTo(f, '文件夹');
                CONFIG.FS_MEDIA = 'fsa';
                readyPromise = Promise.resolve('fsa');
                blocked = null;
                return { name: h && h.name, moved: moved };
            },
            grantDirectory: grantDirectory,
            unbindDirectory: unbindDirectory,
            // 2.13.3：首次运行面板直接在 gm / opfs 之间切换（fsa 走 bindDirectory）
            useMedium: useMedium,
            handleName: handleName,
            supported: function () { try { return typeof showDirectoryPicker === 'function'; } catch (e) { return false; } },
            // 介质用不了时非空：写入必须被拦住（否则内容会分裂到两个介质里）
            blocked: function () { return blocked; },
            /* ---- 真实文件镜像（只有 fsa 介质有）----
             * 目的：让用户在文件管理器里直接看到 /src/a.js 这样的文件，而不是一堆 hash 名字。
             * 单向之外还支持「读回来」：启动时把文件夹里被改过/新增的文件采纳进容器。 */
            canMirror: function () { return implName === 'fsa' && !blocked && !!(impl && impl.realWrite); },
            realWrite: function (rel, content) { ensureImpl(); return impl.realWrite ? impl.realWrite(rel, content) : false; },
            realDel: function (rel) { ensureImpl(); return impl.realDel ? impl.realDel(rel) : false; },
            realList: function () {
                ensureImpl();
                if (impl.realList && implName === 'fsa') return impl.realList();
                return Promise.resolve(null);
            },
            mirrorStats: function () { ensureImpl(); return impl.mirrorStats ? impl.mirrorStats() : null; },
            /* ---- P3b-3：自动无感续授权 ---- */
            autoState: function () {
                return {
                    enabled: AutoGrant.enabled, state: AutoGrant.state, armed: AutoGrant.armed,
                    tries: AutoGrant.tries, maxTries: AutoGrant.maxTries,
                    why: AutoGrant.lastWhy, at: AutoGrant.lastAt,
                    error: AutoGrant.lastError || '', denied: AutoGrant.deniedThisLoad,
                    listeners: AutoGrant.listeners.length
                };
            },
            setAutoGrant: function (on) {
                AutoGrant.enabled = on !== false;
                if (!AutoGrant.enabled) { autoDisarm(); AutoGrant.state = 'off'; }
                return AutoGrant.enabled;
            },
            // 测试/兜底：不需要手势的那条路（query → 还在就接上；掉了就挂手势监听）
            autoProbe: function (why) { return autoProbe(why || '手动探测'); },
            // 允许外层「接上之后」重新对齐（推队列 → 读回 → 补镜像）。可以挂多个（测试会再挂一个观察者）
            onAutoResume: function (fn) { if (typeof fn === 'function') onAutoResumeList.push(fn); return onAutoResumeList.length; },
            autoDisarm: function () { autoDisarm(); return true; },
            _reset: function () { known.clear(); seeded = false; },
            _invalidateReady: function () { readyPromise = null; },     // 测试用：让 ready() 重跑一遍
            _useForTest: function (custom) { impl = custom; implName = custom.name || 'test'; seeded = false; known.clear(); }
        };
    })();

    const DSW = {
        version: VERSION,
        proto: PROTO_VERSION,
        config: CONFIG,
        Store: Store,
        SessionState: SessionState,
        // 测试钩子（在 90-main.js 里统一暴露）
        state: {}
    };
    try { globalThis.__DSW_VFS__ = DSW; } catch (e) {}
    try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow) unsafeWindow.__DSW_VFS__ = DSW; } catch (e) {}


/* >>> 02-util.js */
    /* =========================================================================
     * 02 通用工具
     * ====================================================================== */

    function simpleHash(str) {
        str = String(str == null ? '' : str);
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(36);
    }

    // 内容摘要（**不是**加密摘要，但必须满足「同内容同摘要、不同内容几乎不可能同摘要」）。
    // 两路独立的 32 位混合 → 64 位（14 位 base36）。blob 键与回执里的 hash= 共用它。
    // 旧实现只有 32 位（生日界 ≈7.7 万样本就有一半概率撞车），实测回执出现过两个大小不同的
    // 文件 hash 相同（假阳性），所以这里加宽；simpleHash 保持原样（只做会话内短键，不需要抗碰撞）。
    function contentHash(content) {
        const s = String(content == null ? '' : content);
        const p36 = function (x) { return ('0000000' + (x >>> 0).toString(36)).slice(-7); };
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0; i < s.length; i++) {
            const ch = s.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 16777619) >>> 0;
            h2 = Math.imul(h2 ^ ch, 2246822519) >>> 0;
            h2 = (h2 ^ (h2 >>> 15)) >>> 0;
        }
        // 长度单独混一次：''、'\n'、' ' 这类「内容差别极小」的输入不会退化成同一摘要
        const len = s.length;
        h1 = (h1 ^ Math.imul(len + 1, 2654435761)) >>> 0;
        h2 = (h2 ^ Math.imul(len + 31, 668265263)) >>> 0;
        h1 = (h1 ^ (h1 >>> 16)) >>> 0;
        h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        return p36(h1) + p36(h2);
    }

    function fmtSize(n) {
        if (n == null) return '';
        if (n < 1024) return n + 'B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'K';
        return (n / 1024 / 1024).toFixed(2) + 'M';
    }

    // UTF-8 字节数（D6）：`s.length` 是 UTF-16 码元数，中文/emoji 会少报。
    // 回执里的 `size=`、`bytes=`、条目大小一律走这里 —— 纯 ASCII 走快速路径，零开销。
    function byteLen(s) {
        const str = String(s == null ? '' : s);
        // eslint-disable-next-line no-control-regex
        if (!/[^\x00-\x7f]/.test(str)) return str.length;
        try { return utf8(str).length; } catch (e) { return str.length; }
    }

    function fmtClock(ts) {
        try { return new Date(ts).toLocaleTimeString(); } catch (e) { return ''; }
    }

    /* base64 传输通道（反馈「许愿 1」）：正文以 base64 传入（`write /f base64`）时，
     * 一切「正文经过聊天渲染层」的问题都消失 —— 不会撞 heredoc 的 `<<<` 提前闭合、
     * 不会被 markdown 围栏/引用块吃掉、也不怕正文里有整行 `>>>`。丑，但对含特殊字符的
     * 内容（JS/CSS）是唯一可靠的路径。解码失败必须明说，绝不静默写成乱码。 */
    function decodeBase64(input) {
        let s = String(input == null ? '' : input).replace(/\s+/g, '');
        if (!s) return { ok: true, text: '' };
        s = s.replace(/-/g, '+').replace(/_/g, '/');          // 容忍 URL-safe 变体
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
            return { ok: false, error: '含非法字符（base64 只允许 A-Za-z0-9+/= 与空白）' };
        }
        if (s.length % 4 === 1) return { ok: false, error: '长度不合法（base64 长度不能 ≡1 mod 4）' };
        while (s.length % 4) s += '=';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const val = function (c) { return c === '=' ? 0 : chars.indexOf(c); };
        const bytes = [];
        for (let i = 0; i < s.length; i += 4) {
            const n = (val(s[i]) << 18) | (val(s[i + 1]) << 12) | (val(s[i + 2]) << 6) | val(s[i + 3]);
            bytes.push((n >> 16) & 255);
            if (s[i + 2] !== '=') bytes.push((n >> 8) & 255);
            if (s[i + 3] !== '=') bytes.push(n & 255);
        }
        return decodeUtf8Bytes(bytes);
    }

    // UTF-8 字节 → 字符串（浏览器无 Buffer，自备解码器；非法字节序列明确报错）
    function decodeUtf8Bytes(bytes) {
        let out = '';
        for (let i = 0; i < bytes.length;) {
            const b = bytes[i];
            let cp, n;
            if (b < 0x80) { cp = b; n = 1; }
            else if ((b & 0xE0) === 0xC0) { cp = b & 0x1F; n = 2; }
            else if ((b & 0xF0) === 0xE0) { cp = b & 0x0F; n = 3; }
            else if ((b & 0xF8) === 0xF0) { cp = b & 0x07; n = 4; }
            else return { ok: false, error: '解码后不是合法 UTF-8（第 ' + (i + 1) + ' 字节 0x' + b.toString(16) + '）' };
            if (i + n > bytes.length) return { ok: false, error: '解码后 UTF-8 在结尾被截断' };
            for (let k = 1; k < n; k++) {
                const c = bytes[i + k];
                if ((c & 0xC0) !== 0x80) return { ok: false, error: '解码后不是合法 UTF-8（续字节错误）' };
                cp = (cp << 6) | (c & 0x3F);
            }
            if (cp > 0x10FFFF) return { ok: false, error: '解码后码点越界' };
            out += String.fromCodePoint(cp);
            i += n;
        }
        return { ok: true, text: out };
    }

    // 时长字面量（find since=/recent= 用）：`10m` / `2h` / `30s` / `1d` / 纯数字 = 分钟
    function parseDurationMs(v) {
        const s = String(v == null ? '' : v).trim().toLowerCase();
        const m = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|秒|m|min|mins|分|分钟|h|hr|hrs|小时|d|day|天)?$/.exec(s);
        if (!m) return null;
        const n = parseFloat(m[1]);
        if (!isFinite(n)) return null;
        const u = m[2] || 'm';
        let mult = 60000;
        if (/^s/.test(u) || u === '秒') mult = 1000;
        else if (/^h/.test(u) || u === '小时') mult = 3600000;
        else if (/^d/.test(u) || u === '天') mult = 86400000;
        return n * mult;
    }

    // 相对时间（find 回执用）：让「最近改过」一眼可读，不必自己减时间戳
    function fmtAge(ts, now) {
        const d = Math.max(0, (now == null ? Date.now() : now) - (ts || 0));
        if (d < 60000) return Math.round(d / 1000) + 's前';
        if (d < 3600000) return Math.round(d / 60000) + 'm前';
        if (d < 86400000) return (d / 3600000).toFixed(1) + 'h前';
        return Math.round(d / 86400000) + 'd前';
    }

    function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

    function unique(arr) {
        const seen = new Set();
        const out = [];
        for (const v of arr) { if (!seen.has(v)) { seen.add(v); out.push(v); } }
        return out;
    }

    // 全角 → 半角（协议标记、标点、数字、字母）
    function toHalfWidth(s) {
        return String(s == null ? '' : s)
            .replace(/[\uff01-\uff5e]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
            .replace(/\u3000/g, ' ');
    }

    // 半角化只作用于引号外：命令名/开关/路径要半角化（全角区间、全角逗号、全角数字都认），
    // 但引号内是内容（inline edit 的旧/新片段、grep 的搜索词）——内容里的全角标点不能被改，
    // 否则原文里是「，」「！」这类全角标点时，片段被转成半角就永远匹配不上。
    function toHalfWidthOutsideQuotes(line) {
        let out = '';
        let quote = null;
        const s = String(line == null ? '' : line);
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (quote) {
                out += ch;
                if (ch === '\\' && i + 1 < s.length) { out += s[++i]; continue; }
                if (ch === quote) quote = null;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '\u201c' || ch === '\u201d') {
                quote = (ch === '\u201c' || ch === '\u201d') ? '"' : ch;
                out += ch;
                continue;
            }
            out += toHalfWidth(ch);
        }
        return out;
    }

    // 零宽字符 + BOM
    function stripInvisible(s) {
        return String(s == null ? '' : s).replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '');
    }

    function levenshtein(a, b) {
        a = String(a); b = String(b);
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = new Array(n + 1);
        let cur = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            cur[0] = i;
            for (let j = 1; j <= n; j++) {
                const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            }
            const t = prev; prev = cur; cur = t;
        }
        return prev[n];
    }

    function similarity(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
    }

    function normalizeLine(line) { return String(line).trim().replace(/\s+/g, ' '); }

    function countOccurrences(haystack, needle) {
        if (!needle) return 0;
        let count = 0, pos = 0;
        while ((pos = haystack.indexOf(needle, pos)) !== -1) { count++; pos += needle.length; }
        return count;
    }

    /* 注：原 deepClone（整树逐字符复制，含每个文件的完整内容）已移除 —— 批快照改走
     * 05-fs 的 cloneTree（写时复制：只新建节点对象，内容字符串按引用共享）。 */

    /* ------------------------- 图标（纯 SVG，无 emoji） ------------------------- */

    function svgIcon(path, opts) {
        opts = opts || {};
        const size = opts.size || 16;
        const sw = opts.sw || 1.6;
        return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" ' +
            'stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
    }

    const ICONS = {
        logo: svgIcon('<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>', { size: 18, sw: 1.5 }),
        refresh: svgIcon('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', { size: 14 }),
        plus: svgIcon('<path d="M12 5v14M5 12h14"/>', { size: 14 }),
        folder: svgIcon('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>', { size: 15 }),
        folderPlus: svgIcon('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M12 11.5v5M9.5 14h5"/>', { size: 15 }),
        folderDown: svgIcon('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M12 10.8v5.4M9.6 13.6l2.4 2.4 2.4-2.4"/>', { size: 15 }),
        file: svgIcon('<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/>', { size: 15 }),
        edit: svgIcon('<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13.5 6.5l4 4"/>', { size: 14 }),
        trash: svgIcon('<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>', { size: 14 }),
        upload: svgIcon('<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 18v2h16v-2"/>', { size: 15 }),
        download: svgIcon('<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>', { size: 15 }),
        back: svgIcon('<path d="M15 5l-7 7 7 7"/>', { size: 15 }),
        next: svgIcon('<path d="M9 5l7 7-7 7"/>', { size: 15 }),
        check: svgIcon('<path d="M5 13l4 4L19 7"/>', { size: 14 }),
        info: svgIcon('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8.2v.1"/>', { size: 14 }),
        search: svgIcon('<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>', { size: 15 }),
        settings: svgIcon('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', { size: 15 }),
        list: svgIcon('<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.1M4 12h.1M4 18h.1"/>', { size: 15 }),
        receipt: svgIcon('<path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z"/><path d="M10 8h4M10 12h4"/>', { size: 15 }),
        undo: svgIcon('<path d="M9 7H15a4.5 4.5 0 0 1 0 9H8"/><path d="M11 4L8 7l3 3"/>', { size: 14 }),
        redo: svgIcon('<path d="M15 7H9a4.5 4.5 0 0 0 0 9h7"/><path d="M13 4l3 3-3 3"/>', { size: 14 }),
        restore: svgIcon('<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v7h7"/>', { size: 14 }),
        clipboard: svgIcon('<rect x="6" y="4" width="12" height="16" rx="1.5"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6"/>', { size: 14 }),
        copy: svgIcon('<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9"/>', { size: 14 }),
        filter: svgIcon('<path d="M4 5h16l-6 7v7l-4-2v-5z"/>', { size: 14 }),
        plan: svgIcon('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h4"/>', { size: 15 }),
        // 阅读（只读查看）：文件页给系统文件的入口之一
        eye: svgIcon('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', { size: 15 }),
        // 编辑内容（铅笔+横线）：与「重命名」共用同一支笔的语义，但带文字按钮时的图标
        pen: svgIcon('<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13.5 6.5l4 4"/>', { size: 14 }),
        // 主题键（模板头版的圆形图标钮）：浅色显示月亮（点了去深色），深色显示太阳
        moon: svgIcon('<path d="M20.2 13.2A8.2 8.2 0 1 1 10.8 3.8a6.6 6.6 0 0 0 9.4 9.4z"/>', { size: 17 }),
        sun: svgIcon('<circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.5M12 18.9v2.5M2.6 12h2.5M18.9 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/>', { size: 17 }),

        /* ---- 文件查看页（文本编辑器）/ 「更多」面板新增：全选 / 粘贴 / 保存 / 新建文件 / 导入文件夹 / 压缩包 / 批量 ---- */
        close: svgIcon('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', { size: 15 }),
        dots: svgIcon('<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>', { size: 15 }),
        selectAll: svgIcon('<rect x="4" y="4" width="16" height="16" rx="2.5" stroke-dasharray="3 2.6"/><path d="M8.4 12.2l2.5 2.5 4.7-5.2"/>', { size: 15 }),
        paste: svgIcon('<path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v12A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17.5 5H15"/><rect x="9" y="3" width="6" height="3.4" rx="1"/><path d="M8.6 12.5h6.8M8.6 16h6.8"/>', { size: 15 }),
        save: svgIcon('<path d="M5 4h10.5L19 7.5V20H5z"/><path d="M8.5 4v5.5h7V4"/><rect x="8.5" y="13" width="7" height="7"/>', { size: 15 }),
        filePlus: svgIcon('<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/><path d="M11.5 12v5M9 14.5h5"/>', { size: 15 }),
        folderUp: svgIcon('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M12 17v-5.4M9.6 14l2.4-2.4 2.4 2.4"/>', { size: 15 }),
        archive: svgIcon('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M10.4 4v2.6M12.4 6.6v2.4M10.4 9v2.4M12.4 11.4v2.2"/><rect x="9.8" y="13.6" width="3.2" height="3.4" rx="1"/>', { size: 15 }),
        refresh2: svgIcon('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4.5v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 19.5V15h4.5"/>', { size: 15 }),
        layers: svgIcon('<path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12.5L12 17l8-4.5"/><path d="M4 16.5L12 21l8-4.5"/>', { size: 15 }),
        importTo: svgIcon('<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H9l1.8 2.2h7.7A1.5 1.5 0 0 1 20 8.7V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M12 10v7M9.2 14.2L12 17l2.8-2.8"/>', { size: 15 }),
    };

/* >>> 03-platform.js */
    /* =========================================================================
     * 03 平台适配
     * ====================================================================== */

    const PLATFORM_DEFS = [
        {
            id: 'deepseek', name: 'DeepSeek',
            hosts: ['chat.deepseek.com', 'deepseek.com', 'www.deepseek.com'],
            convMatch: /\/a\/chat\/s\/([^/?#]+)/,
            msgSelector: '[data-message-author-role="assistant"], [data-role="assistant"], [data-message-role="assistant"], .message-assistant, .ds-markdown',
            // 第二期：upload 双模式 —— 平台有附件入口时把文件真的放进聊天（input[type=file]）
            attach: { fileInput: 'input[type="file"]' },
            userMsgSelector: '[data-message-author-role="user"], [data-role="user"], [data-message-role="user"], .message-user',
            threadLink: 'a[href^="/a/chat/s/"], a[href="/a/chat"]',
            dsButtonSpecial: true
        },
        {
            id: 'chatgpt', name: 'ChatGPT',
            hosts: ['chatgpt.com', 'chat.openai.com'],
            convMatch: /\/c\/([^/?#]+)/,
            msgSelector: '[data-message-author-role="assistant"]',
            userMsgSelector: '[data-message-author-role="user"]',
            threadLink: 'a[href^="/c/"]',
            dsButtonSpecial: false
        },
        {
            id: 'claude', name: 'Claude',
            hosts: ['claude.ai'],
            convMatch: /\/chat\/([^/?#]+)/,
            msgSelector: '[data-testid="assistant-message"], [class*="font-claude-message"], [data-is-streaming]',
            userMsgSelector: '[data-testid="user-message"], [class*="font-user-message"]',
            threadLink: 'a[href^="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'gemini', name: 'Gemini',
            hosts: ['gemini.google.com'],
            convMatch: /\/app\/([^/?#]+)/,
            msgSelector: 'model-response, .model-response-text',
            userMsgSelector: 'user-query, .user-query-text',
            threadLink: 'a[href^="/app/"]',
            dsButtonSpecial: false
        },
        {
            id: 'copilot', name: 'Copilot',
            hosts: ['copilot.microsoft.com'],
            convMatch: /\/(?:chats?|c)\/([^/?#]+)/,
            msgSelector: '[data-content="ai-message"], [data-testid="ai-message"]',
            userMsgSelector: '[data-content="user-message"], [data-testid="user-message"]',
            threadLink: 'a[href*="/chats/"]',
            dsButtonSpecial: false
        },
        {
            id: 'kimi', name: 'Kimi',
            hosts: ['kimi.com', 'www.kimi.com', 'kimi.moonshot.cn'],
            convMatch: /\/chat\/([^/?#]+)/,
            msgSelector: '[class*="segment-assistant"], [class*="segment"][class*="assistant"]',
            userMsgSelector: '[class*="segment-user"], [class*="segment"][class*="user"]',
            threadLink: 'a[href^="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'doubao', name: '豆包',
            hosts: ['doubao.com', 'www.doubao.com'],
            convMatch: /\/chat\/([^/?#]+)/,
            msgSelector: '[data-testid="receive_message"], [class*="receive-message"]',
            userMsgSelector: '[data-testid="send_message"], [class*="send-message"]',
            threadLink: 'a[href*="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'qianwen', name: '通义千问',
            hosts: ['qianwen.com', 'www.qianwen.com', 'tongyi.aliyun.com'],
            convMatch: /\/(?:c|q|chat)\/([^/?#]+)/,
            msgSelector: '[class*="message-select-wrapper-answer"]',
            userMsgSelector: '[class*="message-select-wrapper-question"]',
            threadLink: 'a[href^="/c/"], a[href*="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'yuanbao', name: '腾讯元宝',
            hosts: ['yuanbao.tencent.com'],
            convMatch: /\/chat\/([^/?#]+)/,
            msgSelector: '[class*="agent-chat__bubble--ai"], [class*="agent-chat"][class*="ai"]',
            userMsgSelector: '[class*="agent-chat__bubble--human"], [class*="agent-chat"][class*="human"]',
            threadLink: 'a[href*="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'poe', name: 'Poe',
            hosts: ['poe.com'],
            convMatch: /\/([^/?#]+)$/,
            msgSelector: '[class*="Message_botMessageBubble"], [class*="BotMessage"]',
            userMsgSelector: '[class*="Message_humanMessageBubble"], [class*="HumanMessage"]',
            threadLink: 'a[href^="/"]',
            dsButtonSpecial: false
        },
        {
            id: 'grok', name: 'Grok',
            hosts: ['grok.com'],
            convMatch: /\/chat\/([^/?#]+)/,
            msgSelector: '[class*="message-bubble"][class*="assistant"], .response-content-markdown',
            userMsgSelector: '[class*="message-bubble"][class*="user"]',
            threadLink: 'a[href^="/chat/"]',
            dsButtonSpecial: false
        },
        {
            id: 'aistudio', name: 'AI Studio',
            hosts: ['aistudio.google.com'],
            convMatch: /\/prompts\/([^/?#]+)/,
            msgSelector: 'ms-chat-turn[role="assistant"], [class*="chat-turn"][class*="model"]',
            userMsgSelector: 'ms-chat-turn[role="user"], [class*="chat-turn"][class*="user"]',
            threadLink: 'a[href^="/prompts/"]',
            dsButtonSpecial: false
        }
    ];

    const PLATFORM = (function detectPlatform() {
        let host = '';
        try { host = (location.hostname || '').toLowerCase(); } catch (e) { host = ''; }
        if (!host) {
            try {
                const m = String(location.href || '').match(/^https?:\/\/([^/?#]+)/);
                host = m ? m[1].toLowerCase() : '';
            } catch (e) {}
        }
        for (const def of PLATFORM_DEFS) {
            for (const h of def.hosts) {
                if (host === h || host.endsWith('.' + h)) return Object.assign({ matched: true, host: host }, def);
            }
        }
        return {
            matched: false, host: host,
            id: 'generic', name: '通用',
            hosts: [],
            convMatch: /\/(?:c|chat|conversation|thread|s)\/([^/?#]+)/,
            msgSelector: '[data-message-author-role="assistant"], [data-role="assistant"], [data-message-role="assistant"], .message-assistant, [class*="assistant"][class*="message"], [class*="message"][class*="assistant"]',
            userMsgSelector: '[data-message-author-role="user"], [data-role="user"], [data-message-role="user"], .message-user, [class*="user"][class*="message"]',
            threadLink: 'a[href*="/chat/"], a[href*="/c/"]',
            dsButtonSpecial: false
        };
    })();

    /* ------------------------- 「正在生成」信号 ------------------------- */

    // 「停止生成」按钮的文案（按钮级、紧贴输入框附近才算，避免误判页面其它「停止」按钮）
    const STOP_LABEL_RE = /^(?:停止|停止生成|停止回答|停止响应|停止输出|终止生成|取消生成|中断生成|stop|stop generating|stop response|stop streaming|stop the response|cancel)\s*$/i;

    // 元素/祖先上的流式标记类名（只在消息元素自身及其祖先上匹配，不做全页模糊匹配）
    const STREAM_CLASS_RE = /(?:^|[\s_-])(?:streaming|is-streaming|is-generating|generating|typing|result-streaming|streaming-indicator|md-streaming)(?:$|[\s_-])/i;

    // 全页可信的显式流式属性（语义明确，不是模糊类名）
    const STREAM_ATTR_SELECTORS = [
        '[data-is-streaming="true"]',
        '[data-streaming="true"]',
        '[data-streaming="1"]',
        '.result-streaming'
    ];

    function currentConversationKey() {
        try {
            const m = location.pathname.match(PLATFORM.convMatch);
            return m ? (PLATFORM.id + ':' + m[1]) : 'root';
        } catch (e) { return 'root'; }
    }

/* >>> 05-fs.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const TRASH_MAX_BYTES = 4 * 1024 * 1024;
    const UNDO_DEPTH = 50;             // 用户能撤销的**步数**（语义）
    const UNDO_MAX_RECORDS = 200;      // 允许攒多少条增量档才压一次基线（物理，P4）

    /* P3a 提交协议：容器树不再每批整体重写，改成「快照 + 增量日志 + 提交指针」。
     *   dsw2:fs:base:<seq>  完整序列化树（少写）
     *   dsw2:fs:log:<seq>   一批一条 ops（体积 O(改动)，不再是 O(文件数)）
     *   dsw2:fs:head        {seq, baseSeq} —— **唯一翻转的键 = 原子提交点**
     *
     * 读 = base(root) + 依次 apply log(baseSeq+1 .. seq)。
     * 提交 = 先写 log（或 base）→ 再翻 head。任何一步崩掉，看到的都是上一批的完整一致状态；
     * 半截产物（孤儿 log / 孤儿 base）会在下次压缩时清掉。
     * 旧格式键 dsw2:fs:tree 只在「还没有 head」时作为迁移来源读一次，之后被删。 */
    const FS_BASE_PREFIX = 'dsw2:fs:base:';
    const FS_LOG_PREFIX = 'dsw2:fs:log:';
    const STORE_FS_HEAD = 'dsw2:fs:head';
    const FS_COMPACT_EVERY = 32;      // 增量攒够这么多批就压成新快照（顺带清理）

    /* =========================================================================
     * 05 VirtualFS —— 虚拟文件系统
     *   树：内存对象；持久化：元数据树 + 内容寻址 blob；每批一次提交（§9）
     * ====================================================================== */

    function newDirNode() { return { type: 'dir', children: Object.create(null) }; }

    /* 文件节点 = { type:'file', content, mtime, hash, hlen, size }
     *     hash = contentHash(content)  —— 内容寻址键，落盘时直接用，不再每批重算
     *     hlen = content.length        —— O(1) 的「内容变没变」哨兵（见 serializeNode）
     *     size = byteLen(content)      —— 回执/统计用的 UTF-8 字节数
     *
     * P2 的核心：这三个字段在**写入的那一刻**算一次，之后每批持久化只读缓存。
     * 以前 serializeNode 每批对每个文件重算 contentHash + byteLen，是 O(容器总字节)：
     * 一个 2MB 文件 + 每轮一条命令 = 每轮白算 4MB 哈希（persistFS 一次、makeUndoCp 再一次），
     * 与「本批改了几个文件」完全无关 —— 这是实测最明显的卡顿来源。 */
    function newFileNode(content) {
        const s = String(content == null ? '' : content);
        return {
            type: 'file', content: s, mtime: Date.now(),
            hash: contentHash(s), hlen: s.length, size: byteLen(s)
        };
    }

    /* 唯一的内容写入漏斗：改内容必须走这里，hash/hlen/size 才会跟着更新。
     * 漏走一次 → 树里记的 hash 指向**旧内容** = 下次加载拿到错误内容（所以 serializeNode
     * 里还有一道哨兵，DEBUG 打开时会把绕过漏斗的写入直接报出来）。 */
    function setFileContent(node, content) {
        const s = String(content == null ? '' : content);
        node.content = s;
        node.hash = contentHash(s);
        node.hlen = s.length;
        node.size = byteLen(s);
        node.mtime = Date.now();
        node.missing = undefined;      // 真写了一笔新内容，「内容缺失」这个状态就此解除
        return node;
    }

    /* 结构快照（写时复制）：只新建「目录/文件节点对象」，**内容字符串按引用共享**。
     * 为什么不能再用 deepClone：每次 beginBatch 都要拍一份批前快照，而 deepClone 会把
     * 每个文件的完整内容逐字符复制一遍 —— 容器里有几 MB 文件时，一条命令就复制几 MB，
     * 这是「运行时卡顿」的最大来源（§9 效率）。
     * 共享字符串是安全的：JS 字符串不可变，写入一律是 `setFileContent`（换引用），
     * 快照里的旧节点对象仍指向旧串，回滚/提交语义不受影响。节点对象仍各自独立，
     * 目录增删（children[...] = / delete）不会串到快照。 */
    function cloneTree(node) {
        if (!node || typeof node !== 'object') return node;
        if (node.type === 'file') {
            // 缓存字段一起搬（**不重算**）：cloneTree 每批都要全树走一遍，重算等于把 P2 白做
            return {
                type: 'file', content: node.content, mtime: node.mtime,
                hash: node.hash, hlen: node.hlen, size: node.size
            };
        }
        const children = Object.create(null);
        const src = node.children || Object.create(null);
        for (const k of Object.keys(src)) children[k] = cloneTree(src[k]);
        return { type: 'dir', children: children };
    }

    let fsData = { root: newDirNode() };

    // P3a 提交协议的内存态
    let fsSnap = null;                        // 已落盘的**序列化**树：既是增量 diff 的基准，也是 GC 的依据
    let fsHead = { seq: 0, baseSeq: 0, at: 0 };
    let fsCorrupt = null;                     // 非空 = 存储读不回来：只读保护，绝不覆盖（见 initFS）
    let missingBlobs = [];                    // 加载时发现「树引用了、存储里却没有」的内容

    /* ------------------------- 序列化 / 持久化 ------------------------- */

    /* 内容的存在性 / 读写一律走 FsMedia（P3b）—— 这里不再自己维护一份哈希集合，
     * 免得「介质换了、缓存没换」造成两边说法不一致（那是「内容缺失」误报/漏报的温床）。 */
    function seedPresentBlobs() { FsMedia.keys(); }

    function putBlob(hash, content) {
        if (FsMedia.has(hash)) return true;      // 内容寻址天然可去重：同一个 hash 只写一次
        return FsMedia.put(hash, content);
    }

    function serializeNode(node, blobCache) {
        if (node.type === 'file') {
            if (node.missing) {
                // 内容在存储里已经找不到了（见 deserializeNode）：**保留原来的引用**，
                // 绝不把它当成空文件重新落盘 —— 否则一次静默的读取失败就被"洗白"成
                // 「这个文件本来就是空的」，原内容再也回不来。
                return { type: 'file', hash: node.hash, size: node.size, mtime: node.mtime || Date.now() };
            }
            const content = String(node.content == null ? '' : node.content);
            let hash = node.hash;
            let size = node.size;
            if (typeof hash !== 'string' || node.hlen !== content.length) {
                // 哨兵①（O(1)，正常路径零开销）：节点没有缓存、或长度对不上 → 重算并回填。
                hash = contentHash(content);
                size = byteLen(content);
                node.hash = hash; node.hlen = content.length; node.size = size;
            } else if (DEBUG) {
                // 哨兵②（只在 debug 下跑全量）：任何绕过 setFileContent 的写入都会在这里现形。
                const expect = contentHash(content);
                if (hash !== expect) {
                    errlog('serializeNode: 缓存 hash 与内容不符（有写入点绕过了 setFileContent）：' + hash + ' ≠ ' + expect);
                    hash = expect; size = byteLen(content);
                    node.hash = hash; node.hlen = content.length; node.size = size;
                }
            }
            if (!blobCache.has(hash)) {
                if (!putBlob(hash, content)) throw new Error('blob 写入失败（存储配额？）');
                blobCache.add(hash);
            }
            return { type: 'file', hash: hash, size: size, mtime: node.mtime || Date.now() };
        }
        const children = {};
        const src = node.children || Object.create(null);
        for (const k of Object.keys(src)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            children[k] = serializeNode(src[k], blobCache);
        }
        return { type: 'dir', children: children };
    }

    function deserializeNode(node, blobCache) {
        if (!node || typeof node !== 'object') return newDirNode();
        if (node.type === 'file') {
            seedPresentBlobs();                  // 幂等；只为了能判断「这个 hash 到底在不在存储里」
            const hash = node.hash;
            const present = typeof hash === 'string' && FsMedia.has(hash);
            let content = blobCache.get(hash);
            if (content === undefined) {
                const got = FsMedia.get(hash);
                content = (typeof got === 'string') ? got : '';
                blobCache.set(hash, content);
            }
            return {
                type: 'file', content: content, mtime: node.mtime || Date.now(),
                hash: hash, hlen: content.length,
                size: typeof node.size === 'number' ? node.size : byteLen(content),
                // 缺失标记：内容读不到时**不要**让后续提交把它改写成空文件（见 serializeNode）
                missing: present ? undefined : true
            };
        }
        const children = Object.create(null);
        const src = node.children || {};
        for (const k of Object.keys(src)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            children[k] = deserializeNode(src[k], blobCache);
        }
        return { type: 'dir', children: children };
    }

    /* ------------------------- P3a 提交协议 ------------------------- */

    /* 序列化树扁平化：path -> 节点（目录也算）。O(文件数)，不碰内容字节。 */
    function flattenSerialized(node, prefix, out) {
        if (!node || typeof node !== 'object') return;
        out[prefix] = node;
        if (node.type !== 'dir') return;
        const ch = node.children || {};
        for (const k of Object.keys(ch)) {
            flattenSerialized(ch[k], prefix === '/' ? '/' + k : prefix + '/' + k, out);
        }
    }

    /* 两份序列化树的差 → ops。只比 type/hash/mtime 不参与比较（内容没变就不该产生 op）。 */
    function diffSnapshots(oldRoot, newRoot) {
        const a = {}, b = {};
        flattenSerialized(oldRoot, '/', a);
        flattenSerialized(newRoot, '/', b);
        const ops = [];
        const dels = [];
        for (const p of Object.keys(a)) {
            if (p === '/') continue;
            const nb = b[p];
            if (!nb || nb.type !== a[p].type) dels.push(p);       // 没了，或者文件↔目录换了身份
        }
        dels.sort(function (x, y) { return y.length - x.length || (x < y ? 1 : -1); });   // 深→浅
        for (const p of dels) ops.push({ op: 'rm', path: p });
        const sets = [];
        for (const p of Object.keys(b)) {
            if (p === '/') continue;
            const na = a[p], nb = b[p];
            if (!na || na.type !== nb.type) sets.push(p);
            else if (nb.type === 'file' && na.hash !== nb.hash) sets.push(p);
        }
        sets.sort(function (x, y) { return x.length - y.length || (x < y ? -1 : 1); });   // 浅→深（父先于子）
        for (const p of sets) {
            const nb = b[p];
            if (nb.type === 'dir') ops.push({ op: 'mkdir', path: p });
            else ops.push({ op: 'set', path: p, hash: nb.hash, size: nb.size, mtime: nb.mtime });
        }
        return ops;
    }

    /* 把 ops 重放到序列化树上（加载时用）。返回失败即「日志与结构冲突」，由调用方兜底。 */
    function applyOpsToSnapshot(root, ops) {
        for (let i = 0; i < ops.length; i++) {
            const o = ops[i];
            if (!o || typeof o.path !== 'string' || o.path === '/') continue;
            const segs = o.path.split('/').slice(1);
            if (!segs.length) continue;
            if (o.op === 'rm') {
                let cur = root;
                for (let j = 0; j + 1 < segs.length && cur; j++) cur = cur.children ? cur.children[segs[j]] : null;
                if (cur && cur.children) delete cur.children[segs[segs.length - 1]];
                continue;
            }
            let cur = root;
            let bad = false;
            for (let j = 0; j + 1 < segs.length; j++) {
                const s = segs[j];
                if (!cur.children) cur.children = {};
                if (!cur.children[s]) cur.children[s] = { type: 'dir', children: {} };
                cur = cur.children[s];
                if (cur.type !== 'dir') { bad = true; break; }
            }
            if (bad) return { ok: false, error: '日志与结构冲突：' + o.path };
            const last = segs[segs.length - 1];
            if (o.op === 'mkdir') {
                if (!cur.children) cur.children = {};
                if (!cur.children[last]) cur.children[last] = { type: 'dir', children: {} };
                else if (cur.children[last].type !== 'dir') return { ok: false, error: '日志与结构冲突：' + o.path };
            } else if (o.op === 'set') {
                if (!cur.children) cur.children = {};
                cur.children[last] = { type: 'file', hash: o.hash, size: o.size, mtime: o.mtime };
            } else {
                return { ok: false, error: '未知的日志操作：' + o.op };
            }
        }
        return { ok: true };
    }

    /* 读回「已提交的」序列化树：base + 依次 apply log。 */
    function readCommittedSnapshot() {
        const head = Store.get(STORE_FS_HEAD, null);
        if (!head || typeof head.seq !== 'number' || typeof head.baseSeq !== 'number'
            || head.baseSeq > head.seq || head.baseSeq < 0) {
            return { ok: false, reason: 'no-head' };
        }
        const base = Store.get(FS_BASE_PREFIX + head.baseSeq, null);
        if (!base || !base.root || base.root.type !== 'dir') return { ok: false, reason: 'base-missing' };
        const root = base.root;
        for (let s = head.baseSeq + 1; s <= head.seq; s++) {
            const rec = Store.get(FS_LOG_PREFIX + s, null);
            if (!rec || !Array.isArray(rec.ops)) return { ok: false, reason: 'log-missing:' + s };
            const applied = applyOpsToSnapshot(root, rec.ops);
            if (!applied.ok) return { ok: false, reason: applied.error };
        }
        return { ok: true, root: root, head: head };
    }

    /* 提交成功后清理：不在 head 里的 base、已被快照覆盖的 log、head 之后的孤儿 log。 */
    function cleanupSuperseded() {
        let keys = [];
        try { keys = Store.keys(); } catch (e) { return; }
        for (const k of keys) {
            if (typeof k !== 'string') continue;
            if (k.indexOf(FS_BASE_PREFIX) === 0) {
                const s = Number(k.slice(FS_BASE_PREFIX.length));
                if (!isFinite(s) || s !== fsHead.baseSeq) Store.del(k);
            } else if (k.indexOf(FS_LOG_PREFIX) === 0) {
                const s = Number(k.slice(FS_LOG_PREFIX.length));
                if (!isFinite(s) || s <= fsHead.baseSeq || s > fsHead.seq) Store.del(k);
            }
        }
        // 走到这里说明新格式已经能完整读回来，旧格式键就没用了
        try { if (Store.get(STORE_TREE, null) !== null) Store.del(STORE_TREE); } catch (e) {}
    }

    function writeJournalCommit(snap, ops) {
        const seq = fsHead.seq + 1;
        if (!Store.set(FS_LOG_PREFIX + seq, { v: 4, seq: seq, at: Date.now(), ops: ops })) {
            return { ok: false, error: '增量日志写入失败（存储配额？）' };
        }
        const newHead = { seq: seq, baseSeq: fsHead.baseSeq, at: Date.now() };
        if (!Store.set(STORE_FS_HEAD, newHead)) {      // 提交点翻转失败 → 日志作废，绝不留半截状态
            Store.del(FS_LOG_PREFIX + seq);
            return { ok: false, error: '提交指针写入失败（存储配额？）' };
        }
        fsHead = newHead;
        fsSnap = snap;
        return { ok: true, ops: ops.length, seq: seq };
    }

    function writeCompactCommit(snap) {
        const seq = fsHead.seq + 1;
        if (!Store.set(FS_BASE_PREFIX + seq, { v: 4, seq: seq, at: Date.now(), root: snap })) {
            return { ok: false, error: '快照写入失败（存储配额？）' };
        }
        const newHead = { seq: seq, baseSeq: seq, at: Date.now() };
        if (!Store.set(STORE_FS_HEAD, newHead)) {
            Store.del(FS_BASE_PREFIX + seq);
            return { ok: false, error: '提交指针写入失败（存储配额？）' };
        }
        fsHead = newHead;
        fsSnap = snap;
        cleanupSuperseded();
        return { ok: true, ops: -1, compacted: true, seq: seq };
    }

    function persistFS() {
        if (fsCorrupt) return { ok: false, error: '容器存储损坏，已进入只读保护：' + fsCorrupt + '（数据仍在，未被覆盖）' };
        {
            const blk = FsMedia.blocked();
            if (blk) {
                return {
                    ok: false,
                    error: '容器内容在' + blk.where + '里，现在打不开（' + blk.reason + '）。'
                        + '已暂时禁止写入，避免内容分裂到两个地方 —— 通常你点一下屏幕就会自动接上；'
                        + '也可以到「设置 → 容器存放位置」点「立即授权」。'
                };
            }
        }
        try {
            const blobCache = new Set();
            const snap = serializeNode(fsData.root, blobCache);
            const res = commitSnapshot(snap);
            // 提交成功后再镜像到用户文件夹（失败不影响容器本身，只记一笔）
            if (res && res.ok) {
                try { mirrorToFolder(); } catch (e) { warn('镜像到文件夹失败：', e && e.message); }
            }
            return res;
        } catch (e) {
            return { ok: false, error: '分片存储失败：' + (e && e.message ? e.message : String(e)) };
        }
    }

    // 把 snap 提交进 base/log/head。抽出来是为了让 persistFS 能在提交成功后统一做镜像。
    function commitSnapshot(snap) {
        {
            /* 跨标签页防撞号：另一个标签页可能在我们背后提交过，那样「seq+1」就会和它撞在
             * 同一个 log 键上，把我们这条日志悄悄覆盖掉（比旧版「整树覆盖」更隐蔽的坏法）。
             * 检测到漂移就退化成一次**整树压缩**：语义回到旧版的「后写者胜」，但至少是
             * 一个完整一致的状态，而不是半截日志。P5 会把它换成「重放我们的 ops」。 */
            let drifted = false;
            try {
                const stored = Store.get(STORE_FS_HEAD, null);
                if (!stored || typeof stored.seq !== 'number' || typeof stored.baseSeq !== 'number') {
                    drifted = fsHead.seq > 0;
                } else if (stored.seq !== fsHead.seq || stored.baseSeq !== fsHead.baseSeq) {
                    drifted = true;
                    if (stored.seq > fsHead.seq) fsHead = { seq: stored.seq, baseSeq: fsHead.baseSeq, at: 0 };
                }
            } catch (e) {}
            if (drifted) {
                warn('persistFS: 提交指针被别的标签页改动过 → 退化为整树压缩（后写者胜）');
                return writeCompactCommit(snap);
            }

            const baseExists = !!Store.get(FS_BASE_PREFIX + fsHead.baseSeq, null);
            if (fsSnap && baseExists) {
                const ops = diffSnapshots(fsSnap, snap);
                if (!ops.length) { fsSnap = snap; return { ok: true, ops: 0 }; }   // 一点没变：一个字节都不写
                if ((fsHead.seq - fsHead.baseSeq) < FS_COMPACT_EVERY) {
                    return writeJournalCommit(snap, ops);
                }
            }
            return writeCompactCommit(snap);
        }
    }

    /* 内容缺失检测：树引用了某 hash，但存储里没有这个 blob。
     * 以前这里会静默退化成空串（rawGet 兜底 ''）—— 文件「变成空的」还不报错，是最阴的坏法。 */
    /* ------------------- P3b-2b：把活文件镜像到用户文件夹 -------------------
     * 内容介质按 hash 存 blob（去重、撤销、GC 都靠它，不能动），但用户打开文件夹
     * 只看到一堆 hash 名字、而且 .dsw 是隐藏目录 —— 等于什么都看不到。
     * 所以额外把**活文件按原路径**写一份：/src/a.js → <文件夹>/src/a.js。
     * mirrorState 记「我们相信磁盘上就是这个内容」，比对不上才写，避免每次全量重写。
     *
     * 2.10.0：**系统区（/__sys）不镜像**。系统文件（手册/计划）由容器自己管，
     * 一旦写到手机存储里，用户用文件管理器就能看到、也可能顺手误删；而容器的
     * 「内部区只读」保护只作用于容器内部，管不到容器外那份副本 —— 所以干脆不写出去。
     * 回收站（/__trash）同理。 */
    let mirrorState = new Map();       // 虚拟路径 -> hash

    function fsRelPath(vpath) { return String(vpath).replace(/^\/+/, ''); }

    function walkLiveFiles(fn) {
        const walk = function (node, prefix) {
            if (!node || typeof node !== 'object') return;
            if (node.type === 'file') { fn(prefix, node); return; }
            const src = node.children || {};
            for (const k of Object.keys(src)) walk(src[k], prefix === '/' ? '/' + k : prefix + '/' + k);
        };
        walk(fsData.root, '/');
    }

    /* 2.10.0：把旧版可能留在用户文件夹里的系统区副本清掉。
     * 只删「__sys」这一个容器保留名（含里面的文件与目录），用户自己的文件一个不动。
     * 用 sysMirrorPurged 保证一次会话只清一次，避免反复排删除任务。 */
    let sysMirrorPurged = false;
    function purgeSystemMirror(force) {
        if (!FsMedia.canMirror()) return false;
        if (sysMirrorPurged && !force) return false;
        sysMirrorPurged = true;
        const rel = fsRelPath(SYS_PREFIX.replace(/\/+$/, ''));   // '/__sys/' → '__sys'
        if (!rel) return false;
        try { FsMedia.realDel(rel); return true; }
        catch (e) { warn('清理文件夹里的系统区失败：', e && e.message); return false; }
    }

    // 把活文件同步到文件夹（只写有变化的）。返回写了几个。
    function mirrorToFolder() {
        if (!FsMedia.canMirror()) return 0;
        // 先清掉旧版留下的系统区副本（一次会话只做一次）
        try { purgeSystemMirror(); } catch (e) {}
        const cur = new Map();
        walkLiveFiles(function (vp, node) {
            // 内部区（系统区 /__sys + 回收站 /__trash）不镜像到文件夹 ——
            // 系统文件落到手机存储里会被文件管理器误删，且容器只读保护管不到容器外。
            if (isInternalAreaPath(vp)) return;
            cur.set(vp, node);
        });
        let n = 0;
        cur.forEach(function (node, vp) {
            if (mirrorState.get(vp) === node.hash) return;
            FsMedia.realWrite(fsRelPath(vp), String(node.content == null ? '' : node.content));
            mirrorState.set(vp, node.hash);
            n++;
        });
        mirrorState.forEach(function (h, vp) {
            if (!cur.has(vp)) { FsMedia.realDel(fsRelPath(vp)); mirrorState.delete(vp); n++; }
        });
        return n;
    }

    /* 启动时把文件夹里的改动读回容器：改过的采纳、新增的建立。
     * 系统区（/__sys）只出不进 —— 手册是容器自己管的，不能让磁盘上的旧版本把它顶回去。 */
    async function fsSyncFromFolder() {
        mirrorState = new Map();
        if (!FsMedia.canMirror()) return { skipped: true, reason: '当前介质不是文件夹' };
        let list = null;
        try { list = await FsMedia.realList(); } catch (e) { list = null; }
        if (!list) return { skipped: true, reason: '读不到文件夹内容' };

        let adopted = 0, created = 0;
        for (const f of list) {
            const vp = '/' + String(f.path).replace(/^\/+/, '');
            if (isSysAreaPath(vp) || vp.indexOf(TRASH_PREFIX) === 0) continue;
            const node = resolveNode(vp);
            if (node && node.type === 'file') {
                if (String(node.content == null ? '' : node.content) === f.content) {
                    mirrorState.set(vp, node.hash);              // 已经一致，记下来免得下次重写
                } else {
                    setFileContent(node, f.content);             // 用户在文件夹里改过 → 采纳
                    adopted++;
                }
            } else if (!node) {
                const r = fsWrite(vp, f.content, { force: true });   // 用户在文件夹里新增 → 建进来
                if (r && r.ok !== false) { created++; }
            }
        }
        if (adopted || created) {
            persistFS();
            undoSave('文件夹改动');
            try { pushLog('从文件夹读回：改动 ' + adopted + ' 个、新增 ' + created + ' 个文件'); } catch (e) {}
        }
        return { adopted: adopted, created: created, files: list.length };
    }

    /* P3b-3：自动续授权接上之后要做的事 —— **顺序很重要**：
     *   1) 先把「权限掉之前想写而没写成」的队列推下去（不然它们会被当成孤儿）；
     *   2) 再读回文件夹里用户的改动；
     *   3) 最后补一次镜像。
     * 1 和 2 反了就会拿磁盘上的旧内容把刚刚写的新内容顶回去 —— 那是静默丢数据。 */
    try {
        FsMedia.onAutoResume(function (why) {
            Promise.resolve()
                .then(function () { return FsMedia.flush(); })
                .then(function () { return fsSyncFromFolder(); })
                .then(function () { purgeSystemMirror(true); })
                .then(function () { mirrorToFolder(); })
                .then(function () {
                    try { pushLog('文件夹权限已自动接上（' + why + '）'); } catch (e) {}
                    try { showToast('文件夹已自动接上，可以正常存了'); } catch (e) {}
                    try { render(); } catch (e) {}
                })
                .catch(function (e) { warn('自动接上后对齐失败：', e && e.message); });
        });
    } catch (e) {}

    function findMissingBlobs(serializedRoot) {
        const out = [];
        seedPresentBlobs();
        const walk = function (n, p) {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'file') {
                if (!n.hash || !FsMedia.has(n.hash)) out.push({ path: p, hash: n.hash || '(无)' });
                return;
            }
            const ch = n.children || {};
            for (const k of Object.keys(ch)) walk(ch[k], p === '/' ? '/' + k : p + '/' + k);
        };
        walk(serializedRoot, '/');
        return out;
    }

    function collectBlobHashes(rootNode, used) {
        if (!rootNode) return;
        const walk = function (n) {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'file' && n.hash) used.add(n.hash);
            else if (n.type === 'dir' && n.children) for (const k of Object.keys(n.children)) walk(n.children[k]);
        };
        walk(rootNode);
    }

    function gcBlobs() {
        try {
            const used = new Set();
            // P3a：树已不在 dsw2:fs:tree 里了。直接用手里的「已提交序列化树」当可达集，
            // 比回读 base+log 再重放便宜得多（而且它一定是最新的）。
            const snap = fsSnap || serializeNode(fsData.root, new Set());
            collectBlobHashes(snap, used);
            // 撤销栈。P4：档里现在主要是 ops（小），只有基线档和「回收站变了的那几档」才带整块数据 ——
            // 所以这里不再需要把 50 份全树 JSON.parse 回来，可达集直接由 ops 里的 hash 拼出来。
            const idx = Store.get(STORE_UNDO_IDX, null);
            if (idx && idx.first != null && idx.last != null) {
                for (let i = idx.first; i <= idx.last; i++) {
                    const cp = Store.get(UNDO_PREFIX + i, null);
                    if (!cp) continue;
                    if (cp.tree) collectBlobHashes(cp.tree, used);      // 基线档 / 旧格式档
                    opsBlobHashes(cp.fwd, used);                        // 增量档：新值
                    opsBlobHashes(cp.bwd, used);                        // 增量档：旧值（undo 回去还要用）
                    if (cp.trash && Array.isArray(cp.trash.items)) {
                        for (const it of cp.trash.items) if (it && it.node) collectBlobHashes(it.node, used);
                    }
                }
            }
            // 回收站
            const trash = Store.get(STORE_TRASH, null);
            if (trash && Array.isArray(trash.items)) {
                for (const it of trash.items) if (it && it.node) collectBlobHashes(it.node, used);
            }
            // 内容层可能不在 GM 里（P3b 换了介质），所以枚举与删除都走 FsMedia
            const hashes = FsMedia.keys();
            let removed = 0;
            for (const hash of hashes) {
                if (!used.has(hash)) { FsMedia.del(hash); removed++; }
            }
            if (removed) log('gcBlobs: 清理', removed, '个孤立 blob');
            return removed;
        } catch (e) { warn('gcBlobs failed:', e); return 0; }
    }

    /* ------------------------- 批量事务（§9 写放大） ------------------------- */

    // 批次栈：外层 = 一条消息，内层 = 消息里的一段 dry 域（只回滚自己那一段，不牵连别的域）。
    // 每层除了文件树快照，还带一份「持久键快照」：批内有些副作用绕过文件树直接写 Store
    // （回收站条目、计划模式状态），回滚时必须一起还原 —— 否则 dry 校验会留下幽灵回收站条目，
    // atomic 回滚也会把计划模式卡在开启状态。
    //
    // 另外两层标记决定「这一批要不要进撤销栈」（§10）：
    //   mutated = 批内真的写了文件（由 withAtomicWrite 这一个漏斗统一打标）；
    //   jump    = 批内只是 undo/redo 移动了撤销游标。
    // 只有 mutated 的批次才记档：读批不记（否则 undo 的「N 步」和写入次数对不上），
    // 纯 undo/redo 也不记（否则它自己追加一条新档，把重做分支挤掉 → redo 永远「最多 0 步」）。
    let batchStack = [];

    function beginBatch() {
        // flushIdx = 本批为了「批内 undo/redo」而临时物化出来的那档撤销栈下标（见 flushBatchTip）；
        // 没有批内 undo/redo 时始终是 null，提交路径与旧版完全一致。
        // tipDirty = 物化之后本批又写过（栈顶那一档已不代表本批当前状态）。
        batchStack.push({
            snapshot: { root: cloneTree(fsData.root) }, store: new Map(),
            mutated: false, jump: false, flushIdx: null, tipDirty: false
        });
    }

    function noteMutation() {
        if (!batchStack.length) return;
        const top = batchStack[batchStack.length - 1];
        top.mutated = true;
        if (top.flushIdx != null) top.tipDirty = true;   // 物化之后又写：栈顶档已过期
    }

    function noteHistoryJump() {
        if (batchStack.length) batchStack[batchStack.length - 1].jump = true;
    }

    // 批内要改某个持久键之前调一次：记下它批前的值（同一层只记第一次）
    function batchRemember(key) {
        if (!batchStack.length) return;
        const top = batchStack[batchStack.length - 1];
        if (top.store.has(key)) return;
        const before = Store.get(key, undefined);
        top.store.set(key, { had: before !== undefined, val: before === undefined ? null : before });
    }

    function mergeBatchStore(from, to) {
        from.forEach(function (rec, k) { if (!to.has(k)) to.set(k, rec); });
    }

    function restoreBatchStore(recs) {
        recs.forEach(function (rec, k) {
            if (rec.had) Store.set(k, rec.val);
            else Store.del(k);
        });
    }

    // 内层提交：把「批前值」并给外层（外层更早、更接近真实批前状态），自己不做持久化
    function commitBatch(label) {
        if (!batchStack.length) return { ok: true };
        const top = batchStack.pop();
        if (batchStack.length) {
            const parent = batchStack[batchStack.length - 1];
            mergeBatchStore(top.store, parent.store);
            if (top.mutated) parent.mutated = true;
            if (top.jump) parent.jump = true;
            // 内层（glob / apply / dry 段）里发生的批内 undo/redo，物化下标要交给外层收尾
            if (top.flushIdx != null) parent.flushIdx = top.flushIdx;
            // 内层里有真实写入 → 外层的物化档也过期（dry 段回滚不会走到这里，所以不会误标）
            if (top.mutated && parent.flushIdx != null) parent.tipDirty = true;
            if (top.tipDirty) parent.tipDirty = true;
            return { ok: true };
        }
        const p = persistFS();
        if (!p.ok) {
            // 持久化失败（存储配额等）：内存里的改动必须一并还原 —— 否则回执说「已回滚」、
            // 内存却留着这次写入，下一次成功落盘会把「已回滚」的改动重新写进去（言行不一）。
            // top 已在此前 pop 出栈，这里直接用它的快照还原，不再依赖上层再调 rollbackBatch。
            fsData = top.snapshot;
            restoreBatchStore(top.store);
            undoLoadCursor();
            return p;
        }
        // 入栈判据：只有真的改了文件才记档。纯 undo/redo（jump 且没有别的写入）只移动游标，
        // 不再追加档 —— 这是容器实测里「undo 后 redo 报最多 0 步」的根因。
        // P3a：persistFS 刚把当前状态序列化过一次（fsSnap 就是它），撤销档直接复用，不再序列化第二遍。
        if (top.mutated) {
            if (top.flushIdx == null) {
                undoSave(label || 'batch', fsSnap);
            } else if (top.tipDirty) {
                // 物化之后又写过：把本批最终状态收进撤销栈（仍停在栈顶就原地更新，一个批次只占一档）
                if (top.flushIdx === undoIdx.last && undoIdx.cursor === top.flushIdx) {
                    try {
                        // P4：增量档要按「相对前一档的 ops」重建，不能只换 tree —— 交给同一个构造函数
                        if (!undoRewriteAt(top.flushIdx, label || 'batch', fsSnap, batchRemember)) {
                            throw new Error('重写撤销档失败');
                        }
                        Store.set(STORE_UNDO_IDX, undoIdx);
                    } catch (e) {
                        warn('commitBatch 更新物化档失败，退回追加新档：', e && e.message);
                        undoSave(label || 'batch', fsSnap);
                    }
                } else {
                    undoSave(label || 'batch', fsSnap);
                }
            }
            // tipDirty 为 false：栈顶那一档就是本批状态（游标可能在它上面，也可能因批内 undo 停在更早
            // 的档上——后者保留为重做分支，批后还能 redo 回来）。两种情况都不再追加空档。
        }
        return { ok: true };
    }

    // 内层回滚：只把这一段还原到它开始时的样子，外层的改动保留
    function rollbackBatch() {
        if (!batchStack.length) return false;
        const top = batchStack.pop();
        fsData = top.snapshot;
        restoreBatchStore(top.store);
        // 撤销游标是内存对象 + 持久键两份状态：只还原持久键会让内存那份留着脏值
        // （dry 域里跑 undo 就能看到：游标被真的挪走了，之后 redo/面板按钮全乱）。
        undoLoadCursor();
        if (batchStack.length) {
            mergeBatchStore(top.store, batchStack[batchStack.length - 1].store);
            return true;
        }
        persistFS();
        return true;
    }

    function inBatch() { return batchStack.length > 0; }

    // 单命令原子写：批内直接执行（由批提交/回滚统一负责），批外自建一层迷你批次。
    // 所有「改文件树」的入口都从这里走 —— 成功时打 mutated 标，撤销栈靠它决定记不记档。
    function withAtomicWrite(fn, label) {
        if (batchStack.length) {
            const res = fn();
            if (res && res.ok !== false) noteMutation();
            return res;
        }
        beginBatch();
        let res = null;
        let threw = null;
        try { res = fn(); } catch (e) { threw = e; }
        if (threw || !res || res.ok === false) {
            rollbackBatch();
            if (threw) {
                errlog('fs operation threw:', threw);
                return { ok: false, error: '内部错误：' + (threw && threw.message ? threw.message : String(threw)) };
            }
            return res || { ok: false, error: '未知错误' };
        }
        noteMutation();
        const p = commitBatch(label || 'op');
        if (!p.ok) {
            rollbackBatch();
            return { ok: false, error: '存储失败，写入已回滚：' + p.error };
        }
        return res;
    }

    /* ------------------------- 撤销栈（§10 分键） ------------------------- */

    let undoIdx = { cursor: -1, first: 0, last: -1 };

    /* P4：撤销档从「每档一份完整序列化树」改成「一个基线档 + 一串增量档」。
     *
     * 旧写法的代价：每批都要 JSON.stringify 一整棵树再写进去，50 档就是 50 份全树；
     * gcBlobs 还要把 50 份全树 JSON.parse 回来算可达集。文件一多，这两件事都很贵。
     *
     * 新写法：档 k 存「从档 k-1 的状态变到档 k 的状态」的 ops（fwd）与反向的 bwd。
     *   · 省存储：稳态每批只写 O(本批改动)，而不是 O(文件数)
     *   · 省 GC：可达集 = 当前树 ∪ 各档 ops 提到的 hash ∪ 回收站，不必再 parse 50 份全树
     * 兼容旧档：某档只要带 `tree` 就当成「自成一档的基线」，从它往后重放即可，
     * 所以升级前留下的历史不会被废掉。
     *
     * 索引语义不变（first / cursor / last）。可撤销步数**至少**是 UNDO_DEPTH：
     * 增量档很便宜，所以允许栈里多留一些（最多 UNDO_MAX_RECORDS 档），攒够了才压一次新基线。
     * 压缩 = O(链长) 重放 + 一次全树写，摊到 ~150 批一次 —— 旧写法是每批都写全树。
     * 也就是说稳态下能撤销的步数常常比 UNDO_DEPTH 还多，这算白赚，不算失真。 */
    let lastCpSnap = null;        // 最近一档的序列化树（写增量档时做 diff 基准）
    let lastCpSnapIdx = -1;
    let lastCpTrashJson = null;   // 最近一次显式写下的回收站快照（没变就不重复存）

    function safeGetTrash() {
        try { return Store.get(STORE_TRASH, null); } catch (e) { return null; }
    }

    // ops 里提到的内容 hash（增量档的可达集靠它，不用回读全树）
    function opsBlobHashes(ops, used) {
        if (!Array.isArray(ops)) return;
        for (const o of ops) if (o && o.op === 'set' && o.hash) used.add(o.hash);
    }

    /* 取档 k 的序列化树：往回找到最近的「自成一档」（带 tree）的档，再往后重放 fwd。 */
    function undoStateSnap(k) {
        if (k < undoIdx.first || k > undoIdx.last) return null;
        let b = k, base = null;
        while (b >= undoIdx.first) {
            const cp = Store.get(UNDO_PREFIX + b, null);
            if (cp && cp.tree) { base = cp.tree; break; }
            b--;
        }
        if (!base) return null;
        const root = JSON.parse(JSON.stringify(base));   // 深拷贝：重放会就地改这棵树
        for (let i = b + 1; i <= k; i++) {
            const cp = Store.get(UNDO_PREFIX + i, null);
            if (!cp || !Array.isArray(cp.fwd)) return null;
            const r = applyOpsToSnapshot(root, cp.fwd);
            if (!r.ok) return null;
        }
        return root;
    }

    function undoSnapOf(k) {
        if (lastCpSnap && lastCpSnapIdx === k) return lastCpSnap;
        const s = undoStateSnap(k);
        if (s) { lastCpSnap = s; lastCpSnapIdx = k; }
        return s;
    }

    /* 取档 k 当时的回收站：往回找最近一个「显式写过 trash 字段」的档。
     * 基线档一定显式写（哪怕是 null），所以这个回走必然终止。 */
    function undoTrashAt(k) {
        for (let i = k; i >= undoIdx.first; i--) {
            const cp = Store.get(UNDO_PREFIX + i, null);
            if (!cp) continue;
            if (Object.prototype.hasOwnProperty.call(cp, 'trash')) return cp.trash;
        }
        return null;
    }

    /* 在栈顶追加一档。snap 必须是「当前状态」的序列化树。
     * remember(key)：批内调用时传 batchRemember，让 dry/失败回滚能把这一档也还原。 */
    function undoWriteNext(label, snap, remember) {
        const next = undoIdx.last + 1;
        const prev = (undoIdx.last >= undoIdx.first) ? undoSnapOf(undoIdx.last) : null;
        const rec = { v: 5, at: Date.now(), label: label || '' };
        if (prev) {
            rec.fwd = diffSnapshots(prev, snap);
            rec.bwd = diffSnapshots(snap, prev);
        } else {
            rec.base = true;                 // 没有前一档 → 自成一档的基线
            rec.tree = snap;
        }
        // 回收站：内容变了才存，没变就靠 undoTrashAt 往回找（省下每档一份回收站快照）
        const trash = safeGetTrash();
        const tj = trash ? JSON.stringify(trash) : '';
        if (rec.base || lastCpTrashJson !== tj) {
            rec.trash = trash || null;
            lastCpTrashJson = tj;
        }
        if (remember) remember(UNDO_PREFIX + next);
        if (!Store.set(UNDO_PREFIX + next, rec)) return -1;
        undoIdx.last = next;
        undoIdx.cursor = next;
        lastCpSnap = snap;
        lastCpSnapIdx = next;
        return next;
    }

    /* 摊还压缩：栈里堆到 UNDO_MAX_RECORDS 档时，把「只保留最近 UNDO_DEPTH 步」所需的
     * 那一档物化成新基线，并删掉更老的档。 */
    function undoCompactIfNeeded() {
        if (undoIdx.last - undoIdx.first < UNDO_MAX_RECORDS) return false;
        const newFirst = undoIdx.last - UNDO_DEPTH;
        if (newFirst <= undoIdx.first) return false;
        const snap = undoStateSnap(newFirst);
        if (!snap) return false;                     // 链不完整：不冒险，宁可留着旧档
        const trash = undoTrashAt(newFirst);
        const rec = { v: 5, base: true, at: Date.now(), label: 'baseline', tree: snap, trash: trash || null };
        batchRemember(UNDO_PREFIX + newFirst);
        if (!Store.set(UNDO_PREFIX + newFirst, rec)) return false;
        for (let i = undoIdx.first; i < newFirst; i++) {
            batchRemember(UNDO_PREFIX + i);
            Store.del(UNDO_PREFIX + i);
        }
        undoIdx.first = newFirst;
        lastCpTrashJson = trash ? JSON.stringify(trash) : '';
        Store.set(STORE_UNDO_IDX, undoIdx);
        return true;
    }

    /* 就地把档 k 重建成「代表 snap 这个状态」的档（增量档要相对档 k-1 重算 ops）。
     * 用在「批内先物化了一档、之后又写过」的收尾：仍停在栈顶时不追加新档，而是更新它。 */
    function undoRewriteAt(k, label, snap, remember) {
        const prevIdx = k - 1;
        const prev = (prevIdx >= undoIdx.first) ? undoSnapOf(prevIdx) : null;
        const rec = { v: 5, at: Date.now(), label: label || '' };
        if (prev) {
            rec.fwd = diffSnapshots(prev, snap);
            rec.bwd = diffSnapshots(snap, prev);
        } else {
            rec.base = true;
            rec.tree = snap;
        }
        const trash = safeGetTrash();
        const tj = trash ? JSON.stringify(trash) : '';
        if (rec.base || lastCpTrashJson !== tj) {
            rec.trash = trash || null;
            lastCpTrashJson = tj;
        }
        if (remember) remember(UNDO_PREFIX + k);
        if (!Store.set(UNDO_PREFIX + k, rec)) return false;
        if (k === undoIdx.last) { lastCpSnap = snap; lastCpSnapIdx = k; }
        return true;
    }

    function undoSave(label, snap) {
        try {
            truncateRedoBranch();                       // 撤销后再写：重做分支作废（经典撤销栈语义）
            const held = snap || serializeNode(fsData.root, new Set());
            if (undoWriteNext(label, held, null) < 0) return false;
            undoCompactIfNeeded();
            Store.set(STORE_UNDO_IDX, undoIdx);
            return true;
        } catch (e) { warn('undoSave failed:', e); return false; }
    }

    // 撤销过 N 步之后又发生新写入：游标之后的重做分支必须删掉，
    // 否则 undo 会走到「更早那条时间线」的旧档上（错乱）。
    function truncateRedoBranch() {
        if (undoIdx.cursor >= undoIdx.last) return;
        batchRemember(STORE_UNDO_IDX);                  // dry/失败回滚时游标要能还原
        for (let i = undoIdx.cursor + 1; i <= undoIdx.last; i++) {
            batchRemember(UNDO_PREFIX + i);
            Store.del(UNDO_PREFIX + i);
        }
        undoIdx.last = undoIdx.cursor;
        if (lastCpSnapIdx > undoIdx.last) { lastCpSnap = null; lastCpSnapIdx = -1; }
        Store.set(STORE_UNDO_IDX, undoIdx);
    }

    /* S2 修复（批内 undo + redo 不互逆、数据永久丢失）：
     * 撤销栈只在**批次收尾**记档，而 undo/redo 是域内命令、执行时本批的写入还没记档。
     * 于是批内 `undo 1` 会越过本批、直接拨到「上一批」的历史档，`redo 1` 再拨回上一批的档 ——
     * 本批刚写的文件既不在树里、也不在回收站，永久丢失（容器实测：write x1 + write x2 + undo 1 + redo 1）。
     * 修法：批内第一次 undo/redo 之前，把「本批尚未记档的写入」按 §6「一个批次 = 一步」物化成栈顶一档，
     * 之后的 undo/redo 就在包含本批的完整历史上移动；收尾时若栈顶档就代表本批状态，不再追加空档。
     * 纯 undo/redo 批（mutated=false）不动物化，行为与旧版一致。 */
    function flushBatchTip(label) {
        if (!batchStack.length) return;
        const top = batchStack[batchStack.length - 1];
        if (!top.mutated) return;
        // 物化过、且之后没再写过 → 栈顶那一档就是本批当前状态，直接用（undo/redo 各自动游标即可）
        if (top.flushIdx != null && !top.tipDirty) return;
        try {
            truncateRedoBranch();            // 从更早的档写回来：本批旧的重做分支作废
            batchRemember(STORE_UNDO_IDX);
            // 批内不能用 fsSnap（那还是上一批的状态），必须现序列化当前状态
            const next = undoWriteNext(label, serializeNode(fsData.root, new Set()), batchRemember);
            if (next < 0) return;
            undoCompactIfNeeded();
            top.flushIdx = next;
            top.tipDirty = false;
            Store.set(STORE_UNDO_IDX, undoIdx);
        } catch (e) { warn('flushBatchTip failed:', e); }
    }

    function undoLoadCursor() {
        const idx = Store.get(STORE_UNDO_IDX, null);
        undoIdx = (idx && typeof idx.cursor === 'number' && typeof idx.first === 'number' && typeof idx.last === 'number')
            ? idx
            : { cursor: -1, first: 0, last: -1 };
        // 这三个是纯缓存，回滚 / 重载后一律作废、按需重建
        lastCpSnap = null;
        lastCpSnapIdx = -1;
        lastCpTrashJson = null;
    }

    function undoRestore(cursor) {
        const snap = undoStateSnap(cursor);
        if (!snap) return { ok: false, error: '撤销档 #' + cursor + ' 读取失败（历史链不完整）' };
        const trash = undoTrashAt(cursor);
        fsData = { root: deserializeNode(snap, new Map()) };
        batchRemember(STORE_TRASH);      // dry 校验 undo/redo 时回收站也要还原
        if (trash) Store.set(STORE_TRASH, trash);
        else Store.del(STORE_TRASH);
        undoIdx.cursor = cursor;
        batchRemember(STORE_UNDO_IDX);   // dry 校验 undo/redo 时游标也要还原
        Store.set(STORE_UNDO_IDX, undoIdx);
        if (cursor === undoIdx.last) { lastCpSnap = snap; lastCpSnapIdx = cursor; }
        persistFS();
        return { ok: true };
    }

    /* 撤销/重做的回执要说清「这一趟到底动了什么」——只报「回到 #N」等于没说。
       逐路径算出增/删/改，并明确：撤销不是删除，被移出的文件不进回收站，用 redo 能找回。 */
    function collectFileContents(node, prefix, out) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'file') { out[prefix] = String(node.content == null ? '' : node.content); return; }
        const src = node.children || {};
        for (const k of Object.keys(src)) collectFileContents(src[k], prefix === '/' ? '/' + k : prefix + '/' + k, out);
    }

    function treeDiff(beforeRoot, afterRoot) {
        const a = {}, b = {};
        collectFileContents(beforeRoot, '/', a);
        collectFileContents(afterRoot, '/', b);
        const added = [], removed = [], changed = [];
        for (const k of Object.keys(b)) {
            if (!Object.prototype.hasOwnProperty.call(a, k)) added.push(k);
            else if (a[k] !== b[k]) changed.push(k);
        }
        for (const k of Object.keys(a)) if (!Object.prototype.hasOwnProperty.call(b, k)) removed.push(k);
        return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
    }

    function diffNote(d) {
        const seg = [];
        const part = function (sign, list) {
            if (!list.length) return;
            seg.push(sign + list.length + (list.length <= 2 ? ' ' + list.join(' ') : ''));
        };
        part('+', d.added);
        part('-', d.removed);
        part('~', d.changed);
        return seg.length ? '（' + seg.join(' ｜ ') + '）' : '（内容没变化）';
    }

    function fsUndo(steps) {
        steps = Math.max(1, steps | 0 || 1);
        flushBatchTip('batch');          // 批内有未记档的写入：先物化成栈顶一档，undo 才拨得动本批
        const target = undoIdx.cursor - steps;
        if (target < undoIdx.first) {
            return { ok: false, error: '已到最早的可撤销点（还能撤销 ' + Math.max(0, undoIdx.cursor - undoIdx.first) + ' 步）' };
        }
        const before = fsData.root;
        const r = undoRestore(target);
        if (!r.ok) return r;
        noteHistoryJump();
        const d = treeDiff(before, fsData.root);
        return {
            ok: true,
            body: '已撤销 ' + steps + ' 步，回到 #' + target + diffNote(d)
                + (d.removed.length ? '；撤销不是删除，被移出的文件不在回收站，redo 可以找回' : '')
        };
    }

    function fsRedo(steps) {
        steps = Math.max(1, steps | 0 || 1);
        flushBatchTip('batch');          // 同上：批内 redo 也要先看到本批这一档
        const target = undoIdx.cursor + steps;
        if (target > undoIdx.last) {
            return { ok: false, error: '没有可重做的操作（最多 ' + Math.max(0, undoIdx.last - undoIdx.cursor) + ' 步）' };
        }
        const before = fsData.root;
        const r = undoRestore(target);
        if (!r.ok) return r;
        noteHistoryJump();
        const d = treeDiff(before, fsData.root);
        return { ok: true, body: '已重做 ' + steps + ' 步，回到 #' + target + diffNote(d) };
    }

    /* ------------------------- 初始化 ------------------------- */

    // 系统区 / 内部区判定（面板与 AI 权限共用同一口径）：
    //   系统区 = /__sys（蓝）        内部区 = /__sys + /__trash（容器自己管，用户与 AI 都不该删）
    function isSysAreaPath(p) {
        const s = String(p == null ? '' : p);
        const root = SYS_PREFIX.replace(/\/+$/, '');
        return s === root || s.indexOf(SYS_PREFIX) === 0;
    }

    function isInternalAreaPath(p) {
        const s = String(p == null ? '' : p);
        for (const pre of INTERNAL_PREFIXES) {
            const root = pre.replace(/\/+$/, '');
            if (s === root || s.indexOf(pre) === 0) return true;
        }
        return false;
    }

    // 系统区初始化。手册（/__sys/手册.md）的刷新规则 —— 面板现在允许人编辑系统文件，
    // 所以这里**不能**一发现内容不同就覆盖：
    //   · 首次 / 协议换代  → 容器写自己的手册（旧协议的手册没有保留价值）
    //   · 容器这版手册没变  → 什么都不做（人改过的继续留着）
    //   · 手册没被人改过、容器内容升级了 → 静默刷新成新版
    //   · 人改过、容器内容也变了 → 保留**人改的那版**（AI/面板的改动算人的）
    function ensureSystemArea() {
        if (!fsData.root.children['__sys'] || fsData.root.children['__sys'].type !== 'dir') {
            fsData.root.children['__sys'] = newDirNode();
        }
        const sys = fsData.root.children['__sys'];
        const ver = Store.get(STORE_MANUAL_VER, null);
        const manual = buildManual();
        const cur = sys.children['手册.md'];
        const curHash = cur ? simpleHash(String(cur.content || '')) : '';
        const newHash = simpleHash(manual);
        const base = Store.get(STORE_MANUAL_HASH, null);
        if (ver !== PROTO_VERSION || !cur) {
            sys.children['手册.md'] = newFileNode(manual);
            Store.set(STORE_MANUAL_VER, PROTO_VERSION);
            Store.set(STORE_MANUAL_HASH, newHash);
        } else if (base == null && curHash === newHash) {
            Store.set(STORE_MANUAL_HASH, newHash);          // 认领现状（老用户升级上来的第一次）
        } else if (base !== newHash && curHash === base) {
            sys.children['手册.md'] = newFileNode(manual);  // 没人改过 + 容器升级了 → 刷新
            Store.set(STORE_MANUAL_HASH, newHash);
        }
        if (!fsData.root.children['__trash']) fsData.root.children['__trash'] = newDirNode();
    }

    function initFS() {
        undoLoadCursor();
        fsCorrupt = null;
        missingBlobs = [];
        seedPresentBlobs();

        const loaded = readCommittedSnapshot();
        let root = null;
        let source = 'empty';
        if (loaded.ok) {
            root = loaded.root;
            fsHead = { seq: loaded.head.seq, baseSeq: loaded.head.baseSeq, at: loaded.head.at || 0 };
            source = 'head';
        } else if (loaded.reason === 'no-head') {
            // 还没迁到新格式：旧键 dsw2:fs:tree 是唯一来源
            const legacy = Store.get(STORE_TREE, null);
            if (legacy && legacy.root && legacy.root.type === 'dir') {
                root = legacy.root;
                source = 'legacy';
                log('initFS: 从旧格式 fs:tree 迁移到 base+log+head');
            }
            fsHead = { seq: 0, baseSeq: 0, at: 0 };
        } else {
            // 有 head 却读不回来 = 存储损坏。这里**绝不**退化成空容器（那等于把数据抹掉），
            // 先试试旧键兜底，再不行就进只读保护，把数据原样留在存储里等人处理。
            const legacy = Store.get(STORE_TREE, null);
            if (legacy && legacy.root && legacy.root.type === 'dir') {
                root = legacy.root;
                source = 'legacy-fallback';
                warn('initFS: 新格式读取失败（' + loaded.reason + '），已用旧快照兜底');
            } else {
                fsCorrupt = loaded.reason || 'unknown';
                errlog('initFS: 容器树读取失败（' + fsCorrupt + '），已进入只读保护，不覆盖任何数据');
            }
            fsHead = { seq: 0, baseSeq: 0, at: 0 };
        }

        if (root) {
            fsData = { root: deserializeNode(root, new Map()) };
            fsSnap = root;
        } else {
            fsData = { root: newDirNode() };
            fsSnap = null;
        }

        // 内容缺失检测必须在**提交之前**做：查的是「刚从存储里读到的样子」。
        // 放到提交之后再查会被骗过去 —— 那时 serializeNode 已经把读不到内容的文件
        // 重新哈希成空串了（这正是以前「文件悄悄变空还不报错」的坏法）。
        try {
            missingBlobs = findMissingBlobs(fsSnap || serializeNode(fsData.root, new Set()));
            if (missingBlobs.length) {
                warn('initFS: ' + missingBlobs.length + ' 个文件引用的内容在存储里找不到');
                pushLog('内容缺失：' + missingBlobs.length + ' 个文件的正文找不到了（'
                    + missingBlobs.slice(0, 3).map(function (m) { return m.path; }).join('、')
                    + (missingBlobs.length > 3 ? ' 等' : '') + '）；这些文件的引用被原样保留，内容恢复后即可读回', 'error');
            }
        } catch (e) {}

        ensureSystemArea();

        if (!fsCorrupt) {
            const p = persistFS();          // 新容器写 base#0；老容器把手册刷新等改动记进日志；无变化则一个字节不写
            if (!p.ok) warn('initFS: 首次提交失败：' + p.error);
        }

        if (undoIdx.last < 0 && !fsCorrupt) undoSave('init');
        setTimeout(gcBlobs, 5000);
    }

    /* ------------------------- 路径 ------------------------- */

    const PLACEHOLDER_EXACT = /^(filename|placeholder|filepath|path|file|xxx|yyy|zzz|.*完整路径.*|.*路径.*)$/i;
    const ILLEGAL_PATH_CHAR = /[\x00-\x1f\\<>|*?"]/;

    function validatePath(input) {
        if (typeof input !== 'string') return { ok: false, reason: '路径必须是字符串' };
        let p = input.trim();
        if (!p) return { ok: false, reason: '路径为空' };
        p = p.startsWith('/') ? p : '/' + p;
        p = p.replace(/\/{2,}/g, '/');
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
        if (p.length > CONFIG.MAX_PATH_LEN) return { ok: false, reason: '路径超长（>' + CONFIG.MAX_PATH_LEN + '）' };
        if (ILLEGAL_PATH_CHAR.test(p)) return { ok: false, reason: '含非法字符（\\ < > * ? | " 或控制符）' };
        if (p === '/') return { ok: true, path: '/', segments: [], root: true };
        const segments = p.split('/').slice(1);
        if (!segments.length || (segments.length === 1 && segments[0] === '')) return { ok: true, path: '/', segments: [], root: true };
        for (const seg of segments) {
            if (seg === '.' || seg === '..') return { ok: false, reason: '不允许 . 或 .. 片段' };
            if (seg === '') return { ok: false, reason: '空路径段' };
            if (seg !== seg.trim()) return { ok: false, reason: '路径段 "' + seg + '" 首尾有空格' };
            if (seg.length > 120) return { ok: false, reason: '路径段过长："' + seg.slice(0, 20) + '…"' };
            if (isPlaceholderSegment(seg)) return { ok: false, reason: '路径段 "' + seg + '" 是占位符，请替换为真实文件名' };
        }
        return { ok: true, path: p, segments: segments };
    }

    function isPlaceholderSegment(seg) { return PLACEHOLDER_EXACT.test(seg); }

    function resolveNode(path) {
        const v = validatePath(path);
        if (!v.ok) return null;
        if (v.root) return fsData.root;
        let node = fsData.root;
        for (const seg of v.segments) {
            if (!node || node.type !== 'dir') return null;
            node = node.children[seg];
            if (!node) return null;
        }
        return node;
    }

    function resolveFile(path) {
        const n = resolveNode(path);
        return n && n.type === 'file' ? n : null;
    }

    function resolveParentDir(segments) {
        let node = fsData.root;
        for (let i = 0; i < segments.length - 1; i++) {
            if (!node || node.type !== 'dir') return null;
            node = node.children[segments[i]];
        }
        return node && node.type === 'dir' ? node : null;
    }

    // §3.3 慷慨默认：write 自动建父目录
    function ensureParentDir(segments, autoCreate) {
        let node = fsData.root;
        const created = [];
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            const child = node.children[seg];
            if (!child) {
                if (!autoCreate) return { ok: false, error: '父目录 /' + segments.slice(0, i + 1).join('/') + ' 不存在' };
                node.children[seg] = newDirNode();
                created.push('/' + segments.slice(0, i + 1).join('/'));
            } else if (child.type !== 'dir') {
                return { ok: false, error: '/' + segments.slice(0, i + 1).join('/') + ' 是文件不是目录' };
            }
            node = node.children[seg];
        }
        return { ok: true, parent: node, created: created };
    }

    /* ------------------------- 上下文片段 ------------------------- */

    function buildCtx(lines, from, to, pad) {
        const ctxFrom = Math.max(1, from - pad);
        const ctxTo = Math.min(lines.length, to + pad);
        const out = [];
        for (let li = ctxFrom; li <= ctxTo; li++) {
            const mark = (li >= from && li <= to) ? '>' : ' ';
            out.push(mark + ' ' + li + '| ' + String(lines[li - 1] == null ? '' : lines[li - 1]));
        }
        return out;
    }

    function buildCtxHeadTail(lines) {
        const n = lines.length;
        const K = 3;
        const out = [];
        if (n <= 2 * K + 1) {
            for (let i = 1; i <= n; i++) out.push('  ' + i + '| ' + String(lines[i - 1] == null ? '' : lines[i - 1]));
            return out;
        }
        for (let i = 1; i <= K; i++) out.push('  ' + i + '| ' + String(lines[i - 1] == null ? '' : lines[i - 1]));
        out.push('  ... 省略 ' + (n - 2 * K) + ' 行 ...');
        for (let i = n - K + 1; i <= n; i++) out.push('  ' + i + '| ' + String(lines[i - 1] == null ? '' : lines[i - 1]));
        return out;
    }

    /* ------------------------- 邻近候选（错误即答案） ------------------------- */

    // 同目录 + 全树的近似路径候选（用于"路径不存在"）
    function similarPaths(badPath, limit) {
        limit = limit || 3;
        const target = String(badPath || '');
        const base = target.slice(0, target.lastIndexOf('/') + 1) || '/';
        const name = target.slice(target.lastIndexOf('/') + 1);
        const scored = [];
        const walk = function (node, prefix, depth) {
            if (depth > 6 || !node || node.type !== 'dir') return;
            for (const k of Object.keys(node.children)) {
                const p = prefix + k;
                const child = node.children[k];
                const isDir = child.type === 'dir';
                const s = similarity(name.toLowerCase(), k.toLowerCase());
                const near = p.startsWith(base) ? 0.25 : 0;
                if (s > 0.45 || (near && /^[\w.\-]{0,12}$/.test(name))) scored.push({ path: p + (isDir ? '/' : ''), score: Math.min(1, s + near), type: child.type });
                if (isDir) walk(child, p + '/', depth + 1);
            }
        };
        walk(fsData.root, '/', 1);
        scored.sort(function (a, b) { return b.score - a.score; });
        const out = [];
        const seen = new Set();
        for (const s of scored) {
            if (seen.has(s.path)) continue;
            seen.add(s.path);
            out.push(s);
            if (out.length >= limit) break;
        }
        return out;
    }

    function findSimilarLines(content, target, topN) {
        topN = topN || 2;
        const lines = String(content).split('\n');
        const targetNorm = String(target).split('\n')[0].trim().replace(/\s+/g, ' ');
        if (!targetNorm) return [];
        const scored = [];
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i].trim().replace(/\s+/g, ' ');
            if (!ln) continue;
            const maxLen = Math.max(ln.length, targetNorm.length);
            const minLen = Math.min(ln.length, targetNorm.length);
            if (maxLen && minLen / maxLen < 0.4) continue;
            const score = similarity(ln, targetNorm);
            if (score > 0.5) scored.push({ line: i + 1, text: lines[i], score: score });
        }
        scored.sort(function (a, b) { return b.score - a.score; });
        if (scored.length) return scored.slice(0, topN);
        // v2.0.2 兜底：手册 §8 承诺「片段未找到」也要给候选行，但上面的长度剪枝（minLen/maxLen < 0.4）
        // 与 0.5 阈值会把「短行 vs 长片段」（如片段 nonexistent-xyz 对文件里的 alpha）全滤掉，
        // 回执只剩一句光秃秃的「片段未找到」——AI 拿不到任何参照，只能盲猜（容器实测抓到）。
        // 这里放宽：不剪枝、不设阈值，取最相似的两行（score 一并回显，AI 可自行判断可信度）。
        const weak = [];
        for (let wi = 0; wi < lines.length; wi++) {
            const wln = lines[wi].trim().replace(/\s+/g, ' ');
            if (!wln) continue;
            weak.push({ line: wi + 1, text: lines[wi], score: similarity(wln, targetNorm) });
        }
        weak.sort(function (a, b) { return b.score - a.score; });
        return weak.slice(0, topN);
    }

    /* ------------------------- 写 ------------------------- */

    function fsWrite(path, content, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'write', path: path, error: v.reason };
        if (v.root) return { ok: false, op: 'write', path: '/', error: '不能把根目录写成文件' };
        content = String(content == null ? '' : content);
        const contentBytes = byteLen(content);
        if (contentBytes > CONFIG.MAX_FILE_SIZE) {
            return { ok: false, op: 'write', path: v.path, error: '单文件超限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) + '（当前 ' + fmtSize(contentBytes) + '），请拆分或改用 append' };
        }
        return withAtomicWrite(function () {
            const pRes = ensureParentDir(v.segments, true);
            if (pRes.ok === false) return { ok: false, op: 'write', path: v.path, error: pRes.error };
            const parent = pRes.parent;
            const name = v.segments[v.segments.length - 1];
            const existing = parent.children[name];
            if (existing && existing.type === 'dir') {
                return { ok: false, op: 'write', path: v.path, error: v.path + ' 是已存在的目录，不能覆盖为文件' };
            }
            if (existing && flags.exclusive) {
                return { ok: false, op: 'write', path: v.path, error: '文件已存在（exclusive）：' + v.path };
            }
            parent.children[name] = newFileNode(content);
            const res = {
                ok: true, op: 'write', path: v.path, size: contentBytes, hash: contentHash(content),
                created: !existing, overwritten: !!existing, autoMkdir: pRes.created, changes: [v.path]
            };
            if (existing) {
                const old = String(existing.content == null ? '' : existing.content);
                res.prevSize = byteLen(old);
                res.lines = [old.split('\n').length, content.split('\n').length];
            }
            return res;
        }, 'write ' + v.path);
    }

    function fsAppend(path, content, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'append', path: path, error: v.reason };
        content = String(content == null ? '' : content);
        if (!resolveFile(v.path)) {
            const r = fsWrite(v.path, content, flags);
            if (r.ok) { r.op = 'append'; r.created = true; }
            return r;
        }
        return withAtomicWrite(function () {
            const node = resolveFile(v.path);
            if (!node) return { ok: false, op: 'append', path: v.path, error: '文件不存在：' + v.path };
            const before = node.content;
            const beforeBytes = byteLen(before);
            const addBytes = byteLen(content);
            if (beforeBytes + addBytes > CONFIG.MAX_FILE_SIZE) {
                const room = CONFIG.MAX_FILE_SIZE - beforeBytes;
                return {
                    ok: false, op: 'append', path: v.path,
                    error: '追加后超过上限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) + '（已有 ' + fmtSize(beforeBytes) + '，剩余 ' + fmtSize(Math.max(0, room)) + '）',
                    suggest: '可分块：本次最多追加 ' + Math.max(0, room) + ' 字节'
                };
            }
            const sep = (before.length && !before.endsWith('\n')) ? '\n' : '';
            setFileContent(node, before + sep + content);
            node.mtime = Date.now();
            return {
                ok: true, op: 'append', path: v.path, size: byteLen(node.content),
                appended: addBytes, changes: [v.path]
            };
        }, 'append ' + v.path);
    }

    /* ---- 19：路径「不存在」时要能说清为什么（当前状态 vs 历史状态） ----
     * VFS 只回答「现在有没有」，但用户真正要问的常常是「刚才发生过什么」：
     *   · 这个路径只在 dry 批次里出现过（预演过但没落盘）→ 提示去掉 dry 重跑
     *   · 这个路径被删过（内容在回收站里）→ 直接给出 restore 序号指引
     * 只记路径集合，不记内容，成本一行；跨会话清零。
     */
    const drySeen = new Set();
    function noteDryPath(p) { if (p) drySeen.add(String(p)); }
    function drySeenHas(p) { return drySeen.has(String(p)); }
    function forgetDryPath(p) { drySeen.delete(String(p)); }
    function resetDrySeen() { drySeen.clear(); }

    // 回收站里有没有这个源路径（条目里存的是 src）
    function trashEntryForPath(p) {
        try {
            const trash = Store.get(STORE_TRASH, null);
            if (!trash || !Array.isArray(trash.items)) return null;
            for (const it of trash.items) if (it && it.src === p && it.name) return TRASH_PREFIX + it.name;
        } catch (e) {}
        return null;
    }

    // 统一的「路径不存在」失败：能说清原因就说清
    function missingPathFail(op, p) {
        const dry = drySeenHas(p);
        const trashed = dry ? null : trashEntryForPath(p);
        if (dry) {
            return {
                ok: false, op: op, path: p, kind: 'path', candidates: similarPaths(p, 3),
                error: p + ' 不存在：它只在本会话的 dry 批次里出现过（预演过、没有真正落盘）',
                fix: '去掉 dry 重跑那一条命令（dry 只校验不写入）'
            };
        }
        if (trashed) {
            return {
                ok: false, op: op, path: p, kind: 'path', candidates: similarPaths(p, 3),
                error: p + ' 不存在：它已被删除，内容在回收站 ' + trashed + ' 里',
                fix: 'restore list 看序号，再 restore <序号>（或 read ' + trashed + ' 直接看）'
            };
        }
        return { ok: false, op: op, path: p, kind: 'path', error: p + ' 不存在', candidates: similarPaths(p, 3) };
    }

    /* ------------------------- 读 ------------------------- */

    function fsRead(path, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'read', path: path, error: v.reason };
        let node = resolveNode(v.path);
        if (!node) node = trashVirtualNode(v.path);   // 回收站条目：能 read，但只经这一条只读通道
        if (!node) {
            return missingPathFail('read', v.path);
        }
        if (node.type === 'dir') {
            const virt = trashVirtualOf(v.path);          // read <目录> 与 list 同口径（回收站同源，D9）
            const names = mergedChildNames(node, virt);
            const rows = names.map(function (n) {
                const c = mergedChild(node, virt, n);
                return n + (c.type === 'dir' ? '/' : '  ' + fmtSize(byteLen(c.content)));
            });
            return { ok: true, op: 'read', path: v.path, type: 'dir', entries: names, body: rows.length ? rows : ['(空目录)'] };
        }
        const raw = String(node.content == null ? '' : node.content);
        const lines = raw.split('\n');
        let start = 1, end = lines.length;
        // head=N / tail=N（E2）：只看文件头尾，不必先知道总行数；与显式行区间同时给时以行区间为准
        const wantHead = positiveInt(flags.head);
        const wantTail = positiveInt(flags.tail);
        if (flags.head != null && !wantHead) {
            return { ok: false, op: 'read', path: v.path, error: 'head 需要一个正整数行数', kind: 'syntax', fix: 'read ' + v.path + ' head=20' };
        }
        if (flags.tail != null && !wantTail) {
            return { ok: false, op: 'read', path: v.path, error: 'tail 需要一个正整数行数', kind: 'syntax', fix: 'read ' + v.path + ' tail=20' };
        }
        const range = flags.lineRange;
        let sliced = false;
        if (Array.isArray(range)) {
            start = clamp(range[0] | 0, 1, Math.max(1, lines.length));
            end = clamp(range[1] | 0, start, Math.max(1, lines.length));
        } else if (wantHead) {
            end = Math.min(lines.length, wantHead); sliced = true;
        } else if (wantTail) {
            start = Math.max(1, lines.length - wantTail + 1); sliced = true;
        }
        let body;
        if (sliced) body = lines.slice(start - 1, end).map(function (l, i) { return { line: start + i, text: l }; });
        else if (range) body = lines.slice(start - 1, end).map(function (l, i) { return { line: start + i, text: l }; });
        else if (flags.numbered) body = lines.map(function (l, i) { return { line: i + 1, text: l }; });
        else body = null;
        return {
            ok: true, op: 'read', path: v.path, type: 'file', size: byteLen(raw),
            totalLines: lines.length, mtime: node.mtime, lines: body, range: (range || sliced) ? [start, end] : null,
            raw: raw
        };
    }

    function fsReadRaw(path) {
        const node = resolveFile(path);
        if (!node) return { ok: false, error: '文件不存在：' + path };
        return { ok: true, path: path, content: String(node.content == null ? '' : node.content), mtime: node.mtime };
    }

    function fsList(path, flags) {
        flags = flags || {};
        const p = path || '/';
        const v = validatePath(p);
        if (!v.ok) return { ok: false, op: 'list', path: p, error: v.reason };
        let node = resolveNode(v.path);
        if (!node) node = trashVirtualNode(v.path);
        if (!node) return { ok: false, op: 'list', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };
        if (node.type === 'file') {
            return { ok: true, op: 'list', path: v.path, type: 'file', body: [v.path + '  ' + fmtSize(byteLen(node.content))] };
        }
        // 回收站是「虚拟目录」：真实子节点与 Store 条目合并成同一份列表（D9）
        const virtOf = trashVirtualOf;
        const namesOf = mergedChildNames;
        // A10：`list <目录> recursive` 以前被静默吞掉（不报错、也不递归），现在真递归
        const deep = !!(flags.recursive || flags.deep);
        const entries = [];
        const rows = [];
        let truncated = false;   // 6.2：深度/条目上限是静默截断 → 结果里明说，别让用户以为列全了
        const walk = function (n, virt, prefix, pathPrefix, depth) {
            if (depth > 8 || rows.length > 400) { truncated = true; return; }
            for (const name of namesOf(n, virt)) {
                if (rows.length > 400) { truncated = true; return; }
                const c = mergedChild(n, virt, name);
                if (!c) continue;
                rows.push(prefix + name + (c.type === 'dir' ? '/' : '  ' + fmtSize(byteLen(c.content))));
                if (depth === 1) entries.push(name);
                if (deep && c.type === 'dir') walk(c, virtOf(pathPrefix + name + '/'), prefix + '  ', pathPrefix + name + '/', depth + 1);
            }
        };
        walk(node, virtOf(v.path), '', v.path, 1);
        return { ok: true, op: 'list', path: v.path, type: 'dir', entries: entries, body: rows.length ? rows.concat(truncated ? ['…（已达深度 8 / 条目 400 上限，可能未列全）'] : []) : ['(空目录)'], recursive: deep || undefined, truncated: truncated || undefined };
    }

    function fsTree(path) {
        const p = path || '/';
        const v = validatePath(p);
        if (!v.ok) return { ok: false, op: 'tree', path: p, error: v.reason };
        const node = resolveNode(v.path);
        if (!node) return { ok: false, op: 'tree', path: v.path, error: v.path + ' 不存在' };
        const out = [];
        const walk = function (n, prefix, depth) {
            if (depth > 8 || out.length > 400) return;
            if (n.type !== 'dir') return;
            const virt = prefix === TRASH_PREFIX ? trashVirtualMap() : null;   // 回收站虚拟条目（D9）
            const names = Object.keys(n.children).sort();
            for (const name of names) {
                const c = n.children[name];
                out.push(prefix + name + (c.type === 'dir' ? '/' : '  ' + fmtSize(byteLen(c.content))));
                if (c.type === 'dir') walk(c, prefix + name + '/', depth + 1);
            }
            if (virt) for (const name of Object.keys(virt).sort()) {
                if (out.length > 400) return;
                if (n.children[name]) continue;
                const c = virt[name];
                out.push(prefix + name + (c.type === 'dir' ? '/' : '  ' + fmtSize(byteLen(c.content))));
            }
        };
        if (node.type === 'file') return { ok: true, op: 'tree', path: v.path, type: 'file', body: [v.path] };
        walk(node, v.path === '/' ? '/' : v.path + '/', 1);
        return { ok: true, op: 'tree', path: v.path, type: 'dir', body: out.length ? out : ['(空)'] };
    }

    function fsStat(path) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'stat', path: path, error: v.reason };
        let node = resolveNode(v.path);
        if (!node) node = trashVirtualNode(v.path);
        if (!node) return { ok: false, op: 'stat', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };
        if (node.type === 'dir') {
            let files = 0, dirs = 0, bytes = 0;
            const walk = function (n) {
                for (const k of Object.keys(n.children)) {
                    const c = n.children[k];
                    if (c.type === 'dir') { dirs++; walk(c); } else { files++; bytes += byteLen(c.content); }
                }
            };
            walk(node);
            // 回收站目录：把 Store 里的条目也算进统计，别让 stat /__trash 恒为 0（D9）
            if (v.path === trashRootPath()) {
                const virt = trashVirtualMap();
                for (const k of Object.keys(virt)) {
                    if (node.children[k]) continue;
                    if (virt[k].type === 'dir') dirs++; else { files++; bytes += byteLen(virt[k].content); }
                }
            }
            return { ok: true, op: 'stat', path: v.path, type: 'dir', body: ['type=dir files=' + files + ' dirs=' + dirs + ' bytes=' + bytes] };
        }
        const c = String(node.content == null ? '' : node.content);
        const cBytes = byteLen(c);
        // chars：以「码点」计的字符数（E5）——中文/emoji 下它与 UTF-16 的 .length、与字节数都不同，
        // 判断「这段文本到底多长」时比 bytes 更贴近直觉。
        let chars = 0;
        for (const _ of c) chars++;
        return {
            ok: true, op: 'stat', path: v.path, type: 'file',
            // mtime 一起给：两次 stat/read 数字对不上时，先看时间戳就知道是「文件真变过」还是「读取有问题」
            body: ['type=file size=' + fmtSize(cBytes) + '(' + cBytes + 'B) chars=' + chars + ' lines=' + c.split('\n').length
                + ' hash=' + contentHash(c) + ' mtime=' + fmtClock(node.mtime || 0)]
        };
    }

    /* ------------------------- 全容器检索 ------------------------- */

    // grep 的 ext 过滤（E1）：`ext=js,md` / `ext=.js` / `ext=*.js` 都认；空 → 不过滤
    function parseExtFilter(raw) {
        if (raw == null || raw === true || raw === '') return null;
        const parts = String(raw).split(/[\s,，、]+/).filter(Boolean);
        const list = parts.map(function (x) {
            return String(x).replace(/^\*+/, '').replace(/^\.+/, '').toLowerCase();
        }).filter(Boolean);
        return list.length ? list : null;
    }

    // 正整数开关（head / tail / limit）；非法值 → null（由调用方决定是报错还是用默认）
    function positiveInt(raw) {
        if (raw == null || raw === true) return null;
        const n = parseInt(String(raw), 10);
        return (isFinite(n) && n > 0) ? n : null;
    }

    // grep 一次扫描的硬上限：limit=N 可以调高命中数，但不许把回执撑爆
    const GREP_HARD_LIMIT = 2000;

    function fsGrep(basePath, pattern, flags) {
        flags = flags || {};
        const v = validatePath(basePath || '/');
        if (!v.ok) return { ok: false, op: 'grep', path: basePath, error: v.reason };
        const node = resolveNode(v.path);
        if (!node) return { ok: false, op: 'grep', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };

        let test;
        let re = null;
        if (flags.regex) {
            try { re = new RegExp(pattern, flags.ignoreCase ? 'i' : ''); }
            catch (e) { return { ok: false, op: 'grep', error: '正则无效：' + (e && e.message ? e.message : String(e)), kind: 'regex' }; }
            test = function (line) { return re.test(line); };
        } else {
            const needle = flags.ignoreCase ? String(pattern).toLowerCase() : String(pattern);
            test = function (line) {
                return (flags.ignoreCase ? line.toLowerCase() : line).indexOf(needle) !== -1;
            };
        }
        if (!flags.regex && String(pattern).length === 0) {
            return { ok: false, op: 'grep', error: '搜索词为空', kind: 'syntax' };
        }
        const match = flags.invert ? function (l) { return !test(l); } : test;
        const extList = parseExtFilter(flags.ext);
        const extOk = function (p) {
            if (!extList) return true;
            const base = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
            for (const e of extList) if (base === e || base.slice(-(e.length + 1)) === '.' + e) return true;
            return false;
        };
        const limit = Math.min(positiveInt(flags.limit) || CONFIG.GREP_MAX_HITS, GREP_HARD_LIMIT);
        // ctx=N：命中的每一处再带 N 行前后文（硬顶 50，避免一次回执被上下文淹没）
        const ctxN = Math.min(positiveInt(flags.ctx) || 0, 50);

        const hits = [];
        const files = [];              // 每个有命中的文件及其命中处数（-l / -c 直接用）
        let scanned = 0;
        let totalHits = 0;

        // 去重防护（反馈 二·4）：无论上游怎么走到这里，同一个「路径:行」最多算一处命中。
        // 容器实测出现过「同一行被回了几百遍、只有锚点号在变」——回执侧不能再放大它。
        const seenHitKeys = new Set();
        const scanFile = function (p, content) {
            const lines = String(content == null ? '' : content).split('\n');
            let n = 0;
            for (let i = 0; i < lines.length; i++) {
                if (!match(lines[i])) continue;
                const dedupKey = p + ':' + (i + 1);
                if (seenHitKeys.has(dedupKey)) continue;
                seenHitKeys.add(dedupKey);
                n++;
                if (totalHits + n - 1 < limit) {
                    const hit = { path: p, line: i + 1, text: lines[i] };
                    if (ctxN) {
                        const before = [], after = [];
                        for (let k = Math.max(0, i - ctxN); k < i; k++) before.push({ line: k + 1, text: lines[k] });
                        for (let k = i + 1; k <= Math.min(lines.length - 1, i + ctxN); k++) after.push({ line: k + 1, text: lines[k] });
                        hit.before = before;
                        hit.after = after;
                    }
                    hits.push(hit);
                }
            }
            if (n) { files.push({ path: p, count: n }); totalHits += n; }
        };

        if (node.type === 'file') {
            if (extOk(v.path)) { scanned = 1; scanFile(v.path, node.content); }
        } else {
            const walk = function (n, prefix) {
                const names = Object.keys(n.children).sort();
                for (const name of names) {
                    const c = n.children[name];
                    const p = prefix + name;
                    if (c.type === 'dir') { walk(c, p + '/'); continue; }
                    // 只有回收站不参与 grep：/__trash 里是已删文件的副本，搜出来会把「已删除的内容」
                    // 当成命中（误导）。系统区 /__sys 是可搜的（手册也这么承诺）。
                    if (p.indexOf(TRASH_PREFIX) === 0) continue;
                    if (!extOk(p)) continue;
                    scanned++;
                    scanFile(p, c.content);
                }
            };
            walk(node, v.path === '/' ? '/' : v.path + '/');
        }
        return {
            ok: true, op: 'grep', path: v.path, hits: hits, files: files,
            scanned: scanned, totalHits: totalHits, limit: limit,
            truncated: totalHits > hits.length
        };
    }

    /* ------------------------- 路径匹配 / 找文件（find） ------------------------- */

    // 段级 glob：`*` = 段内任意（不跨 `/`），`?` = 段内一个字符，其余按字面量。
    function globSegRe(seg, ci) {
        let re = '';
        for (const ch of String(seg)) {
            if (ch === '*') re += '[^/]*';
            else if (ch === '?') re += '[^/]';
            else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        return new RegExp('^' + re + '$', ci ? 'i' : '');
    }

    // 整路径 glob：`**` 跨任意层（含 0 层）。带记忆化，避免深层目录指数级回溯。
    function globPathMatch(rel, pattern, ci) {
        const pat = String(pattern).split('/').filter(function (s) { return s !== ''; });
        const segs = String(rel).split('/').filter(function (s) { return s !== ''; });
        const memo = new Map();
        const go = function (pi, si) {
            const key = pi + ',' + si;
            if (memo.has(key)) return memo.get(key);
            let res;
            if (pi === pat.length) res = (si === segs.length);
            else if (pat[pi] === '**') {
                res = false;
                for (let k = si; k <= segs.length; k++) { if (go(pi + 1, k)) { res = true; break; } }
            } else if (si >= segs.length) res = false;
            else res = globSegRe(pat[pi], ci).test(segs[si]) && go(pi + 1, si + 1);
            memo.set(key, res);
            return res;
        };
        return go(0, 0);
    }

    function hasGlobChars(s) { return /[*?]/.test(String(s == null ? '' : s)); }

    function isTrashPath(p) { return String(p).indexOf(TRASH_PREFIX) === 0; }

    // 相对路径（相对搜索根），用于 find / glob 的匹配
    function relToBase(abs, basePrefix) {
        if (!basePrefix) return abs.slice(abs.indexOf('/') === 0 ? 1 : 0);
        return abs.slice(basePrefix.length + 1);
    }

    /* find：按名字/路径找文件或目录（glob）。与 grep 的分工：
     *   grep = 找**内容**；find = 找**文件和目录名**。以前 find 是 grep 的别名（反直觉），已纠正。 */
    function fsFind(basePath, pattern, flags) {
        flags = flags || {};
        const v = validatePath(basePath || '/');
        if (!v.ok) return { ok: false, op: 'find', path: basePath, error: v.reason };
        const node = resolveNode(v.path) || trashVirtualNode(v.path);
        if (!node) return { ok: false, op: 'find', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };

        const ci = !!flags.ignoreCase;
        const pat = String(pattern == null ? '' : pattern).trim() || '*';
        const full = pat.indexOf('/') >= 0;
        const extList = parseExtFilter(flags.ext);
        const onlyDirs = !!flags.dirs;
        const maxDepth = Math.min(positiveInt(flags.depth) || 24, 24);
        const limit = Math.min(positiveInt(flags.limit) || 200, 1000);
        // 最近改动（反馈 许愿·5）：since=10m / recent=2h → 只看这之后改过的文件；sort=mtime → 按改动时间倒序
        const sinceMs = flags.since == null ? null : parseDurationMs(flags.since);
        const sinceAt = (sinceMs != null && sinceMs > 0) ? (Date.now() - sinceMs) : null;
        const sortByMtime = String(flags.sort == null ? '' : flags.sort).toLowerCase() === 'mtime';
        const basePrefix = v.path === '/' ? '' : v.path;
        const matches = [];
        let truncated = false;
        const extOk = function (name) {
            if (!extList) return true;
            const b = name.toLowerCase();
            for (const e of extList) if (b === e || b.slice(-(e.length + 1)) === '.' + e) return true;
            return false;
        };
        const walk = function (n, absDir, depth) {
            const names = Object.keys(n.children).sort();
            for (const name of names) {
                if (matches.length >= limit) { truncated = true; return; }
                const c = n.children[name];
                const abs = absDir + '/' + name;
                if (isTrashPath(abs)) continue;
                const isDir = c.type === 'dir';
                const rel = relToBase(abs, basePrefix);
                const target = full ? rel : name;
                // 类型过滤：dirs= 只看目录；给了 ext= 就只看文件（目录没有扩展名，不该混进来）
                const typePass = onlyDirs ? isDir : (extList ? (!isDir && extOk(name)) : true);
                const mt = isDir ? 0 : (c.mtime || 0);
                if (typePass && (sinceAt == null || mt >= sinceAt) && globPathMatch(target, pat, ci)) {
                    matches.push({ path: abs + (isDir ? '/' : ''), type: isDir ? 'dir' : 'file', size: isDir ? 0 : byteLen(c.content), mtime: mt });
                }
                if (isDir && depth < maxDepth) walk(c, abs, depth + 1);
            }
        };
        if (node.type === 'file') {
            const mt = node.mtime || 0;
            if ((sinceAt == null || mt >= sinceAt) && globPathMatch(v.path.split('/').pop(), pat, ci)) {
                matches.push({ path: v.path, type: 'file', size: byteLen(node.content), mtime: mt });
            }
        } else {
            walk(node, basePrefix, 1);
        }
        if (sortByMtime) matches.sort(function (a, b) { return (b.mtime || 0) - (a.mtime || 0); });
        return {
            ok: true, op: 'find', path: v.path, pattern: pat, matches: matches, truncated: truncated, limit: limit,
            sinceAt: sinceAt, sinceRaw: (sinceAt != null ? String(flags.since) : null), sortByMtime: sortByMtime
        };
    }

    /* 把 glob 源展开成有序路径列表（merge 的源用它）。
     * 返回 { ok, files:[路径], dirs:[路径], truncated }；`**` 可跨目录，普通 `*` 不跨。 */
    function expandGlobPaths(pattern, flags) {
        flags = flags || {};
        const raw = String(pattern == null ? '' : pattern).trim();
        if (!raw) return { ok: false, error: '空模式' };
        const abs = raw.startsWith('/') ? raw : '/' + raw;
        const segs = abs.split('/').filter(function (s) { return s !== ''; });
        // 找到「第一个带 glob 的段」，之前的都是字面前缀 = 搜索根
        let cut = 0;
        while (cut < segs.length && !hasGlobChars(segs[cut])) cut++;
        const base = '/' + segs.slice(0, cut).join('/');
        const rest = segs.slice(cut).join('/');
        if (!rest) return { ok: true, files: [base], dirs: [], truncated: false };
        const bv = validatePath(base || '/');
        if (!bv.ok) return { ok: false, error: bv.reason };
        const node = resolveNode(bv.path);
        if (!node) return { ok: false, error: bv.path + ' 不存在' };
        const ci = !!flags.ignoreCase;
        const maxDepth = Math.min(positiveInt(flags.depth) || 24, 24);
        const limit = Math.min(positiveInt(flags.limit) || 500, 2000);
        const basePrefix = bv.path === '/' ? '' : bv.path;
        const files = [], dirs = [];
        let truncated = false;
        const walk = function (n, absDir, depth) {
            for (const name of Object.keys(n.children).sort()) {
                if (files.length + dirs.length >= limit) { truncated = true; return; }
                const c = n.children[name];
                const abs = absDir + '/' + name;
                if (isTrashPath(abs)) continue;
                const isDir = c.type === 'dir';
                const rel = relToBase(abs, basePrefix);
                if (globPathMatch(rel, rest, ci)) { if (isDir) dirs.push(abs + '/'); else files.push(abs); }
                if (isDir && depth < maxDepth) walk(c, abs, depth + 1);
            }
        };
        if (node.type === 'file') { if (globPathMatch(bv.path.split('/').pop(), rest, ci)) files.push(bv.path); }
        else walk(node, basePrefix, 1);
        return { ok: true, files: files, dirs: dirs, truncated: truncated };
    }

    /* ------------------------- merge（按序拼接） ------------------------- */

    /* 把 srcPaths 按给定顺序首尾拼接成一个文件。
     * 关键点：**顺序由调用方给定**（AI 可以按 01/02/03 排序，或直接列路径），
     * 程序只做「读 → 拼 → 一次写」，内容不经过聊天正文（大文件也不会被平台吞）。
     * 相邻文件之间：若前一段非空且不以换行结尾，补一个换行 —— 否则「没有结尾换行的文件」
     * 会和后一个文件粘成一行（首尾拼接不等于粘成一行）。 */
    function fsMerge(targetPath, srcPaths, flags) {
        flags = flags || {};
        const vt = validatePath(targetPath);
        if (!vt.ok) return { ok: false, op: 'merge', path: targetPath, error: vt.reason };
        if (vt.root) return { ok: false, op: 'merge', path: '/', error: '不能把合并结果写成根目录' };
        if (!srcPaths || !srcPaths.length) {
            return { ok: false, op: 'merge', path: vt.path, kind: 'syntax', error: 'merge 没有源文件', fix: 'merge ' + vt.path + ' /a.md /b.md（按顺序列出源文件）' };
        }
        const seen = Object.create(null);
        const parts = [];
        let totalBytes = 0;
        for (const raw of srcPaths) {
            const p = resolvePathArg(raw, '/');
            if (p === vt.path) return { ok: false, op: 'merge', path: vt.path, error: '源文件里包含目标自己：' + p };
            if (seen[p]) continue;                 // 同一源重复列出只取一次
            seen[p] = 1;
            const v = validatePath(p);
            if (!v.ok) return { ok: false, op: 'merge', path: vt.path, error: '源路径非法：' + p };
            const n = resolveFile(v.path);
            if (!n) return { ok: false, op: 'merge', path: vt.path, kind: 'path', error: '源文件不存在：' + p, candidates: similarPaths(v.path, 3) };
            const text = String(n.content == null ? '' : n.content);
            parts.push({ path: v.path, text: text });
            totalBytes += byteLen(text);
        }
        let joined = '';
        for (const seg of parts) {
            if (joined && !joined.endsWith('\n') && seg.text) joined += '\n';
            joined += seg.text;
        }
        if (byteLen(joined) > CONFIG.MAX_FILE_SIZE) {
            return { ok: false, op: 'merge', path: vt.path, error: '合并结果超过单文件上限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) + '（当前 ' + fmtSize(byteLen(joined)) + '），请拆成多个 merge' };
        }
        return withAtomicWrite(function () {
            const pRes = ensureParentDir(vt.segments, true);
            if (pRes.ok === false) return { ok: false, op: 'merge', path: vt.path, error: pRes.error };
            const name = vt.segments[vt.segments.length - 1];
            const existing = pRes.parent.children[name];
            if (existing && existing.type === 'dir') {
                return { ok: false, op: 'merge', path: vt.path, error: vt.path + ' 是已存在的目录' };
            }
            if (existing && !flags.force) {
                return { ok: false, op: 'merge', path: vt.path, kind: 'danger', error: '目标已存在：' + vt.path + '（加 force 覆盖）' };
            }
            pRes.parent.children[name] = newFileNode(joined);
            return {
                ok: true, op: 'merge', path: vt.path, changes: [vt.path], structure: true,
                created: !existing, size: byteLen(joined), hash: contentHash(joined),
                lines: joined.split('\n').length, sources: parts.map(function (s) { return s.path; })
            };
        }, 'merge ' + vt.path);
    }

    /* ------------------------- split（按行数 / 分隔符切分） ------------------------- */

    /* split 是 merge 的逆操作：把一个**大文件**切成多片，内容同样不经过聊天正文。
     *   · 按行数：split /big.md 500（或 chunk=500）→ 每片 500 行；
     *   · 按分隔符：split /doc.md sep=###（分隔符**走 sep=**，不写裸词）→ 两个分隔符行之间一片，分隔符本身不进任何片；
     *   · 输出：同目录下 `<名>.p1<后缀>`、`<名>.p2<后缀>…`；`to=/目录` 换输出目录；目标存在要 force。
     * 整批原子（一片失败全部回滚）；写进内部区（/__sys、/__trash）一律拒绝（权限，不是便利）。 */
    const SPLIT_MAX_PARTS = 500;
    function fsSplit(path, opts) {
        opts = opts || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'split', path: path, error: v.reason };
        const node = resolveFile(v.path);
        if (!node) return missingPathFail('split', v.path);
        const raw = String(node.content == null ? '' : node.content);
        if (!raw) return { ok: false, op: 'split', path: v.path, error: '文件是空的，没有可分的内容' };
        // 结尾换行不算「一片」：先把行尾空元素摘掉，片间/结尾的换行按原样补回，
        // 这样 split 出来的片用 merge 拼回去能逐字节还原（split/merge 互为逆运算）。
        const allLines = raw.split('\n');
        const endsNl = allLines.length > 1 && allLines[allLines.length - 1] === '';
        const lines = endsNl ? allLines.slice(0, -1) : allLines;
        const parts = [];
        if (opts.mode === 'sep') {
            const sep = String(opts.sep == null ? '' : opts.sep);
            if (!sep.trim()) return { ok: false, op: 'split', path: v.path, kind: 'syntax', error: 'sep= 分隔符为空', fix: 'split ' + v.path + ' sep=###' };
            let cur = [];
            for (const line of lines) {
                if (line.trim() === sep.trim()) { if (cur.length) parts.push(cur.join('\n')); cur = []; continue; }
                cur.push(line);
            }
            if (cur.length) parts.push(cur.join('\n'));
            if (parts.length <= 1) {
                return { ok: false, op: 'split', path: v.path, kind: 'range', error: '按 sep=' + sep + ' 只切出 ' + parts.length + ' 片（没找到可用分隔点）', fix: '确认分隔符行，或改用按行数：split ' + v.path + ' 500' };
            }
        } else {
            const n = parseInt(opts.chunk, 10);
            if (!isFinite(n) || n < 1) {
                return { ok: false, op: 'split', path: v.path, kind: 'syntax', error: '需要每片行数（正整数）或 sep=分隔符', fix: 'split ' + v.path + ' 500 或 split ' + v.path + ' sep=###' };
            }
            for (let i = 0; i < lines.length; i += n) {
                let text = lines.slice(i, i + n).join('\n');
                if (i + n < lines.length || endsNl) text += '\n';   // 保留片间/结尾换行，merge 可原样拼回
                parts.push(text);
            }
        }
        if (!parts.length) return { ok: false, op: 'split', path: v.path, error: '文件是空的，没有可分的内容' };
        if (parts.length > SPLIT_MAX_PARTS) {
            const need = Math.max(1, Math.ceil(raw.split('\n').length / SPLIT_MAX_PARTS));
            return { ok: false, op: 'split', path: v.path, kind: 'range', error: '会切出 ' + parts.length + ' 片（上限 ' + SPLIT_MAX_PARTS + '）', fix: '增大每片行数（split ' + v.path + ' ' + need + '），或改用 sep= 按结构切' };
        }
        let outDir = v.path.slice(0, v.path.lastIndexOf('/')) || '/';
        if (opts.toDir) {
            const vt = validatePath(opts.toDir);
            if (!vt.ok) return { ok: false, op: 'split', path: v.path, error: 'to= 目录非法：' + vt.reason };
            outDir = vt.path;
        }
        const base = v.path.slice(v.path.lastIndexOf('/') + 1);
        const dot = base.lastIndexOf('.');
        const stem = dot > 0 ? base.slice(0, dot) : base;
        const ext = dot > 0 ? base.slice(dot) : '';
        const outPaths = [];
        for (let i = 0; i < parts.length; i++) outPaths.push((outDir === '/' ? '' : outDir) + '/' + stem + '.p' + (i + 1) + ext);
        for (const p of outPaths) {
            if (isInternalAreaPath(p)) {
                return { ok: false, op: 'split', path: v.path, kind: 'denied', error: '内部区（' + SYS_PREFIX + ' 与 ' + TRASH_PREFIX + '）对 AI 只读：不能把分片写到 ' + p, fix: '用 to=/用户目录 指定输出目录' };
            }
        }
        if (!opts.force) {
            for (const p of outPaths) {
                if (resolveNode(p)) return { ok: false, op: 'split', path: v.path, kind: 'danger', error: '目标已存在：' + p + '（加 force 覆盖）' };
            }
        }
        beginBatch();                                  // 嵌套批次：分片要么全成、要么全不成
        const rows = [];
        for (let i = 0; i < parts.length; i++) {
            const w = fsWrite(outPaths[i], parts[i], {});
            if (!w || !w.ok) {
                rollbackBatch();
                return { ok: false, op: 'split', path: v.path, error: '写分片失败：' + ((w && w.error) || outPaths[i]) };
            }
            rows.push({ path: w.path, lines: parts[i].split('\n').length, size: w.size, hash: w.hash });
        }
        commitBatch('split');
        return {
            ok: true, op: 'split', path: v.path, parts: rows, dir: outDir,
            mode: opts.mode === 'sep' ? 'sep' : 'lines', chunk: opts.chunk || null, sep: opts.sep || null,
            changes: rows.map(function (r) { return r.path; }), structure: true
        };
    }

    /* ------------------------- sort（行排序 / 去重） ------------------------- */

    /* 就地排序一个文本文件的行（清单 / 日志 / merge 后的文件最常用）。
     *   · 默认按行文本升序（numeric= 时按数值）；uniq 去重；reverse 反向；
     *   · 结尾换行原样保留（排序不多出/少掉空行）；已经有序时回执说「未改动」。
     * 刻意**不塞进 merge**：merge 要保持「不读全文的流式拼接」特性，排序是另一件事。 */
    function fsSort(path, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'sort', path: path, error: v.reason };
        const node = resolveFile(v.path);
        if (!node) return missingPathFail('sort', v.path);
        const raw = String(node.content == null ? '' : node.content);
        if (!raw) return { ok: true, op: 'sort', path: v.path, empty: true, changes: [] };
        const all = raw.split('\n');
        const endsNl = all.length > 1 && all[all.length - 1] === '';
        let lines = endsNl ? all.slice(0, -1) : all.slice();
        const key = flags.ignoreCase ? function (s) { return s.toLowerCase(); } : function (s) { return s; };
        const cmp = flags.numeric
            ? function (a, b) {
                const x = parseFloat(a), y = parseFloat(b);
                if (isFinite(x) && isFinite(y) && x !== y) return x - y;
                return key(a) < key(b) ? -1 : (key(a) > key(b) ? 1 : 0);
            }
            : function (a, b) { return key(a).localeCompare(key(b), undefined, { numeric: true }); };
        lines.sort(cmp);
        if (flags.reverse) lines.reverse();
        let removed = 0;
        if (flags.uniq) {
            const out = [];
            for (const l of lines) {
                if (out.length && key(out[out.length - 1]) === key(l)) { removed++; continue; }
                out.push(l);
            }
            lines = out;
        }
        let joined = lines.join('\n');
        if (endsNl) joined += '\n';
        if (joined === raw) return { ok: true, op: 'sort', path: v.path, nochange: true, removed: removed, changes: [] };
        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'sort', path: v.path, error: '文件不存在：' + v.path };
            setFileContent(n2, joined);
            n2.mtime = Date.now();
            return {
                ok: true, op: 'sort', path: v.path, oldLines: all.length, newLines: joined.split('\n').length,
                removed: removed, size: byteLen(joined), hash: contentHash(joined), changes: [v.path]
            };
        }, 'sort ' + v.path);
    }

    /* ------------------------- diff（两个文件的差异） ------------------------- */

    /* 逐行比较两个文件（不要求上下文完全一致，用 LCS 太重；这里给「首个不同 + 统计」的可用摘要）：
     *   - 找出所有不同的行号（对齐比较：同行号内容不同算改；多出的行算增/删）
     *   - 正文只给前 N 处（默认 20，ctx 控制），并统计共多少处不同
     * 目的：AI 不必把两个文件都读进上下文就能判断「到底哪里不一样」。 */
    function fsDiff(pathA, pathB, flags) {
        flags = flags || {};
        const va = validatePath(pathA), vb = validatePath(pathB);
        if (!va.ok) return { ok: false, op: 'diff', path: pathA, error: va.reason };
        if (!vb.ok) return { ok: false, op: 'diff', path: pathB, error: vb.reason };
        const na = resolveFile(va.path), nb = resolveFile(vb.path);
        if (!na) return { ok: false, op: 'diff', path: va.path, kind: 'path', error: va.path + ' 不存在', candidates: similarPaths(va.path, 3) };
        if (!nb) return { ok: false, op: 'diff', path: vb.path, kind: 'path', error: vb.path + ' 不存在', candidates: similarPaths(vb.path, 3) };
        const A = String(na.content == null ? '' : na.content).split('\n');
        const B = String(nb.content == null ? '' : nb.content).split('\n');
        // 结尾换行不算一条差异行（否则「一个有结尾换行、一个没有」会伪装成两处不同）
        if (A.length > 1 && A[A.length - 1] === '') A.pop();
        if (B.length > 1 && B[B.length - 1] === '') B.pop();
        const ci = !!flags.ignoreCase;
        const norm = function (s) { return ci ? String(s).toLowerCase() : String(s); };
        const rows = [];
        const max = Math.max(A.length, B.length);
        let changed = 0, same = 0;
        const cap = 20;
        for (let i = 0; i < max; i++) {
            const a = i < A.length ? A[i] : null;
            const b = i < B.length ? B[i] : null;
            if (a != null && b != null && norm(a) === norm(b)) { same++; continue; }
            changed++;
            if (rows.length < cap) {
                if (a != null && b != null) rows.push('L' + (i + 1) + '  - ' + a.slice(0, 120) + '\n' + '       + ' + b.slice(0, 120));
                else if (a == null) rows.push('L' + (i + 1) + '  + ' + b.slice(0, 120) + '  （只在 ' + vb.path + '）');
                else rows.push('L' + (i + 1) + '  - ' + a.slice(0, 120) + '  （只在 ' + va.path + '）');
            }
        }
        const truncated = changed > rows.length;
        return {
            ok: true, op: 'diff', path: va.path, other: vb.path,
            same: same, changed: changed, truncated: truncated,
            rows: rows, aLines: A.length, bLines: B.length
        };
    }

    /* ------------------------- edit ------------------------- */

    // 一组行的公共行首空白（忽略空行）；没有任何缩进时返回 ''
    function commonIndent(lines) {
        let best = null;
        for (const l of lines) {
            const s2 = String(l);
            if (!s2.trim()) continue;
            const m = /^[ \t]*/.exec(s2)[0];
            if (best === null || m.length < best.length) best = m;
        }
        return best === null ? '' : best;
    }

    function fuzzyEdit(content, oldStr, newStr) {
        const fileLines = content.split('\n');
        const searchLines = String(oldStr).split('\n').map(normalizeLine);
        const n = searchLines.length;
        if (n === 0 || (n === 1 && searchLines[0] === '')) return { ok: false, error: '旧内容为空' };
        const fileNorm = fileLines.map(normalizeLine);
        let matchStart = -1;
        for (let i = 0; i <= fileNorm.length - n; i++) {
            let matched = true;
            for (let j = 0; j < n; j++) {
                if (fileNorm[i + j] !== searchLines[j]) { matched = false; break; }
            }
            if (matched) {
                if (matchStart !== -1) return { ok: false, error: '模糊匹配出现多处命中，请提供更长的上下文' };
                matchStart = i;
            }
        }
        if (matchStart === -1) return { ok: false, error: 'MATCH_FAIL' };
        const fileBlock = fileLines.slice(matchStart, matchStart + n);
        let addLines = String(newStr).split('\n');
        // A4：模糊匹配时，如果「旧片段」和「新片段」都完全没有行首缩进，而原文匹配到的行有 ——
        // 这是「行首空白在到达脚本之前就被吞掉」（按渲染文本取文本会吃掉行首缩进）的指纹。
        // 此时直接替换会把 12 空格缩进写成顶格；这里按原文缩进补回，并在回执标 ⚠（自愈不许静默）。
        const indentOf = commonIndent(fileBlock);
        const reindent = (indentOf && !commonIndent(String(oldStr).split('\n')) && !commonIndent(addLines)) ? indentOf : '';
        let reindentPerLine = false;
        if (reindent) {
            // 行数一一对应时，逐行沿用**原文对应行**的缩进 —— 只补公共缩进会把「块内嵌套」
            // 拍平（`return 1;` 在第 3 层却只剩第 2 层的缩进）。行数不同就只能退到公共缩进平移。
            reindentPerLine = fileBlock.length === addLines.length;
            addLines = addLines.map(function (l, i) {
                if (!l.trim()) return l;
                if (reindentPerLine) {
                    const m = /^[ \t]*/.exec(String(fileBlock[i]))[0];
                    return m + l.replace(/^[ \t]*/, '');
                }
                return reindent + l;
            });
        }
        const replaced = fileLines.slice(0, matchStart).concat(addLines).concat(fileLines.slice(matchStart + n));
        return {
            ok: true, newContent: replaced.join('\n'), matchedLines: [matchStart + 1, matchStart + n],
            reindented: reindent, reindentPerLine: reindentPerLine
        };
    }

    function fsEdit(path, oldStr, newStr, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'edit', path: path, error: v.reason };
        const fileNode = resolveFile(v.path);
        if (!fileNode) {
            return { ok: false, op: 'edit', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };
        }
        if (flags.lineRange) return fsEditByRange(v.path, flags.lineRange, newStr);

        if (oldStr == null || oldStr === '') {
            return { ok: false, op: 'edit', path: v.path, error: '缺少旧内容', syntax: 'edit /路径 "旧片段" "新片段"' };
        }

        const content = String(fileNode.content == null ? '' : fileNode.content);
        let newContent = null;
        let fuzzy = false;
        let reindented = '';
        let reindentPerLine = false;
        let matchedLines = null;

        if (flags.all) {
            const count = countOccurrences(content, oldStr);
            if (count === 0) {
                // 4.4：模糊匹配的命中位置由启发式决定，无法安全地「全替换」→ 明确拒绝，
                // 而不是悄悄只替换一处（那与 all=true 的语义冲突、且用户不会发现）。
                return editMatchError(v.path, content, oldStr, 'all=true 时片段在原文中一次都没精确匹配到；全替换只接受精确匹配（去掉 all 走模糊匹配，或先 read 核对原文）');
            } else {
                newContent = content.split(oldStr).join(newStr);
            }
        } else {
            const count = countOccurrences(content, oldStr);
            if (count === 0) {
                const f = fuzzyEdit(content, oldStr, newStr);
                if (!f.ok) return editMatchError(v.path, content, oldStr, f.error);
                newContent = f.newContent; fuzzy = true; matchedLines = f.matchedLines; reindented = f.reindented || ''; reindentPerLine = !!f.reindentPerLine;
            } else if (count > 1) {
                const lines = content.split('\n');
                const cands = [];
                let from = 0;
                for (let k = 0; k < count && k < 3; k++) {
                    const idx = content.indexOf(oldStr, from);
                    if (idx < 0) break;
                    const line = content.slice(0, idx).split('\n').length;
                    cands.push({ line: line, text: lines[line - 1] || '' });
                    from = idx + 1;
                }
                return {
                    ok: false, op: 'edit', path: v.path,
                    error: '命中 ' + count + ' 处，默认要求唯一匹配',
                    candidates: cands.map(function (c) { return { line: c.line, text: c.text }; }),
                    kind: 'match',
                    fix: '加 all 全替换，或提供更长的上下文'
                };
            } else {
                newContent = content.replace(oldStr, function () { return newStr; });  // 函数形式:替换文本按字面量写入,不被特殊模式展开
            }
        }

        if (byteLen(newContent) > CONFIG.MAX_FILE_SIZE) {
            return { ok: false, op: 'edit', path: v.path, error: '编辑后超过单文件上限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) };
        }

        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'edit', path: v.path, error: '文件不存在：' + v.path };
            setFileContent(n2, newContent);
            n2.mtime = Date.now();
            const lines = newContent.split('\n');
            let from = 1, to = Math.max(1, lines.length);
            if (matchedLines) { from = matchedLines[0]; to = matchedLines[1]; }
            else {
                const idx = content.indexOf(oldStr);
                if (idx >= 0) { from = content.slice(0, idx).split('\n').length; to = from + String(oldStr).split('\n').length - 1; }
            }
            return {
                ok: true, op: 'edit', path: v.path, size: byteLen(newContent), hash: contentHash(newContent), fuzzy: fuzzy,
                reindent: reindented || null,
                reindentPerLine: !!reindentPerLine,
                changes: [v.path], context: buildCtx(lines, from, to, 2),
                oldLines: content.split('\n').length, newLines: lines.length
            };
        }, 'edit ' + v.path);
    }

    function editMatchError(path, content, oldStr, reason) {
        const sims = findSimilarLines(content, oldStr, 2);
        return {
            ok: false, op: 'edit', path: path,
            error: reason === 'MATCH_FAIL' ? '片段未找到' : reason,
            candidates: sims.map(function (s) { return { line: s.line, text: s.text, score: s.score }; }),
            kind: 'match',
            fix: 'edit #锚点 <<<…<<<（或 read ' + path + ' 确认当前内容）'
        };
    }

    // 一段文本的公共行首缩进（全空行忽略；混合缩进取最长公共前缀）
    function blockIndentOf(lines) {
        let ind = null;
        for (const l of (lines || [])) {
            if (!String(l).trim()) continue;
            const m = /^[ \t]*/.exec(String(l))[0];
            if (ind === null) ind = m;
            else { let k = 0; while (k < ind.length && k < m.length && ind[k] === m[k]) k++; ind = ind.slice(0, k); }
        }
        return ind || '';
    }

    /* rmline：删行。存在的唯一理由不是「少打几个字」，而是**空正文** ——
     * 用 edit/write 删行要写一段空 heredoc，而空正文恰恰是平台最容易吃掉的东西（13 的同类根因）。
     * 所以它只吃行区间，不需要正文。 */
    /* insert：在「第 pos 行之前」插入正文（pos = total+1 即末尾）。原有行一行不动。
     * 为什么需要它：`edit` 必须有「旧片段」才能定位，`append` 只能加在末尾 ——
     * 「在第 12 行前插一段」过去只能整篇重写（大文件等于重打一遍，且正文越长越容易被平台吞）。
     * 定位（行号 / 锚点）与内容解耦，和锚点令牌是一套思路。 */
    function fsInsert(path, pos, content) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'insert', path: path, error: v.reason };
        const node = resolveFile(v.path);
        if (!node) return missingPathFail('insert', v.path);
        const total = String(node.content == null ? '' : node.content).split('\n').length;
        const p = parseInt(pos, 10);
        if (!isFinite(p) || p < 1 || p > total + 1) {
            return {
                ok: false, op: 'insert', path: v.path, kind: 'range',
                error: '插入点 L' + (isFinite(p) ? p : pos) + ' 超出范围（' + v.path + ' 当前 ' + total + ' 行，可插入 L1..L' + (total + 1) + '）',
                fix: '要追加到末尾用 append ' + v.path + '；要插到开头用 insert ' + v.path + ' 1'
            };
        }
        const add = String(content == null ? '' : content).split('\n');
        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'insert', path: v.path, error: '文件不存在：' + v.path };
            const lines = String(n2.content == null ? '' : n2.content).split('\n');
            const next = lines.slice(0, p - 1).concat(add).concat(lines.slice(p - 1));
            const joined = next.join('\n');
            if (byteLen(joined) > CONFIG.MAX_FILE_SIZE) {
                return { ok: false, op: 'insert', path: v.path, error: '插入后超过单文件上限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) };
            }
            setFileContent(n2, joined);
            n2.mtime = Date.now();
            return {
                ok: true, op: 'insert', path: v.path, pos: p, addedLines: add.length,
                size: byteLen(joined), hash: contentHash(joined), changes: [v.path], structure: true,
                context: buildCtx(next, p, p + add.length - 1, 2),
                oldLines: lines.length, newLines: next.length
            };
        }, 'insert ' + v.path);
    }

    function fsRmLine(path, range) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'rmline', path: path, error: v.reason };
        if (!range || !range.length) {
            return { ok: false, op: 'rmline', path: path, error: 'rmline 需要行区间（例：rmline /f 12-15）' };
        }
        const node = resolveFile(v.path);
        if (!node) return missingPathFail('rmline', v.path);
        const cur0 = String(node.content == null ? '' : node.content).split('\n');
        const total0 = cur0.length;
        const a = clamp(range[0] | 0, 1, total0);
        const b = clamp(range[1] | 0, a, total0);
        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'rmline', path: v.path, error: '文件不存在：' + v.path };
            const cur = String(n2.content == null ? '' : n2.content).split('\n');
            const removedLines = cur.slice(a - 1, b);      // 删前内容：回执要显示它，而不是删后的邻居
            const next = cur.slice(0, a - 1).concat(cur.slice(b));
            setFileContent(n2, next.join('\n'));
            n2.mtime = Date.now();
            return {
                ok: true, op: 'rmline', path: v.path, removed: b - a + 1, range: [a, b],
                removedLines: removedLines,
                afterLine: next[a - 1] == null ? null : next[a - 1],   // 删完后 L{a} 起是什么（补一行上下文）
                changes: [v.path], structure: true, size: byteLen(n2.content), hash: contentHash(n2.content),
                context: buildCtx(next, Math.max(1, a - 2), Math.min(next.length, a + 1), 2),
                oldLines: cur.length, newLines: next.length
            };
        }, 'rmline ' + v.path);
    }

    function fsEditByRange(path, range, newContent) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'edit', path: path, error: v.reason };
        const node = resolveFile(v.path);
        if (!node) return { ok: false, op: 'edit', path: v.path, error: v.path + ' 不存在' };
        const lines = node.content.split('\n');
        const total = lines.length;
        const rawA = range[0] | 0;
        const rawB = range[1] | 0;
        if (rawA > total) return { ok: false, op: 'edit', path: v.path, error: '起始行 ' + rawA + ' 超出总行数 ' + total, kind: 'range' };
        const a = clamp(rawA, 1, total);
        const b = clamp(rawB, a - 1, total);
        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'edit', path: v.path, error: '文件不存在：' + v.path };
            const cur = n2.content.split('\n');
            const newBlock = String(newContent).split('\n');
            // 契约（手册 §4）：新内容没带行首缩进而原文有 → 按原文补回，并在回执里明说。
            // 行数一一对应时逐行沿用**原文对应行**的缩进（与 fuzzyEdit 同策略）——只补公共缩进会把块内嵌套
            // 拍平（`return 1;` 在第 3 层却只剩第 2 层的缩进）；行数不同时才退到公共缩进平移。
            const oldBlock = cur.slice(a - 1, b);
            const ind = blockIndentOf(oldBlock);
            const reindent = (ind && !blockIndentOf(newBlock)) ? ind : '';
            const reindentPerLine = !!(reindent && oldBlock.length === newBlock.length);
            const aligned = reindent ? newBlock.map(function (l, i) {
                if (!l.trim()) return l;
                if (reindentPerLine) {
                    const m = /^[ \t]*/.exec(String(oldBlock[i]))[0];
                    return m + l.replace(/^[ \t]*/, '');
                }
                return reindent + l;
            }) : newBlock;
            const next = cur.slice(0, a - 1).concat(aligned).concat(cur.slice(b));
            const joined = next.join('\n');
            if (byteLen(joined) > CONFIG.MAX_FILE_SIZE) return { ok: false, op: 'edit', path: v.path, error: '编辑后超过单文件上限' };
            setFileContent(n2, joined);
            n2.mtime = Date.now();
            return {
                ok: true, op: 'edit', path: v.path, size: byteLen(joined), range: [a, b],
                reindent: reindent || null, reindentPerLine: reindentPerLine,
                changes: [v.path], context: buildCtx(next, a, a + aligned.length - 1, 2),
                oldLines: cur.length, newLines: next.length
            };
        }, 'edit-range ' + v.path);
    }

    /* editTree：对一个目录下的**所有文件**做同一处替换（`edit /src "旧" "新"`）。
     * 这是「先 grep -l 再逐个 edit」的合并版 —— 一次命令、一个回执、一批撤销。
     * 安全边界：
     *   · 跳过内部区（/__sys、/__trash）—— 不能借「从根批量替换」绕过系统区只读；
     *   · 只做**精确子串**替换（全替换），不模糊、不按行；要按行/锚点请对单个文件用 edit；
     *   · 文件数有上限（默认 200，硬顶 500），超了照做前 N 个并把 truncated 标出来，绝不静默截断。
     */
    function fsEditTree(basePath, oldStr, newStr, flags) {
        flags = flags || {};
        const v = validatePath(basePath);
        if (!v.ok) return { ok: false, op: 'edit', path: basePath, error: v.reason };
        const node = resolveNode(v.path);
        if (!node) return { ok: false, op: 'edit', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };
        if (node.type !== 'dir') return { ok: false, op: 'edit', path: v.path, error: v.path + ' 不是目录' };
        if (oldStr == null || oldStr === '') {
            return { ok: false, op: 'edit', path: v.path, kind: 'syntax', error: '缺少要替换的旧片段', syntax: 'edit /目录 "旧片段" "新片段"', fix: '例如 edit /src "oldName" "newName"（会替换该目录下所有文件）' };
        }
        const extList = parseExtFilter(flags.ext);
        const limit = Math.min(positiveInt(flags.limit) || 200, 500);
        const extOk = function (name) {
            if (!extList) return true;
            const b = name.toLowerCase();
            for (const e of extList) if (b === e || b.slice(-(e.length + 1)) === '.' + e) return true;
            return false;
        };
        // 第一遍只读：收集要改哪些文件、各多少处（不改动，便于「无命中」时直接返回）
        const plan = [];
        let scanned = 0, hits = 0, truncated = false, sizeRejected = 0;
        const walk = function (n, absDir) {
            for (const name of Object.keys(n.children).sort()) {
                const c = n.children[name];
                const abs = absDir + '/' + name;
                if (isInternalAreaPath(abs)) continue;          // 系统区 / 回收站：绝不借批量替换绕过
                if (c.type === 'dir') { walk(c, abs); continue; }
                if (!extOk(name)) continue;
                scanned++;
                const text = String(c.content == null ? '' : c.content);
                const parts = text.split(oldStr);
                const count = parts.length - 1;
                if (!count) continue;
                if (plan.length >= limit) { truncated = true; continue; }
                const next = parts.join(newStr);
                if (byteLen(next) > CONFIG.MAX_FILE_SIZE) { sizeRejected++; continue; }
                plan.push({ path: abs, count: count, next: next, lines: next.split('\n').length, hash: contentHash(next) });
                hits += count;
            }
        };
        walk(node, v.path === '/' ? '' : v.path);
        if (!plan.length) {
            return { ok: true, op: 'edit', path: v.path, scanned: scanned, changedFiles: 0, hits: 0, truncated: truncated, sizeRejected: sizeRejected, empty: true };
        }
        return withAtomicWrite(function () {
            const files = [];
            for (const it of plan) {
                const n2 = resolveFile(it.path);
                if (!n2) continue;
                setFileContent(n2, it.next);
                n2.mtime = Date.now();
                files.push({ path: it.path, count: it.count, lines: it.lines, hash: it.hash });
            }
            return {
                ok: true, op: 'edit', path: v.path, scanned: scanned, changedFiles: files.length,
                hits: hits, truncated: truncated, sizeRejected: sizeRejected,
                changes: files.map(function (f) { return f.path; }), structure: true, files: files
            };
        }, 'edit-tree ' + v.path);
    }

    /* ------------------------- patch ------------------------- */

    function parseUnifiedDiff(text) {
        const hunks = [];
        // CRLF 容忍（A8）：`\r` 留在每行行尾会让整段上下文对不上原文，
        // 而候选行的相似度又是 1.00 —— 回执就变成「明明一样却说找不到」。
        const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
        let current = null;
        for (const line of lines) {
            const m = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
            if (m) {
                if (current) hunks.push(current);
                current = {
                    oldStart: parseInt(m[1], 10), newStart: parseInt(m[3], 10),
                    oldCount: m[2] === undefined ? 1 : parseInt(m[2], 10),
                    newCount: m[4] === undefined ? 1 : parseInt(m[4], 10),
                    oldLines: [], newLines: []
                };
                continue;
            }
            if (!current) continue;
            if (line.startsWith('---') || line.startsWith('+++')) continue;
            if (line.startsWith('+')) current.newLines.push(line.slice(1));
            else if (line.startsWith('-')) current.oldLines.push(line.slice(1));
            else if (line === '') { current.oldLines.push(''); current.newLines.push(''); }
            // 闭标记 / 定界符残留不是上下文行（heredoc 收尾有时会落进正文）
            else if (/^[<>]{3}$/.test(line) || /^\[\/?dsw/.test(line)) continue;
            else if (line.startsWith('\\')) continue; // "\ No newline at end of file"
            // 上下文行的**标记空格**可能被聊天平台吃掉（` B2` → `B2`，终诊 A7/A8）：
            // 统一 diff 里只有 @@ / - / + / \ 是标记行，其余一律按上下文行处理，前导空格可有可无。
            // 于是「平台吞空白」不再制造假偏移，也不需要要求用户改用 `=` 前缀的 diff 约定。
            else {
                const c = line.startsWith(' ') ? line.slice(1) : line;
                current.oldLines.push(c); current.newLines.push(c);
            }
        }
        if (current) hunks.push(current);
        if (!hunks.length) return { ok: false, error: '未解析到 hunk（需要 @@ -a,b +c,d @@ 头）' };
        // A8 真凶：补丁正文尾部多一个空行（AI 很爱在闭标记前留一行）会被当成**空的上下文行**，
        // 于是整段上下文永远比原文多一行 → 报「未找到」，而候选行相似度又是 1.00（看着自相矛盾）。
        // 用 @@ 头里的行数把「多出来的尾部空行」削掉：只在长度超出声明行数、且多出来的确实是空行时削。
        for (const h of hunks) {
            while (h.oldLines.length > h.oldCount && h.oldLines[h.oldLines.length - 1] === '') h.oldLines.pop();
            while (h.newLines.length > h.newCount && h.newLines[h.newLines.length - 1] === '') h.newLines.pop();
        }
        return { ok: true, data: hunks };
    }

    function fsPatch(path, diffText) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'patch', path: path, error: v.reason };
        const node = resolveFile(v.path);
        if (!node) return { ok: false, op: 'patch', path: v.path, error: v.path + ' 不存在', kind: 'path', candidates: similarPaths(v.path, 3) };
        const parsed = parseUnifiedDiff(diffText);
        if (!parsed.ok) return { ok: false, op: 'patch', path: v.path, error: parsed.error, kind: 'syntax' };

        const srcLines = String(node.content).split('\n');
        const spans = parsed.data.map(function (h) {
            // §3.3 patch 自动容忍行号偏移：先在原始行号 ±3 行找上下文，找不到就全文件找唯一命中
            const start0 = Math.max(0, h.oldStart - 1);
            let start = start0;
            const probe = h.oldLines.join('\n');
            // 第二遍「行尾空白不敏感」匹配：行尾空格/制表符不同不该算对不上（标 ⚠，不静默）
            const probeLoose = h.oldLines.map(function (l) { return String(l).replace(/[ \t]+$/, ''); }).join('\n');
            const stripTail = function (l) { return String(l).replace(/[ \t]+$/, ''); };
            // strict=两侧原样比；loose=两侧都去掉行尾空白再比（原文行尾空格 vs 补丁行尾空格）
            const sameAt = function (i, strict) {
                const seg = srcLines.slice(i, i + h.oldLines.length);
                return strict ? seg.join('\n') === probe : seg.map(stripTail).join('\n') === probeLoose;
            };
            if (probe || probeLoose) {
                let found = -1;
                let loose = false;
                for (let d = 0; d <= 3 && found < 0; d++) {
                    for (const cand of [start0 - d, start0 + d]) {
                        if (cand < 0 || cand + h.oldLines.length > srcLines.length) continue;
                        if (sameAt(cand, true)) { found = cand; break; }
                        if (sameAt(cand, false)) { found = cand; loose = true; break; }
                    }
                }
                let ambiguous = null;
                if (found < 0) {
                    const hits = [];
                    for (let i = 0; i + h.oldLines.length <= srcLines.length; i++) {
                        if (sameAt(i, true) || sameAt(i, false)) hits.push(i);
                        if (hits.length > 8) break;
                    }
                    if (hits.length === 1) { found = hits[0]; loose = !sameAt(hits[0], true); }
                    else if (hits.length > 1) ambiguous = hits;   // A8：多处一样 → 说清「出现 N 次」，别报「找不到」
                }
                if (found < 0) {
                    return { start: start0, end: start0 + h.oldLines.length, newLines: h.newLines, orig: start0, missing: true, probe: probe, ambiguous: ambiguous };
                }
                start = found;
                return { start: start, end: start + h.oldLines.length, newLines: h.newLines, orig: start0, loose: loose };
            }
            return { start: start, end: start + h.oldLines.length, newLines: h.newLines, orig: start0 };
        }).sort(function (a, b) { return a.start - b.start; });

        const missing = spans.filter(function (s) { return s.missing; });
        if (missing.length) {
            // A8 的两副面孔要分开说：①上下文在原文出现多次（不是「找不到」，是「不确定改哪一处」）
            // ②真的对不上——若首行还能精确对上，就明说「首行一样、整段对不上」，别自相矛盾
            const amb = missing.filter(function (s) { return s.ambiguous && s.ambiguous.length; })[0];
            if (amb) {
                return {
                    ok: false, op: 'patch', path: v.path, kind: 'match',
                    error: '补丁上下文在原文里出现了 ' + amb.ambiguous.length + ' 次，无法确定改哪一处',
                    candidates: amb.ambiguous.slice(0, 4).map(function (i) { return { line: i + 1, text: srcLines[i] }; }),
                    fix: '多带几行上下文重新生成补丁，或改用 edit #锚点 <<<…<<<（grep 取锚点）'
                };
            }
            const sims = findSimilarLines(String(node.content), missing[0].probe || '', 2);
            const head = sims.filter(function (s) { return s.score >= 0.99; })[0];
            return {
                ok: false, op: 'patch', path: v.path, kind: 'match',
                error: '补丁上下文未找到（' + missing.length + ' 个 hunk 对不上原文'
                    + (head ? '；首行 L' + head.line + ' 与补丁一致，但整段上下文对不上' : '') + '）',
                candidates: sims.map(function (s) { return { line: s.line, text: s.text, score: s.score }; }),
                fix: 'read ' + v.path + ' 确认当前内容后再生成补丁'
            };
        }

        for (let i = 1; i < spans.length; i++) {
            if (spans[i].start < spans[i - 1].end) return { ok: false, op: 'patch', path: v.path, error: 'hunk 区间重叠', kind: 'syntax' };
        }
        if (spans.length && spans[spans.length - 1].end > srcLines.length) {
            return { ok: false, op: 'patch', path: v.path, error: 'hunk 行号越界（文件共 ' + srcLines.length + ' 行）', kind: 'range' };
        }
        let lines = srcLines.slice();
        for (let i = spans.length - 1; i >= 0; i--) {
            const s = spans[i];
            lines = lines.slice(0, s.start).concat(s.newLines).concat(lines.slice(s.end));
        }
        const joined = lines.join('\n');
        if (byteLen(joined) > CONFIG.MAX_FILE_SIZE) return { ok: false, op: 'patch', path: v.path, error: '补丁后超过单文件上限' };

        return withAtomicWrite(function () {
            const n2 = resolveFile(v.path);
            if (!n2) return { ok: false, op: 'patch', path: v.path, error: '文件不存在：' + v.path };
            setFileContent(n2, joined);
            n2.mtime = Date.now();
            const shiftedSpans = spans.filter(function (s) { return s.start !== s.orig; });
            const res = {
                ok: true, op: 'patch', path: v.path, size: byteLen(joined), hunks: spans.length,
                changes: [v.path], lines: [srcLines.length, lines.length]
            };
            // 偏移自愈必须能自查：写出「哪个 hunk 从哪一行挪到了哪一行」，A7 那种「看着对齐却报偏移」
            // 才能一眼判定是真偏移还是误报
            if (shiftedSpans.length) {
                res.autoShift = shiftedSpans.length;
                res.shiftDetail = shiftedSpans.slice(0, 3).map(function (s) {
                    return 'hunk L' + (s.orig + 1) + '→L' + (s.start + 1);
                }).join(' ');
            }
            const looseN = spans.filter(function (s) { return s.loose; }).length;
            if (looseN) res.looseMatch = looseN;
            let parts = [];
            let offset = 0;
            for (const s of spans) {
                const from = s.start + offset + 1;
                parts = parts.concat(buildCtx(lines, from, from + s.newLines.length - 1, 2));
                offset += s.newLines.length - (s.end - s.start);
            }
            res.context = parts.join('\n');
            return res;
        }, 'patch ' + v.path);
    }

    /* ------------------------- 结构操作 ------------------------- */

    function trashStore(backupName, node, srcPath) {
        batchRemember(STORE_TRASH);      // 批回滚时回收站条目要一起还原，别留幽灵
        let trash = Store.get(STORE_TRASH, null);
        if (!trash || !Array.isArray(trash.items)) trash = { items: [] };
        let serialized = null;
        try { serialized = serializeNode(node, new Set()); }
        catch (e) { serialized = null; }
        trash.items.push({
            at: Date.now(), v: 3, name: backupName, src: srcPath || null,
            bytes: nodeBytes(node),
            node: serialized || cloneTree(node)
        });
        // §11.1 回收站按字节限容
        let total = 0;
        for (const it of trash.items) total += it.bytes || 0;
        while (total > TRASH_MAX_BYTES && trash.items.length > 1) {
            const gone = trash.items.shift();
            total -= gone.bytes || 0;
        }
        Store.set(STORE_TRASH, trash);
    }

    function nodeBytes(node) {
        if (!node || typeof node !== 'object') return 0;
        if (node.type === 'file') return byteLen(node.content);
        let n = 0;
        for (const k of Object.keys(node.children || {})) n += nodeBytes(node.children[k]);
        return n;
    }

    function fsDelete(path, flags) {
        flags = flags || {};
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'delete', path: path, error: v.reason };
        if (v.root) return { ok: false, op: 'delete', path: '/', error: '拒绝删除根目录' };
        const parent = resolveParentDir(v.segments);
        if (!parent) return { ok: false, op: 'delete', path: v.path, error: '父目录不存在' };
        const name = v.segments[v.segments.length - 1];
        const node = parent.children[name];
        if (!node) return { ok: false, op: 'delete', path: v.path, error: v.path + ' 不存在', candidates: similarPaths(v.path, 3), kind: 'path' };
        const children = node.type === 'dir' ? Object.keys(node.children).length : 0;
        if (node.type === 'dir' && children > 0 && !flags.recursive) {
            return {
                ok: false, op: 'delete', path: v.path, kind: 'danger',
                error: v.path + ' 是非空目录（' + children + ' 个子项），未删除',
                syntax: 'delete ' + v.path + ' recursive',
                fix: '确认连同子项一起删（进回收站，可 restore）请加 recursive'
            };
        }
        return withAtomicWrite(function () {
            const p2 = resolveParentDir(v.segments);
            if (!p2) return { ok: false, op: 'delete', path: v.path, error: '父目录不存在' };
            const n2 = p2.children[name];
            if (!n2) return { ok: false, op: 'delete', path: v.path, error: v.path + ' 不存在' };
            const backupName = Date.now() + '-' + simpleHash(v.path).slice(0, 4) + '-' + name;
            trashStore(backupName, n2, v.path);
            delete p2.children[name];
            return {
                ok: true, op: 'delete', path: v.path, trash: TRASH_PREFIX + backupName, wasDir: n2.type === 'dir',
                changes: [v.path], deletedBytes: nodeBytes(n2), structure: true
            };
        }, 'delete ' + v.path);
    }

    function trashRootPath() { return TRASH_PREFIX.replace(/\/$/, ''); }

    /* ------------------------- 回收站虚拟视图（D9） -------------------------
     * 回收站条目存在 Store 里（键 STORE_TRASH），文件树的 /__trash 只是初始化的空占位 ——
     * 于是 `stat /__trash` 恒为 0、`list /__trash` 恒空，而 `restore list` 有货：
     * 同一份数据两套视图脱节，用户 list /__trash 会以为回收站是空的。
     * 这里把 Store 条目投影成只读节点，让 list / tree / stat / read 看到的 /__trash
     * 与 restore list 是**同一份事实**。写通道不经过这里（内部区本来就对 AI 只读）。
     */
    function trashVirtualMap() {
        const map = Object.create(null);
        let trash = null;
        try { trash = Store.get(STORE_TRASH, null); } catch (e) { trash = null; }
        if (!trash || !Array.isArray(trash.items)) return map;
        for (const it of trash.items) {
            if (!it || !it.name) continue;
            let node = null;
            try { node = deserializeNode(it.node, new Map()); } catch (e) { node = null; }
            if (!node) continue;
            node.mtime = it.at || node.mtime;
            map[String(it.name)] = node;
        }
        return map;
    }

    // /__trash/<备份名>[/子路径…] → 节点（3.1：目录备份要能继续往下读，手册 §9 承诺「能看被删文件的内容」）
    function trashVirtualNode(path) {
        const p2 = String(path == null ? '' : path);
        if (p2.indexOf(TRASH_PREFIX) !== 0) return null;
        const segs = p2.slice(TRASH_PREFIX.length).split('/').filter((x) => x !== '');
        if (!segs.length) return null;
        let node = trashVirtualMap()[segs[0]] || null;
        for (let i = 1; i < segs.length && node; i++) node = (node.children || {})[segs[i]] || null;
        return node || null;
    }

    // /__trash 根目录的虚拟映射（其它路径不投影）
    function trashVirtualOf(path) { return String(path == null ? '' : path) === trashRootPath() ? trashVirtualMap() : null; }

    // 真实子节点 + 回收站虚拟条目的合并视图
    function mergedChildNames(node, virt) {
        const names = Object.keys(node.children);
        if (virt) for (const k of Object.keys(virt)) if (names.indexOf(k) < 0) names.push(k);
        return names.sort();
    }
    function mergedChild(node, virt, name) { return node.children[name] || (virt ? virt[name] : null); }

    // 同一条目的判等：**不能按引用比**。Store.get 每次 JSON.parse 出全新对象图，
    // item 来自一次 get、filter 的 x 来自另一次 get，x !== item 恒为真 ——
    // 这正是「restore 成功后条目仍留在回收站、能反复 restore 同一路径」的根因（D5）。
    function sameTrashItem(a, b) {
        if (!a || !b) return false;
        return String(a.name || '') === String(b.name || '')
            && Number(a.at || 0) === Number(b.at || 0)
            && String(a.src || '') === String(b.src || '');
    }

    function trashOrdered(trash) {
        return trash.items.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    }

    // 条目引用三种写法等价：序号（与 restore list 同序）／备份名／原路径
    function resolveTrashRef(ordered, ref) {
        const s = String(ref == null ? '' : ref).trim();
        if (!s) return null;
        if (/^\d+$/.test(s)) return ordered[parseInt(s, 10) - 1] || null;
        return ordered.filter(function (it) { return it.name === s || it.src === s; })[0] || null;
    }

    function fsRestore(flags) {
        flags = flags || {};
        let trash = Store.get(STORE_TRASH, null);
        if (!trash || !Array.isArray(trash.items)) trash = { items: [] };
        if (flags.purge) {
            batchRemember(STORE_TRASH);
            const n = trash.items.length;
            Store.set(STORE_TRASH, { items: [] });
            setTimeout(gcBlobs, 1500);
            return { ok: true, op: 'restore', body: n ? ['已清空回收站（' + n + ' 项）'] : ['回收站已为空'] };
        }
        if (!trash.items.length) return { ok: true, op: 'restore', body: ['回收站为空'] };
        const ordered = trashOrdered(trash);
        if (flags.list || !flags.item) {
            const rows = ordered.slice(0, 20).map(function (it, i) {
                return (i + 1) + '. ' + (it.src || '?') + '  ' + fmtSize(it.bytes || 0) + '  ' + fmtClock(it.at)
                    + '  ' + TRASH_PREFIX + it.name;
            });
            return { ok: true, op: 'restore', body: rows.length ? rows : ['回收站为空'] };
        }
        const item = resolveTrashRef(ordered, flags.item);
        if (!item) {
            return {
                ok: false, op: 'restore', kind: 'path',
                error: '回收站里没有 ' + flags.item,
                candidates: ordered.slice(0, 3).map(function (it, i) { return { path: (i + 1) + '. ' + (it.src || '?') }; }),
                fix: '先 restore list 看序号与原路径，再用 restore 1（序号）或 restore ' + (ordered[0] && ordered[0].src ? ordered[0].src : '/原路径')
            };
        }
        const target = item.src || '/restored-' + item.name;
        return withAtomicWrite(function () {
            const v = validatePath(target);
            if (!v.ok) return { ok: false, op: 'restore', error: v.reason };
            const pRes = ensureParentDir(v.segments, true);
            if (pRes.ok === false) return { ok: false, op: 'restore', error: pRes.error };
            const parent = pRes.parent;
            const nameSeg = v.segments[v.segments.length - 1];
            parent.children[nameSeg] = deserializeNode(item.node, new Map());
            batchRemember(STORE_TRASH);
            const list = Store.get(STORE_TRASH, { items: [] });
            list.items = list.items.filter(function (x) { return !sameTrashItem(x, item); });
            Store.set(STORE_TRASH, list);
            return { ok: true, op: 'restore', path: target, changes: [target], structure: true };
        }, 'restore ' + target);
    }

    function fsMkdir(path) {
        const v = validatePath(path);
        if (!v.ok) return { ok: false, op: 'mkdir', path: path, error: v.reason };
        if (v.root) return { ok: true, op: 'mkdir', path: '/', existing: true, body: ['/ 已存在（mkdir 幂等）'] };
        const existing = resolveNode(v.path);
        if (existing && existing.type === 'dir') return { ok: true, op: 'mkdir', path: v.path, existing: true, body: [v.path + ' 已存在（mkdir 幂等，未改动）'] };
        if (existing && existing.type === 'file') return { ok: false, op: 'mkdir', path: v.path, error: v.path + ' 已是文件', kind: 'danger' };
        return withAtomicWrite(function () {
            const pRes = ensureParentDir(v.segments, true);
            if (pRes.ok === false) return { ok: false, op: 'mkdir', path: v.path, error: pRes.error };
            pRes.parent.children[v.segments[v.segments.length - 1]] = newDirNode();
            return { ok: true, op: 'mkdir', path: v.path, created: true, changes: [v.path], structure: true };
        }, 'mkdir ' + v.path);
    }

    function fsMove(src, dst, flags) {
        flags = flags || {};
        const vs = validatePath(src);
        if (!vs.ok) return { ok: false, op: 'move', path: src, error: vs.reason };
        if (vs.root) return { ok: false, op: 'move', path: src, error: '不能移动根目录' };
        const node = resolveNode(vs.path);
        if (!node) return { ok: false, op: 'move', path: vs.path, error: vs.path + ' 不存在', candidates: similarPaths(vs.path, 3), kind: 'path' };
        let vd = validatePath(dst);
        if (!vd.ok) return { ok: false, op: 'move', path: vs.path, error: vd.reason };
        if (vd.root) return { ok: false, op: 'move', path: vs.path, error: '不能移动到根目录本身' };

        return withAtomicWrite(function () {
            // 目标是已存在目录 → 落入其内部（§11.1 保留旧语义）
            let finalSegs = vd.segments;
            const destNode = resolveNode(vd.path);
            if (destNode && destNode.type === 'dir') {
                finalSegs = vd.segments.concat([vs.segments[vs.segments.length - 1]]);
            }
            const finalPath = '/' + finalSegs.join('/');
            if (finalPath === vs.path) return { ok: true, op: 'move', path: vs.path, body: [vs.path + ' → ' + finalPath + '（同一路径，未改动）'], moved: false };

            const sp = resolveParentDir(vs.segments);
            if (!sp) return { ok: false, op: 'move', path: vs.path, error: '源父目录不存在' };
            const moved = sp.children[vs.segments[vs.segments.length - 1]];
            if (!moved) return { ok: false, op: 'move', path: vs.path, error: vs.path + ' 不存在' };
            // 防自嵌套
            if (moved.type === 'dir' && finalPath.indexOf(vs.path + '/') === 0) {
                return { ok: false, op: 'move', path: vs.path, error: '不能把目录移动到自身内部' };
            }
            const pRes = ensureParentDir(finalSegs, true);
            if (pRes.ok === false) return { ok: false, op: 'move', path: vs.path, error: pRes.error };
            const name = finalSegs[finalSegs.length - 1];
            if (pRes.parent.children[name]) {
                if (!flags.force) return { ok: false, op: 'move', path: vs.path, error: '目标已存在：' + finalPath + '（加 force 覆盖）', kind: 'danger' };
                delete pRes.parent.children[name];
            }
            pRes.parent.children[name] = moved;
            delete sp.children[vs.segments[vs.segments.length - 1]];
            return { ok: true, op: 'move', path: vs.path, to: finalPath, changes: [vs.path, finalPath], structure: true, moved: true };
        }, 'move ' + src);
    }

    /* copy 带行区间 = 「裁剪 + 复制」：把源文件的 L a-b 取出来，写成目标文件（整篇）。
     * 为什么要它：从大文件里捞一段到新文件，过去只能把那段内容原样再打一遍 heredoc ——
     * 内容一长就容易被平台吞（同一个根因）。这里内容不经过聊天正文，只走行号定位。 */
    function fsCopyRange(srcPath, srcNode, dst, vd, flags) {
        if (srcNode.type !== 'file') {
            return { ok: false, op: 'copy', path: srcPath, kind: 'path', error: 'copy 带行区间时源必须是文件：' + srcPath, fix: '去掉行区间就是整文件/整目录复制' };
        }
        const lines = String(srcNode.content == null ? '' : srcNode.content).split('\n');
        const total = lines.length;
        const a = clamp(flags.lineRange[0] | 0, 1, total);
        const b = clamp(flags.lineRange[1] | 0, a, total);
        const slice = lines.slice(a - 1, b);
        return withAtomicWrite(function () {
            let finalSegs = vd.segments;
            const destNode = resolveNode(vd.path);
            if (destNode && destNode.type === 'dir') finalSegs = vd.segments.concat([srcPath.split('/').pop()]);
            const finalPath = '/' + finalSegs.join('/');
            const pRes = ensureParentDir(finalSegs, true);
            if (pRes.ok === false) return { ok: false, op: 'copy', path: srcPath, error: pRes.error };
            const name = finalSegs[finalSegs.length - 1];
            if (pRes.parent.children[name] && !flags.force) {
                return { ok: false, op: 'copy', path: srcPath, error: '目标已存在：' + finalPath + '（加 force 覆盖）', kind: 'danger' };
            }
            const content = slice.join('\n');
            if (byteLen(content) > CONFIG.MAX_FILE_SIZE) {
                return { ok: false, op: 'copy', path: srcPath, error: '复制结果超过单文件上限 ' + fmtSize(CONFIG.MAX_FILE_SIZE) };
            }
            pRes.parent.children[name] = newFileNode(content);
            return {
                ok: true, op: 'copy', path: srcPath, to: finalPath, range: [a, b], lines: slice.length,
                size: byteLen(content), hash: contentHash(content), changes: [finalPath], structure: true
            };
        }, 'copy-range ' + srcPath);
    }

    function fsCopy(src, dst, flags) {
        flags = flags || {};
        const vs = validatePath(src);
        if (!vs.ok) return { ok: false, op: 'copy', path: src, error: vs.reason };
        if (vs.root) return { ok: false, op: 'copy', path: src, error: '不能复制根目录' };
        const node = resolveNode(vs.path);
        if (!node) return { ok: false, op: 'copy', path: vs.path, error: vs.path + ' 不存在', candidates: similarPaths(vs.path, 3), kind: 'path' };
        const vd = validatePath(dst);
        if (!vd.ok) return { ok: false, op: 'copy', path: vs.path, error: vd.reason };
        if (vd.root) return { ok: false, op: 'copy', path: vs.path, error: '不能复制到根目录本身' };
        if (flags.lineRange) return fsCopyRange(vs.path, node, dst, vd, flags);
        return withAtomicWrite(function () {
            let finalSegs = vd.segments;
            const destNode = resolveNode(vd.path);
            if (destNode && destNode.type === 'dir') finalSegs = vd.segments.concat([vs.segments[vs.segments.length - 1]]);
            const finalPath = '/' + finalSegs.join('/');
            const pRes = ensureParentDir(finalSegs, true);
            if (pRes.ok === false) return { ok: false, op: 'copy', path: vs.path, error: pRes.error };
            const name = finalSegs[finalSegs.length - 1];
            if (pRes.parent.children[name] && !flags.force) {
                return { ok: false, op: 'copy', path: vs.path, error: '目标已存在：' + finalPath + '（加 force 覆盖）', kind: 'danger' };
            }
            pRes.parent.children[name] = cloneTree(node);
            return { ok: true, op: 'copy', path: vs.path, to: finalPath, changes: [finalPath], structure: true };
        }, 'copy ' + src);
    }

    /* ------------------------- 大纲 / 摘要 ------------------------- */

    function outlineOf(content) {
        const lines = String(content).split('\n');
        const out = [];
        const re = /^\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|def|fn|public|private|protected|interface|type|struct)\s+([A-Za-z_$][\w$]*)|^\s*([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:function|\()/;
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(re);
            if (m) out.push({ line: i + 1, text: lines[i] });
            if (out.length > 200) break;
        }
        return out;
    }

    /* ------------------------- 对外接口 ------------------------- */

    const VirtualFS = {
        get root() { return fsData.root; },
        init: initFS,
        persist: persistFS,
        gcBlobs: gcBlobs,
        beginBatch: beginBatch,
        commitBatch: commitBatch,
        rollbackBatch: rollbackBatch,
        batchRemember: batchRemember,
        inBatch: inBatch,
        batchDepth: function () { return batchStack.length; },                       // 单命令存点用：批栈当前深度
        batchMutated: function () { return batchStack.length ? !!batchStack[batchStack.length - 1].mutated : false; },   // 当前顶层批次是否真的写过
        read: fsRead,
        readRaw: fsReadRaw,
        list: fsList,
        tree: fsTree,
        stat: fsStat,
        grep: fsGrep,
        find: fsFind,
        diff: fsDiff,
        write: fsWrite,
        append: fsAppend,
        edit: fsEdit,
        editTree: fsEditTree,
        insert: fsInsert,
        merge: fsMerge,
        split: fsSplit,
        sort: fsSort,
        rmline: fsRmLine,
        patch: fsPatch,
        mkdir: fsMkdir,
        move: fsMove,
        copy: fsCopy,
        delete: fsDelete,
        restore: fsRestore,
        undo: fsUndo,
        redo: fsRedo,
        outline: outlineOf,
        expandGlob: expandGlobPaths,
        hasGlob: hasGlobChars,
        globMatch: globPathMatch,
        validatePath: validatePath,
        resolve: resolveNode,
        resolveFile: resolveFile,
        noteDryPath: noteDryPath,       // 19：dry 批次碰过的路径（供「为什么不存在」的报错溯源）
        drySeenHas: drySeenHas,
        forgetDryPath: forgetDryPath,
        resetDrySeen: resetDrySeen,
        similarPaths: similarPaths,
        findSimilarLines: findSimilarLines,
        ensureSystemArea: ensureSystemArea,
        isSysPath: isSysAreaPath,       // 系统区（/__sys，蓝色）
        isInternal: isInternalAreaPath, // 内部区（/__sys + /__trash）
        newDirNode: newDirNode,
        newFileNode: newFileNode,
        setFileContent: setFileContent,   // P2：唯一的内容写入漏斗（hash/hlen/size 随之更新）
        undoSave: undoSave,
        undoIdx: function () { return undoIdx; },
        // 测试/导入导出用：把撤销栈清回「只有一个空档 #0」的基线
        undoReset() {
            for (const k of Store.keys()) if (typeof k === 'string' && k.indexOf(UNDO_PREFIX) === 0) Store.del(k);
            undoIdx = { cursor: -1, first: 0, last: -1 };
            Store.del(STORE_UNDO_IDX);
            undoSave('init');
        },
        clear() {
            fsData = { root: newDirNode() };
            ensureSystemArea();
            persistFS();
            undoSave('clear');
        },
        resetToEmpty() {
            fsData = { root: newDirNode() };
            resetDrySeen();
            ensureSystemArea();
        },
        // P3a：把容器树的存储（base/log/head + 旧 fs:tree）整个抹掉，回到「从未落盘」的基线。
        // 测试要干净基线时用；正常运行路径永远不调它。
        resetStore() {
            let keys = [];
            try { keys = Store.keys(); } catch (e) {}
            for (const k of keys) {
                if (typeof k !== 'string') continue;
                if (k.indexOf(FS_BASE_PREFIX) === 0 || k.indexOf(FS_LOG_PREFIX) === 0
                    || k === STORE_FS_HEAD || k === STORE_TREE) Store.del(k);
            }
            fsSnap = null;
            fsHead = { seq: 0, baseSeq: 0, at: 0 };
            fsCorrupt = null;
            missingBlobs = [];
        },
        // P3a：加载时发现的「树引用、存储里没有」的内容（面板/回执要能说出来）
        missingBlobs: function () { return missingBlobs.slice(); },
        corrupt: function () { return fsCorrupt; },
        head: function () { return { seq: fsHead.seq, baseSeq: fsHead.baseSeq }; },
        // P3b-2b：真实文件镜像（只有文件夹介质有意义）；系统区不镜像
        syncFromFolder: fsSyncFromFolder,
        mirrorToFolder: mirrorToFolder,
        purgeSystemMirror: purgeSystemMirror,
        mirrorState: function () { return mirrorState.size; },
        snapshot() {
            const blobCache = new Set();
            return { v: 3, at: Date.now(), root: serializeNode(fsData.root, blobCache) };
        },
        loadSnapshot(snap) {
            if (!snap || !snap.root) return { ok: false, error: '快照为空' };
            fsData = { root: deserializeNode(snap.root, new Map()) };
            ensureSystemArea();
            persistFS();
            undoSave('import');
            return { ok: true };
        }
    };

/* >>> 06-anchor.js */
    /* =========================================================================
     * 06 锚点令牌（§3.5）
     *   {锚点 → 路径, 行号, 当时该行内容哈希, 时间}，随会话持久化。
     *
     * 落盘策略：**改动即同步 Store.set**。不搞 LRU、不搞 600ms 延迟合并 ——
     *   一个会话的锚点是「几十条」量级，2000 条上限永远到不了；而延迟落盘要多养
     *   dirty/timer/order/touch 一整套记账，还得在 pagehide 里补一次 flush 防丢，
     *   属于为不会发生的事增加生命周期管理。grep 批量生成走 annotate：批内不重复写。
     * ====================================================================== */

    const AnchorStore = (function () {
        let conv = 'root';
        let table = null;          // { token: entry }
        let suspend = 0;           // >0 时暂停落盘（批量用）

        function load() {
            const c = currentConversationKey();
            if (table && conv === c) return;
            conv = c;
            const saved = Store.get(ANCHOR_PREFIX + conv, null);
            table = (saved && saved.map) ? saved.map : Object.create(null);
        }

        // 同步落盘：没有 dirty / timer / flush，写入即持久
        function persist() {
            if (suspend > 0) return;
            Store.set(ANCHOR_PREFIX + conv, { map: table, at: Date.now() });
        }
        function batch(fn) {
            suspend++;
            try { return fn(); } finally { suspend--; persist(); }
        }

        function tokenFor(path, line) {
            let base = '#' + simpleHash(path + ':' + line).slice(0, 3);
            let tok = base;
            let n = 0;
            while (table[tok] && (table[tok].path !== path || table[tok].line !== line)) {
                n++;
                tok = '#' + simpleHash(path + ':' + line + ':' + n).slice(0, 3);
            }
            return tok;
        }

        function put(path, line, text) {
            const tok = tokenFor(path, line);
            table[tok] = {
                path: path, line: line, hash: contentHash(normalizeLine(text)),
                text: String(text == null ? '' : text).slice(0, 120), at: Date.now()
            };
            persist();
            return tok;
        }

        return {
            // 为「文件:行」生成锚点（同一位置稳定复用）
            make(path, line, text) {
                load();
                if (!path || !line) return null;
                return put(path, line, text);
            },

            // 批量：给一组命中行生成锚点，返回 { hits, tokens }。整批只落盘一次
            annotate(path, hits) {
                load();
                return batch(function () {
                    return hits.map(function (h) { return Object.assign({}, h, { anchor: put(path, h.line, h.text) }); });
                });
            },

            get(token) {
                load();
                if (!token) return null;
                const t = String(token).trim();
                const key = t.startsWith('#') ? t : '#' + t;
                return table[key] || null;
            },

            // 解析锚点 → { ok, path, line, exact, relocated?:[from,to] }
            resolve(token) {
                load();
                const entry = this.get(token);
                if (!entry) {
                    return {
                        ok: false,
                        error: '锚点 ' + (String(token).startsWith('#') ? token : '#' + token) + ' 不在本会话的锚点表里',
                        fix: '先用 grep 或 read 取得新的锚点'
                    };
                }
                const node = VirtualFS.resolveFile(entry.path);
                if (!node) {
                    return { ok: false, error: '锚点指向的文件已不存在：' + entry.path, path: entry.path, fix: '重新 grep 该文件或换路径' };
                }
                const lines = String(node.content == null ? '' : node.content).split('\n');
                const cur = lines[entry.line - 1];
                // 「这一行还在吗」：undefined（文件短了）或**空行**（删行后上移/尾部换行）都算不在 ——
                // 只有真的还有内容，才谈得上「就地改过」。
                const curBlank = cur === undefined || String(cur).trim() === '';
                if (!curBlank && contentHash(normalizeLine(cur)) === entry.hash) {
                    return { ok: true, path: entry.path, line: entry.line, exact: true };   // 三态之①：原地命中
                }
                // 内容哈希重定位（唯一命中才自动用），落盘记住新行号
                const matches = [];
                for (let i = 0; i < lines.length; i++) {
                    if (contentHash(normalizeLine(lines[i])) === entry.hash) matches.push(i + 1);
                }
                if (matches.length === 1) {
                    // 三态之②：旧内容还在，只是行号挪了 → 唯一命中才自动跟过去，并标「重定位」
                    const relocated = [entry.line, matches[0]];
                    entry.line = matches[0];
                    entry.at = Date.now();
                    persist();
                    return { ok: true, path: entry.path, line: matches[0], exact: false, relocated: relocated };
                }
                if (!curBlank) {
                    // 三态之③：行号没变、只是**这一行的内容被就地改过**（旧内容在全文件里已找不到）。
                    // 锚点仍然指向那一行 → 可用，且不该标「重定位」（行号真变了才标 ⚠，18）。
                    return { ok: true, path: entry.path, line: entry.line, exact: false, changed: true };
                }
                return {
                    ok: false,
                    path: entry.path,
                    error: '锚点已失效（原 L' + entry.line + ' 内容已变' + (matches.length > 1 ? '，且有 ' + matches.length + ' 处相同行' : '') + '）',
                    candidates: matches.slice(0, 3).map(function (ln) { return { line: ln, text: lines[ln - 1] }; }),
                    fix: 'read ' + entry.path + ' ' + Math.max(1, entry.line - 5) + '-' + (entry.line + 10) + ' 确认后再改'
                };
            },

            size() { load(); return Object.keys(table).length; },
            reset() { load(); table = Object.create(null); persist(); }
        };
    })();

    const ANCHOR_RE = /^#([0-9a-z]{2,8})$/i;
    function isAnchorToken(s) { return ANCHOR_RE.test(String(s || '').trim()); }

/* >>> 06b-pathstore.js */
    /* =========================================================================
     * 06b 路径令牌（@p1）—— 锚点令牌的兄弟
     *   {令牌 → 路径}，随会话持久化、跨轮跨刷新存活（与 06-anchor 同一套落盘策略）。
     *
     * 为什么需要它：回执里给过的路径（grep -l / find / 工作集尾部）在下一轮要重打一遍，
     * 长路径既费 token 又容易打错。路径令牌把「定位」与「书写」解耦，和锚点是一套思路：
     *   锚点管「哪一行」，令牌管「哪个文件/目录」。
     *
     * 与锚点的差异（刻意的）：
     *   · 锚点靠「该行内容哈希」重定位；路径令牌**不靠内容**——文件改名（basename 变了）不自动跟随，
     *     因为 fsMove 没有路径历史，靠猜会把内容写到错文件。只有「同名文件在全容器唯一」时才重定位。
     *   · 发放点在回执侧（grep -l / find / grep 行首 / 工作集尾部），写命令的回执不发。
     * ====================================================================== */

    const PATHTOK_RE = /^@p([0-9]+)$/i;
    function isPathToken(s) { return PATHTOK_RE.test(String(s == null ? '' : s).trim()); }

    const PathStore = (function () {
        const PATHTOK_MAX = 1000;      // 会话内令牌上限：超了淘汰最旧的（表要有界，否则长会话无界增长）
        let conv = 'root';
        let table = null;              // { token: {path, dir, base, at} }
        let next = 1;
        let suspend = 0;

        function load() {
            const c = currentConversationKey();
            if (table && conv === c) return;
            conv = c;
            const saved = Store.get(PATHTOK_PREFIX + conv, null);
            table = (saved && saved.map) ? saved.map : Object.create(null);
            next = (saved && saved.next > 0) ? saved.next : 1;
        }

        function persist() {
            if (suspend > 0) return;
            Store.set(PATHTOK_PREFIX + conv, { map: table, next: next, at: Date.now() });
        }
        function batch(fn) {
            suspend++;
            try { return fn(); } finally { suspend--; persist(); }
        }

        function baseOf(p) { const i = String(p).lastIndexOf('/'); return i < 0 ? String(p) : String(p).slice(i + 1); }
        function dirOf(p) { const i = String(p).lastIndexOf('/'); return i <= 0 ? '/' : String(p).slice(0, i); }

        function evictIfNeeded() {
            const keys = Object.keys(table);
            if (keys.length <= PATHTOK_MAX) return;
            keys.sort(function (a, b) { return (table[a].at || 0) - (table[b].at || 0); });
            const drop = keys.length - PATHTOK_MAX;
            for (let i = 0; i < drop; i++) delete table[keys[i]];
        }

        // 同一路径稳定复用同一个令牌；新路径分配下一个 @pN
        function put(path) {
            for (const k of Object.keys(table)) if (table[k].path === path) { table[k].at = Date.now(); return k; }
            let tok;
            do { tok = '@p' + next; next++; } while (table[tok]);
            table[tok] = { path: path, dir: dirOf(path), base: baseOf(path), at: Date.now() };
            evictIfNeeded();
            return tok;
        }

        return {
            // 为一个路径取令牌（幂等：同一路径永远同一个令牌）
            make(path) { load(); if (!path) return null; const t = put(path); persist(); return t; },

            // 批量：整批只落盘一次
            makeMany(paths) {
                load();
                return batch(function () {
                    return (paths || []).map(function (p) { return p ? put(p) : null; });
                });
            },

            find(path) { load(); for (const k of Object.keys(table)) if (table[k].path === path) return k; return null; },

            get(token) { load(); const t = String(token == null ? '' : token).trim().toLowerCase(); return table[t] || null; },

            /* 解析令牌 → { ok, path, exact, relocated?:[from,to] } 或 { ok:false, error, candidates, fix }
             * 三态：原地命中 / 同名唯一重定位（标 ⚠）/ 失效给候选。改名不自动跟随（见文件头）。 */
            resolve(token) {
                load();
                const t = String(token == null ? '' : token).trim();
                const entry = this.get(t);
                if (!entry) {
                    return { ok: false, error: '路径令牌 ' + t + ' 不在本会话的令牌表里', fix: '先用 grep -l / find 取得新的令牌（回执里以 @pN 开头）' };
                }
                if (VirtualFS.resolve(entry.path)) return { ok: true, path: entry.path, exact: true };
                // 重定位：路径不在了，但**同名文件**在全容器唯一 → 跟过去（改名不跟：basename 变了就找不到）
                const cands = [];
                (function walk(n, prefix) {
                    if (!n || n.type !== 'dir') return;
                    for (const k of Object.keys(n.children)) {
                        const c = n.children[k];
                        const p = prefix + k;
                        if (p.indexOf(TRASH_PREFIX) === 0) continue;
                        if (c.type === 'dir') walk(c, p + '/');
                        else if (k === entry.base) cands.push(p);
                    }
                })(VirtualFS.root, '/');
                if (cands.length === 1) {
                    const relocated = [entry.path, cands[0]];
                    entry.path = cands[0];
                    entry.dir = dirOf(cands[0]);
                    entry.base = baseOf(cands[0]);
                    entry.at = Date.now();
                    persist();
                    return { ok: true, path: cands[0], exact: false, relocated: relocated };
                }
                return {
                    ok: false, path: entry.path,
                    error: '路径令牌 ' + t + ' 指向的路径已不存在：' + entry.path
                        + (cands.length > 1 ? '（同名文件有 ' + cands.length + ' 个，无法确定是哪个）' : ''),
                    candidates: VirtualFS.similarPaths(entry.path, 3),
                    fix: '重新 find / grep -l 取新令牌，或直接用路径'
                };
            },

            // 外面一次要发很多令牌时用它：整批只落盘一次
            batch(fn) { load(); suspend++; try { return fn(); } finally { suspend--; persist(); } },

            size() { load(); return Object.keys(table).length; },
            reset() { load(); table = Object.create(null); next = 1; persist(); }
        };
    })();

/* >>> 07-lex.js */
    /* =========================================================================
     * 07 词法：归一化 · 命令表 · 别名 · 参数四写法（§3.2 / §3.3 / §3.8）
     * ====================================================================== */

    // 20 个规范命令名（14 个语义族）
    const COMMANDS = {
        read: { kind: 'read', desc: '读文件/列目录/read #锚点', example: 'read /src/a.js' },
        write: { kind: 'write', desc: '覆盖写（自动建父目录）', example: 'write /src/a.js <<<…<<<' },
        append: { kind: 'write', desc: '追加（不存在则创建）', example: 'append /log.md <<<…<<<' },
        edit: { kind: 'write', desc: '替换（默认唯一匹配）', example: 'edit /src/a.js "旧" "新"' },
        insert: { kind: 'write', desc: '在指定行/锚点插入正文（原有行不动）', example: 'insert /src/a.js 12 <<<…<<<' },
        rmline: { kind: 'write', desc: '删行区间（不用写空正文）', example: 'rmline /src/a.js 12-15' },
        apply: { kind: 'write', desc: '一次写多个文件（@@ 路径分节，原子）', example: 'apply <<< @@ /a.js → 内容 → @@ /b.txt → 内容 → <<<' },
        patch: { kind: 'write', desc: '统一 diff 补丁', example: 'patch /src/a.js <<<…<<<' },
        merge: { kind: 'write', desc: '按给定顺序把多个文件首尾拼接成一个', example: 'merge /out.md /01.md /02.md /03.md' },
        split: { kind: 'write', desc: '按行数或分隔符把一个大文件切成多片', example: 'split /big.md 500' },
        sort: { kind: 'write', desc: '就地排序行（可去重/反向/按数值）', example: 'sort /list.txt uniq' },
        mkdir: { kind: 'write', desc: '建目录（幂等）', example: 'mkdir /src/lib' },
        move: { kind: 'write', desc: '移动 / 重命名', example: 'move /a.js /src/a.js' },
        copy: { kind: 'write', desc: '复制', example: 'copy /a.js /b.js' },
        delete: { kind: 'write', desc: '删除（目录需 recursive）', example: 'delete /old.md' },
        undo: { kind: 'write', desc: '撤销 N 步', example: 'undo 1' },
        redo: { kind: 'write', desc: '重做 N 步', example: 'redo 1' },
        restore: { kind: 'write', desc: '回收站 / 恢复', example: 'restore list' },
        upload: { kind: 'write', desc: '生成附件（下载）', example: 'upload /dist/app.js' },
        grep: { kind: 'read', desc: '按内容全容器检索', example: 'grep /src "function "' },
        find: { kind: 'read', desc: '按文件名/路径找（glob：`*` `?` `**`）', example: 'find /src "*.js"' },
        diff: { kind: 'read', desc: '比较两个文件的差异', example: 'diff /a.js /b.js' },
        list: { kind: 'read', desc: '列目录', example: 'list /src' },
        tree: { kind: 'read', desc: '目录树', example: 'tree /' },
        stat: { kind: 'read', desc: '统计', example: 'stat /src/a.js' },
        cd: { kind: 'control', desc: '切换工作目录', example: 'cd /src' },
        expect: { kind: 'control', desc: '断言（失败标 PARTIAL）', example: 'expect /src/a.js "export const add"' },
        help: { kind: 'read', desc: '查命令用法（不必背命令表）', example: 'help edit' },
        plan: { kind: 'plan', desc: '计划模式与条目状态（on/list/add/done/doing/todo/del/clear）', example: 'plan add 改造出站节奏器' }
    };
    const COMMAND_NAMES = Object.keys(COMMANDS);

    /* 命令用法注册表（单一事实来源）：
     *   · 手册 §3 的命令表由 COMMANDS 生成，不再手抄 —— 加了命令就自动出现在手册里；
     *   · `help <命令>` 直接从这份注册表生成答案，AI 不必把整张表背进上下文（用到哪个查哪个）。
     * 这里只补「一句话说不清的形状 / 容易踩的坑」，常规命令默认语法 = example。 */
    const COMMAND_HELP = {
        read: {
            syntax: 'read /路径 [行区间 | head=N | tail=N | -n | outline]  |  read #锚点 [N | -N]',
            notes: ['read #锚点 读锚点行 ±3 行；read #锚点 20 读锚点行起往下共 20 行；read #锚点 -10 读锚点行起往上共 10 行', '长文件默认只给头尾并落盘全文；加 full（或 no-elide）一次给全，省一次二次读取', 'read <目录> 等价 list']
        },
        write: {
            syntax: 'write /路径 → <<< → 内容 → <<<   |   write /路径 base64 → <<< → base64 文本 → <<<',
            notes: ['自动建父目录；有 hash= 可对账', 'base64 通道：正文含整行 <<< / >>> 或特殊字符时用它，正文不再经过聊天渲染层', '--no-warn 关掉本条的正文体检告警（告警只是提醒，从不阻止写入）']
        },
        append: { syntax: 'append /路径 → <<< → 内容 → <<<   |   append /路径 base64 → <<< → base64 → <<<', notes: ['base64 用法同 write'] },
        edit: {
            syntax: 'edit /文件 "旧" "新"  |  edit /目录 "旧" "新"（批量）  |  edit #锚点 <<<新行<<<  |  edit /f 12-15 <<<新段<<<',
            notes: ['默认要求唯一匹配，多处命中报候选，加 all 全替换', '目标是目录 = 替换该目录下所有文件（跳过系统区/回收站，ext= 限后缀）', '模糊匹配命中会标 ⚠，并按原文补回缩进']
        },
        insert: {
            syntax: 'insert /文件 行号 [before|after] <<<内容<<<  |  insert #锚点 [before|after] <<<内容<<<  |  insert /目标 行号 from=/源 [源区间]',
            notes: ['⚠ 两个默认方向相反：行号默认插在它之前，锚点默认插在它之后——回执会标注「默认方向」，插完核一眼', 'from= 把别处的行粘过来，内容不必重打']
        },
        rmline: { syntax: 'rmline /路径 12-15  |  rmline #锚点', notes: ['只吃行区间，不需要正文'] },
        apply: { syntax: 'apply → <<< → @@ /a.js → 内容 → @@ /b.txt → 内容 → <<<', notes: ['整块原子，逐文件给 hash=；上限 20 个文件'] },
        patch: { syntax: 'patch /路径 → <<< → @@ -a,b +c,d @@ → … → <<<', notes: ['只认标准 unified diff；写成双段会按 edit 执行并标 ⚠'] },
        merge: {
            syntax: 'merge /目标 /源1 /源2 …  |  merge /目标 /目录/*.md [sort=name|mtime|none]',
            notes: ['顺序 = 你列出的顺序；glob 源默认按自然序（02 在 10 前）', '目标已存在要 force；源里没有结尾换行会自动补一个，不会粘行']
        },
        split: {
            syntax: 'split /大文件 500  |  split /文档.md sep=###  |  split /f 500 to=/out',
            notes: ['按行数：整数就是每片行数；按结构：sep= 分隔符行（分隔符本身不进任何片）', '输出 <名>.p1<后缀>…，目标已存在要 force；分片自动发 @pN，可用 merge 拼回']
        },
        sort: {
            syntax: 'sort /文件 [uniq] [numeric] [reverse] [-i]',
            notes: ['就地排序行（清单/日志/merge 后的文件常用）；uniq 去重、numeric 按数值、reverse 反向', '已经有序会明说未改动；结尾换行原样保留']
        },
        move: { syntax: 'move /源 /目标', notes: ['同目录 move 即重命名；目标已存在要 force', '源带 glob（/src/*.txt /目标目录）= 批量移动'] },
        copy: { syntax: 'copy /源 /目标 [10-20]', notes: ['带行区间 = 裁剪复制（只把那一段存成新文件）；目标存在要 force', '源带 glob（/src/*.md /目标目录）= 批量复制到目录'] },
        delete: { syntax: 'delete /路径 [recursive] [force]', notes: ['一律进回收站；删除目录必须 recursive', '路径带 glob（/tmp/*.txt）= 批量删除：整批原子，且必须加 force；命中目录还要 recursive'] },
        undo: { syntax: 'undo [N]', notes: ['一个批次 = 一步；读批不占步；撤销≠删除'] },
        restore: { syntax: 'restore list  |  restore <序号|原路径|备份名>  |  restore purge' },
        grep: {
            syntax: 'grep /路径 "关键词" [-i] [-e] [-v] [-l] [-c] [ext=js,md] [ctx=2] [limit=500]',
            notes: ['路径必须写在搜索词前面（写成 grep "词" /路径 会报错，不会降级成全容器搜索）', '无路径 = 从 / 搜（只排除 /__trash）', 'grep 恒带行号，-n 不必写（写了只提示一句）', 'ctx=N 每处带前后 N 行上下文，回执里命中行带锚点、上下文行不带']
        },
        find: {
            syntax: 'find /路径 "模式" [ext=] [depth=N] [dirs] [-i] [sort=mtime] [since=10m]',
            notes: ['路径必须写在匹配式前面', '按文件名找（* ? **，默认递归）；找内容用 grep', 'sort=mtime 按改动时间倒序（最近改的在前）；since=10m / recent=2h 只看这段时间内改过的文件']
        },
        diff: { syntax: 'diff /a /b [-i]', notes: ['给差异处数 + 前几处，不必把两份全文都读进来'] },
        list: { syntax: 'list [路径] [recursive]' },
        stat: { syntax: 'stat /路径', notes: ['给 size/chars/lines/hash/mtime；目录给递归统计'] },
        cd: { syntax: 'cd /路径', notes: ['cwd 会影响相对路径；cd / 回根'] },
        expect: { syntax: 'expect /路径 "必须出现的文本"', notes: ['后置断言：失败 → 本批已写入的内容自动回滚'] },
        plan: { syntax: 'plan on|list|add <条目>|done|doing|todo <序号|last|文字>|del|clear', notes: ['last = 最后一条（可与 plan add 同批）', 'plan off 只有用户能退'] },
        upload: { syntax: 'upload /路径  |  upload /目录  |  upload /a /b /c', notes: ['目录或多个路径 → 打成 zip 附件一次发出（平台无入口时回退下载）', '优先放进聊天附件，平台无入口时回退下载'] },
        help: { syntax: 'help  |  help <命令>', notes: ['不带参数列出全部命令；带参数给该命令的用法与坑'] },
        mkdir: { syntax: 'mkdir /路径' },
        redo: { syntax: 'redo [N]' }
    };

    const COMMAND_ALIASES = {
        cat: 'read', show: 'read', open: 'read', view: 'read', get: 'read', print: 'read',
        读: 'read', 读取: 'read', 查看: 'read', 打开: 'read',
        save: 'write', put: 'write', create: 'write', 写: 'write', 写入: 'write', 保存: 'write', 新建: 'write',
        add: 'append', 追加: 'append',
        modify: 'edit', change: 'edit', fix: 'edit', update: 'edit', replace: 'edit', sub: 'edit',
        修改: 'edit', 编辑: 'edit', 替换: 'edit', 改: 'edit', 删行: 'rmline',
        插入: 'insert', 粘贴: 'insert',
        concat: 'merge', 合并: 'merge',
        切分: 'split', 拆分: 'split', chunk: 'split',
        排序: 'sort', 排序去重: 'sort',
        补丁: 'patch',
        search: 'grep', 搜索: 'grep', 查找: 'grep', 检索: 'grep',
        locate: 'find', 找文件: 'find', 按名查找: 'find',
        del: 'delete', rm: 'delete', remove: 'delete', erase: 'delete', 删除: 'delete', 删: 'delete',
        mv: 'move', rename: 'move', 移动: 'move', 重命名: 'move',
        cp: 'copy', 复制: 'copy',
        ls: 'list', dir: 'list', 列表: 'list', 目录: 'list',
        树: 'tree',
        info: 'stat', 统计: 'stat',
        md: 'mkdir', 建目录: 'mkdir', 新建目录: 'mkdir',
        切换目录: 'cd', 进入: 'cd', 转到: 'cd',
        上传: 'upload', 交付: 'upload', 附件: 'upload',
        撤销: 'undo', 回退: 'undo',
        重做: 'redo',
        回收站: 'restore', 恢复: 'restore',
        断言: 'expect', 校验: 'expect',
        帮助: 'help', 用法: 'help', 怎么用: 'help',
        计划: 'plan', 待办: 'plan'
    };

    // 反查：哪些别名指向这个命令（help 用；也让「有哪些写法」可查）
    function aliasesOf(op) {
        const out = [];
        for (const k of Object.keys(COMMAND_ALIASES)) if (COMMAND_ALIASES[k] === op) out.push(k);
        return out;
    }


    const FLAG_ALIASES = {
        n: 'numbered', num: 'numbered', number: 'numbered', numbers: 'numbered', lines: 'numbered', '行号': 'numbered',
        a: 'all', all: 'all', 全部: 'all',
        r: 'recursive', recursive: 'recursive', recurse: 'recursive', 递归: 'recursive',
        f: 'force', force: 'force', 强制: 'force',
        x: 'exclusive', exclusive: 'exclusive',
        dry: 'dry', 'dry-run': 'dry', dryrun: 'dry',
        q: 'quiet', quiet: 'quiet',
        i: 'ignoreCase', 'ignore-case': 'ignoreCase', ignorecase: 'ignoreCase', 忽略大小写: 'ignoreCase',
        e: 'regex', re: 'regex', regex: 'regex', regexp: 'regex', 正则: 'regex',
        sep: 'sep', separator: 'sep', 分隔符: 'sep',
        from: 'from', 起始: 'from', 来源: 'from',
        to: 'to', 结束: 'to',
        // insert：插入点在目标行的「之前 / 之后」（行号默认之前，锚点默认之后）
        before: 'before', 'before-line': 'before', 之前: 'before', 前面: 'before',
        after: 'after', 'after-line': 'after', 之后: 'after', 后面: 'after',
        deep: 'deep', d: 'deep',
        // find：递归深度 / 只看目录 / 结果排序；merge：源文件排序
        depth: 'depth', 深度: 'depth',
        dirs: 'dirs', onlydirs: 'dirs', 只看目录: 'dirs',
        sort: 'sort', order: 'sort', 排序: 'sort',
        // find：只看最近改动（since=10m / recent=2h）；正文编码通道（write/append ... base64）
        since: 'since', recent: 'since', 最近: 'since', 最近改动: 'since',
        base64: 'base64', b64: 'base64', 编码: 'base64',
        // split：每片行数 / 输出目录
        chunk: 'chunk', per: 'chunk', 每片: 'chunk', 行数: 'chunk',
        // sort：去重 / 反向 / 按数值
        uniq: 'uniq', unique: 'uniq', 去重: 'uniq',
        reverse: 'reverse', desc: 'reverse', 降序: 'reverse', 反向: 'reverse',
        numeric: 'numeric', 数字: 'numeric',
        count: 'count', c: 'count',
        head: 'head', tail: 'tail',
        // 2.13.0：read /f full（或 no-elide）→ 不省略中段，一次读完，不必再去 outbox 二次读取
        full: 'full', 'no-elide': 'noElide', noelide: 'noElide', 全文: 'full', 完整: 'full',
        // --no-warn：关掉本条命令的正文体检告警（误报时用，不影响真实错误）
        'no-warn': 'noWarn', nowarn: 'noWarn', '不告警': 'noWarn',
        nl: 'nl',
        item: 'item', id: 'item',
        list: 'list', purge: 'purge',
        // grep 增强（E1）：-l 只列文件名 / -c 只报计数 / -v 反选 / ext=js,md 扩展名过滤 / limit=N 上限
        l: 'files', files: 'files', 'name-only': 'files', '仅文件名': 'files', '文件名': 'files',
        v: 'invert', invert: 'invert', not: 'invert', 反选: 'invert', 排除: 'invert',
        ext: 'ext', exts: 'ext', type: 'ext', suffix: 'ext', 扩展名: 'ext', 后缀: 'ext',
        // grep 上下文：命中外再带 N 行前后文（定位「这一处在哪个函数/哪一段里」最省来回）
        ctx: 'ctx', context: 'ctx', contexts: 'ctx', around: 'ctx', 上下文: 'ctx', 附近: 'ctx',
        m: 'limit', limit: 'limit', max: 'limit', 上限: 'limit',
        all_: 'all'
    };
    const VALUE_FLAGS = { sep: true, from: true, to: true, head: true, tail: true, count: true, item: true, ext: true, limit: true, ctx: true, depth: true, sort: true, chunk: true, since: true };

    // 命令归一：小写 + 去非字母字符（保留中文）后查表；未命中时做编辑距离 ≤1 的唯一近似
    function normalizeOp(raw) {
        if (raw == null) return { op: null, reason: 'empty' };
        let s = String(raw).trim().toLowerCase();
        s = s.replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');
        if (!s) return { op: null, reason: 'empty' };
        if (COMMANDS[s]) return { op: s, exact: true };
        if (COMMAND_ALIASES[s]) return { op: COMMAND_ALIASES[s], exact: true, alias: s };
        // 编辑距离 ≤1 且唯一（只对长度 ≥4 的名字做，§9.1）
        if (s.length >= 4) {
            const near = COMMAND_NAMES.filter(function (n) { return Math.abs(n.length - s.length) <= 1 && levenshtein(n, s) <= 1; });
            if (near.length === 1) return { op: near[0], exact: false, approxFrom: raw };
        }
        // 命令名 + 名词后缀（readfile / deletefile / listdir …）：§3.8 的"按 read 执行（原标题 readfile）"
        const prefixed = COMMAND_NAMES.filter(function (n) { return s.length > n.length && s.length - n.length <= 6 && s.indexOf(n) === 0; });
        if (prefixed.length === 1) return { op: prefixed[0], exact: false, approxFrom: raw };
        // 反向：命令名被截断（rea / wri / dele）
        if (s.length >= 3) {
            const extended = COMMAND_NAMES.filter(function (n) { return n.length > s.length && n.indexOf(s) === 0; });
            if (extended.length === 1) return { op: extended[0], exact: false, approxFrom: raw };
        }
        return { op: null, reason: 'unknown', closest: closestCommand(s) };
    }

    function closestCommand(s) {
        let best = null, bestScore = 0;
        for (const n of COMMAND_NAMES) {
            const sc = similarity(n, s);
            if (sc > bestScore) { bestScore = sc; best = n; }
        }
        return best && bestScore > 0.4 ? { name: best, score: bestScore } : null;
    }

    /* ------------------------- 分词（尊重引号） ------------------------- */

    /* 分词，并保留「这个 token 带过引号吗」——带引号 = 字面量位置参数。
     * 为什么必须有这一位：引号信息一旦在分词阶段丢掉，`edit /f "L2" "L3"` 里的 L2/L3
     * 就会被 parseLineRange 当成行区间（于是「没有替换文本」），`edit /f "a" "all"` 里的 "all"
     * 又会被当成 all 开关。带引号就是「这是文本」，不该再被解释成开关或行区间。 */
    function splitTokensDetailed(line) {
        const out = [];
        let cur = '';
        let quote = null;
        let quoted = false;
        const flush = function () {
            if (cur !== '' || quoted) { out.push({ t: cur, q: quoted }); cur = ''; quoted = false; }
        };
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (quote) {
                if (ch === quote) { quote = null; continue; }
                if (ch === '\\' && i + 1 < line.length && (line[i + 1] === quote || line[i + 1] === '\\')) { cur += line[++i]; continue; }
                cur += ch;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '“' || ch === '”') { quote = (ch === '“' || ch === '”') ? '"' : ch; quoted = true; continue; }
            if (/\s/.test(ch)) { flush(); continue; }
            cur += ch;
        }
        flush();
        return out;
    }

    function splitTokens(line) {
        return splitTokensDetailed(line).map(function (x) { return x.t; });
    }

    // 参数四写法等价归一（§3.2）：--k=v / k=v / k:v / k v / 裸词
    // 命令感知（第三轮 P0 回归）：行区间只有 read/edit/rmline/insert 真的消费（见 05-fs 的 fsRead / fsEditByRange / fsRmLine / fsInsert），
    // 别的命令里 `42` 是**位置参数**——`grep /f 42` 的搜索词、`restore 1` 的条目号、`undo 3` 的步数。
    // 以前一律被 parseLineRange 抽进 ranges 再丢掉，于是 grep 搜纯数字报「缺少搜索词」、`undo 3` 只退一步。
    const RANGE_OPS = { read: true, edit: true, rmline: true, insert: true, copy: true };

    function parseFlags(tokens, op, quoted) {
        const flags = {};
        const rest = [];
        const ranges = [];
        const wantRanges = !!RANGE_OPS[op];
        // grep 的路径和搜索词都可以省，而搜索词本身可能就是开关同名（item/count/head…）或纯数字：
        // 位置位（路径 + 搜索词）没占满时，裸词一律当位置参数；占满了才按开关认（照旧给 ⚠）。
        const openSlots = (op === 'grep') ? 1 : -1;   // grep 的裸词开关要避开前 2 个位置参数（路径 + 搜索词）
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            // 带引号的 token 是**字面量位置参数**（含空串 "" —— 用它做「删掉这段文本」）：
            // 不当开关、不当行区间、不当 k=v。必须放在 !t 之前，否则空的 "" 会被直接跳过。
            if (quoted && quoted[i]) { rest.push(t); continue; }
            if (!t) continue;
            let m = /^--?([A-Za-z\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*)=(.*)$/.exec(t);
            if (m) { setFlag(flags, m[1], m[2]); continue; }
            m = /^--?([A-Za-z\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*)$/.exec(t);
            if (m) { setFlag(flags, m[1], true); continue; }
            m = /^([A-Za-z\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*)[=:](.+)$/.exec(t);
            if (m && FLAG_ALIASES[m[1].toLowerCase()]) { setFlag(flags, m[1], m[2]); continue; }
            const lower = t.toLowerCase();
            // 裸词只认「多字符」开关名；单字母开关必须带 -/--
            // （否则 edit /f "旧" "x" 里的 "x" 会被当成 exclusive 开关）
            if (FLAG_ALIASES[lower] && lower.length > 1 && !(openSlots >= 0 && rest.length <= openSlots)) {
                const key = FLAG_ALIASES[lower];
                if (VALUE_FLAGS[key] && i + 1 < tokens.length && !/^--?/.test(tokens[i + 1])) setFlag(flags, lower, tokens[++i]);
                else setFlag(flags, lower, true);
                continue;
            }
            if (wantRanges) {
                const r = parseLineRange(t);
                if (r) { ranges.push(r); continue; }
            }
            rest.push(t);
        }
        return { flags: flags, rest: rest, ranges: ranges };
    }

    function setFlag(flags, name, value) {
        const key = FLAG_ALIASES[String(name).toLowerCase()] || String(name).toLowerCase();
        if (value === 'true' || value === true) flags[key] = true;
        else if (value === 'false') flags[key] = false;
        else if (typeof value === 'string' && !VALUE_FLAGS[key]) {
            const v = value.trim().toLowerCase();
            if (['1', 'yes', 'y', 'on', 'true', '是'].indexOf(v) >= 0) flags[key] = true;
            else if (['0', 'no', 'n', 'off', 'false', '否'].indexOf(v) >= 0) flags[key] = false;
            else flags[key] = value;
        } else flags[key] = value;
    }

    // 行区间的等价写法（A2）：`10-12` / `L10-L12` / `10~12` / `10..12` / `10,12` / 全角连字符（先经 toHalfWidth）
    function parseLineRange(t) {
        const s = String(t).trim();
        let m = /^[Ll]?(\d+)\s*(?:[-~–—]|\.\.|,)\s*[Ll]?(\d+)$/.exec(s);
        if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
        m = /^[Ll]?(\d+)$/.exec(s);
        if (m) { const n = parseInt(m[1], 10); return [n, n]; }
        return null;
    }

    // 每个命令真正实现的开关（§3.8「错误即答案」）：命令没实现的开关**不许静默吞掉**。
    // 例：`list /d recursive` 以前既不递归也不报错（A10）；现在要么实现，要么回执标 ⚠ 说明已忽略。
    // 2.13.0：被忽略的开关不再只留一句 ⚠ 就按成功返回 —— 这类命令一律降为 PARTIAL（详见 executeCmd）。
    const COMMAND_FLAGS = {
        // full / no-elide：长文件不再自动省略中段（省一次 outbox 二次读取）
        read: ['numbered', 'outline', 'lineRange', 'head', 'tail', 'full', 'noElide'],
        // sep 是「双段定界的自定义分隔符」，任何带定界正文的命令都可能用它（手册 §3.4）
        // base64：正文以 base64 传入（绕开 `<<<` 提前闭合 / markdown 吞正文）
        write: ['exclusive', 'sep', 'base64', 'noWarn'],
        append: ['exclusive', 'sep', 'base64', 'noWarn'],
        edit: ['all', 'lineRange', 'sep', 'ext', 'limit', 'noWarn'],
        // insert：位置（行号/锚点）+ before/after + from=源路径（源区间由第二个行区间给出）
        insert: ['lineRange', 'before', 'after', 'from', 'sep', 'noWarn'],
        rmline: ['lineRange'],
        apply: ['sep', 'noWarn'],
        patch: ['sep', 'noWarn'],
        // merge：目标 + 任意多个源（源可以含 glob）；sort 决定 glob 源的拼接顺序
        merge: ['force', 'sort', 'sep', 'noWarn'],
        split: ['sep', 'chunk', 'to', 'force', 'noWarn'],
        sort: ['uniq', 'reverse', 'numeric', 'ignoreCase'],
        mkdir: [],
        move: ['force'],
        copy: ['force', 'lineRange'],
        delete: ['recursive'],
        undo: [],
        redo: [],
        restore: ['list', 'purge', 'item'],
        upload: [],
        // grep 恒带行号（-n / numbered 写了也生效，写了只提示一句不必写）
        grep: ['regex', 'ignoreCase', 'files', 'count', 'invert', 'ext', 'limit', 'ctx', 'numbered'],
        find: ['ignoreCase', 'ext', 'limit', 'depth', 'dirs', 'sort', 'since'],
        diff: ['ignoreCase', 'ctx', 'limit'],
        list: ['recursive', 'deep'],
        tree: [],
        stat: [],
        cd: [],
        expect: [],
        help: [],
        plan: []
    };

    // 每个命令**位置参数**的上限（不含路径）。多出来的裸词以前被静默吞掉（问题 B：
    // `read /f.txt foobar` 连个 ⚠ 都没有）—— 与「命令没实现的开关不许静默」同一口径。
    // 值为 undefined 的命令（edit / patch / plan / restore / expect）位置参数可以是任意多段
    // （正文、多词条目、序号+片段），不做这个检查。
    const POS_MAX = {
        read: 0, write: 0, append: 0, mkdir: 0, delete: 0, undo: 0, redo: 0,
        upload: 8,      // 2.13.0：upload 可一次给多个路径（打成 zip 附件）
        rmline: 0, apply: 0, insert: 0,
        list: 0, tree: 0, stat: 0, cd: 0, grep: 1, move: 1, copy: 1, help: 1, split: 1, sort: 0
    };

    function unknownPosFor(op, args) {
        const max = POS_MAX[op];
        if (max == null || !args || args.length <= max) return [];
        return args.slice(max).filter(function (x) { return x != null && String(x) !== ''; });
    }

    function unknownFlagsFor(op, flags, args) {
        const allowed = COMMAND_FLAGS[op];
        if (!allowed || !flags) return [];
        const out = [];
        for (const k of Object.keys(flags)) {
            if (!k || k.charAt(0) === '_') continue;
            if (flags[k] === false || flags[k] == null) continue;
            if (allowed.indexOf(k) >= 0) continue;
            out.push(k);
        }
        for (const a of unknownPosFor(op, args)) out.push(String(a));   // 多出来的裸词也算「不认识的参数」
        return out;
    }

    // 只认新标准：命令行必须写在 ```dsw 代码围栏（或 <dsw> … </dsw>）执行域内。
    // 旧机制的 `[read: /a]` / `[write: /a]…[/write]` / `§` 闭合 / ```fs 围栏裸命令
    // 一律不再识别、不再归一化执行。下面这些正则只用来「明确拒绝 + 就地给出新写法」
    // （错误即答案：写旧语法的人要立刻拿到正确写法，而不是被静默当成别的命令）。
    const OLD_SYNTAX_OPEN_RE = /^\[[A-Za-z\u4e00-\u9fa5_]+\s*[:：]\s*[^\]]*\]$/;
    const OLD_SYNTAX_CLOSE_RE = /^\[\s*\/\s*[A-Za-z\u4e00-\u9fa5_]+\s*\]$/;
    const OLD_SYNTAX_SECTION_RE = /^§+$/;

    function oldSyntaxHint(line) {
        const t = String(line == null ? '' : line).trim();
        if (OLD_SYNTAX_SECTION_RE.test(t)) return '旧闭合符 ' + t + ' 已不再支持';
        if (OLD_SYNTAX_CLOSE_RE.test(t)) return '旧块闭合 ' + t + ' 已不再支持（旧机制整块写法已移除）';
        if (!OLD_SYNTAX_OPEN_RE.test(t)) return null;
        const inner = t.slice(1, -1);
        const norm = normalizeOp(inner.split(/[:：]/)[0]);
        const arg = inner.replace(/^[^:：]*[:：]?/, '').trim();
        return '旧语法 ' + t + ' 已不再支持' + (norm.op ? '；改成：' + norm.op + (arg ? ' ' + arg : '') : '');
    }

    function isCommentLine(line) {
        const t = String(line).trim();
        return t.startsWith('#') && !/^#[0-9a-z]{2,8}$/i.test(t);
    }

/* >>> 08-parser.js */
    /* =========================================================================
     * 08 解析器：执行域提取 + 行扫描状态机 + 定界正文 + 阶梯判据
     *   （§3.1 / §3.4 / §4 / §5.1 / §11）
     * ====================================================================== */

    /* ---------------------------- ① 归一化 ---------------------------- */

    function normalizeProtocolText(text) {
        let t = String(text == null ? '' : text);
        t = stripInvisible(t);
        // 16：**只对域标记行**做半角化。以前整段 toHalfWidth 会把 heredoc 正文里的中文标点
        // 也改成半角（“你好，世界” → "你好,世界"）—— 正文是内容，不能动。
        // 命令行的半角化下沉到 parseCommandLine（那里拿到的必然是命令行，不含正文）。
        t = t.split('\n').map(function (line) {
            return /[\[［【⟦<＜]\s*\/?\s*dsw\s*[\]］】⟧>＞]/i.test(line) ? toHalfWidthOutsideQuotes(line) : line;
        }).join('\n');
        // 2.13.0 协议标记换成主流 Agent 认得的两种（见 08-parser 的 DOMAIN_OPEN_RE 注释）：
        //   ① ```dsw 代码围栏（首选，各家 Agent 的命令块就是这个形状）；
        //   ② <dsw> … </dsw> 标签（与 <tool> / <function_calls> 同形状）。
        // 这里只做同一形状内的归一（大小写 / 空格 / 全半角 / <//dsw>），**不做旧标记兼容** ——
        // 旧标记（[[dsw]] / ⟦dsw⟧ / ===dsw===）由 legacyDomainLines 明确报错并给新写法（不静默）。
        // ⚠ 斜杠组必须可选：`(\/{1,2})` 要求至少一个斜杠，于是 `<DSW>`（开标记、大写）压根匹配不上、
        // 归一不生效，域被当成域外文本 —— 这是 2.13.0 首发的真实 bug。
        t = t.replace(/<\s*(\/{0,2})\s*dsw\s*>/gi, function (_, slash) { return '<' + (slash || '') + 'dsw>'; });
        return t;
    }

    // —— 执行域标记（2.13.0 起只认这两种，都是主流 Agent 工具块的形状）——
    // 开标记：<dsw> / <dsw atomic dry force>（大小写、全半角、多余空格均归一后再判）
    const DOMAIN_OPEN_RE = /^<\s*dsw\s*(?:[:：]\s*)?([a-zA-Z ,，、]*?)\s*>\s*$/i;
    // 闭标记：</dsw> / <//dsw> / < / dsw >
    const DOMAIN_CLOSE_RE = /^<\s*\/{1,2}\s*dsw\s*>\s*$/i;
    // 同一行写完开+闭（`<dsw></dsw>`）= 空执行域。以前整行不匹配开标记 → hasDomain=false
    // → action=none → 连回执都没有（A11 的静默）；现在它照样算一个（空）执行域，交上层回 NOOP。
    const DOMAIN_EMPTY_RE = /^<\s*dsw\s*(?:[:：]\s*)?([a-zA-Z ,，、]*?)\s*>\s*<\s*\/{1,2}\s*dsw\s*>$/i;
    // Markdown 围栏：```dsw（推荐写法，也是各家 Agent 的命令块形状）。修饰符写在语言标签后面：
    // ```dsw atomic dry``` —— 围栏与 <dsw> 修饰符语义完全一致。
    const FENCE_OPEN_RE = /^(`{3,}|~{3,})\s*(dsw|dsl|vfs|container)(?:[ \t]+([a-zA-Z ,]*?))?[ \t]*$/i;
    const FENCE_CLOSE_RE = /^(`{3,}|~{3,})\s*$/;
    // 旧协议标记（[[dsw]] / [⟦dsw⟧ / [dsw] / ===dsw=== / ---dsw---）：**不再识别为执行域**，
    // 但必须明确报错并给新写法（硬约束 3：静默停摆次数必须为 0）。行级判定，不碰正文。
    const LEGACY_MARK_LINE_RE = /^\s*(?:\[\[\s*\/?\s*dsw\b[\]］】]*|[\[［【⟦]\s*\/?\s*dsw\s*[\]］】⟧\]]|=+\s*\/?\s*dsw\s*=+|-{2,}\s*\/?\s*dsw\s*-{2,})\s*$/i;
    const HEREDOC_OPEN_RE = /^(<{3,})\s*([A-Za-z_\-\u4e00-\u9fa5]*)\s*$/;
    // 定界正文闭合符（§3.4）：`>>>` 与 `<<<` 等价，长度 ≥ 开始符长度。
    // 为什么必须再认 `<<<`：聊天页会把行首 `>>>` 当 Markdown 引用块渲染，innerText 里这三个字符
    // 会整个消失（`<<<` 不是合法 HTML 标签/引用块，能活下来）。只认 `>>>` 时正文永远等不到闭合，
    // 整个执行域被判「未闭合」→ 所有写正文的操作全灭。
    function heredocCloseLen(line) {
        const t = String(line == null ? '' : line).trim();
        return /^(?:>{3,}|<{3,})$/.test(t) ? t.length : 0;
    }
    // 双段分隔符：`===` 是 Markdown setext 下划线（会被吃掉），`;;;` 是等价的安全写法
    const DOUBLE_SEP_LINE_RE = /^(?:={3,}|;{3,})$/;
    const DOUBLE_SEP_WORDS = /^(old|oldtext|old-text|原始|旧|before)$/i;

    function parseMods(text) {
        const mods = {};
        for (const w of String(text || '').split(/[\s,，、]+/)) {
            const w2 = w.trim().toLowerCase();
            if (!w2) continue;
            if (w2 === 'atomic' || w2 === 'force' || w2 === 'dry') mods[w2] = true;
        }
        return mods;
    }

    function parseDomainOpen(line) {
        const t = line.trim();
        const m = DOMAIN_OPEN_RE.exec(t);
        if (!m) return null;
        return { type: 'canonical', mods: parseMods(m[1]) };
    }

    function parseDomainClose(line) { return DOMAIN_CLOSE_RE.test(line.trim()); }

    function isFenceOpen(line) {
        const m = FENCE_OPEN_RE.exec(line.trim());
        return m ? { fence: m[1], mods: parseMods(m[3]) } : null;
    }

    // 围栏「闭合」判定：与开始符**同字符**且长度 ≥ 开始符。
    // 为什么必须比长度：整段执行域被 ```` 四反引号围栏包住、正文里又有一整行 ``` 时，
    // 旧代码用 FENCE_CLOSE_RE（只要求 ≥3）会把正文那行 ``` 当成闭合 → 正文被截断、后面变成命令。
    function isFenceCloseFor(line, tick, len) {
        const m = FENCE_CLOSE_RE.exec(String(line == null ? '' : line).trim());
        return !!m && m[1].charAt(0) === tick && m[1].length >= len;
    }

    /* ---------------------------- ② 定界正文 ---------------------------- */

    function scanHeredoc(lines, startIdx, sepWord, limitIdx) {
        // 返回 { body: [..], pairs: {old,new}|null, endIdx, closed, truncated }
        const open = HEREDOC_OPEN_RE.exec(lines[startIdx].trim());
        if (!open) return null;
        const need = open[1].length;
        const mode = (open[2] || '').trim();
        const body = [];
        const stop = Math.min(limitIdx == null ? lines.length - 1 : limitIdx, lines.length - 1);
        let i = startIdx + 1;
        let closed = false;
        for (; i <= stop; i++) {
            if (heredocCloseLen(lines[i]) >= need) { closed = true; break; }
            body.push(lines[i]);
        }
        // 未闭合 = 撞上了执行域边界（网页把行首 `>>>` 吃掉了）：按边界收尾，
        // 尾部那几行空行是消失的闭合符留下的，不算正文内容。
        const truncated = !closed;
        if (truncated) while (body.length && !String(body[body.length - 1]).trim()) body.pop();
        let pairs = null;
        const doubleMode = DOUBLE_SEP_WORDS.test(mode) || !!sepWord;
        if (doubleMode) {
            const sep = sepWord || '';
            let at = sep ? body.findIndex(function (l) { return l.trim() === sep; }) : -1;
            if (at < 0) at = body.findIndex(function (l) { return DOUBLE_SEP_LINE_RE.test(l.trim()); });
            if (at >= 0) pairs = { old: body.slice(0, at).join('\n'), new: body.slice(at + 1).join('\n') };
        }
        return { body: body, pairs: pairs, endIdx: closed ? i : stop, closed: closed, truncated: truncated };
    }

    // 判断一个参数像不像「路径」：/ 开头、./ ../ 开头、# 锚点、@pN 路径令牌，或含目录分隔
    function looksLikePathToken(t) {
        const s = String(t == null ? '' : t).trim();
        if (!s) return false;
        if (s[0] === '/' || s[0] === '#' || s[0] === '@') return true;
        if (s.indexOf('./') === 0 || s.indexOf('../') === 0) return true;
        if (/^[\w.\-\u4e00-\u9fa5]+\/[\w.\-\u4e00-\u9fa5]+$/.test(s)) return true;
        return false;
    }

    /* ---------------------------- ③ 命令行 ---------------------------- */

    function preprocessOpColon(line) {
        // `read:/a.js` → `read /a.js`（只处理紧跟操作名的那一个冒号）
        return String(line).replace(/^(\s*[A-Za-z\u4e00-\u9fa5_]+)\s*[:：]\s*(?=[/#~.]|\S)/, function (m, head) { return head + ' '; });
    }

    function parseCommandLine(rawLine) {
        let line = String(rawLine == null ? '' : rawLine);
        line = line.replace(/^\s*[-*+]\s+/, ''); // 容忍列表符号
        line = toHalfWidthOutsideQuotes(line);                 // 16：命令行在这里半角化（全角区间/全角逗号/全角数字都认）
        // 旧机制写法一律拒绝（不再归一化执行），但要说清楚怎么改
        const oldHint = oldSyntaxHint(line);
        if (oldHint) {
            const t = line.trim();
            const newForm = OLD_SYNTAX_OPEN_RE.test(t)
                ? t.replace(/^\[/, '').replace(/\]$/, '').replace(/[:：]/, ' ').replace(/\s+/g, ' ').trim()
                : '';
            return {
                ok: false, raw: line, kind: 'legacy-syntax', badOp: t,
                syntax: '[read: /a] → read /a（写进 ```dsw 围栏里）',
                fix: oldHint + (newForm ? '（写进 ```dsw 代码围栏里）'
                    : '；新标准：命令写进 ```dsw 围栏，每行一条 `操作 路径 [参数]`')
            };
        }
        const prepared = preprocessOpColon(line);
        const detailed = splitTokensDetailed(prepared);
        const tokens = detailed.map(function (x) { return x.t; });
        if (!tokens.length) return null;
        const norm = normalizeOp(tokens[0]);
        if (!norm.op) {
            return {
                ok: false, raw: line, kind: 'unknown-op', badOp: tokens[0],
                closest: norm.closest,
                syntax: norm.closest ? (norm.closest.name + ' <路径> [参数]') : 'read /路径',
                fix: norm.closest ? ('未知命令 ' + tokens[0] + '；最接近：' + norm.closest.name) : ('未知命令 ' + tokens[0])
            };
        }
        // plan 命令的参数是「子命令 + 文字」，不能走开关解析：
        // `plan done 2` 里的 2 会被 parseFlags 当成行区间吃掉，`plan add 读取 配置` 也会被拆散。
        if (norm.op === 'plan') {
            const args = tokens.slice(1);
            return {
                ok: true,
                op: 'plan',
                kind: COMMANDS.plan.kind,
                approx: norm.exact ? null : (norm.approxFrom || tokens[0]),
                alias: norm.alias || null,
                anchor: null,
                path: args.length ? args[0] : '',
                args: args.slice(1),
                flags: {},
                raw: line,
                body: null,
                pairs: null
            };
        }

        // 命令名进参数解析：行区间只给 read/edit，grep 的裸词按「位置位是否占满」判定（第三轮 P0）
        const parsed = parseFlags(tokens.slice(1), norm.op, detailed.slice(1).map(function (x) { return x.q; }));
        const flags = parsed.flags;
        let rest = parsed.rest;
        let path = rest.length ? rest[0] : '';
        let extra = rest.slice(1);
        let inline = extra.slice();

        // 锚点：edit #a3f / read #a3f / delete #a3f
        let anchor = null;
        if (path && isAnchorToken(path)) { anchor = path; path = ''; }

        // 范围锚点（反馈 许愿·2）：`read #a3f 20` = 锚点行起往下共 20 行；`read #a3f -10` = 锚点行起往上共 10 行。
        // 「±3 行不够定位一段函数体」——正数不再被当成绝对行区间（那与锚点组合本来就没有意义）。
        let relSpan = null;
        if (anchor && norm.op === 'read') {
            const ai = tokens.indexOf(anchor);
            if (ai >= 0 && ai + 1 < tokens.length && !(detailed[ai + 1] && detailed[ai + 1].q)) {
                const m2 = /^([+-]?)(\d+)$/.exec(tokens[ai + 1]);
                if (m2) {
                    const n2 = parseInt(m2[2], 10);
                    if (n2 > 0) {
                        relSpan = (m2[1] === '-' ? -n2 : n2);
                        // 这个数已经由 _relSpan 消费，不能再当「多余的裸词」报「不认识的参数」
                        const at = extra.indexOf(tokens[ai + 1]);
                        if (at >= 0) { extra.splice(at, 1); inline = extra.slice(); }
                    }
                }
            }
        }

        // grep / find 的「无路径 = 全容器」：首参不像路径时，它就是搜索词 / 文件名模式
        if ((norm.op === 'grep' || norm.op === 'find') && path && !looksLikePathToken(path)) {
            extra = [path].concat(extra);
            inline = extra.slice();
            path = '';
        }

        // 2.13.0 参数顺序写反的硬错（`grep -n "x" /a.html`）：搜索词占了路径位，
        // 真路径退化成多余裸词 —— 以前它只留一句 ⚠ 就按「全容器搜索」跑完了（静默降级成成功）。
        // 现在标出来，doGrep / doFind 直接报错并给正确顺序。
        let misplacedPath = '';
        if (norm.op === 'grep' || norm.op === 'find') {
            // 只看**第二个**往后的裸词：第一个是搜索词 / 匹配式（它自己可以带 / 或 *）
            for (const t of inline.slice(1)) {
                if (!t || /[*?]/.test(t)) continue;
                if (looksLikePathToken(t) && String(t) !== path) { misplacedPath = t; break; }
            }
        }

        // 无路径的默认值（§3.3 慷慨默认）
        if (!path) {
            if (norm.op === 'grep' || norm.op === 'find') path = '/';
            else if (norm.op === 'read' || norm.op === 'list' || norm.op === 'tree' || norm.op === 'stat') path = '.';
            else if (norm.op === 'restore') path = '';
        }
        if (parsed.ranges.length && RANGE_OPS[norm.op]) {   // 行区间只对「真的吃区间」的命令生效（read/edit/rmline）
            // `read /f 10 - 12` / `read /f 10 12` 会被分词拆成两个单行区间，以前只取 ranges[0]，
            // 于是「读 10-12 行」静默变成「只读第 10 行」（A2）。两个单行区间按「起点<终点」合并成一对。
            if (parsed.ranges.length >= 2
                && parsed.ranges[0][0] === parsed.ranges[0][1]
                && parsed.ranges[1][0] === parsed.ranges[1][1]
                && parsed.ranges[0][0] < parsed.ranges[1][0]) {
                flags.lineRange = [parsed.ranges[0][0], parsed.ranges[1][0]];
            } else {
                flags.lineRange = parsed.ranges[0];
            }
            // insert 需要两个位置：目标行 + （from= 时的）源行区间。这里把原始区间序列留一份，
            // 由 doInsert 解释（前缀 _ 的键不参与「未实现开关」检查）。
            if (norm.op === 'insert') flags._ranges = parsed.ranges.map(function (r) { return r.slice(); });
        }
        // 范围锚点优先于「被当成绝对行号」的解读：清掉 lineRange，改由 _relSpan 驱动
        if (norm.op === 'read' && relSpan != null) {
            flags._relSpan = relSpan;
            delete flags.lineRange;
        }

        return {
            ok: true,
            op: norm.op,
            kind: COMMANDS[norm.op].kind,
            approx: norm.exact ? null : (norm.approxFrom || tokens[0]),
            alias: norm.alias || null,
            anchor: anchor,
            path: path,
            args: inline,
            flags: flags,
            misplacedPath: misplacedPath,
            raw: line,
            body: null,
            pairs: null
        };
    }

    /* ---------------------------- ④ 行扫描 ---------------------------- */

    function scanDomainLines(lines, fromIdx, toIdx) {
        const cmds = [];
        const issues = [];
        let last = null;
        let i = fromIdx;
        while (i <= toIdx) {
            const line = lines[i];
            const t = line.trim();
            if (!t) { i++; continue; }
            if (isCommentLine(t)) { i++; continue; }
            // 围栏形式里再写一遍正典开/闭标记时，它们是结构行而不是命令（否则会多出一条「未知命令」）
            if (parseDomainOpen(t) || parseDomainClose(t)) { i++; continue; }

            const hd = HEREDOC_OPEN_RE.exec(t);
            if (hd) {
                const sep = last && (last.flags && (last.flags.sep || (last.args && last.args.indexOf('sep=') >= 0))) ? String(last.flags.sep || '') : '';
                const h = scanHeredoc(lines, i, sep, toIdx);
                if (last) {
                    last.body = h.body;
                    last.pairs = h.pairs;
                    if (h.truncated) {
                        // 自愈但绝不静默：允许执行，但要让 AI 知道闭合符没到，并给出不会踩坑的写法
                        last.bodyImplicitClose = true;
                        issues.push({ line: i + 1, text: '定界正文未见闭合符，已按执行域边界收尾（行首 >>> 会被网页 markdown 吃掉；用 <<< 收尾即可）', heal: true });
                    }
                } else {
                    issues.push({ line: i + 1, text: '定界正文前没有命令，已忽略', fatal: false });
                }
                i = h.endIdx + 1;
                continue;
            }

            const cmd = parseCommandLine(line);
            if (!cmd) { i++; continue; }
            if (cmd.ok === false) {
                cmd.line = i + 1;
                cmds.push(cmd);
                last = null;
                i++;
                continue;
            }
            cmd.line = i + 1;
            cmds.push(cmd);
            last = cmd;
            i++;
        }
        return { cmds: cmds, issues: issues };
    }

    /* ---------------------------- ⑤ 执行域提取 ---------------------------- */

    function extractDomains(text) {
        const lines = String(text == null ? '' : text).split('\n');
        const domains = [];
        let unclosed = 0;
        let i = 0;
        while (i < lines.length) {
            const open = parseDomainOpen(lines[i]);
            const fence = open ? null : isFenceOpen(lines[i]);
            if (!open && !fence) {
                const emp = DOMAIN_EMPTY_RE.exec(lines[i].trim());
                if (emp) {
                    const emods = parseMods(emp[1]);
                    domains.push({
                        ok: true, unclosed: false, atomic: !!emods.atomic, force: !!emods.force, dry: !!emods.dry,
                        startLine: i + 1, endLine: i + 1, rawText: '', fence: false, modsApplied: emods,
                        cmds: [], issues: [], empty: true
                    });
                    i++;
                    continue;
                }
                i++;
                continue;
            }

            const isFence = !!fence;
            const mods = open ? open.mods : (fence ? fence.mods : {});
            const fenceMark = (isFence && fence && fence.fence) ? String(fence.fence) : '';
            const fenceTick = fenceMark ? fenceMark.charAt(0) : '';
            const fenceLen = fenceMark.length;
            const start = i;
            let closeIdx = -1;
            let heredocDepth = 0;
            let need = 0;
            let implicitClose = 0;
            let j = i + 1;
            for (; j < lines.length; j++) {
                const t = lines[j].trim();
                const hd = HEREDOC_OPEN_RE.exec(t);
                if (hd && heredocDepth === 0) { need = hd[1].length; heredocDepth = 1; continue; }
                if (heredocDepth) {
                    if (heredocCloseLen(t) >= need) { heredocDepth = 0; continue; }
                    // 自愈（§5 R3）：正文还没闭合就撞上闭标记 —— 闭标记优先。
                    // 否则「网页吃掉了行首 >>>」会让整域被判「未闭合」，一条命令都执行不了。
                    // 只认 `</dsw>`：围栏域里的 ``` 必须继续服从「正文内的 ``` 不闭合执行域」规则。
                    if (!parseDomainClose(t)) continue;
                    heredocDepth = 0;
                    implicitClose++;
                }
                if (isFence) {
                    // 围栏安全规则：`<<< … >>>` 内部的 ``` 不闭合执行域（已由 heredocDepth 保证）；
                    // 且闭合符必须与开始符同字符、长度 ≥ 开始符（```` 域里正文的 ``` 不算闭合）。
                    if (isFenceCloseFor(t, fenceTick, fenceLen)) { closeIdx = j; break; }
                    if (parseDomainClose(t)) { closeIdx = j; break; }
                } else {
                    // <dsw> 域：只认 </dsw> 闭合。域里出现代码围栏**不再**当成域的结束
                    // （2.13.0：围栏本身就是推荐的域写法，AI 常在 <dsw> 里再写一层围栏示意）。
                    if (parseDomainClose(t)) { closeIdx = j; break; }
                }
            }
            if (closeIdx < 0) {
                unclosed++;
                domains.push({
                    ok: false, unclosed: true, atomic: false, force: false, dry: false,
                    startLine: start + 1, endLine: lines.length, fence: isFence, cmds: [], issues: []
                });
                break;
            }
            const scan = scanDomainLines(lines, start + 1, closeIdx - 1);
            domains.push({
                ok: true, unclosed: false,
                atomic: !!mods.atomic, force: !!mods.force, dry: !!mods.dry,
                startLine: start + 1, endLine: closeIdx + 1,
                rawText: lines.slice(start + 1, closeIdx).join('\n'),
                fence: isFence,
                modsApplied: mods,
                cmds: scan.cmds, issues: scan.issues
            });
            i = closeIdx + 1;
        }
        return { domains: domains, unclosed: unclosed };
    }

    /* ---------------------------- ⑥ 围栏 / 定界正文区间 ---------------------------- */

    // Markdown 围栏区间：围栏内一律不执行（旧机制的 ```fs 裸命令已移除），只用于排除代码示例
    function collectFenceRanges(text) {
        const lines = String(text == null ? '' : text).split('\n');
        const ranges = [];
        let open = null;
        for (let i = 0; i < lines.length; i++) {
            const m = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
            if (!m) continue;
            if (!open) open = { start: i, tick: m[1][0], len: m[1].length, lang: lines[i].slice(m[1].length).trim().toLowerCase() };
            else if (m[1][0] === open.tick && m[1].length >= open.len) { ranges.push({ start: open.start, end: i, lang: open.lang }); open = null; }
        }
        if (open) ranges.push({ start: open.start, end: lines.length - 1, lang: open.lang, unclosed: true });
        return ranges;
    }

    function inRanges(idx, ranges) {
        for (const r of ranges) if (idx >= r.start && idx <= r.end) return r;
        return null;
    }

    // 定界正文区间（用于把正文行排除在「命令占比」之外）
    function collectHeredocRanges(text) {
        const lines = String(text == null ? '' : text).split('\n');
        const ranges = [];
        let i = 0;
        while (i < lines.length) {
            const m = HEREDOC_OPEN_RE.exec(lines[i].trim());
            if (!m) { i++; continue; }
            const need = m[1].length;
            let j = i + 1;
            for (; j < lines.length; j++) {
                if (heredocCloseLen(lines[j]) >= need) break;
            }
            ranges.push({ start: i, end: Math.min(j, lines.length - 1) });
            i = j + 1;
        }
        return ranges;
    }

    /* ---------------------------- ⑦ 高置信命令行（阶梯判据 §5.1） ---------------------------- */

    function looksLikePlaceholderPath(p) {
        if (!p) return true;
        const v = VirtualFS.validatePath(p);
        if (!v.ok) return true;
        for (const seg of v.segments) if (isPlaceholderSegment(seg)) return true;
        return false;
    }

    function scanBareCommands(text, opts) {
        opts = opts || {};
        const lines = String(text == null ? '' : text).split('\n');
        const domainLineSet = opts.domainLines || new Set();
        const fences = collectFenceRanges(text);
        const heredocs = collectHeredocRanges(text);
        const candidates = [];
        let nonEmpty = 0;
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            if (!t) continue;
            if (inRanges(i, heredocs)) continue;      // 定界正文内容不是「正文说明」
            if (domainLineSet.has(i)) continue;
            nonEmpty++;
            if (/^>/.test(t)) continue;             // 引用块
            if (isCommentLine(t)) continue;
            if (inRanges(i, fences)) continue;       // 围栏内一律是代码示例
            const cmd = parseCommandLine(lines[i]);
            if (!cmd || cmd.ok === false) continue;
            if (looksLikePlaceholderPath(cmd.path)) continue;   // ② 排除占位符
            if (/[<>{}$]|\bTODO\b|\.\.\./.test(cmd.path)) continue;
            cmd.line = i + 1;
            cmd.bare = true;
            candidates.push(cmd);
        }
        const ratio = nonEmpty ? candidates.length / nonEmpty : 0;
        return {
            candidates: candidates,
            nonEmpty: nonEmpty,
            ratio: ratio,
            writeCandidates: candidates.filter(function (c) { return c.kind === 'write'; }),
            readCandidates: candidates.filter(function (c) { return c.kind !== 'write'; }),
            length: String(text || '').length
        };
    }

    /* ---------------------------- ⑧ 总入口 ---------------------------- */

    function parseMessage(rawText) {
        const text = normalizeProtocolText(rawText);
        const extracted = extractDomains(text);
        const domains = extracted.domains.filter(function (d) { return d.ok; });

        const domainLines = new Set();
        for (const d of domains.concat(extracted.domains.filter(function (x) { return !x.ok; }))) {
            for (let i = d.startLine - 1; i <= d.endLine - 1; i++) domainLines.add(i);
        }

        // 旧协议标记（[[dsw]] / ⟦dsw⟧ / ===dsw===）：**不再算执行域**，但也不能当没看见 ——
        // ① 这些行占进 domainLines，域外的「读兵底」不会把里面的命令当裸命令执行；
        // ② 记下来交给裁决层明确报错并给新写法（不静默、不兼容）。
        const legacyMarks = [];
        const allLines = text.split('\n');
        for (let i = 0; i < allLines.length; i++) {
            if (domainLines.has(i)) continue;
            if (!LEGACY_MARK_LINE_RE.test(allLines[i])) continue;
            legacyMarks.push({ line: i + 1, raw: allLines[i].trim() });
            domainLines.add(i);
        }

        const bare = scanBareCommands(text, { domainLines: domainLines });

        // 「命令写在代码块里，却没认出来」：平台可能把 ``` 围栏标记丢掉（只留代码内容），
        // 于是整域消失、什么都看不见。这在 2.13.0 发版后被真实反馈命中 —— 域外兼底只能
        // 看到裸命令行，看不到代码块里的，所以以前是**静默停摆**（违反硬约束 3）。
        // 这里单独数一遍「代码块里像命令的行」：数量 > 0 时交给裁决层明确回一条提示。
        let fencedCmds = 0;
        try {
            const allLines2 = text.split('\n');
            const hdRanges = collectHeredocRanges(text);
            for (const r of collectFenceRanges(text)) {
                for (let i = r.start; i <= r.end; i++) {
                    if (domainLines.has(i)) continue;
                    if (inRanges(i, hdRanges)) continue;          // 正文内容不算命令
                    const c = parseCommandLine(allLines2[i]);
                    if (c && c.ok) fencedCmds++;
                }
            }
        } catch (e) {}

        const cmds = [];
        for (const d of domains) {
            for (const c of d.cmds) {
                c.domain = { atomic: d.atomic, force: d.force, dry: d.dry, fence: d.fence, startLine: d.startLine };
                cmds.push(c);
            }
        }

        return {
            text: text,
            domains: extracted.domains,
            hasDomain: domains.length > 0,
            domainCmds: cmds,
            unclosedDomains: extracted.unclosed,
            legacyMarks: legacyMarks,
            fencedCmds: fencedCmds,
            bare: bare
        };
    }

/* >>> 09-exec.js */
    /* =========================================================================
     * 09 执行引擎：自愈 R3 · 错误即答案 R4 · 原子批次 R2 · 断言 · 幂等 R1
     * ====================================================================== */

    // 相对路径 → 绝对路径（相对 cwd；. / .. 归一化）
    function resolvePathArg(p, cwd) {
        let s = String(p == null ? '' : p).trim();
        if (!s) return cwd && cwd !== '/' ? cwd : '/';
        if (s === '.') return cwd && cwd !== '/' ? cwd : '/';
        const abs = s.startsWith('/');
        const parts = (abs ? s : ((cwd && cwd !== '/') ? cwd + '/' + s : '/' + s)).split('/');
        const out = [];
        for (const seg of parts) {
            if (!seg || seg === '.') continue;
            if (seg === '..') { out.pop(); continue; }
            out.push(seg);
        }
        return '/' + out.join('/');
    }

    /* ---- 13：正文可疑检查（只警告，不拒绝） ----
     * 手册 §4 要求「含缩进 / 行首 # - > / 成对 ** __ 的正文必须包进三反引号围栏」——
     * 但脚本自己不检查，就等于这条契约没人执行。这里只做三条低误报的检查，命中就在回执里标 ⚠。
     * 2.13.0：强调标记改成「**计数 + 落单位置**」双条件（奇数但落单在行中一律不报），
     * 并给出 --no-warn 开关 —— 宁可少报，也要把真实告警的信任留给用户。
     */
    const SUSPICIOUS_EMPHASIS_MAX = 12;      // 超过这么多处就不再用奇偶法判（奇偶已无判别力）

    function suspiciousBody(body) {
        const text = String(body == null ? '' : body);
        if (!text.trim()) return '';
        const notes = [];
        // 只统计「像强调」的标记：出现在词边界（前/后是空白、标点或串首尾）的那种。
        // 旧写法是纯奇偶计数，`a__b__c__d`、`x__y` 这类标识符里的连续下划线会被当成「成对 __ 只出现 N 次」误报。
        // 三反引号围栏与行内代码里的内容平台当字面量不改写，一并跳过（手册本就要求正文包围栏）。
        const stripped = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
        const isBoundary = function (ch) { return ch === '' || /[^\w]/.test(ch); };
        for (const mk of ['**', '__']) {
            let n = 0;
            let oddAtLineEdge = false;
            for (let i = stripped.indexOf(mk); i !== -1; i = stripped.indexOf(mk, i + mk.length)) {
                const before = i === 0 ? '' : stripped[i - 1];
                const after = stripped[i + mk.length] || '';
                if (!(isBoundary(before) || isBoundary(after))) continue;
                n++;
                // 2.13.0 降误报：奇数本身**不足以**判定被吞（长文里 29 处 `__` 也会是奇数，
                // 而代码正文里成对标记本来就多，奇偶法在大数量上不可靠）。
                // 只有「落单的那一个落在行首 / 行尾」才像被吞了一半（行中的落单更像正文字面量）。
                const atEdge = before === '' || before === '\n' || after === '' || after === '\n'
                    || stripped.charAt(i - 1) === '\n' || stripped.charAt(i + mk.length) === '\n';
                if (atEdge) oddAtLineEdge = true;
            }
            if (n % 2 === 1 && n <= SUSPICIOUS_EMPHASIS_MAX && oddAtLineEdge) {
                notes.push('成对 ' + mk + ' 共 ' + n + ' 处但有个落单在行首 / 行尾（可能被平台吞了一半；确认无误可加 --no-warn）');
            }
        }
        const rows = text.split('\n');
        const pyish = /(^|\n)\s*(def|class)\s+\w/.test(text);
        if (pyish) {
            for (let i = 1; i < rows.length; i++) {
                const prev = rows[i - 1], cur = rows[i];
                if (!prev.trim() || !cur.trim()) continue;
                if (/[:：]\s*$/.test(prev) && /^\S/.test(cur)) {
                    notes.push('第 ' + (i + 1) + ' 行没有行首缩进，而上一行以「:」结尾（缩进可能被平台吞了）');
                    break;
                }
            }
        }
        return notes.length ? notes.join('；') : '';
    }

    /* ---- 14：回执/正文被截断时把完整内容落盘，回执里给 read 路径 ----
     * 「另有 N 行已省略（见面板）」对 AI 是死路：它看不到面板。落盘到 /__sys/outbox/（AI 只读区），
     * 回执里直接给 `read /__sys/outbox/xxx.txt`，AI 自己就能接着看。
     */
    function spillText(label, text) {
        try {
            const body = String(text == null ? '' : text);
            const safe = String(label || 'dump').replace(/[^\w.-]+/g, '_').slice(0, 40);
            // 名字带上内容哈希（内容寻址）：同一份内容反复读只落一份盘，回执里给的路径也稳定不变。
            // 以前用「时分秒」命名，每读一次大文件就多写一份几 MB 的副本，越用越卡（§9 效率）。
            const p = '/__sys/outbox/' + safe + '-' + contentHash(body) + '.txt';
            const existing = VirtualFS.resolve(p);
            if (existing && existing.type === 'file' && String(existing.content) === body) return p;   // 已落盘，直接复用
            // 低层直写：不经过 withAtomicWrite —— 否则「读大文件 / 回执落盘」会被记成一次可撤销写入，
            // 破坏 §6「读批不进撤销栈」（undo 的步数会与写入次数对不上）。这是诊断旁路落盘，不占撤销栈。
            const v = VirtualFS.validatePath(p);
            if (!v.ok || v.root) return null;
            let node = VirtualFS.root;
            for (let i = 0; i < v.segments.length - 1; i++) {
                const seg = v.segments[i];
                if (!node.children[seg]) node.children[seg] = VirtualFS.newDirNode();
                node = node.children[seg];
                if (!node || node.type !== 'dir') return null;
            }
            node.children[v.segments[v.segments.length - 1]] = VirtualFS.newFileNode(body);
            VirtualFS.persist();
            return p;
        } catch (e) { return null; }
    }

    // 会改文件树的操作（19 的 dry 溯源只认这些；read/list/stat/grep 不算）
    // rmline 以前漏在这里 → 它的 dry 溯源不记路径、批量汇总也漏算（反馈 许愿·4 暴露）
    const MUTATING_OPS = {
        write: 1, append: 1, edit: 1, insert: 1, rmline: 1, patch: 1, mkdir: 1, move: 1, copy: 1, split: 1, sort: 1,
        'delete': 1, restore: 1, undo: 1, redo: 1, upload: 1
    };

    function dangerAllowed(cmd, isDomain) {
        // §5.1 危险命令永不放宽：必须显式执行域
        const op = cmd.op;
        if (op === 'delete') return isDomain;   // 所有删除（含单个文件）都要显式执行域（手册 §9）
        if (op === 'upload' || op === 'restore' || op === 'undo' || op === 'redo') return isDomain;
        return true;
    }

    /* ---------------------------- 单命令 ---------------------------- */

    function annotateHits(path, hits) {
        return hits.map(function (h) {
            const tok = AnchorStore.make(path, h.line, h.text);
            return { line: h.line, text: h.text, anchor: tok };
        });
    }

    /* 路径令牌 @pN 展开（§3.5 的兄弟机制）：**必须在 resolvePathArg 之前**动 path/args，
     * 而 resolvePathArg 本身保持纯函数不动（它被多处直接调用，不能掺会话状态）。
     *   · cmd.path：整体是令牌时换成真实路径；
     *   · cmd.args：整体是令牌时换成真实路径（move/copy 的目标、merge 的源都在这）；
     *   · cmd.flags.from / to：`from=@p1` 落在 flags 里（parseFlags 的 k=v 分支），也要展开。
     * 返回 { cmd, heal } 或 { error }（令牌失效 → 这一条回错，同批其它命令照常跑）。 */
    function expandCommandTokens(cmd, ctx) {
        const next = Object.assign({}, cmd);
        let heal = '';
        const one = function (raw) {
            if (!isPathToken(raw)) return { raw: raw };
            const r = PathStore.resolve(raw);
            if (!r.ok) return { error: r };
            if (r.relocated) heal = (heal ? heal + '；' : '') + '令牌 ' + String(raw).trim() + ' 重定位 ' + r.relocated[0] + '→' + r.relocated[1];
            return { raw: r.path };
        };
        const p = one(next.path);
        if (p.error) return { error: fail(cmd, String(next.path), p.error.error, { kind: 'path', candidates: p.error.candidates, fix: p.error.fix }) };
        next.path = p.raw;
        if (Array.isArray(next.args)) {
            const outArgs = [];
            for (const a of next.args) {
                const r = one(a);
                if (r.error) return { error: fail(cmd, String(a), r.error.error, { kind: 'path', candidates: r.error.candidates, fix: r.error.fix }) };
                outArgs.push(r.raw);
            }
            next.args = outArgs;
        }
        if (next.flags && (next.flags.from != null || next.flags.to != null)) {
            const f = Object.assign({}, next.flags);
            for (const key of ['from', 'to']) {
                if (f[key] == null) continue;
                const r = one(f[key]);
                if (r.error) return { error: fail(cmd, String(f[key]), r.error.error, { kind: 'path', candidates: r.error.candidates, fix: r.error.fix }) };
                f[key] = r.raw;
            }
            next.flags = f;
        }
        return { cmd: next, heal: heal };
    }

    function executeCmd(cmd, ctx) {
        const cwd = ctx.cwd || '/';
        ctx.heals = ctx.heals || 0;
        // §5：冒险型自愈的额度按命令重算 —— 每条命令各有一次机会，不再整批共用一次
        ctx.riskyHeals = 0;
        // 令牌展开先于一切路径解析（计划命令不吃路径，放行即可）
        let tokenHeal = '';
        if (cmd.op !== 'plan') {
            const ex = expandCommandTokens(cmd, ctx);
            if (ex.error) return ex.error;
            cmd = ex.cmd;
            tokenHeal = ex.heal || '';
        }
        let path = resolvePathArg(cmd.path, cwd);
        let selfHeal = null;

        // §11.1 计划命令：参数是「子命令 + 文字」，不按路径解析
        if (cmd.op === 'plan') return doPlan(cmd);

        if (cmd.op === 'cd') {
            const v = VirtualFS.validatePath(path);
            if (!v.ok) return fail(cmd, path, v.reason, { kind: 'path' });
            const node = VirtualFS.resolve(v.path);
            if (!node) return fail(cmd, path, path + ' 不存在', { candidates: VirtualFS.similarPaths(path, 3), kind: 'path', fix: 'cd ' + (VirtualFS.similarPaths(path, 1)[0] ? VirtualFS.similarPaths(path, 1)[0].path : '/') });
            if (node.type !== 'dir') return fail(cmd, path, path + ' 不是目录', { kind: 'path' });
            ctx.cwd = v.path;
            return { ok: true, op: 'cd', path: v.path, summary: 'cwd = ' + v.path, cwd: v.path };
        }

        // 锚点优先（§3.5）
        if (cmd.anchor) {
            const res = AnchorStore.resolve(cmd.anchor);
            if (!res.ok) return fail(cmd, cmd.anchor, res.error, { candidates: res.candidates, fix: res.fix, kind: 'anchor' });
            path = res.path;
            if (res.relocated) {
                if (ctx.riskyHeals >= CONFIG.RISKY_HEALS_PER_CMD) {
                    return fail(cmd, path, '锚点 ' + cmd.anchor + ' 已漂移（L' + res.relocated[0] + '→L' + res.relocated[1] + '），但这条命令已用过一次自愈', { kind: 'anchor', fix: 'read ' + path + ' 后再改' });
                }
                ctx.riskyHeals++;
                ctx.heals++;
                selfHeal = '锚点重定位 L' + res.relocated[0] + '→L' + res.relocated[1];
            }
            // A1：锚点必须真的「定位」。以前无论什么命令都把 lineRange 清成 null，于是
            // `read #a3f` 退化成「读整个文件」（大文件只回一份头尾摘要），与手册 §2「read #锚点 直接用锚点」不符。
            // 现在：read + 锚点 → 锚点行 ±3 行；显式给了行区间（read #a3f 100-140）就用显式区间；
            //       read #a3f 20 / -10 → 范围锚点（锚点行起往下/往上共 N 行，定位函数体比 ±3 够用）；
            //       edit + 锚点 → 显式区间优先，否则单行替换（doEdit 里的 _anchorLine 语义不变）。
            const hadRange = Array.isArray(cmd.flags && cmd.flags.lineRange) ? cmd.flags.lineRange : null;
            const relSpan = cmd.flags && cmd.flags._relSpan;
            let anchorRange;
            if (cmd.op === 'read' && relSpan) {
                const n = Math.abs(relSpan);
                anchorRange = relSpan > 0
                    ? [res.line, res.line + n - 1]
                    : [Math.max(1, res.line - n + 1), res.line];
            } else {
                anchorRange = cmd.op === 'read' ? (hadRange || [Math.max(1, res.line - 3), res.line + 3]) : hadRange;
            }
            cmd = Object.assign({}, cmd, { flags: Object.assign({}, cmd.flags, { lineRange: anchorRange, _anchorLine: res.line }) });
        }

        // glob 批量（delete / move / copy）：路径里带 * ? ** 时先展开成一批目标。
        //   · 整批**原子**（一条失败全部回滚）；
        //   · 任一目标落在内部区（/__sys、/__trash）→ 整条拒绝（不能借 glob 绕过系统区只读）；
        //   · glob **删除**必须显式加 force（危险命令永不放宽的延伸：一次删一批要你点头）。
        if ((cmd.op === 'delete' || cmd.op === 'move' || cmd.op === 'copy') && VirtualFS.hasGlob(cmd.path)) {
            return doGlobBatch(cmd, cmd.path, ctx, cmd.op);
        }
        let out;
        switch (cmd.op) {
            case 'read': out = doRead(cmd, path); break;
            case 'list': out = doSimple(cmd, path, VirtualFS.list, 'list'); break;
            case 'tree': out = doSimple(cmd, path, VirtualFS.tree, 'tree'); break;
            case 'stat': out = doSimple(cmd, path, VirtualFS.stat, 'stat'); break;
            case 'grep': out = doGrep(cmd, path); break;
            case 'find': out = doFind(cmd, path); break;
            case 'help': out = doHelp(cmd); break;
            case 'diff': out = doDiff(cmd, path, ctx); break;
            case 'write': out = doWrite(cmd, path, ctx); break;
            case 'append': out = doAppend(cmd, path, ctx); break;
            case 'edit': out = doEdit(cmd, path, ctx); break;
            case 'insert': out = doInsert(cmd, path, ctx); break;
            case 'rmline': out = doRmLine(cmd, path, ctx); break;
            case 'apply': out = doApply(cmd, ctx); break;
            case 'patch': out = doPatch(cmd, path, ctx); break;
            case 'mkdir': out = doMkdir(cmd, path); break;
            case 'move': out = doMove(cmd, path, ctx); break;
            case 'copy': out = doCopy(cmd, path, ctx); break;
            case 'merge': out = doMerge(cmd, path, ctx); break;
            case 'split': out = doSplit(cmd, path, ctx); break;
            case 'sort': out = doSort(cmd, path, ctx); break;
            case 'delete': out = doDelete(cmd, path); break;
            case 'undo': out = doSteps(cmd, path, VirtualFS.undo, 'undo'); break;
            case 'redo': out = doSteps(cmd, path, VirtualFS.redo, 'redo'); break;
            case 'restore': out = doRestore(cmd, path); break;
            case 'upload': out = doUpload(cmd, path); break;
            case 'expect': out = doExpect(cmd, path); break;
            default: out = fail(cmd, path, '未实现的命令 ' + cmd.op, { kind: 'syntax' });
        }
        // 锚点重定位等「自愈」必须逐条标 ⚠（§5 R3）
        if (out && out.ok && selfHeal && !out.selfHeal) out.selfHeal = selfHeal;
        // 路径令牌重定位同样要逐条标 ⚠（自愈不许静默）
        if (out && out.ok && tokenHeal) {
            ctx.heals++;
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + tokenHeal) : tokenHeal;
        }
        // 命令名是近似匹配（reed→read / readfile→read / rea→read）：按正确命令执行，但必须标 ⚠。
        // 手册承诺过这一条，之前只解析了 cmd.approx 却没人往回收执里放（容器实测抓到的静默自愈）。
        if (out && out.ok && cmd.approx) {
            ctx.heals++;
            const note = '命令名 ' + cmd.approx + ' → ' + (out.op || '命令') + '（按最接近的命令执行）';
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + note) : note;
        }
        // 命令没实现的开关绝不静默（A10）：命令照常执行，但回执要说清「这个参数被忽略了」；
        // 2.13.0：而且**不再降级为成功** —— 这类命令一律标 partial，整批回执给 PARTIAL。
        //   （以前只在 ⚠ 里提一句就按 ✓ AUTO 返回，AI 会以为「参数生效了」。）
        if (out && out.ok) {
            const unknown = unknownFlagsFor(cmd.op, cmd.flags, cmd.args);
            if (unknown.length) {
                ctx.heals++;
                // 域级修饰符写错位置的提示（dry/force/atomic 属于开标记，不属于命令行）
                const mods = unknown.filter(function (k) { return k === 'dry' || k === 'force' || k === 'atomic'; });
                const modHint = mods.length ? '（' + mods.join('、') + ' 要写在开标记里：```dsw ' + mods.join(' ') + '，或 <dsw ' + mods.join(' ') + '>）' : '';
                const note = '参数 ' + unknown.join('、') + ' 本命令不认识，已忽略' + modHint;
                out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + note) : note;
                out.partial = true;
            }
        }
        return out;
    }

    /* 把底层结果原样返回，并补上「命令在第几行」—— 回执、报错、锚点都要它。
     * 原来是 14 处各写一遍 pickLine(r, cmd)，现在只有这一处。 */
    function pickLine(r, cmd) {
        if (!r || typeof r !== 'object') return r;
        if (r.line == null) r.line = cmd.line;
        return r;
    }

    function fail(cmd, path, error, extra) {
        return Object.assign({
            ok: false, op: cmd.op, path: path, error: error, kind: (extra && extra.kind) || 'generic',
            line: cmd.line
        }, extra || {});
    }

    // 定界正文没等到闭合符就撞上执行域边界（网页把行首 >>> 当引用块渲染吃掉了）：
    // 自愈允许执行，但必须逐条标 ⚠（§5 R3：自愈不许静默），并告知不会踩坑的写法。
    function noteImplicitBodyClose(cmd, out, ctx) {
        if (!cmd || !cmd.bodyImplicitClose || !out || !out.ok) return out;
        ctx.heals++;
        const note = '正文未见闭合符，已按执行域边界收尾（行首 >>> 被网页 markdown 吃掉；改用 <<< 收尾）';
        out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + note) : note;
        return out;
    }

    /* ---------------------------- 各命令实现 ---------------------------- */

    function doRead(cmd, path) {
        const flags = cmd.flags || {};
        const r = VirtualFS.read(path, flags);
        if (!r.ok) return pickLine(r, cmd);
        if (r.type === 'dir') {
            return { ok: true, op: 'read', path: r.path, summary: 'read ' + r.path + ' → 目录 ' + r.entries.length + ' 项', body: r.body, structure: false };
        }
        let lines;
        if (flags.outline) {
            const o = VirtualFS.outline(r.raw);
            lines = o.length ? o.map(function (x) { return x.line + '| ' + x.text; }) : ['(未识别到大纲结构，可改 read ' + r.path + ' 分段读)'];
        } else if (r.lines) {
            const withAnchor = annotateHits(r.path, r.lines);
            lines = withAnchor.map(function (h) { return h.anchor + ' ' + h.line + '| ' + h.text; });
        } else {
            const all = String(r.raw).split('\n');
            // 2.13.0 `full` / `no-elide`：默认只给头尾 + 一句「去 outbox 二次读」，
            // 那多出来的一轮往返经常比直接给全文还贵。写了 full 就一次给全（不再落盘）。
            const wantFull = !!((flags && flags.full) || (flags && flags.noElide));
            if (all.length > 60 && !wantFull) {
                lines = buildCtxHeadTail(all).map(function (l, i) { return l; });
                // 14：只给头尾时，全文落盘（/__sys/outbox/，AI 只读区），回执里直接给 read 路径
                const sp = spillText('read-' + r.path.replace(/[^\w.-]+/g, '_'), r.raw);
                lines.push('(共 ' + r.totalLines + ' 行 / ' + fmtSize(r.size) + '；用 read ' + r.path + ' 1-80 分段读，'
                    + '或 read ' + r.path + ' full 一次读全'
                    + (sp ? '；全文已落盘：read ' + sp : '') + ')');
            } else {
                lines = all.map(function (l) { return l; });
            }
        }
        const rangeNote = r.range ? (' L' + r.range[0] + (r.range[1] !== r.range[0] ? '-' + r.range[1] : '')) : '';
        // head/tail 也在 summary 里回显，否则「为什么只给了 20 行」要靠猜
        const htNote = flags.head != null ? ' head=' + flags.head : (flags.tail != null ? ' tail=' + flags.tail : '');
        // 负偏移统一为显式范围：read #a3f -8 这种写法过去只把 -8 当「多余裸词」吞掉，
        // 交出解析后的显式行号，并提示「改显式写法」。（自愈不许静默）
        const relSpan = flags._relSpan;
        if (cmd.anchor && relSpan != null && relSpan < 0 && -relSpan < 400) {
            const ar = AnchorStore.resolve(cmd.anchor);
            const base = (ar && ar.relocated ? ar.relocated[1] : (ar ? ar.line : 1));
            const start = Math.max(1, base - (-relSpan) + 1);
            const end = base;
            const hint = 'ℹ ' + cmd.anchor + ' 负偏移已转显式范围 L' + start + '-' + end + '；建议直接写：read ' + cmd.anchor + ' ' + start + '-' + end;
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + hint) : hint;
        }
        return {
            ok: true, op: 'read', path: r.path, changes: [],
            summary: 'read ' + r.path + (cmd.anchor ? ' ' + cmd.anchor : '') + rangeNote + htNote + ' ' + r.totalLines + '行/' + fmtSize(r.size),
            body: lines
        };
    }

    function doSimple(cmd, path, fn, name) {
        const r = fn(path, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        return { ok: true, op: name, path: r.path, summary: name + ' ' + r.path, body: r.body };
    }

    function doGrep(cmd, path) {
        const flags = cmd.flags || {};
        const [pattern] = (cmd.args && cmd.args.length) ? cmd.args : [''];
        // 2.13.0：`grep -n "x" /a.html` 这种「搜索词占了路径位」的写法不静默降级为全容器搜索。
        if (cmd.misplacedPath) {
            return fail(cmd, cmd.misplacedPath, '参数顺序不对：' + cmd.misplacedPath + ' 被当成了多余的搜索词，本次没有搜索',
                {
                    kind: 'syntax',
                    syntax: 'grep /路径 "关键词" [-i] [-e] [-l] [-c] [-v] [ext=js,md] [ctx=2] [limit=500]',
                    fix: '路径写在前面：grep ' + cmd.misplacedPath + ' "' + (pattern || '关键词') + '"（-n 无需写，grep 恒带行号）'
                });
        }
        if (!pattern) {
            return fail(cmd, path, '缺少搜索词', { kind: 'syntax', syntax: 'grep /路径 "关键词"', fix: 'grep /src "function "' });
        }
        const r = VirtualFS.grep(path, pattern, flags);
        if (!r.ok) return pickLine(r, cmd);
        // 回执里回显生效开关（-i / -e / -v / ext / ctx），否则用户不知道这次为什么命中的不一样
        const opts = (flags.ignoreCase ? ' -i' : '') + (flags.regex ? ' -e' : '')
            + (flags.invert ? ' -v' : '') + (flags.files ? ' -l' : '') + (flags.count ? ' -c' : '')
            + (flags.ext ? ' ext=' + flags.ext : '')
            + (flags.ctx ? ' ctx=' + flags.ctx : '');
        // ctx 与 -l / -c 同用没有意义：不静默吞掉，回执里说明已忽略
        const ctxIgnored = (flags.ctx && (flags.files || flags.count))
            ? '参数 ctx 只作用于逐行结果，与 ' + (flags.files ? '-l' : '-c') + ' 同用时已忽略' : '';
        // -n / numbered：grep 恒带行号（每个命中行都带行号），所以它不是「被忽略的参数」，
        // 但也不能默默吞掉 —— 写一句「不必写」让 AI 下次省掉。
        const nNote = flags.numbered ? '参数 -n 无需写：grep 恒带行号（本次已按带行号处理）' : '';
        const heal = [ctxIgnored, nNote].filter(Boolean).join('；');
        if (!r.totalHits) {
            // 口径写清楚：grep 只跳过回收站，所以「0 个文件」说的范围要写明白
            // 17：不写「扫描 M 个文件」这种工程术语，直接说「查了 M 个，其中 K 个有命中」
            const scope = r.scanned
                ? '查了 ' + r.scanned + ' 个文件，其中 0 个有命中（不含 ' + TRASH_PREFIX + '）'
                : '没有可搜索的文件（' + TRASH_PREFIX + ' 不参与 grep）';
            return { ok: true, op: 'grep', path: r.path, summary: 'grep ' + r.path + ' “' + pattern + '”' + opts + ' → 0 命中（' + scope + '）', body: [], selfHeal: heal || undefined };
        }
        // -l：只列文件名（每个文件一行，不带行号）—— 找「哪些文件提到它」时最短
        //     行首发**路径令牌** @pN：下一轮 `read @pN` / `edit @pN …` 不必重打路径
        if (flags.files) {
            const toks = PathStore.makeMany(r.files.map(function (f) { return f.path; }));
            return {
                ok: true, op: 'grep', path: r.path,
                summary: 'grep “' + pattern + '”' + opts + ' → ' + r.files.length + ' 个文件有命中（' + r.totalHits + ' 处）',
                body: r.files.map(function (f, i) { return (toks[i] ? toks[i] + '  ' : '') + f.path; }),
                selfHeal: heal || undefined
            };
        }
        // -c：只报每个文件的命中处数（不看行内容）—— 评估改动面时最省眼睛
        if (flags.count) {
            const toks = PathStore.makeMany(r.files.map(function (f) { return f.path; }));
            return {
                ok: true, op: 'grep', path: r.path,
                summary: 'grep “' + pattern + '”' + opts + ' → ' + r.files.length + ' 个文件 ' + r.totalHits + ' 处命中（仅计数）',
                body: r.files.map(function (f, i) { return (toks[i] ? toks[i] + '  ' : '') + f.count + '  ' + f.path; }),
                selfHeal: heal || undefined
            };
        }
        // 命中行按文件发路径令牌：**每个文件只在其第一处命中行首带一次 @pN**（行首仍是锚点 #xxx，
        // 保持「每行以 # 开头」的既有契约），后续同文件命中不再重复。
        const tokFor = {};
        if (r.hits.length) {
            const uniq = [];
            for (const h of r.hits) if (uniq.indexOf(h.path) === -1) uniq.push(h.path);
            const toks = PathStore.makeMany(uniq);
            for (let i = 0; i < uniq.length; i++) tokFor[uniq[i]] = toks[i];
        }
        // ctx=N：命中行照旧带锚点，前后文行只给「路径:行号 内容」（无锚点，避免锚点表被上下文撑爆）；
        // 相邻命中重叠的上下文按 (路径,行号) 去重，不同片段之间插一行 `--`（与 grep -C 同形）。
        if (flags.ctx) {
            const rows = [];
            const printed = new Set();
            const seenFile = {};
            let prevKey = null, prevLine = 0;
            for (const h of r.hits) {
                const segs = [];
                for (const b of (h.before || [])) segs.push({ line: b.line, text: b.text, hit: false });
                segs.push({ line: h.line, text: h.text, hit: true });
                for (const a of (h.after || [])) segs.push({ line: a.line, text: a.text, hit: false });
                for (const s of segs) {
                    const key = h.path + ':' + s.line;
                    if (printed.has(key)) continue;
                    if (prevKey !== null && (h.path !== prevKey || s.line > prevLine + 1)) rows.push('--');
                    printed.add(key);
                    if (s.hit) {
                        const pre = seenFile[h.path] ? '' : ((tokFor[h.path] || '') + ' ');
                        seenFile[h.path] = 1;
                        rows.push(AnchorStore.make(h.path, s.line, s.text) + ' ' + pre + h.path + ':' + s.line + '  ' + String(s.text).slice(0, 200));
                    } else {
                        rows.push('   ' + h.path + ':' + s.line + '  ' + String(s.text).slice(0, 200));
                    }
                    prevKey = h.path; prevLine = s.line;
                }
            }
            if (r.truncated) rows.push('(命中 ' + r.totalHits + ' 处，只回前 ' + r.hits.length + ' 处；可加 limit=500 提高上限，或缩小路径/加 ext 过滤)');
            return { ok: true, op: 'grep', path: r.path, summary: 'grep “' + pattern + '”' + opts + ' → 查了 ' + r.scanned + ' 个文件，其中 ' + r.files.length + ' 个有命中（' + r.totalHits + ' 处，带 ctx=' + flags.ctx + '）', body: rows, selfHeal: heal || undefined };
        }
        const rows = [];
        const seenFile2 = {};
        const rowKeys = new Set();                 // 回执行级去重：同一「路径:行」只出现一次（反馈 二·4）
        for (const h of r.hits) {
            const k = h.path + ':' + h.line;
            if (rowKeys.has(k)) continue;
            rowKeys.add(k);
            const tok = AnchorStore.make(h.path, h.line, h.text);
            const pre = seenFile2[h.path] ? '' : ((tokFor[h.path] || '') + ' ');
            seenFile2[h.path] = 1;
            rows.push(tok + ' ' + pre + h.path + ':' + h.line + '  ' + String(h.text).slice(0, 200));
        }
        if (r.truncated) rows.push('(命中 ' + r.totalHits + ' 处，只回前 ' + r.hits.length + ' 处；可加 limit=500 提高上限，或缩小路径/加 ext 过滤)');
        // 17：命中数按「文件」和「处」分开说 —— 只写「N 命中」会让人以为是文件数
        return { ok: true, op: 'grep', path: r.path, summary: 'grep “' + pattern + '”' + opts + ' → 查了 ' + r.scanned + ' 个文件，其中 ' + r.files.length + ' 个有命中（' + r.totalHits + ' 处）', body: rows, selfHeal: heal || undefined };
    }

    /* help：从命令注册表现查用法（不靠 AI 背命令表 —— 用到哪个查哪个）。
     * 这是「工具规模膨胀」的对策里最适合本通道的一条：命令多了，但 AI 只需记得「有 help」。 */
    function doHelp(cmd) {
        const raw = String((cmd.path || '') || (cmd.args && cmd.args[0]) || '').trim();
        if (!raw) {
            const label = { read: '读', write: '写', control: '控制', plan: '计划' };
            const body = [];
            for (const k of ['read', 'write', 'control', 'plan']) {
                const names = COMMAND_NAMES.filter(function (n) { return COMMANDS[n].kind === k; });
                if (names.length) body.push('[' + (label[k] || k) + '] ' + names.join('  '));
            }
            body.push('help <命令> 查该命令的用法与坑');
            // 顺带列出手册目录：告诉 AI「手册分这些节、可以按节取」，而不是把全文塞过去
            body.push('');
            body.push('【手册目录】');
            for (const s of manualSections().secs) body.push('§' + s.num + ' ' + s.title);
            body.push('help §2 取某一节（或 help 正文 / help 令牌 按关键词）；全文 read ' + SYS_MANUAL_PATH);
            return { ok: true, op: 'help', path: '', summary: 'help → ' + COMMAND_NAMES.length + ' 个命令 + 手册目录', body: body };
        }
        const norm = normalizeOp(raw);
        if (!norm.op) {
            // 不是命令：按「节号 / 标题关键词」取**那一节**单节正文（按需即取的关键一步）
            const sec = findManualSection(raw);
            if (sec.ok) {
                return { ok: true, op: 'help', path: '§' + sec.section.num,
                    summary: 'help §' + sec.section.num + ' → ' + sec.section.title,
                    body: sec.section.text.split('\n') };
            }
            if (sec.candidates && sec.candidates.length) {
                return fail(cmd, raw, '手册里有 ' + sec.candidates.length + ' 节都像「' + raw + '」', {
                    kind: 'unknown-op',
                    fix: 'help §' + sec.candidates.map(function (s) { return s.num; }).join(' 或 §')
                });
            }
            return fail(cmd, raw, '没有这个命令：' + raw, {
                kind: 'unknown-op', closest: norm.closest,
                fix: norm.closest ? ('最接近：' + norm.closest.name + '（help ' + norm.closest.name + '）') : 'help 列出全部命令'
            });
        }
        const op = norm.op;
        const meta = COMMANDS[op];
        const h = COMMAND_HELP[op] || {};
        const flags = COMMAND_FLAGS[op] || [];
        const al = aliasesOf(op);
        const body = ['用法：' + (h.syntax || meta.example)];
        if (h.syntax && meta.example && h.syntax !== meta.example) body.push('例：' + meta.example);
        if (flags.length) body.push('参数：' + flags.join(' '));
        if (al.length) body.push('别名：' + al.join(' '));
        for (const n of (h.notes || [])) body.push('· ' + n);
        return { ok: true, op: 'help', path: op, summary: 'help ' + op + ' → ' + meta.desc, body: body };
    }

    // find：按名字/路径找文件（与 grep 分工：grep 找内容，find 找文件）
    function doFind(cmd, path) {
        const flags = cmd.flags || {};
        const pattern = (cmd.args && cmd.args.length) ? cmd.args[0] : '*';
        // 2.13.0：路径写在了后面（`find "*.js" /src`）→ 报错，不静默当成从 / 搜
        if (cmd.misplacedPath) {
            return fail(cmd, cmd.misplacedPath, '参数顺序不对：' + cmd.misplacedPath + ' 被当成了多余的匹配式，本次没有查找',
                {
                    kind: 'syntax',
                    syntax: 'find /路径 "文件名模式" [ext=js,md] [depth=1] [dirs] [since=10m]',
                    fix: '路径写在前面：find ' + cmd.misplacedPath + ' "' + pattern + '"'
                });
        }
        // since= 写错必须报错，不能静默当「没给」——否则「最近改过的文件」会回一份全量列表
        if (flags.since != null && parseDurationMs(flags.since) == null) {
            return fail(cmd, path, 'since/recent 的时长写法不对：' + flags.since, {
                kind: 'syntax', syntax: 'find / "*.js" since=10m  |  find / "*.js" recent=2h  |  find / "*.js" sort=mtime',
                fix: '用 10m / 2h / 30s / 1d（纯数字 = 分钟）'
            });
        }
        const r = VirtualFS.find(path, pattern, flags);
        if (!r.ok) return pickLine(r, cmd);
        const opts = (flags.ignoreCase ? ' -i' : '') + (flags.ext ? ' ext=' + flags.ext : '')
            + (flags.dirs ? ' dirs' : '') + (flags.depth ? ' depth=' + flags.depth : '')
            + (r.sinceRaw ? ' since=' + r.sinceRaw : '') + (r.sortByMtime ? ' sort=mtime' : '');
        const showAge = !!r.sinceRaw || !!r.sortByMtime;
        const now = Date.now();
        const dirs = r.matches.filter(function (m) { return m.type === 'dir'; }).length;
        const filesN = r.matches.length - dirs;
        if (!r.matches.length) {
            return {
                ok: true, op: 'find', path: r.path,
                summary: 'find ' + r.path + ' “' + r.pattern + '”' + opts + ' → 0 命中',
                body: []
            };
        }
        // 每个匹配项都发路径令牌（目录也发）：下一轮 list/read/cd/merge @pN 直接引用
        const mtoks = PathStore.makeMany(r.matches.map(function (m) { return m.path; }));
        const body = r.matches.map(function (m, i) {
            const pre = mtoks[i] ? mtoks[i] + '  ' : '';
            const age = (showAge && m.type === 'file') ? '  ' + fmtAge(m.mtime, now) : '';
            return m.type === 'dir' ? pre + m.path : (pre + m.path + '  ' + fmtSize(m.size) + age);
        });
        if (r.truncated) body.push('(已达上限 ' + r.limit + ' 条，可能未列全；可加 limit= 或缩小路径)');
        return {
            ok: true, op: 'find', path: r.path,
            summary: 'find ' + r.path + ' “' + r.pattern + '”' + opts + ' → ' + filesN + ' 个文件 / ' + dirs + ' 个目录',
            body: body
        };
    }

    // diff：比较两个文件的差异（不必把两份全文都读进上下文）
    function doDiff(cmd, path, ctx) {
        const otherRaw = cmd.args && cmd.args[0];
        if (!cmd.path || !otherRaw) {
            return fail(cmd, path, 'diff 需要第二个文件', { kind: 'syntax', syntax: 'diff /a.js /b.js', fix: 'diff ' + path + ' /另一个文件' });
        }
        const other = resolvePathArg(otherRaw, ctx.cwd || '/');
        const r = VirtualFS.diff(path, other, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        return {
            ok: true, op: 'diff', path: r.path, other: r.other,
            changed: r.changed, same: r.same, truncated: r.truncated,
            summary: 'diff ' + r.path + ' ↔ ' + r.other + ' → ' + r.changed + ' 处不同（相同 ' + r.same + ' 行）'
                + (r.truncated ? '，只回前 ' + r.rows.length + ' 处' : ''),
            body: r.rows
        };
    }

    function requireBody(cmd, path, name) {
        if (cmd.body == null) {
            return fail(cmd, path, name + ' 缺少正文', {
                kind: 'syntax',
                syntax: name + ' ' + path + ' 换行 <<< 换行 内容 换行 <<<',
                fix: '多行内容必须用 <<< … <<< 包住（>>> 也认，但行首 >>> 会被网页 markdown 吃掉）'
            });
        }
        return null;
    }

    // 静态校验：一行一行扫，给出「行号 + 证据」。
    //   1) 括号配对：() [] {} 匹配；结余/错配皆报（证据含列号）
    //   2) 字符串闭合：' " ` 三种引号内转义，未闭合报
    //   3) 语法错误：结构性缺失（行尾悬空的 if/for/while 与未闭合块）
    function lintOneLine(line, idx) {
        const errors = [];
        const pairs = { ')': '(', ']': '[', '}': '{' };
        const opens = ['(', '[', '{'];
        const closes = [')', ']', '}'];
        const stack = [];
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (opens.indexOf(ch) !== -1) stack.push({ ch: ch, pos: i });
            else if (closes.indexOf(ch) !== -1) {
                const top = stack[stack.length - 1];
                if (top && top.ch === pairs[ch]) stack.pop();
                else errors.push('第 ' + (i + 1) + ' 列：' + ch + ' 找不到匹配的开括号（' + (top ? top.ch : '无') + '）');
            }
        }
        for (const s of stack) errors.push('第 ' + (s.pos + 1) + ' 列：' + s.ch + ' 缺少闭合括号');
        // 字符串闭合
        let q = null;
        let esc = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (esc) { esc = false; continue; }
            if (q) { if (ch === '\\') esc = true; else if (ch === q) q = null; }
            else if (ch === "'" || ch === '"' || ch === '`') q = ch;
        }
        if (q) errors.push('未闭合的字符串：' + q);
        return errors;
    }

    // 可疑强调标记（`*` 边界）:
    function flagSuspiciousEmphasis(body) {
        const text = String(body == null ? '' : body);
        if (!text.trim()) return '';
        const rows = text.split('\n');
        const notes = [];
        for (let i = 0; i < rows.length; i++) {
            const stripped = rows[i].replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
            for (const mk of ['**', '__']) {
                let n = 0;
                for (let j = stripped.indexOf(mk); j !== -1; j = stripped.indexOf(mk, j + mk.length)) {
                    const before = j === 0 ? '' : stripped[j - 1];
                    const after = stripped[j + mk.length] || '';
                    if (before === '' || /[^\w]/.test(before) || after === '' || /[^\w]/.test(after)) n++;
                }
                if (n % 2 === 1 && n <= SUSPICIOUS_EMPHASIS_MAX) {
                    notes.push('L' + (i + 1) + '：孤立的 ' + mk + ' 出现 ' + n + ' 次（奇数）');
                }
            }
        }
        return notes.join('；');
    }

    // 静态语法校验命令（括号配对、字符串闭合、行号 + 证据）
    function doLint(cmd, path) {
        const p = path || cmd.path;
        if (!p) return fail(cmd, path, 'lint 需要文件路径（例如：lint /src/a.js）', { kind: 'syntax', syntax: 'lint /路径', fix: 'lint /src/a.js' });
        const r = VirtualFS.read(p, { numbered: true });
        if (!r.ok) return pickLine(r, cmd);
        const lines = r.lines ? r.lines.map(function (x, i) { return x.text; }) : [];
        const errors = [];
        for (let i = 0; i < lines.length; i++) {
            const ls = lintOneLine(lines[i], i);
            for (const e of ls) errors.push('L' + (i + 1) + ' ' + e);
        }
        const summary = errors.length ? 'lint ' + p + ' → ' + errors.length + ' 处问题' : 'lint ' + p + ' → 无问题';
        return { ok: errors.length === 0, op: 'lint', path: p, summary: summary, body: errors.length ? errors : ['(无问题)'] };
    }

    // base64 通道提示：高危模式下主动建议 write /f base64
    function suggestBase64(body, n) {
        const text = String(body == null ? '' : body);
        if (!text) return '';
        const lines = text.split('\n');
        if (lines.some(function (l) { return /^<{3}/.test(l.trim()) || /^>{3}$/.test(l.trim()); })) {
            return 'ℹ 检测到高危模式（正文含完整行 <<</>>>），改用：write /f base64';
        }
        if (/\x00/.test(text)) return 'ℹ 检测到高危模式（含 NUL 字节），改用：write /f base64';
        if (/\n[ \t]*\n[ \t]*\n[ \t]*\n/.test(text)) return 'ℹ 检测到高危模式（正文换行过多），改用：write /f base64';
        if (/^ \/\/[^\n]*\/[gim]*$/.test(text) || /^[^\n]* \/[^\n]*\/[gim]*$/.test(text)) {
            // 单行正则字面量（/pattern/flags）
            return 'ℹ 检测到高危模式（疑似正则字面量），改用：write /f base64';
        }
        return '';
    }

    /* 取正文：`... base64` 时先解码。返回 { body } 或 { error }（error 已是回执对象）。
     * 为什么要有它：正文里的 `<<<` 会提前闭合 heredoc、整行 `>>>` 会被网页吃掉 ——
     * base64 让正文不再「经过聊天渲染层」，是含特殊字符内容（JS/CSS）唯一可靠的通道。 */
    function bodyTextOf(cmd, name, path) {
        const miss = requireBody(cmd, path, name);
        if (miss) return { error: miss };
        let body = cmd.body.join('\n');
        if (cmd.flags && cmd.flags.base64) {
            const d = decodeBase64(body);
            if (!d.ok) {
                return {
                    error: fail(cmd, path, name + ' base64 解码失败：' + d.error, {
                        kind: 'syntax',
                        syntax: name + ' ' + path + ' base64 → <<< → base64 文本 → <<<',
                        fix: '确认正文是标准 base64（换行/空白会被忽略）；不想编码就去掉 base64，用普通 <<< 正文'
                    })
                };
            }
            return { body: d.text, decoded: true };
        }
        return { body: body };
    }

    function doWrite(cmd, path, ctx) {
        const rawBody = cmd.body == null ? '' : cmd.body.join('\n');
        const fenced = !!(cmd && cmd.domain && cmd.domain.fence);   // 整段执行域是否被代码围栏包住
        const b64Note = (cmd.flags && cmd.flags.noWarn) ? '' : suggestBase64(rawBody, cmd);
        const bt = bodyTextOf(cmd, 'write', path);
        if (bt.error) return bt.error;
        const body = bt.body;
        const r = VirtualFS.write(path, body, { exclusive: !!cmd.flags.exclusive });
        if (!r.ok) return pickLine(r, cmd);
        const out = {
            ok: true, op: 'write', path: r.path, changes: [r.path], structure: r.created && !!r.autoMkdir,
            summary: (r.created ? '+ ' : '~ ') + r.path + ' ' + fmtSize(r.size) + '/' + body.split('\n').length + 'L'
                + (bt.decoded ? '（base64 解码）' : '')
        };
        if (r.autoMkdir && r.autoMkdir.length) {
            ctx.heals++;
            out.selfHeal = '自动建目录 ' + r.autoMkdir.join(' ');
        }
        if (b64Note) {
            ctx.heals++;
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + b64Note) : b64Note;
        }
        // 13：可疑正文 → 标 ⚠（仍然写入，不拒绝）。
        // 但整段执行域已被围栏包住时，围栏内是**字面量**、平台不改写 ——
        // 此时 `__`/`**`/行首缩进的告警只会是误报，跳过；base64 建议仍保留
        //（它针对的是「正文里一整行 <<< 提前闭合 heredoc」这个协议层冲突，与外围栏无关）。
        const quiet = !!(cmd.flags && cmd.flags.noWarn);
        const sus = (fenced || quiet) ? '' : suspiciousBody(body);
        if (sus) {
            ctx.heals++;
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；⚠' + sus) : ('⚠' + sus);
        }
        if (r.overwritten) out.summary += '  (覆盖 ' + fmtSize(r.prevSize || 0) + ')';
        if (r.hash) out.summary += '  hash=' + r.hash;      // ③ 写入即回显内容哈希（AI 可对账）
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    function doAppend(cmd, path, ctx) {
        const rawBody = cmd.body == null ? '' : cmd.body.join('\n');
        const b64Note = (cmd.flags && cmd.flags.noWarn) ? '' : suggestBase64(rawBody, cmd);
        if (bt.error) return bt.error;
        const body = bt.body;
        const r = VirtualFS.append(path, body, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        // 先建 out 再写 selfHeal：旧代码把 b64Note 那段写在 `const out` 之前，
        // 一旦触发（正文含整行 <<<、NUL、疑似正则…）就是「用 out 于声明之前」的 TDZ ReferenceError，
        // 命令当场崩掉。同步把『正文含整行 <<< 建议 base64』的自愈提示落到回执上。
        const out = { ok: true, op: 'append', path: r.path, changes: [r.path], summary: (r.created ? '+ ' : '~ ') + r.path + ' +' + fmtSize(r.appended == null ? byteLen(body) : r.appended) + (bt.decoded ? '（base64 解码）' : '') };
        if (b64Note) {
            ctx.heals++;
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + b64Note) : b64Note;
        }
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    // 缩进补回的 ⚠ 文案（契约 §4：补回了就必须说）—— 模糊匹配与按行替换共用同一份
    function reindentNote(r) {
        if (!r || !r.reindent) return '';
        return '新内容没有行首缩进，已按原文补回'
            + (r.reindentPerLine ? '（逐行对齐原文缩进）' : '（' + String(r.reindent).length + ' 个空白字符）');
    }

    /* reorderEdits（根因版）：同一批里对**同一个文件**的多次「行区间」修改，
     * 行号一律按**这一批开始时的快照**解读 —— 后面的编辑要加上前面编辑造成的行数变化。
     * 不这么做的话，AI 按旧行号写的第二条 edit 会改到错行（行号漂移），
     * 而「按行号降序排一下」只治升序一种情况，仍然解决不了「前面一改、后面全漂」。
     * 锚点写法（#a3f）是内容寻址、每步重新解析，**不参与平移**。
     */
    function applyShift(cmd, path, ctx) {
        const flags = cmd.flags || {};
        const range = flags.lineRange;
        if (!range || !range.length || flags._anchorLine) return null;
        ctx.shifts = ctx.shifts || Object.create(null);
        const list = ctx.shifts[path] || [];
        let adj = 0;
        for (const x of list) if (x.to < range[0]) adj += x.delta;
        if (adj) flags.lineRange = [range[0] + adj, range[1] + adj];
        return {
            key: path, adj: adj,
            // 记下这一步造成的行数变化（供后面同一文件的编辑平移用）
            apply: function (from, to, delta) {
                list.push({ from: from, to: to, delta: delta });
                ctx.shifts[path] = list;
            }
        };
    }

    // rmline：删行（只吃行区间，不需要正文 —— 见 05-fs 里 fsRmLine 的注释）
    function doRmLine(cmd, path, ctx) {
        const sh = applyShift(cmd, path, ctx);
        let range = cmd.flags && cmd.flags.lineRange;
        // 锚点写法（rmline #a3f）：executeCmd 只把锚点行放进 _anchorLine，没有展开成 lineRange，
        // 这里补上——否则手册 §4「或 rmline #锚点」永远报「需要行区间」。
        if ((!range || !range.length) && cmd.flags && cmd.flags._anchorLine) {
            range = [cmd.flags._anchorLine, cmd.flags._anchorLine];
        }
        if (!range || !range.length) {
            return fail(cmd, path, 'rmline 需要行区间', {
                kind: 'syntax', syntax: 'rmline /路径 12-15',
                fix: '给行区间（12-15 或 12），或先用 grep 取锚点再 rmline #锚点'
            });
        }
        const r = VirtualFS.rmline(path, range);
        if (!r.ok) return pickLine(r, cmd);
        if (sh) sh.apply(r.range[0], r.range[1], -r.removed);
        const out = {
            ok: true, op: 'rmline', path: r.path, changes: [r.path], structure: true,
            removed: r.removed, oldLines: r.oldLines, newLines: r.newLines,   // 供批量汇总（许愿·4）累计
            summary: '- ' + r.path + ' 删除 ' + r.removed + ' 行（L' + r.range[0] + '-' + r.range[1] + '）→ ' + r.newLines + 'L'
        };
        /* 回执显示「删了什么」，不是「删后剩下什么」（反馈 二·2）。
         * 旧版把删后的邻居行用 `>` 标出来，AI 会把它误读成「刚删掉的行」——于是重复删一遍。
         * 现在：`-` 标记被删行（带原始行号），再补一行「删后 L{a} 起是什么」做锚点。
         * 单行删除压成一行（批量 rmline 时载荷才不会被撑爆）——重复的 rmline 必须压缩。 */
        if (r.removedLines && r.removedLines.length) {
            const afterNote = r.afterLine == null
                ? '（删除后 L' + r.range[0] + ' 之后没有内容）'
                : '（删后 L' + r.range[0] + '| ' + String(r.afterLine) + '）';
            if (r.removedLines.length === 1) {
                out.body = ['- L' + r.range[0] + '| ' + String(r.removedLines[0]) + '  ' + afterNote];
            } else {
                const CAP = 12;
                const body = ['删前 L' + r.range[0] + '-' + r.range[1] + '（以下为被删原文）：'];
                const head = r.removedLines.slice(0, CAP);
                for (let i = 0; i < head.length; i++) body.push('- ' + (r.range[0] + i) + '| ' + String(head[i]));
                if (r.removedLines.length > CAP) body.push('  …（另有 ' + (r.removedLines.length - CAP) + ' 行被删）');
                body.push(afterNote);
                out.body = body;
            }
        } else if (r.context && r.context.length) {
            out.body = r.context;
        }
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    /* apply：一次消息写多个文件（① 根因对策）——
     * AI 文件操作的真正瓶颈是「每条命令一个来回」：写 20 个文件要发 20 段 heredoc，
     * 每段都要赌平台不吞正文。apply 把这些合并成**一个块**：正文里每个文件以 `@@ /路径` 分节，
     * 内容逐字节原样（不 trim 行首）；整批原子 —— 有一个失败就全部回滚；回执逐文件给 hash。
     */
    const APPLY_MAX_FILES = 20;

    function parseApplyBody(body) {
        const out = [];
        let cur = null;
        for (const line of String(body == null ? '' : body).split('\n')) {
            const m = /^@@\s*(\S.*?)\s*$/.exec(line);
            if (m) { cur = { path: m[1], lines: [] }; out.push(cur); continue; }
            if (cur) cur.lines.push(line);
        }
        return out.map(function (s) { return { path: s.path, content: s.lines.join('\n') }; });
    }

    function doApply(cmd, ctx) {
        const miss = requireBody(cmd, 'apply', 'apply');
        if (miss) return miss;
        const files = parseApplyBody(cmd.body.join('\n'));
        if (!files.length) {
            return fail(cmd, 'apply', 'apply 里一个文件都没有', {
                kind: 'syntax', syntax: 'apply 换行 <<< 换行 @@ /a.js 换行 内容 换行 @@ /b.txt 换行 内容 换行 <<<',
                fix: '每个文件用一行 `@@ /路径` 开头'
            });
        }
        if (files.length > APPLY_MAX_FILES) {
            return fail(cmd, 'apply', '一次 apply 最多 ' + APPLY_MAX_FILES + ' 个文件（收到 ' + files.length + ' 个）', { fix: '拆成两次 apply' });
        }
        const writes = [];
        for (const f of files) {
            const p = resolvePathArg(f.path, ctx.cwd || '/');
            const v = VirtualFS.validatePath(p);
            if (!v.ok) return fail(cmd, f.path, '路径非法：' + v.reason, { kind: 'path' });
            if (VirtualFS.isInternal(v.path)) {
                return fail(cmd, v.path, '内部区（' + SYS_PREFIX + ' 与 ' + TRASH_PREFIX + '）对 AI 只读，apply 不能写这里', { kind: 'denied' });
            }
            if (typeof isPlanModeActive === 'function' && isPlanModeActive()) {
                return fail(cmd, v.path, '计划模式：写操作被拦（退出计划模式后再改文件）', {
                    kind: 'denied', fix: 'plan list 看计划；要退出请让用户点面板「计划」→ 退出'
                });
            }
            writes.push({ path: v.path, content: f.content });
        }
        VirtualFS.beginBatch();                    // 嵌套批次：apply 自己是一个原子单元
        const rows = [];
        let bad = null;
        for (const w of writes) {
            const r = VirtualFS.write(w.path, w.content, {});
            if (!r || !r.ok) { bad = Object.assign({}, r || {}, { path: w.path }); break; }
            rows.push((r.created ? '+ ' : '~ ') + r.path + '  ' + fmtSize(r.size) + '  hash=' + (r.hash || ''));
        }
        if (bad) {
            VirtualFS.rollbackBatch();
            return fail(cmd, bad.path || 'apply', 'apply 里有一个文件写失败，整批已回滚：' + (bad.error || '写入失败'), { kind: bad.kind || 'write' });
        }
        VirtualFS.commitBatch('apply');
        return noteImplicitBodyClose(cmd, {
            ok: true, op: 'apply', path: '', changes: writes.map(function (w) { return w.path; }), structure: true,
            summary: '+ apply ' + writes.length + ' 个文件（原子，逐文件 hash 见下）', body: rows
        }, ctx);
    }

    // edit 的行内 diff（E3）：把「改前→改后」压成 summary 上一段短标注 ——
    // 不额外占回执行（稳态压缩仍生效），但 AI 一眼能看出这次替换到底改成了什么样，
    // 不必再 read 一遍来确认（以前的回执只有 `~ /f 21B`，看不到改了哪行）。
    function inlineDiffNote(oldStr, newStr) {
        const clip = function (s) {
            s = String(s == null ? '' : s).replace(/\s+$/, '');
            return s.length > 40 ? s.slice(0, 39) + '…' : s;
        };
        const ol = oldStr == null ? null : String(oldStr).split('\n');
        const nl = String(newStr == null ? '' : newStr).split('\n');
        const oTxt = ol ? (clip(ol[0]) + (ol.length > 1 ? '…(' + ol.length + '行)' : '')) : '(按行区间)';
        const nTxt = clip(nl[0]) + (nl.length > 1 ? '…(' + nl.length + '行)' : '');
        return '⟨- ' + oTxt + ' → + ' + nTxt + '⟩';
    }

    function doEdit(cmd, path, ctx) {
        const sh = applyShift(cmd, path, ctx);      // 行区间按批前快照解读（锚点除外）
        const flags = Object.assign({}, cmd.flags);
        const anchorLine = flags._anchorLine;
        delete flags._anchorLine;
        const args = cmd.args || [];

        let oldStr = null, newStr = null, how = '';
        if (cmd.pairs) { oldStr = cmd.pairs.old; newStr = cmd.pairs.new; how = '双段'; }
        else if (cmd.body != null) { newStr = cmd.body.join('\n'); how = (anchorLine || flags.lineRange) ? '按行' : ''; }
        else if (args.length >= 2) { oldStr = args[0]; newStr = args.slice(1).join(' '); how = '内联'; }
        else if (args.length === 1 && anchorLine) { newStr = args[0]; how = '按行'; }
        else if (args.length === 1) {
            return fail(cmd, path, 'edit 只给了一个片段，脚本无法知道要改成什么', {
                kind: 'syntax',
                syntax: 'edit /路径 "旧片段" "新片段"',
                fix: '补上第二个片段，或改成双段正文：edit ' + path + ' → <<< old → 旧 → ;;; → 新 → <<<'
            });
        } else {
            return fail(cmd, path, '缺少替换内容', { kind: 'syntax', syntax: 'edit /路径 "旧" "新"', fix: '最省事的写法：edit ' + path + ' "旧" "新"' });
        }

        // 目录批量替换：`edit /src "旧" "新"` = 先 grep -l 再逐个 edit 的合并版（一次命令、一批撤销）
        if (how !== '按行') {
            const dirNode = VirtualFS.resolve(path);
            if (dirNode && dirNode.type === 'dir') {
                const rr = VirtualFS.editTree(path, oldStr, newStr, flags);
                if (!rr.ok) return pickLine(rr, cmd);
                if (rr.empty) {
                    return {
                        ok: true, op: 'edit', path: rr.path,
                        summary: '= ' + rr.path + ' 批量替换：查了 ' + rr.scanned + ' 个文件，没有命中（未改动）'
                    };
                }
                const outDir = {
                    ok: true, op: 'edit', path: rr.path, changes: rr.changes, structure: true,
                    summary: '~ ' + rr.path + ' 批量替换 ' + rr.hits + ' 处 / ' + rr.changedFiles + ' 个文件（查了 ' + rr.scanned + ' 个）'
                        + inlineDiffNote(oldStr, newStr),
                    body: rr.files.slice(0, 30).map(function (f) { return f.path + '  ' + f.count + ' 处  ' + f.lines + 'L'; })
                };
                const notes = [];
                if (rr.truncated) { ctx.heals++; notes.push('达到批量文件上限（前 ' + rr.changedFiles + ' 个已改；可加 limit= 或缩小路径）'); }
                if (rr.sizeRejected) { ctx.heals++; notes.push(rr.sizeRejected + ' 个文件替换后超单文件上限，已跳过'); }
                if (notes.length) outDir.selfHeal = notes.join('；');
                return outDir;
            }
        }

        if (!how) {
            return fail(cmd, path, 'edit 需要说明改哪一段', {
                kind: 'syntax',
                syntax: 'edit /路径 "旧" "新" 或 edit /路径 12-15 + <<<…<<< 或 edit #锚点 + <<<…<<<',
                fix: '把「旧内容」一起给出（双段正文），或先用 grep 取锚点'
            });
        }

        // 锚点整行替换 / 行区间替换
        if (how === '按行') {
            flags.lineRange = anchorLine ? [anchorLine, anchorLine] : flags.lineRange;
            const r = VirtualFS.edit(path, null, newStr, flags);
            if (!r.ok) return pickLine(r, cmd);
            if (sh && r.range) sh.apply(r.range[0], r.range[1], r.newLines - r.oldLines);
            const outLine = {
                ok: true, op: 'edit', path: r.path, changes: [r.path],
                summary: '~ ' + r.path + ' L' + flags.lineRange[0] + (flags.lineRange[1] !== flags.lineRange[0] ? '-' + flags.lineRange[1] : '') + ' → ' + fmtSize(r.size) + ' ' + inlineDiffNote(null, newStr)
            };
            const rnLine = reindentNote(r);          // 问题 C：补回缩进必须写进回执，不能静默
            if (rnLine) { ctx.heals++; outLine.selfHeal = rnLine; }
            return noteImplicitBodyClose(cmd, outLine, ctx);
        }

        const r = VirtualFS.edit(path, oldStr, newStr, flags);
        if (!r.ok) {
            const out = pickLine(r, cmd);
            if (r.kind === 'match' && r.candidates && r.candidates.length) {
                out.candidates = r.candidates.map(function (c) {
                    return { line: c.line, text: c.text, anchor: AnchorStore.make(r.path, c.line, c.text), score: c.score };
                });
            }
            return out;
        }
        const out = {
            ok: true, op: 'edit', path: r.path, changes: [r.path],
            oldLines: r.oldLines, newLines: r.newLines,   // 供批量汇总（许愿·4）
            summary: '~ ' + r.path + ' ' + (r.hash ? 'hash=' + r.hash + ' ' : '') +
                ' → ' + fmtSize(r.size) + ' (' + r.oldLines + '→' + r.newLines + 'L) ' + inlineDiffNote(oldStr, newStr)
        };
        if (r.fuzzy) {
            if (ctx.riskyHeals >= CONFIG.RISKY_HEALS_PER_CMD) {
                return fail(cmd, path, '精确匹配失败，需要模糊匹配但这条命令已用过一次自愈', { kind: 'match', fix: 'read ' + r.path + ' 后按其当前内容重试' });
            }
            ctx.riskyHeals++;
            ctx.heals++;
            const rn = reindentNote(r);
            out.selfHeal = '模糊匹配（原文与片段空格/引号不完全一致）'
                + (rn ? '；' + rn : '；片段与原文都没有行首缩进，未做补回（若缩进是在 heredoc 里被平台吞掉的，改用内联 edit 或占位符）');
        }
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    /* insert：把正文「粘」到一个定位点上（行号 / 锚点），原有行不动。
     *   · 行号默认插在它**之前**（`insert /f 12` = 在 L12 前）；加 after 插到之后。
     *   · 锚点默认插在它**之后**（`grep` 拿到 #a3f，很自然就是「在这一行后面加内容」）；加 before 插到之前。
     *   · from=/源路径 [源区间]：内容直接来自另一个文件（不必把内容再打一遍）—— 裁剪 + 定位粘贴一步到位。
     */
    function doInsert(cmd, path, ctx) {
        const flags = cmd.flags || {};
        const anchorLine = flags._anchorLine;
        const ranges = Array.isArray(flags._ranges) ? flags._ranges : (flags.lineRange ? [flags.lineRange] : []);
        // 行号按「这一批开始时的快照」解读：本批前面若有插入/删行，这里要把偏移算上
        // （锚点写入不参与平移 —— 内容是内容寻址的，与 edit 的锚点语义一致）。applyShift 会
        // 直接改写 flags.lineRange，所以位置判定要读改写后的这个值。
        const sh = applyShift(cmd, path, ctx);
        const targetRange = (!anchorLine && Array.isArray(flags.lineRange)) ? flags.lineRange : (ranges.length ? ranges[0] : null);

        let pos = null, posHow = '';
        // 行号默认「之前」、锚点默认「之后」——两个默认方向相反，混用时极易插错（反馈 二·3）。
        // 默认值不改（各自都符合直觉），但回执必须**显式标注这是默认方向**，让 AI 一眼能核对。
        const dirExplicit = !!(flags.before || flags.after);
        if (anchorLine) {
            pos = flags.before ? anchorLine : anchorLine + 1;
            posHow = (flags.before ? '在 ' + cmd.anchor + '（L' + anchorLine + '）之前' : '在 ' + cmd.anchor + '（L' + anchorLine + '）之后')
                + (dirExplicit ? '' : '（锚点默认方向：之后；想插到前面加 before）');
        } else if (targetRange) {
            const t = targetRange;
            if (t[0] !== t[1]) {
                return fail(cmd, path, 'insert 只接受一个插入点（收到行区间 L' + t[0] + '-' + t[1] + '）', {
                    kind: 'syntax', syntax: 'insert /路径 12 <<<…<<<',
                    fix: '给单行：insert ' + path + ' ' + t[0] + '（在 L' + t[0] + ' 前插入）'
                });
            }
            pos = flags.after ? t[0] + 1 : t[0];
            posHow = (flags.after ? '在 L' + t[0] + ' 之后' : '在 L' + t[0] + ' 之前')
                + (dirExplicit ? '' : '（行号默认方向：之前；想插到后面加 after）');
        }
        if (pos == null) {
            return fail(cmd, path, 'insert 需要插入位置', {
                kind: 'syntax',
                syntax: 'insert /路径 行号 <<<…<<< 或 insert #锚点 <<<…<<<',
                fix: '例如 insert ' + path + ' 1（文件开头）、insert ' + path + ' 12 after（L12 之后）、或先 grep 取锚点再 insert #锚点'
            });
        }

        let content;
        if (flags.from) {
            if (cmd.body != null) {
                return fail(cmd, path, 'insert 同时收到正文和 from=（二选一）', {
                    kind: 'syntax', fix: '要粘贴别处的行就用 from=/源路径；要写新内容就用 <<< 正文 <<<'
                });
            }
            const srcPath = resolvePathArg(flags.from, ctx.cwd || '/');
            const srcNode = VirtualFS.resolveFile(srcPath);
            if (!srcNode) {
                return fail(cmd, srcPath, 'from= 的源文件不存在：' + srcPath, { kind: 'path', candidates: VirtualFS.similarPaths(srcPath, 3) });
            }
            let srcLines = String(srcNode.content == null ? '' : srcNode.content).split('\n');
            // 源区间：第 2 个（第三个/第四个单行会先合并）
            let srcRange = null;
            if (ranges.length >= 2) {
                if (ranges.length >= 3 && ranges[1][0] === ranges[1][1] && ranges[2][0] === ranges[2][1]) srcRange = [ranges[1][0], ranges[2][0]];
                else srcRange = ranges[1];
            }
            if (srcRange) {
                const total = srcLines.length;
                if (srcRange[0] > total) {
                    return fail(cmd, srcPath, 'from 区间起始 L' + srcRange[0] + ' 超出源文件行数 ' + total, { kind: 'range' });
                }
                const a = clamp(srcRange[0], 1, total);
                const b = clamp(srcRange[1], a, total);
                srcLines = srcLines.slice(a - 1, b);
                posHow = posHow + '，内容来自 ' + srcPath + ' L' + a + '-' + b;
            } else {
                // 整篇粘贴：文件末尾的换行不额外算成一条空行（否则会多插一个空行）
                if (srcLines.length > 1 && srcLines[srcLines.length - 1] === '') srcLines = srcLines.slice(0, -1);
                posHow = posHow + '，内容来自 ' + srcPath + '（整篇 ' + srcLines.length + ' 行）';
            }
            content = srcLines.join('\n');
        } else {
            const miss = requireBody(cmd, path, 'insert');
            if (miss) return miss;
            content = cmd.body.join('\n');
        }

        const r = VirtualFS.insert(path, pos, content);
        if (!r.ok) return pickLine(r, cmd);
        if (sh) sh.apply(r.pos, r.pos, r.addedLines);      // 记下这次插入造成的行数变化，供同批后续命令平移
        const out = {
            ok: true, op: 'insert', path: r.path, changes: [r.path], structure: true,
            addedLines: r.addedLines, oldLines: r.oldLines, newLines: r.newLines,   // 供批量汇总（许愿·4）
            summary: '+ ' + r.path + ' 插入 ' + r.addedLines + ' 行 @ L' + r.pos + '（' + posHow + '）→ ' + r.newLines + 'L'
                + (r.hash ? ' hash=' + r.hash : '')
        };
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    function doPatch(cmd, path, ctx) {
        const miss = requireBody(cmd, path, 'patch');
        if (miss) return miss;
        const body = cmd.body.join('\n');
        // 自愈：手册 §4 的双段定界（<<< old / ;;; / 新）在 patch 上也认 —— 它等价于「把旧段换成新段」，
        // 直接按 edit 的双段语义执行，并逐条标 ⚠（自愈不许静默）。没有 @@ 头也没有 ;;; 才报错。
        if (body.indexOf('@@') === -1 && cmd.pairs && cmd.pairs.old !== '') {
            const er = VirtualFS.edit(path, cmd.pairs.old, cmd.pairs.new, Object.assign({}, cmd.flags));
            if (!er.ok) return Object.assign(er, { line: cmd.line });
            const out = {
                ok: true, op: 'patch', path: er.path, changes: [er.path],
                summary: '~ ' + er.path + ' → ' + fmtSize(er.size),
                selfHeal: 'patch 收到双段正文（没有 @@ 头），已按 edit 双段替换执行'
            };
            return noteImplicitBodyClose(cmd, out, ctx);
        }
        const r = VirtualFS.patch(path, body);
        if (!r.ok) {
            const out = pickLine(r, cmd);
            if (r.kind === 'syntax') {
                out.syntax = 'patch /路径 换行 <<< 换行 @@ -a,b +c,d @@ 换行 … 换行 <<<';
                out.fix = 'patch 只认标准 unified diff（要有 @@ -a,b +c,d @@ 头）；只做整段替换用 edit /路径 → <<< old → 旧段 → ;;; → 新段 → <<<';
            }
            return out;
        }
        const out = { ok: true, op: 'patch', path: r.path, changes: [r.path], summary: '~ ' + r.path + ' ' + r.hunks + ' hunk ' + fmtSize(r.size) };
        if (r.autoShift) {
            out.selfHeal = '补丁行号偏移 ' + r.autoShift + ' 处已自动对齐'
                + (r.shiftDetail ? '（' + r.shiftDetail + '）' : '')
                + '，已按对齐后的位置写入';
        }
        if (r.looseMatch) {
            const note = '有 ' + r.looseMatch + ' 个 hunk 按「行尾空白不敏感」匹配（原文与补丁行尾空格/制表符不同）';
            out.selfHeal = out.selfHeal ? (out.selfHeal + '；' + note) : note;
        }
        return noteImplicitBodyClose(cmd, out, ctx);
    }

    function doMkdir(cmd, path) {
        const r = VirtualFS.mkdir(path);
        if (!r.ok) return pickLine(r, cmd);
        if (r.existing) return { ok: true, op: 'mkdir', path: r.path, summary: '= ' + r.path + ' 已存在（未改动）', body: r.body };
        return { ok: true, op: 'mkdir', path: r.path, summary: '+ ' + r.path + '/（目录）', structure: true, changes: [r.path] };
    }

    function doMove(cmd, path, ctx) {
        const dstRaw = cmd.args && cmd.args[0];
        if (!dstRaw) return fail(cmd, path, 'move 缺少目标路径', { kind: 'syntax', syntax: 'move /源 /目标', fix: 'move ' + path + ' /新路径' });
        const dst = resolvePathArg(dstRaw, ctx.cwd || '/');
        const r = VirtualFS.move(path, dst, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        return { ok: true, op: 'move', path: r.path, to: r.to, summary: '~ ' + r.path + ' → ' + r.to, structure: true, changes: [r.path, r.to] };
    }

    function doCopy(cmd, path, ctx) {
        const dstRaw = cmd.args && cmd.args[0];
        if (!dstRaw) return fail(cmd, path, 'copy 缺少目标路径', { kind: 'syntax', syntax: 'copy /源 /目标', fix: 'copy ' + path + ' /副本' });
        const dst = resolvePathArg(dstRaw, ctx.cwd || '/');
        const r = VirtualFS.copy(path, dst, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        // 带行区间（copy /src /dst 10-20）= 裁剪复制：回执写清楚取了哪一段、多少行
        if (r.range) {
            return {
                ok: true, op: 'copy', path: r.path, to: r.to, changes: [r.to], structure: true,
                summary: '+ ' + r.to + '（复制自 ' + r.path + ' L' + r.range[0] + '-' + r.range[1] + '，' + r.lines + ' 行）'
                    + (r.hash ? ' hash=' + r.hash : '')
            };
        }
        return { ok: true, op: 'copy', path: r.path, to: r.to, summary: '+ ' + r.to + '（复制自 ' + r.path + '）', structure: true, changes: [r.to] };
    }

    // 自然序：02 排在 10 前面（字符串比较会排反），源文件名带序号时这是关键
    function naturalCompare(a, b) {
        const ra = String(a).split(/(\d+)/), rb = String(b).split(/(\d+)/);
        for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
            const x = ra[i] === undefined ? '' : ra[i];
            const y = rb[i] === undefined ? '' : rb[i];
            if (x === y) continue;
            const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
            if (nx && ny) { const d = parseInt(x, 10) - parseInt(y, 10); if (d) return d; }
            return x < y ? -1 : 1;
        }
        return 0;
    }

    /* merge：按 AI 给定的顺序把多个文件首尾拼成一个。
     * 源可以逐个列出（顺序 = 写出顺序，AI 用 01/02/03 的文件名编好序），
     * 也可以用 glob（`/src/*.md`，默认按自然序排；sort=name|mtime|none 可改）。
     * 内容不经过聊天正文 —— 大文件合并不会被平台吞，也不需要把内容再打一遍。 */
    function doMerge(cmd, path, ctx) {
        const flags = cmd.flags || {};
        if (!cmd.path) {
            return fail(cmd, path, 'merge 需要一个目标文件', { kind: 'syntax', syntax: 'merge /目标 /源1 /源2 …', fix: '例如 merge /out.md /01.md /02.md' });
        }
        const tokens = (cmd.args || []).slice();
        if (cmd.body != null) for (const l of cmd.body) { const t = String(l).trim(); if (t) tokens.push(t); }
        if (!tokens.length) {
            return fail(cmd, path, 'merge 缺少源文件', {
                kind: 'syntax', syntax: 'merge /目标 /源1 /源2 …',
                fix: '按要拼接的顺序列出源文件，例如 merge /out.md /01.md /02.md /03.md（或用 /src/*.md 加自然序）'
            });
        }
        const sources = [];
        let usedGlob = false;
        let expandedCount = 0;
        let skippedDirs = 0;
        for (const raw of tokens) {
            if (VirtualFS.hasGlob(raw)) {
                usedGlob = true;
                const absPat = resolvePathArg(raw, ctx.cwd || '/');
                const ex = VirtualFS.expandGlob(absPat, flags);
                if (!ex.ok) return fail(cmd, raw, '展开 glob 失败：' + ex.error, { kind: 'path' });
                for (const f of ex.files) { sources.push(f); expandedCount++; }
                if (ex.dirs && ex.dirs.length) { ctx.heals++; skippedDirs += ex.dirs.length; }
                if (ex.truncated) { ctx.heals++; }
            } else {
                const p = resolvePathArg(raw, ctx.cwd || '/');
                const n = VirtualFS.resolve(p);
                if (n && n.type === 'dir') {
                    return fail(cmd, p, 'merge 只合并文件，不合并目录：' + p, { kind: 'path', fix: 'merge /out.md ' + p + '/*（用 glob 指定目录里的文件）' });
                }
                sources.push(p);
            }
        }
        const sortBy = String(flags.sort || '').toLowerCase();
        const byMtime = function (x, y) {
            const nx = VirtualFS.resolveFile(x), ny = VirtualFS.resolveFile(y);
            return ((nx && nx.mtime) || 0) - ((ny && ny.mtime) || 0);
        };
        if (sortBy === 'mtime') sources.sort(byMtime);
        else if (sortBy === 'name') sources.sort(naturalCompare);
        else if (sortBy && sortBy !== 'none') {
            return fail(cmd, path, 'sort 只支持 name / mtime / none（收到 ' + flags.sort + '）', { kind: 'syntax', fix: 'merge /out.md /src/*.md sort=name' });
        } else if (usedGlob) sources.sort(naturalCompare);
        const r = VirtualFS.merge(path, sources, flags);
        if (!r.ok) return pickLine(r, cmd);
        const out = {
            ok: true, op: 'merge', path: r.path, changes: [r.path], structure: true,
            summary: (r.created ? '+ ' : '~ ') + r.path + ' 合并 ' + r.sources.length + ' 个文件 → '
                + r.lines + 'L/' + fmtSize(r.size) + ' hash=' + r.hash,
            body: r.sources.map(function (p, i) { return (i + 1) + '. ' + p; })
        };
        // 去重发生（同一源列了两次，或 glob 与显式路径重叠）时说一声，别让 AI 以为漏了
        const explicitCount = tokens.filter(function (t) { return !VirtualFS.hasGlob(t); }).length;
        const heals = [];
        if (r.sources.length < explicitCount + expandedCount) { ctx.heals++; heals.push('有源文件重复列出，已去重（实际拼接 ' + r.sources.length + ' 个）'); }
        if (skippedDirs) heals.push('glob 命中的 ' + skippedDirs + ' 个目录已跳过（merge 只拼接文件）');
        if (heals.length) out.selfHeal = heals.join('；');
        return out;
    }

    // split：大文件切分（merge 的逆）；分片自动发路径令牌，下一轮直接 @pN 引用
    function doSplit(cmd, path, ctx) {
        const flags = cmd.flags || {};
        let mode = 'lines', chunk = 0, sep = null;
        if (flags.sep != null) {
            mode = 'sep';
            sep = String(flags.sep);
        } else {
            const bare = (cmd.args && cmd.args.length) ? cmd.args[0] : null;
            chunk = positiveInt(flags.chunk != null ? flags.chunk : bare);
            if (!chunk) {
                return fail(cmd, path, 'split 需要每片行数或 sep= 分隔符', {
                    kind: 'syntax', syntax: 'split /大文件 500  |  split /文档.md sep=###',
                    fix: '每片行数写成一个正整数（如 500）；按结构切就写 sep=分隔符（不要写裸词）'
                });
            }
        }
        const toDir = flags.to ? resolvePathArg(flags.to, ctx.cwd || '/') : null;
        const r = VirtualFS.split(path, { mode: mode, chunk: chunk, sep: sep, toDir: toDir, force: !!flags.force });
        if (!r.ok) return pickLine(r, cmd);
        const toks = PathStore.makeMany(r.parts.map(function (p) { return p.path; }));
        const how = mode === 'sep' ? '按 sep=' + sep : '每片 ' + chunk + ' 行';
        return {
            ok: true, op: 'split', path: r.path, changes: r.changes, structure: true,
            summary: '✂ ' + r.path + ' → ' + r.parts.length + ' 片（' + how + '）',
            body: r.parts.map(function (p, i) { return (toks[i] ? toks[i] + '  ' : '') + p.path + '  ' + p.lines + 'L'; })
        };
    }

    /* glob 批量：把一条命令作用到一批文件上（delete / move / copy），整批原子。 */
    function doGlobBatch(cmd, rawPath, ctx, op) {
        const flags = cmd.flags || {};
        const cwd = ctx.cwd || '/';
        const absPat = resolvePathArg(rawPath, cwd);
        const ex = VirtualFS.expandGlob(absPat, flags);
        if (!ex.ok) return fail(cmd, rawPath, '展开 glob 失败：' + ex.error, { kind: 'path' });
        const files = ex.files || [];
        const dirs = ex.dirs || [];
        const wantDirs = op === 'delete' && !!flags.recursive;
        const targets = wantDirs ? files.concat(dirs) : files;
        if (op === 'delete' && dirs.length && !flags.recursive) {
            return fail(cmd, rawPath, 'glob 命中 ' + dirs.length + ' 个目录', { kind: 'danger', fix: '删目录要加 recursive（内容一并进回收站）：delete ' + rawPath + ' recursive force' });
        }
        if (!targets.length) {
            return fail(cmd, rawPath, 'glob 没有命中任何文件' + (dirs.length ? '（只命中了目录，delete 要加 recursive）' : ''), { kind: 'path', fix: '先 find ' + rawPath + ' 看命中什么' });
        }
        if (ex.truncated) ctx.heals++;
        for (const tg of targets) {
            if (VirtualFS.isInternal(tg)) {
                return fail(cmd, rawPath, '内部区（' + SYS_PREFIX + ' 与 ' + TRASH_PREFIX + '）对 AI 只读：' + tg, { kind: 'denied', fix: 'glob 不要包含系统区 / 回收站' });
            }
        }
        if (op === 'delete' && !flags.force) {
            return fail(cmd, rawPath, 'glob 批量删除 ' + targets.length + ' 项：加 force 明确确认', { kind: 'danger', fix: 'delete ' + rawPath + ' force' });
        }
        const rows = [];
        if (op === 'delete') {
            VirtualFS.beginBatch();
            for (const tg of targets) {
                const r = VirtualFS.delete(tg, flags);
                if (!r || !r.ok) { VirtualFS.rollbackBatch(); return fail(cmd, tg, '批量删除失败：' + ((r && r.error) || tg), { kind: (r && r.kind) || 'generic' }); }
                rows.push('- ' + tg);
            }
            VirtualFS.commitBatch('delete-glob');
            return {
                ok: true, op: 'delete', path: rawPath, changes: targets, structure: true,
                summary: '- glob 批量删除 ' + targets.length + ' 项（原子；进回收站）' + (ex.truncated ? '（已达展开上限，可能未删全）' : ''),
                body: rows
            };
        }
        // move / copy：目标必须是目录（不存在则建）
        const dstRaw = cmd.args && cmd.args[0];
        if (!dstRaw) return fail(cmd, rawPath, op + ' 批量需要目标目录', { kind: 'syntax', fix: op + ' ' + rawPath + ' /目标目录' });
        const dst = resolvePathArg(dstRaw, cwd);
        const dstNode = VirtualFS.resolve(dst);
        if (dstNode && dstNode.type === 'file') return fail(cmd, rawPath, op + ' 批量目标必须是目录：' + dst, { kind: 'path' });
        if (!dstNode) {
            const m = VirtualFS.mkdir(dst);
            if (!m.ok) return pickLine(m, cmd);
        }
        VirtualFS.beginBatch();
        for (const tg of targets) {
            const r = op === 'move' ? VirtualFS.move(tg, dst, flags) : VirtualFS.copy(tg, dst, flags);
            if (!r || !r.ok) { VirtualFS.rollbackBatch(); return fail(cmd, tg, '批量' + op + '失败：' + ((r && r.error) || tg), { kind: (r && r.kind) || 'generic' }); }
            rows.push((op === 'move' ? '~ ' : '+ ') + tg + ' → ' + (r.to || (dst + '/' + tg.split('/').pop())));
        }
        VirtualFS.commitBatch(op + '-glob');
        const dels = dirs.length;   // 目录不参与 move/copy（要整目录请直接写目录路径）
        return {
            ok: true, op: op, path: rawPath, changes: targets.map(function (x) { return (dst + '/' + x.split('/').pop()); }), structure: true,
            summary: (op === 'move' ? '~ ' : '+ ') + 'glob 批量' + op + ' ' + targets.length + ' 项 → ' + dst + (dels ? '（' + dels + ' 个目录已跳过）' : ''),
            body: rows
        };
    }

    function doSort(cmd, path, ctx) {
        const flags = cmd.flags || {};
        const r = VirtualFS.sort(path, flags);
        if (!r.ok) return pickLine(r, cmd);
        if (r.empty) return { ok: true, op: 'sort', path: r.path, summary: '= ' + r.path + ' 是空的（未改动）' };
        if (r.nochange) return { ok: true, op: 'sort', path: r.path, summary: '= ' + r.path + ' 已经有序（未改动' + (r.removed ? '，去重 ' + r.removed + ' 行' : '') + '）' };
        const opts = (flags.uniq ? ' uniq' : '') + (flags.reverse ? ' reverse' : '') + (flags.numeric ? ' numeric' : '');
        return {
            ok: true, op: 'sort', path: r.path, changes: r.changes,
            summary: '~ ' + r.path + opts + ' → ' + r.newLines + 'L' + (r.removed ? '（去重 ' + r.removed + ' 行）' : '') + (r.hash ? ' hash=' + r.hash : '')
        };
    }

    function doDelete(cmd, path) {
        const r = VirtualFS.delete(path, cmd.flags);
        if (!r.ok) return pickLine(r, cmd);
        return { ok: true, op: 'delete', path: r.path, summary: '- ' + r.path + (r.wasDir ? '/' : '') + '（入回收站 ' + r.trash + '）', structure: true, changes: [r.path] };
    }

    function doSteps(cmd, path, fn, name) {
        let steps = 1;
        const arg = String(cmd.path || '').trim();
        if (/^\d+$/.test(arg)) steps = parseInt(arg, 10);
        else if (cmd.args && /^\d+$/.test(String(cmd.args[0] || ''))) steps = parseInt(cmd.args[0], 10);
        const r = fn(steps);
        if (!r.ok) return Object.assign(r, { line: cmd.line, op: name });
        return { ok: true, op: name, summary: (name === 'undo' ? '↶ ' : '↷ ') + r.body, structure: true };
    }

    function doRestore(cmd, path) {
        const flags = Object.assign({}, cmd.flags);
        const ref = (cmd.path && cmd.path !== '.' && cmd.path !== '/') ? cmd.path : (cmd.args && cmd.args[0]);
        if (ref) flags.item = ref;
        const r = VirtualFS.restore(flags);
        if (!r.ok) return pickLine(r, cmd);
        const what = flags.purge ? 'purge' : ((flags.list || !flags.item) ? 'list' : String(flags.item));
        return {
            ok: true, op: 'restore', path: r.path || cmd.path,
            // ♻ = 从回收站取回；↩ 专表「原子批次回滚」，不复用（实测报告里两者混淆过）
            summary: '♻ restore ' + what + (r.changes && r.path ? ' → ' + r.path : ''),
            body: r.body, structure: !!r.changes
        };
    }

    /* upload：交付是**适配层**的事（浏览器下载 / 页面附件入口），core 只负责「把内容交出去」。
     * 端口：deliverFile(name, content) → { ok, attach, summary, warn? }，由 src/adapter/19-importexport.js 提供；
     * core 沙箱里是空实现。这样 src/core/ 目录完全不碰 document —— 分层边界由测试（#40）钉住。
     */
    function doUpload(cmd, path) {
        // 2.13.0 批量附件：`upload /目录` 或 `upload /a /b /c` → 打成一个 zip 附件。
        // 「先打包整个项目发出去」比 AI 一轮轮 read 分段读快得多，也不容易把上下文耗干。
        const targets = [path].concat((cmd.args || []).filter(Boolean));
        const nodes = [];
        const dirs = [];
        for (const t of targets) {
            const n = VirtualFS.resolve(t);
            if (!n) return fail(cmd, t, t + ' 不存在', { kind: 'path', candidates: VirtualFS.similarPaths(t) });
            if (n.type === 'dir') dirs.push(t); else nodes.push(t);
        }
        if (dirs.length || targets.length > 1) return uploadZip(cmd, targets, dirs, nodes);
        const node = VirtualFS.resolveFile(path);
        if (!node) return fail(cmd, path, path + ' 不存在', { kind: 'path', candidates: VirtualFS.similarPaths(path) });
        const content = String(node.content == null ? '' : node.content);
        const name = path.split('/').pop() || 'download.txt';
        const sizeText = fmtSize(byteLen(content));
        let deliv = { ok: false, attach: false, why: '本环境没有交付通道' };
        try {
            if (typeof deliverFile === 'function') deliv = deliverFile(name, content) || deliv;
        } catch (e) {
            deliv = { ok: false, attach: false, why: (e && e.message) || '交付失败' };
        }
        return {
            ok: true, op: 'upload', path: path, attach: !!deliv.attach,
            summary: deliv.summary || ('⇩ ' + name + ' ' + sizeText + '（' + (deliv.why || '未交付') + '）'),
            changes: [], warn: deliv.warn || []
        };
    }

    // 批量附件：收集目标下的文件 → zip → 走与单文件一样的交付通道
    const UPLOAD_ZIP_MAX_FILES = 200;
    function uploadZip(cmd, targets, dirs, files) {
        const list = [];
        const seen = Object.create(null);
        const add = function (p, content) {
            if (seen[p]) return;
            seen[p] = 1;
            list.push({ path: p, content: content });
        };
        for (const f of files) {
            const n = VirtualFS.resolveFile(f);
            if (n) add(f, String(n.content == null ? '' : n.content));
        }
        for (const d of dirs) {
            const node = VirtualFS.resolve(d);
            if (!node) continue;
            const prefix = d === '/' ? '/' : d + '/';
            const walk = function (nd, pfx) {
                for (const name of Object.keys(nd.children || {}).sort()) {
                    if (list.length >= UPLOAD_ZIP_MAX_FILES) return;
                    const c = nd.children[name];
                    const p = pfx + name;
                    if (c.type === 'dir') { walk(c, p + '/'); continue; }
                    if (VirtualFS.isInternal(p)) continue;         // 系统区 / 回收站不进附件
                    add(p, String(c.content == null ? '' : c.content));
                }
            };
            walk(node, prefix);
        }
        if (!list.length) {
            return fail(cmd, targets[0], '这些路径下没有可打包的文件', { kind: 'path', fix: 'upload /src（目录会打成 zip）或 upload /a.js' });
        }
        let bytes = null;
        try { bytes = typeof buildZip === 'function' ? buildZip(list) : null; } catch (e) { bytes = null; }
        if (!bytes || !bytes.length) {
            return fail(cmd, targets[0], '打包失败', { kind: 'generic', fix: '一次给少一点：upload /子目录' });
        }
        const zipName = (dirs.length === 1 ? (dirs[0].split('/').pop() || 'container') : 'container') + '.zip';
        const blob = new Blob([bytes], { type: 'application/zip' });
        const sizeText = fmtSize(bytes.length);
        let deliv = { ok: false, attach: false, why: '本环境没有交付通道' };
        try {
            if (typeof attachToComposer === 'function') {
                const att = attachToComposer(zipName, blob, 'application/zip');
                if (att && att.ok) deliv = { ok: true, attach: true, summary: '⇧ 已放进输入框（附件）' + zipName + ' ' + sizeText + '，含 ' + list.length + ' 个文件 —— 点发送即可' };
                else {
                    const made = downloadBlob(blob, zipName);
                    deliv = {
                        ok: false, attach: false,
                        summary: '⇩ 已下载 ' + zipName + ' ' + sizeText + '，含 ' + list.length + ' 个文件'
                            + (att && att.why ? '（本平台没有附件入口：' + att.why + '）' : '')
                    };
                    if (!made) deliv.warn = ['当前环境不支持自动下载'];
                }
            } else {
                const made = downloadBlob(blob, zipName);
                deliv = { ok: false, attach: false, summary: '⇩ 已下载 ' + zipName + ' ' + sizeText + '（含 ' + list.length + ' 个文件）' };
                if (!made) deliv.warn = ['当前环境不支持自动下载'];
            }
        } catch (e) {
            deliv = { ok: false, attach: false, why: (e && e.message) || '打包失败' };
        }
        return {
            ok: true, op: 'upload', path: targets[0], attach: !!deliv.attach,
            summary: deliv.summary || ('⇩ ' + zipName + ' ' + sizeText + '（' + (deliv.why || '未交付') + '）'),
            changes: [], warn: deliv.warn || []
        };
    }

    function doExpect(cmd, path) {
        const text = cmd.args && cmd.args.length ? cmd.args.join(' ') : null;
        if (!text) return fail(cmd, path, 'expect 缺少要断言的文本', { kind: 'syntax', syntax: 'expect /路径 "必须出现的文本"', fix: 'expect ' + path + ' "export const add"' });
        const node = VirtualFS.resolveFile(path);
        if (!node) return fail(cmd, path, path + ' 不存在（断言失败）', { kind: 'path' });
        const content = String(node.content == null ? '' : node.content);
        if (content.indexOf(text) !== -1) {
            return { ok: true, op: 'expect', path: path, summary: '✓ expect ' + path + ' 命中' };
        }
        const lines = content.split('\n');
        const probe = findSimilarLines(content, text, 1)[0];
        // 期望模式 vs 实际匹配内容：先给两个字段，再标出第一个不同字符位置
        let diffPos = null;
        const a = text;
        const b = probe ? probe.text : '';
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] !== b[i]) { diffPos = i; break; }
        }
        const detail = [];
        detail.push('  期望模式: ' + a.slice(0, 120));
        detail.push('  实际匹配: ' + (probe ? b.slice(0, 120) : '(无匹配内容)'));
        if (diffPos != null) {
            detail.push('  差异：第 ' + (diffPos + 1) + ' 个字符 — 期望 ' + JSON.stringify(a[diffPos]) + ' 实际 ' + JSON.stringify(b[diffPos]));
        }
        detail.concat(lines.slice(0, 3).map(function (l, i) { return '  实际 L' + (i + 1) + '| ' + l.slice(0, 120); }));
        if (probe) detail.push('  最接近 L' + probe.line + '| ' + probe.text.slice(0, 120));
        return {
            ok: false, op: 'expect', path: path, kind: 'expect',
            error: '断言失败：' + path + ' 里没有 “' + text.slice(0, 40) + '”',
            detail: detail,
            fix: 'read ' + path + ' 核对后再改'
        };
    }

    /* ---------------------------- 幂等（§7） ---------------------------- */

    function idempotencyKey(domainText, cwd) {
        return simpleHash(currentConversationKey() + '|' + String(cwd || '/') + '|' + String(domainText || '').replace(/\s+/g, ' ').trim());
    }

    function gateLoad() {
        const k = GATE_PREFIX + currentConversationKey();
        const g = Store.get(k, null);
        if (!g || !Array.isArray(g.batches)) return { gen: 1, batches: [] };
        return g;
    }

    function gateSave(g) {
        const now = Date.now();
        g.batches = g.batches.filter(function (b) { return now - b.at < 10 * 60 * 1000; }).slice(-40);
        Store.set(GATE_PREFIX + currentConversationKey(), g);
    }

    function gateCheck(key) {
        const g = gateLoad();
        const hit = g.batches.filter(function (b) { return b.key === key && b.ok; })[0];
        if (!hit) return { hit: false };
        const ago = Date.now() - hit.at;
        if (ago > CONFIG.IDEMPOTENT_WINDOW_MS) return { hit: false };
        return { hit: true, ago: ago };
    }

    function gateNote(key) {
        const g = gateLoad();
        g.batches.push({ key: key, at: Date.now(), ok: true });
        gateSave(g);
    }

    /* ---------------------------- AUTO 自带 diff（2.13.0） ----------------------------
 * 自动修正（锚点重定位 / edit 模糊匹配 / 命令名纠错 / 行号平移 …）都改了文件，
 * 但旧回执只给一句 ⚠ —— 用户得为一个**看不见的改动**负责。现在：批前给被改路径抓一份快照，
 * 批后对「有自愈且内容真的变了」的路径算一份短 diff，随回执一起发（最多 8 行，超出落盘）。
 */
    const AUTO_DIFF_MAX_FILES = 6;
    const AUTO_DIFF_MAX_ROWS = 8;
    const AUTO_DIFF_MAX_BYTES = 200000;

    function capturePreImages(cmds) {
        const map = Object.create(null);
        let n = 0;
        for (const c of (cmds || [])) {
            if (!c || !c.ok || c.anchor) continue;
            if (!MUTATING_OPS[c.op] || c.op === 'undo' || c.op === 'redo') continue;
            if (!c.path) continue;
            let p = null;
            try { p = resolvePathArg(c.path, cwd); } catch (e) { continue; }
            if (!p || map[p]) continue;
            const node = VirtualFS.resolveFile(p);
            if (!node) continue;
            const content = String(node.content == null ? '' : node.content);
            if (content.length > AUTO_DIFF_MAX_BYTES) continue;
            if (n >= AUTO_DIFF_MAX_FILES) break;
            map[p] = content;
            n++;
        }
        return map;
    }

    function compactAutoDiff(oldText, newText) {
        const A = String(oldText == null ? '' : oldText).split('\n');
        const B = String(newText == null ? '' : newText).split('\n');
        if (A.length > 1 && A[A.length - 1] === '') A.pop();
        if (B.length > 1 && B[B.length - 1] === '') B.pop();
        const clip = function (x) { return x == null ? '(无此行)' : String(x).slice(0, 60); };
        const rows = [];
        const max = Math.max(A.length, B.length);
        for (let i = 0; i < max && rows.length < AUTO_DIFF_MAX_ROWS; i++) {
            const a = i < A.length ? A[i] : null;
            const b = i < B.length ? B[i] : null;
            if (a != null && b != null && a === b) continue;
            rows.push('L' + (i + 1) + '  - ' + clip(a) + '   →   + ' + clip(b));
        }
        return rows;
    }

    function attachAutoDiff(results, preImages) {
        if (!preImages || !Object.keys(preImages).length) return;
        for (const r of (results || [])) {
            if (!r || !r.ok || !r.selfHeal || r.dry || !MUTATING_OPS[r.op]) continue;
            const before = preImages[r.path];
            if (before == null) continue;
            const node = VirtualFS.resolveFile(r.path);
            if (!node) continue;
            const after = String(node.content == null ? '' : node.content);
            if (after === before) continue;
            const rows = compactAutoDiff(before, after);
            if (rows.length) r.autoDiff = rows;
        }
    }

/* ---------------------------- 批次 ---------------------------- */

    /* ---------------------------- 同错升级（§5 R9） ---------------------------- */

    const failCounts = Object.create(null);

    function failKey(r) {
        return currentConversationKey() + '|' + (r.op || '?') + '|' + (r.path || '');
    }

    // 同一命令连续失败 2 次 → 换策略（给全文建议/拆分建议），而不是让 AI 反复猜
    function noteAttempt(r) {
        const k = failKey(r);
        if (r.ok) { delete failCounts[k]; return r; }
        failCounts[k] = (failCounts[k] || 0) + 1;
        r.attempt = failCounts[k];
        if (r.attempt >= 2) {
            r.escalate = true;
            const advice = r.op === 'edit' || r.op === 'patch'
                ? '同一命令已失败 ' + r.attempt + ' 次：建议 read ' + (r.path || '/路径') + ' 全文后重写，或用 grep 取锚点再改'
                : '同一命令已失败 ' + r.attempt + ' 次：建议缩小范围（先 read / stat 现状），或拆成更小的命令';
            r.fix = (r.fix ? r.fix + '；' : '') + advice;
        }
        return r;
    }

    function resetFailCounts() { for (const k of Object.keys(failCounts)) delete failCounts[k]; }

    function failCountOf(op, path) { return failCounts[currentConversationKey() + '|' + op + '|' + (path || '')] || 0; }

    // 一批命令执行：opts.guard(cmd, cwd, ctx) 是「逐条策略闸门」（计划模式 / 内部区只读），
    //   返回 null = 放行；返回一个失败结果 = 这条被拒（只拒这一条，同批其它命令照常执行）。
    //   dry 按「域」分段：写了 dry 的那一段执行完立即回滚，同一条消息里其它域的写入不受影响。
    function executeBatch(cmds, opts) {
        opts = opts || {};
        const ctx = {
            cwd: opts.cwd || '/',
            heals: 0,
            riskyHeals: 0,
            dry: !!opts.dry,
            atomic: !!opts.atomic,
            isDomain: !!opts.isDomain,
            results: []
        };
        const results = [];
        let rolledBack = false;
        let firstError = null;
        let dryCount = 0;
        let dryOpen = false;

        function openDry() {
            if (dryOpen) return;
            VirtualFS.beginBatch();          // 内层：dry 段自己的快照
            dryOpen = true;
        }
        function closeDry() {
            if (!dryOpen) return;
            VirtualFS.rollbackBatch();       // 只回滚 dry 这一段，外层（别的域）留着
            dryOpen = false;
        }

        // atomic 首错后剩余的命令：不再「消失」，统一补成 skipped 结果逐条列出
        // （容器实测：发 3 条只回 2 条，与「逐条事实」的承诺不符）
        let stopAt = -1;
        // 2.13.0 expect 联动回滚：`expect` 是**批内后置断言**（“写完应该出现某段文本”）。
        // 断言失败时前面那些写入已经进了本批快照 —— 以前只告知不对账，文件里就留着失败状态。
        // 现在断言失败 = 整批回滚（同 atomic 语义），并在回执里写明回滚了哪些路径。
        let expectFail = null;
        let rollbackPaths = [];
        const preImages = capturePreImages(cmds);   // 2.13.0：AUTO 自带 diff 的批前快照

        VirtualFS.beginBatch();
        try {
            for (let ci = 0; ci < cmds.length; ci++) {
                const cmd = cmds[ci];
                const isDry = ctx.dry || !!(cmd && cmd.domain && cmd.domain.dry);
                // 19：只管「会改文件树」的命令 —— 读命令既不记「预演过」，也不清标记
                const touchesFs = !!MUTATING_OPS[cmd && cmd.op];
                if (isDry) {
                    openDry();
                    dryCount++;
                    if (touchesFs) {
                        try { VirtualFS.noteDryPath(resolvePathArg(cmd && cmd.path, cwd)); } catch (e) {}
                    }
                } else {
                    closeDry();
                    if (touchesFs) {
                        // 真的（非 dry）碰过这个路径 → 它不再是「只在 dry 里出现过」
                        try { VirtualFS.forgetDryPath(resolvePathArg(cmd && cmd.path, cwd)); } catch (e) {}
                    }
                }

                if (cmd.ok === false) {
                    // 旧语法（kind=legacy-syntax）自带完整「已不再支持 + 新写法」，不要再被通用提示覆盖
                    const isOld = cmd.kind === 'legacy-syntax';
                    const bad = {
                        ok: false, op: cmd.badOp || '?', path: '', line: cmd.line,
                        raw: cmd.raw,
                        error: cmd.fix || '未知命令', kind: cmd.kind || 'unknown-op',
                        syntax: cmd.syntax,
                        fix: isOld ? null : (cmd.closest ? ('正确写法：' + cmd.closest.name + ' /路径') : 'read /__sys/手册.md')
                    };
                    if (isDry) bad.dry = true;
                    results.push(bad);
                    if (ctx.atomic && !firstError) { firstError = results[results.length - 1]; stopAt = ci; break; }
                    continue;
                }
                if (!dangerAllowed(cmd, ctx.isDomain)) {
                    results.push({
                        ok: false, op: cmd.op, path: cmd.path, line: cmd.line, kind: 'denied',
                        error: '危险命令 ' + cmd.op + ' 不在执行域内，已拒绝（危险命令永不放宽）',
                        fix: '把该命令放进 ```dsw 代码围栏（或 <dsw> … </dsw>）执行域',
                        dry: isDry || undefined
                    });
                    if (ctx.atomic && !firstError) { firstError = results[results.length - 1]; stopAt = ci; break; }
                    continue;
                }
                // 逐条策略闸门：越权的那一条被拒，同批合法命令继续执行（不是整批中止；要整批回滚用 atomic）
                const denied = opts.guard ? opts.guard(cmd, ctx.cwd, ctx) : null;
                if (denied) {
                    if (isDry) denied.dry = true;
                    denied.line = cmd.line;
                    results.push(denied);
                    if (ctx.atomic && !firstError) { firstError = results[results.length - 1]; stopAt = ci; break; }
                    continue;
                }
                /* 单命令存点（§9 写放大 / 副作用透明）：会改树的命令各套一层嵌套批次。
                 *   一条命令写到一半失败时只回滚这一条 —— 同批已成功的命令照常保留。
                 *   旧行为：非 atomic 批里失败命令的半个写入会留到整批提交，回执却只说「这条失败」。
                 *   undo/redo 例外：它们自己管撤销游标，交给批级回滚更稳。 */
                const spBase = (touchesFs && cmd.op !== 'undo' && cmd.op !== 'redo') ? VirtualFS.batchDepth() : -1;
                if (spBase >= 0) VirtualFS.beginBatch();
                let r;
                try {
                    r = executeCmd(cmd, ctx);
                } catch (e) {
                    errlog('executeCmd threw:', e);
                    if (spBase >= 0) while (VirtualFS.batchDepth() > spBase) VirtualFS.rollbackBatch();
                    const bad = {
                        ok: false, op: cmd.op || '?', path: cmd.path || '', line: cmd.line, kind: 'internal',
                        error: '内部错误：' + (e && e.message ? e.message : String(e))
                    };
                    if (isDry) bad.dry = true;
                    noteAttempt(bad);
                    results.push(bad);
                    if (ctx.atomic) { if (!firstError) { firstError = bad; stopAt = ci; } break; }
                    continue;      // 非 atomic：只废这一条，同批其余命令继续跑
                }
                if (spBase >= 0) {
                    // 先收拢命令自己漏开的子批次，再决定这一条是「提交」还是「回滚」
                    while (VirtualFS.batchDepth() > spBase + 1) VirtualFS.commitBatch();
                    if (r && r.ok) {
                        VirtualFS.commitBatch();
                    } else {
                        const mutated = VirtualFS.batchMutated();
                        VirtualFS.rollbackBatch();
                        if (r && mutated) r.sideEffectsRolledBack = true;   // 半成品已回滚，回执里明说
                    }
                }
                r.line = cmd.line;
                r.op = r.op || cmd.op;
                if (cmd.bare) r.bare = true;
                if (isDry) r.dry = true;
                noteAttempt(r);
                results.push(r);
                // expect 失败 → 停批并回滚（本批前面那些写入一起撤回）
                if (!r.ok && r.kind === 'expect' && !ctx.atomic) {
                    if (VirtualFS.batchMutated()) {
                        r.batchRolledBack = true;
                        expectFail = r;
                        firstError = r;
                        stopAt = ci;
                        break;
                    }
                }
                if (!r.ok && ctx.atomic && !firstError) { firstError = r; stopAt = ci; break; }
            }
            if (stopAt >= 0) {
                for (let ci = stopAt + 1; ci < cmds.length; ci++) {
                    const c = cmds[ci] || {};
                    const sk = {
                        ok: false, op: c.op || '?', path: c.path || '', line: c.line,
                        kind: 'skipped', error: expectFail ? '未执行（前面的 expect 断言失败，本批已回滚）' : '未执行（atomic 首错已整批回滚）'
                    };
                    if (c.domain && c.domain.dry) sk.dry = true;
                    results.push(sk);
                }
            }
            closeDry();

            if ((ctx.atomic && firstError) || expectFail) {
                rolledBack = VirtualFS.rollbackBatch();
                if (rolledBack) {
                    for (const r of results) if (r.ok) r.rolledBack = true;
                    // 2.13.0：告诉 AI 到底哪些路径被撤了（atomic 回滚难定位的根因就是“不知道动了什么”）
                    const undone = [];
                    for (const r of results) {
                        if (r.ok && r.changes) for (const c of r.changes) if (undone.indexOf(c) === -1) undone.push(c);
                    }
                    rollbackPaths = undone.slice(0, 8);
                }
            } else {
                // dry 段已经在上面各自回滚过了；这里提交的是外层（真实写入的那部分）
                VirtualFS.commitBatch();
            }
        } catch (e) {
            errlog('executeBatch threw:', e);
            closeDry();
            VirtualFS.rollbackBatch();
            rolledBack = true;
            results.push({ ok: false, op: '?', path: '', error: '内部错误：' + (e && e.message ? e.message : String(e)), kind: 'internal' });
        }

        attachAutoDiff(results, preImages);
        const allDry = cmds.length > 0 && dryCount === cmds.length;
        if (allDry) rolledBack = true;      // 纯 dry 批次：一条都没落盘（内层已逐段回滚）
        return {
            cwd: ctx.cwd,
            heals: ctx.heals,
            results: results,
            rolledBack: rolledBack,
            rollbackByExpect: !!expectFail,
            rollbackPaths: rollbackPaths,
            dry: allDry,
            dryCount: dryCount,
            firstError: firstError
        };
    }

/* >>> 10-receipt.js */
    /* =========================================================================
     * 10 回执组装（§3.7）：三段式 + 6 状态码 + 三档详略 + 工作集尾部 + L2 就地纠错
     * ====================================================================== */

    const RECEIPT_OPEN = '⟦fs⟧';
    const RECEIPT_CLOSE = '⟦/fs⟧';

    const STATUS = { OK: 'OK', AUTO: 'AUTO', PARTIAL: 'PARTIAL', NOOP: 'NOOP', SKIP: 'SKIP', DENY: 'DENY' };

    // 出站隔离：回执内的示例命令不带执行域，且脚本对自己的出站内容做出站标记，
    // 避免「回执里的示例被当成命令」再次执行（1.29.3 踩过的坑）。
    function fenceOutbound(content) {
        return String(content == null ? '' : content);
    }

    function statusOf(results, opts) {
        opts = opts || {};
        if (opts.status) return opts.status;
        if (!results.length) return STATUS.NOOP;
        const denied = results.filter(function (r) { return r.kind === 'denied'; });
        if (denied.length === results.length) return STATUS.DENY;
        const okCount = results.filter(function (r) { return r.ok; }).length;
        const healed = results.some(function (r) { return r.selfHeal; }) || (opts.heals || 0) > 0;
        // 2.13.0：有命令把「不认识的参数 / 路径」当没看见地执行了（partial）→ 明确给 PARTIAL，
        // 绝不报成 AUTO/OK 让人以为参数生效了。
        const partial = results.some(function (r) { return r.ok && r.partial; });
        if (okCount === results.length) {
            if (partial) return STATUS.PARTIAL;
            return healed ? STATUS.AUTO : STATUS.OK;
        }
        return STATUS.PARTIAL;
    }

    function factLine(r) {
        if (!r.ok) return null;
        const op = r.op;
        const path = r.path || '';
        // dry：只校验没写盘 —— 绝不能显示成 +（新增），否则模型会以为文件真的建好了。
        // dry 段内的读看到的是「假设写完之后」的预演状态（批次结束即回滚），这一点也要在回执里说清。
        if (r.dry) {
            const s = String(r.summary || (op + ' ' + path)).replace(/^[+~=-]\s*/, '');
            const isRead = ['read', 'list', 'tree', 'stat', 'grep'].indexOf(op) !== -1;
            return '◦ dry ' + s + (isRead ? '（预演：dry 结束即回滚）' : '（只校验，未写入）');
        }
        // 原子批次回滚后，成功过的命令必须标出来，不能假装它生效了
        if (r.rolledBack) return '↩ ' + (r.summary || (op + ' ' + path)) + '（已回滚）';
        if (r.summary) return r.summary;
        if (r.changes && r.changes.length) {
            const c = r.changes[0];
            return (op === 'delete' ? '- ' : op === 'write' || op === 'mkdir' || op === 'copy' ? '+ ' : '~ ') + c;
        }
        return '✓ ' + op + ' ' + path;
    }

    // L2 即时纠错：只给「这一条命令」的正确写法（1~2 行）
    function correctionFor(r) {
        if (!r || r.ok) return null;
        if (r.kind === 'skipped') return null;      // atomic 首错后没跑的命令：给写法反而误导
        if (r.fix) return r.fix;
        if (r.candidates && r.candidates.length) {
            const c0 = r.candidates[0];
            const target = c0.path || r.path || '/路径';
            if (r.op === 'read' || r.op === 'list' || r.op === 'stat') return '改法：' + r.op + ' ' + target;
            if (r.op === 'edit' && c0.anchor) return '改法：edit ' + c0.anchor + ' <<<…<<<';
            return '改法：' + (r.op || 'read') + ' ' + target;
        }
        const op = r.op;
        if (op === 'edit') return '改法：edit ' + (r.path || '/路径') + ' "旧片段" "新片段"（或 edit #锚点 <<<…<<<）';
        if (op === 'write' || op === 'append') return '正确写法：' + op + ' ' + (r.path || '/路径') + ' → 换行 → <<< → 内容 → 换行 → <<<';
        if (op === 'delete') return '正确写法：delete /路径 [recursive]';
        if (op === 'grep') return '正确写法：grep /路径 "关键词" [-i] [-e]';
        if (op === 'move' || op === 'copy') return '正确写法：' + op + ' /源 /目标';
        if (r.kind === 'unknown-op') return '正确写法：read /路径（完整命令表见 /__sys/手册.md）';
        return '完整规范：read /__sys/手册.md';
    }

    /* 病因诊断（反馈「四·1」：错误要指向最可能的原因，不是最直接的现象）。
     * 「一批里冒出一堆未知命令」几乎总是**结构化**故障，不是真的打错命令名：
     *   ① 正文里一整行的 `<<<` 被当成 heredoc 闭合符 → 后面的正文变成了「命令行」；
     *   ② 内联写法（edit /f "旧" "新"）被换行切开 → 第二行成了「未知命令」。
     * 这两种情况下只回「未知命令 X」等于把末端症状当答案，用户根本想不到真实原因。
     * 返回一句可执行的诊断（含对策），没有把握时返回 null（不瞎猜）。 */
    function diagnoseParseIssue(rawText, results) {
        const fails = (results || []).filter(function (r) { return !r.ok; });
        const bad = fails.filter(function (r) {
            return r.kind === 'unknown-op' || r.kind === 'legacy-syntax';
        });
        if (!bad.length) return null;
        const lines = String(rawText == null ? '' : rawText).split('\n');
        let quoteOdd = 0;
        const oddAt = [];
        for (let i = 0; i < lines.length; i++) {
            let dq = 0;
            for (const ch of lines[i]) if (ch === '"') dq++;
            if (dq % 2 === 1) { quoteOdd++; oddAt.push(i + 1); }
        }
        // ① 整行定界符比「开+闭」多出来 → 正文里有被误当闭合符的 <<< / >>>
        const closers = [];
        for (let i = 0; i < lines.length; i++) {
            if (/^(?:<{3,}|>{3,})$/.test(lines[i].trim())) closers.push(i + 1);
        }
        if (closers.length >= 3) {
            return '疑似 heredoc 提前闭合：本批 ' + bad.length + ' 条「未知命令」，而正文里出现了 '
                + closers.length + ' 个整行定界符（L' + closers.join(' / L') + '）——'
                + '正文中一整行的 <<< 被当成了闭合符，它后面的正文被当成命令行解析。'
                + '对策：定界符加长（<<<<< 开、<<<<< 关，长度 ≥ 开始符即闭合，正文里的 <<< 就安全了）；'
                + '含特殊字符的 JS/CSS 建议改用 `write /路径 base64`。';
        }
        // ② 引号不成对 + 有失败 → 内联形式被物理换行切开（前一行「只给一个片段」+ 后一行「未知命令」）
        if (fails.length >= 2 && quoteOdd) {
            return '疑似内联写法被换行切开：本批 ' + fails.length + ' 条失败，且 L' + oddAt.join(' / L')
                + ' 的引号不成对 ——内联形式（edit /f "旧" "新"）必须写在同一物理行。'
                + '对策：改用双段正文 `edit /路径 → <<< → 旧内容 → ;;; → 新内容 → <<<`，'
                + '或用行区间 + <<< 正文 <<<。';
        }
        return null;
    }

    // 工作集尾部：只收「真的留在树里」的变更路径（dry / 已删除 / 移动前的旧路径都不进尾部，
    // 免得尾部出现「文件存在」还是「已删除/移动」自相矛盾的行）
    function tailPathsOf(results) {
        const out = [];
        for (const r of results) {
            if (!r || !r.ok || r.dry || !r.structure) continue;
            if (r.op === 'delete') continue;                 // 已经不在树里了
            if (r.op === 'move') { if (r.to) out.push(r.to); continue; }
            for (const c of r.changes || []) out.push(c);
        }
        return out;
    }

    function buildWorkSetTail(changedPaths, cwd) {
        const out = [];
        const files = unique((changedPaths || []).filter(Boolean));
        if (!files.length) return out;
        // 工作集尾部是**第四个令牌发放点**：它本来就在列「变更文件 + 同目录邻居」的路径，
        // 顺手发 @pN 是免费的 —— 下一轮想接着改这些邻居就不必重打路径。整批只落盘一次。
        return PathStore.batch(function () {
            out.push('cwd=' + (cwd || '/'));
            const seenDirs = Object.create(null);
            for (const p of files.slice(0, 4)) {
                const node = VirtualFS.resolveFile(p);
                if (!node) continue;                         // 不在树里：宁可不提，也不要写自相矛盾的行
                const raw = String(node.content == null ? '' : node.content);
                const tok = PathStore.make(p);
                out.push('  ' + (tok ? tok + ' ' : '') + p + '  ' + raw.split('\n').length + 'L / ' + fmtSize(byteLen(raw)));
                const dir = p.slice(0, p.lastIndexOf('/')) || '/';
                if (seenDirs[dir]) continue;
                seenDirs[dir] = true;
                const parent = VirtualFS.resolve(dir);
                if (parent && parent.type === 'dir') {
                    const neighbors = Object.keys(parent.children).sort().filter(function (n) { return (dir === '/' ? '/' + n : dir + '/' + n) !== p; }).slice(0, 4);
                    if (neighbors.length) {
                        const row = neighbors.map(function (n) {
                            const c = parent.children[n];
                            const full = dir === '/' ? '/' + n : dir + '/' + n;
                            const t2 = PathStore.make(full);
                            return (t2 ? t2 + ' ' : '') + n + (c.type === 'dir' ? '/' : '(' + (String(c.content || '').split('\n').length) + 'L)');
                        }).join('  ');
                        out.push('  同目录 ' + dir + '：' + row);
                    }
                }
                if (out.length >= 8) break;
            }
            return out.slice(0, 8);
        });
    }

    /* 批量行数汇总（反馈 许愿·4）：一批里 ≥2 条改动时给一行总账 ——
     * 「共删 15 行，文件 11395 → 11380 行」这种话 AI 不该自己从 15 行摘要里累加。
     * 只在真的有两处以上改动时出现，单条 write 不会平白多一行。 */
    function batchLineSummary(results) {
        const mut = (results || []).filter(function (r) {
            if (!r || !r.ok || r.dry || !MUTATING_OPS[r.op]) return false;
            return (r.changes && r.changes.length) || r.removed != null || r.addedLines != null;
        });
        if (mut.length < 2) return null;
        let removed = 0, added = 0, net = 0, lineInfo = 0;
        const paths = [];
        for (const r of mut) {
            if (paths.indexOf(r.path) === -1) paths.push(r.path);
            if (typeof r.removed === 'number') removed += r.removed;
            if (typeof r.addedLines === 'number') added += r.addedLines;
            if (typeof r.oldLines === 'number' && typeof r.newLines === 'number') { net += (r.newLines - r.oldLines); lineInfo++; }
        }
        let text = 'Σ 本批 ' + mut.length + ' 条改动 / ' + paths.length + ' 个文件';
        const parts = [];
        if (removed) parts.push('共删 ' + removed + ' 行');
        if (added) parts.push('共插 ' + added + ' 行');
        if (parts.length) text += '：' + parts.join('，');
        if (lineInfo && paths.length === 1) {
            const last = mut.filter(function (r) { return typeof r.newLines === 'number'; }).pop();
            if (last) text += '，' + paths[0] + ' ' + (last.newLines - net) + ' → ' + last.newLines + ' 行（' + (net >= 0 ? '+' : '') + net + '）';
        } else if (net) {
            text += '，净 ' + (net >= 0 ? '+' : '') + net + ' 行';
        }
        return text;
    }

    /**
     * 组装回执
     * opts: { status, ms, steady, cwdHint, hint, level, levelNote }
     */
    function composeReceipt(results, opts) {
        opts = opts || {};
        const total = results.length;
        const okCount = results.filter(function (r) { return r.ok; }).length;
        const status = statusOf(results, opts);
        const ms = opts.ms == null ? 1 : opts.ms;
        const head = RECEIPT_OPEN + ' ' + status + ' ' + okCount + '/' + total + ' · ' + ms + 'ms';
        const lines = [head];
        // 批量汇总（反馈 许愿·4）：15 条 rmline 之后不该让 AI 自己累加 15 行摘要。
        const batchSum = batchLineSummary(results);
        if (batchSum) lines.push(batchSum);

        const failures = results.filter(function (r) { return !r.ok; });
        const bodies = [];
        for (const r of results) if (r.ok && r.body && r.body.length) bodies.push({ r: r, body: r.body });

        // —— 稳态（连续 ≥2 轮无错、无自愈、本轮没有内容载荷、且没有 dry）：1~3 行 ——
        //   有 dry 的批次一律走展开式：压缩态只列路径，会把「只校验没写入」压成看起来像写成功的一行。
        if (opts.steady && !failures.length && !bodies.length
            && !results.some(function (r) { return r.selfHeal || r.dry; })) {
            const changed = [];
            for (const r of results) {
                if (r.dry) continue;                       // dry 没写盘，不算变更
                if (r.changes && r.changes.length) for (const c of r.changes) changed.push(c);
                else if (r.summary && ['read', 'list', 'grep', 'stat', 'tree', 'cd', 'expect'].indexOf(r.op) === -1) changed.push(r.summary);
            }
            if (changed.length) lines.push(changed.slice(0, 2).join(' | '));
            if (opts.cwdHint) lines.push('◀ ' + opts.cwdHint);
            lines.push(RECEIPT_CLOSE);
            return fenceOutbound(lines.join('\n'));
        }

        // —— 逐条事实 ——
        const detail = [];
        for (const r of results) {
            if (r.ok) {
                const fl = factLine(r);
                if (fl) detail.push(fl + (r.selfHeal ? '  ⚠' + r.selfHeal : ''));
                continue;
            }
            const head2 = '✗ ' + (r.op || '?') + ' ' + (r.path || '') + ' ' + (r.error || '失败');
            detail.push(head2.trim());
            // 单命令存点回滚：这条命令写到一半的改动已被撤掉（同批其它命令不受影响），不能不说
            if (r.sideEffectsRolledBack) detail.push('  ⤺ 这条命令写到一半的改动已回滚（同批其它命令不受影响）');
            // 2.13.0 expect 联动回滚：断言不过 → 整批写入已撤
            if (r.batchRolledBack) detail.push('  ⤺ 断言失败：本批已写入的内容已全部回滚（改对后重发，文件不会停在失败状态）');
            if (r.detail && r.detail.length) for (const d of r.detail) detail.push('  ' + d);
            if (r.candidates && r.candidates.length) {
                for (const c of r.candidates.slice(0, 2)) {
                    if (c.anchor) detail.push('  候选 L' + c.line + ' ' + c.anchor + '  ' + String(c.text || '').trim().slice(0, 90));
                    else detail.push('  候选 ' + (c.path || ('L' + c.line)) + (c.score ? '（相似度 ' + Math.min(1, Number(c.score)).toFixed(2) + '）' : ''));
                }
            }
            if (r.syntax) detail.push('  正确写法：' + r.syntax);
        }

        // —— 内容载荷（read / grep 的结果）——
        // v2.0.3：同一路径出现多次时（如 rmline 的上下文 + 随后的 read），两块头一模一样会让 AI
        // 分不清哪块是哪个命令的输出。给重复路径的头补上操作名（单次出现保持原样，不打扰常规阅读）。
        const payload = [];
        const bodyPathCount = Object.create(null);
        for (const b of bodies) {
            const k = b.r.path || b.r.op;
            bodyPathCount[k] = (bodyPathCount[k] || 0) + 1;
        }
        for (const b of bodies) {
            if (b.r.body.length) {
                const k = b.r.path || b.r.op;
                const label = bodyPathCount[k] > 1 ? ((b.r.op || '?') + ' ' + k) : k;
                payload.push('— ' + label + ' —');
                for (const l of b.r.body) payload.push('  ' + l);
            }
        }

        const structureChanged = results.some(function (r) { return r.ok && r.structure; });
        const tail = structureChanged ? buildWorkSetTail(tailPathsOf(results), opts.cwd) : [];

        const hints = [];
        // 病因诊断优先于「这一条怎么改」：先讲清楚为什么，再给单条写法的纠正
        if (opts.diagnosis) hints.push('◀ 病因诊断：' + opts.diagnosis);
        // 错点补课：这一轮踩的坑在哪一节手册里（一行、带冷却）—— 在最需要时只给那一条
        if (opts.manualHint) hints.push('◀ ' + opts.manualHint);
        const hint = opts.hint || (failures.length ? correctionFor(failures[0]) : null);
        if (hint) hints.push('◀ ' + hint);
        if (opts.cwdHint) hints.push('◀ ' + opts.cwdHint);
        if (opts.level && opts.level !== 'domain' && opts.levelNote) hints.push('◀ ' + opts.levelNote);

        // 信封（状态行 + 逐条事实 + 工作集尾部 + 提示）受行数预算约束；内容载荷另计
        // §3.7：常规 ≤6 行；出错 / 结构变化 ≤25 行
        const envCap = (failures.length || structureChanged) ? 25 : 6;
        const envTail = tail.concat(hints);
        const factCap = Math.max(1, envCap - envTail.length);
        const factsAll = lines.concat(detail);
        let factsOut = factsAll;
        let dropped = 0;
        if (factsOut.length > factCap) {
            dropped = factsOut.length - factCap;
            factsOut = factsOut.slice(0, factCap);
        }
        const out = factsOut.slice();
        if (payload.length) {
            // 内容载荷：最多 60 行，超出保留首尾
            const PAYLOAD_CAP = 60;
            if (payload.length > PAYLOAD_CAP) {
                out.push.apply(out, payload.slice(0, PAYLOAD_CAP - 8));
                out.push('  … 省略 ' + (payload.length - PAYLOAD_CAP) + ' 行 …');
                out.push.apply(out, payload.slice(-7));
                const sp = spillText('payload', payload.join('\n'));   // 14：完整载荷落盘，给 read 路径
                if (sp) out.push('  ↳ 完整内容：read ' + sp);
            } else {
                out.push.apply(out, payload);
            }
        }
        out.push.apply(out, envTail);
        // 2.13.0：AUTO 必须附 diff —— 自动修正改了文件却只给一句 ⚠，等于要用户为看不见的改动负责。
        if (status === STATUS.AUTO) {
            const diffs = [];
            for (const r of results) if (r && r.autoDiff && r.autoDiff.length) diffs.push({ r: r, rows: r.autoDiff });
            if (diffs.length) {
                out.push('⚙ AUTO：脚本自动改了这些（diff 在这，核对后再往下走）');
                let shown = 0;
                for (const d of diffs) {
                    for (const row of d.rows) {
                        if (shown >= AUTO_DIFF_MAX_ROWS) break;
                        out.push('  ' + (d.r.path || d.r.op || '') + ' ' + row);
                        shown++;
                    }
                }
                if (shown < diffs.reduce(function (n, d) { return n + d.rows.length; }, 0)) {
                    out.push('  …（其余自动改动可用 diff ' + (diffs[0].r.path || '路径') + ' <另一个文件> 自己看）');
                }
            }
        }
        if (dropped) {
            const sp = spillText('receipt', factsAll.join('\n'));      // 14：完整回执落盘，给 read 路径
            out.push('… 另有 ' + dropped + ' 行已省略' + (sp ? '（完整内容：read ' + sp + '）' : '（完整内容见面板「回执」页）'));
        }
        out.push(RECEIPT_CLOSE);
        return fenceOutbound(out.join('\n'));
    }

    function composeNoop(reason, detail) {
        const lines = [RECEIPT_OPEN + ' NOOP 0/0 · 0ms', reason];
        if (detail) lines.push(detail);
        lines.push('◀ 完整规范：read /__sys/手册.md');
        lines.push(RECEIPT_CLOSE);
        return fenceOutbound(lines.join('\n'));
    }

    function composeSkip(agoMs, note) {
        const sec = Math.max(1, Math.round(agoMs / 1000));
        const win = Math.round((CONFIG.IDEMPOTENT_WINDOW_MS || 0) / 1000);
        const left = Math.max(0, win - sec);
        const lines = [
            RECEIPT_OPEN + ' SKIP 0/0 · 0ms',
            '相同批次已于 ' + sec + 's 前执行，未重复执行'
                + '（幂等窗口 ' + win + 's，还剩 ' + left + 's；到点后重发会正常执行）' + (note ? '（' + note + '）' : ''),
            '◀ 确需强制重跑请在开标记加 force：```dsw force（或 <dsw force>）'
        ];
        lines.push(RECEIPT_CLOSE);
        return fenceOutbound(lines.join('\n'));
    }

/* >>> 11-manual.js */
    /* =========================================================================
     * 11 契约三层（§2 P4）：L0 触发句 · L1 手册文件 /__sys/手册.md · L2 回执纠错
     * ====================================================================== */

    const MANUAL_MARK = 'proto=' + PROTO_VERSION + ' | dsl=dsw-fence';

    // 命令表由注册表 COMMANDS 生成（单一事实来源）：加了命令就自动出现在手册与 help 里，不会漂。
    function manualCommandTable() {
        const label = { read: '读', write: '写', control: '控制', plan: '计划' };
        const rows = [];
        for (const k of ['read', 'write', 'control', 'plan']) {
            const names = COMMAND_NAMES.filter(function (n) { return COMMANDS[n].kind === k; });
            if (!names.length) continue;
            rows.push('| ' + (label[k] || k) + ' | ' + names.map(function (n) { return '`' + n + '`'; }).join(' ') + ' | '
                + names.map(function (n) { return '`' + n + '` ' + COMMANDS[n].desc; }).join('；') + ' |');
        }
        return rows.join('\n');
    }

    function buildManual() {
        const winSec = Math.max(1, Math.round((CONFIG.IDEMPOTENT_WINDOW_MS || 0) / 1000));
        const grepMax = CONFIG.GREP_MAX_HITS || 120;
        return [
            '# DSW 容器手册',
            '',
            MANUAL_MARK,
            '',
            '出错时先看回执那一行的「改法」，照它改即可；本手册按需查对应小节。',
            '',
            '## 1. 执行域',
            '',
            '命令必须写在执行域里。**推荐写法：整段放进一个带 `dsw` 语言标签的代码围栏，并在围栏内用 `<dsw>` 开头、`</dsw>` 收尾。** 这样两边都稳：围栏让平台原样保留字符（不渲染，所以行首 `#` `-` `>`、「数字.」、成对 `__` `**`、缩进都不会被吞），而 `<dsw>` / `</dsw>` 是**纯文本标记** —— 有些平台只保留代码块内容、把围栏标记丢掉，那时靠这两个标签仍然认得出域。域外的讲解、示例、历史消息永不执行；**写命令在域外一律不执行**。',
            '',
            '```dsw',
            '<dsw>',
            'read /',
            '</dsw>',
            '```',
            '',
            '只写 `<dsw> … </dsw>` 标签（不放围栏）也认，但**必须放在代码块里**：裸写在正文里会被平台当成 HTML 标签吃掉。只写 ` ```dsw ` 围栏、不写标签，在保留围栏标记的平台上也能认（推荐写法兼容它）。',
            '',
            '| 开标记 | 作用 |',
            '| --- | --- |',
            '| dsw 围栏（开头三个反引号 + dsw），或 `<dsw>` | 普通域 |',
            '| dsw 围栏 + atomic，或 `<dsw atomic>` | 整条消息任一失败 → 全部回滚（**消息级**，但不推荐，见下） |',
            '| dsw 围栏 + force，或 `<dsw force>` | 绕过幂等，强制重跑 |',
            '| dsw 围栏 + dry，或 `<dsw dry>` | 只校验不写盘（**域级**） |',
            '',
            '开标记的大小写 / 空格 / 全半角都无所谓；闭标记就是结尾那行三个反引号（或 `</dsw>`）。',
            '',
            '**旧标记（`[[dsw]]` / `⟦dsw⟧` / `===dsw===`）已彻底移除**：不再识别、不再兼容；写到它们时容器会明确报错并给新写法（不会静默执行、也不会静默忽略）。',
            '',
            '',
            '**两个修饰符的作用范围不对称，这是最容易踩的坑：**',
            '',
            '- `dry` 是**域级** —— 只作用于写了它的那个域，同一条消息里别的域照常写入。',
            '- `atomic` 是**消息级** —— 一条消息里所有执行域合并成**一个批次**，任一域任一条失败，整条消息的全部写入一起回滚（没写 `atomic` 的普通域也一起回滚）。',
            '- **默认不要用 `atomic`**：回执要等下一轮才到，`atomic` 把「一条可见的失败」变成「整批凭空消失」，很难定位。默认行为（**只回滚失败的那一条 + 状态给 `PARTIAL`**）才好定位；要「整批保真」用 `expect` 做后置断言即可（断言失败 → 本批已写入内容自动回滚）。真要用 `atomic`，回执会列出被回滚的路径。',
            '- 没有「域级 atomic」。要「只回滚某一段」，把那一段拆到另一条消息单独发送。',
            '',
            '其余规则：',
            '',
            '- ✅ 围栏闭合要求**同字符且长度 ≥ 开始符** —— 若正文里出现一整行三个反引号，把外层围栏加长为四个反引号，正文里的反引号串就不会提前闭合。',
            '- 一条消息可以有多个执行域，按文档顺序合并成一个批次，只回一条回执。',
            '- ❌ 域没有闭合 → 整个域不执行，回执 `NOOP 未闭合`。',
            '- ❌ 命令写在执行域外 → 不执行（回执会提示）。唯一例外是 §7 的「域外兜底」：整段像命令**且全是只读命令**时才可能被执行 —— 不要依赖它，写命令在域外永远不执行。',
            '- ✅ 越权（系统区 / 计划模式）或语法错的那一条**只拒它自己**，同批其它命令照常执行（状态 `PARTIAL`）；要「一条错就整批不算」用 dsw 围栏 + atomic（但先看上一条的提醒）。',
            '- ❌ 旧机制写法已全部移除、不再归一化：`[read: /a]`、`[write: /a] … [/write]`、`§` 闭合、`fs` 围栏里的裸命令行一律不执行，回执里给正确写法。',
            '',
            '## 2. 命令与正文',
            '',
            '域内每行一条：`操作 路径 [参数…]`。',
            '',
            '**路径**：可省略前导 `/`（相对 cwd）。`#锚点` 与 `@路径令牌` 可以直接当路径用（见 §4）。',
            '',
            '**参数**四种写法等价：`all=1`、`all:1`、`--all`、`all`。单字母开关必须带横杠（`-a`、`-r`、`-n`），否则会和替换文本里的单字符混淆。',
            '',
            '**不认识的参数不会被静默忽略**：命令照执行，但该条回执标 `⚠参数 X 本命令不认识，已忽略`，整条回执的状态给 **`PARTIAL`**（不是 OK / AUTO）—— 别把 PARTIAL 当成成功，它的意思是「你要的效果没生效」。',
            '',
            '**`grep` / `find` 的参数顺序是硬性的**：`grep /路径 "关键词"`、`find /路径 "*.js"`。写成 `grep -n "x" /a.html` 会报错并给正确写法（不按“全容器搜索”降级执行）。`grep` 恒带行号，`-n` 不用写（写了只提示一句）。',
            '',
            '**引号内的片段一律按字面量**：`edit /f "L2" "L3"` 里的 `L2` 是文本、不是行区间；`"all"`、`"42"` 同理。要行区间 / 开关就写**不带引号**的 `L2`、`10-20`、`all`、`-i`。`""` 是合法的空替换（用来删掉一段文本）。',
            '',
            '**多行正文三种给法**：',
            '',
            '| 给法 | 形状 | 用在哪 |',
            '| --- | --- | --- |',
            '| 单段 | `<<<` → 内容 → `<<<` | `write` `append` `insert` `apply` `patch`；带行区间或锚点的 `edit` 也吃单段（`edit /f 12-15 <<<新段<<<`、`edit #a3f <<<新行<<<`） |',
            '| 双段 | `<<< old` → 旧 → `;;;` → 新 → `<<<` | 多行替换 |',
            '| 内联 | `edit /f "旧" "新"` | 短替换，最省事；**不能跨行** —— 必须写在同一物理行，换行会让后半行变成「未知命令」 |',
            '',
            '```dsw',
            '<dsw>',
            'write /src/util.js',
            '<<<',
            'export const add = (a, b) => a + b;',
            '<<<',
            '</dsw>',
            '```',
            '',
            '正文原样保留（空行、代码块都安全），但有三个坑：',
            '',
            '1. **闭合符长度必须 ≥ 开始符长度**。推荐一律用 `<<<` 收尾；`>>>` 也认，但行首 `>>>` 会被网页当引用块渲染而消失，脚本会按域边界收尾并在回执标 `⚠`。想零 `⚠` 就用 `<<<`，一个正文配一个执行域最稳。',
            '2. ⚠ **正文里若有一整行的 `<<<` / `>>>`，它会提前闭合正文** —— 后面的正文被当成命令行，回执里是一串「未知命令」。两种对策：',
            '   · 定界符加长：`<<<<<` 开、`<<<<<` 关（正文里的 `<<<` 就安全了）；',
            '   · **base64 通道**：`write /路径 base64` + 一行 base64 正文。正文不经过聊天渲染层，`<<<`、反引号、缩进全部免疫 —— 含 JS/CSS 的正文首选。',
            '3. **行首空白与转义改写（硬规则）**：脚本取的是 DOM 文本（不是渲染文本），能挡住浏览器折行，**挡不住平台在渲染阶段就吞掉行首空白、改写 `__` `**` `*` `_` `[x](y)` 这类标记**。既然**整段执行域已经用外层代码围栏包住**（§1），围栏内就是字面量：行首缩进 / 代码 / 行首 `#` `-` `>` / 行首「数字.」/ `<` `>` / `[链接](…)` / 成对 `__` `**` / 反斜杠 / 竖线表格**都不需要额外处理**，正文直接写。',
            '   唯一例外：正文里出现**一整行三个反引号**会提前闭合外层围栏 —— 把外层围栏加长到四个反引号即可，程序按「同字符且长度 ≥ 开始符」判闭合。',
            '   不套外层围栏（旧写法）时：`__init__` 会变成 `init`（成对下划线被当强调吞掉）、`[i]` 会变成 `iii`（当斜体吞掉方括号）、行首缩进丢失、行首 `#` `-` `>` 「数字.」被当 Markdown 吃掉。**含 JS/CSS/正则等大量特殊字符的正文，首选 `write /路径 base64`** —— 它不经过聊天渲染层，缩进、`__`、反引号、`<<<` 全部免疫。',
            '4. **正文体检告警可以关**：写入时容器会扫一遍可疑写法（落单在行首/行尾的 `**` `__`、被吞掉的 Python 缩进、正文含整行 `<<<`）并在回执标 `⚠`。确认无误时给该命令加 `--no-warn`（或 `nowarn`）即可关掉本条的告警 —— 告警只是提醒，从不阻止写入。',
            '',
            '**正文相关的其它事实**：',
            '',
            '- `edit` 走模糊匹配时：原文有缩进、片段没有 → 按原文缩进补回，回执标 `⚠…已按原文补回 N 个空白字符`；两边都没有缩进（heredoc 已被平台吞）→ 回执明说「未做补回」，不会默默接受 —— 这时改用内联 `edit` 或占位符。',
            '- **冒险型自愈按命令计额度**：锚点重定位、`edit` 模糊匹配这类「猜」的自愈，**每条命令各有一次**机会（不再是整批共用一次）；同批里前一条用掉了，不影响后一条。',
            '- **单命令存点**：会改树的命令各自带一层自己的存点 —— 一条命令写到一半失败时，它自己的半个改动**已被单独回滚**，同批已成功的命令照常保留。非 atomic 批也不会留下「说失败却写了一半」的幽灵副作用（回执在该条下加一行 `⤺ 已回滚`）。',
            '- **删行用 `rmline /路径 12-15`**（或 `rmline #锚点`）：它只吃行区间、**不需要正文** —— 空 heredoc 恰恰是平台最容易吃掉的东西。',
            '- **写多个文件用 `apply`**（一条命令一个来回是最大的浪费）：正文里每个文件以一行 `@@ /路径` 分节，直到下一个 `@@ ` 为止，一批最多 20 个文件；整批原子，有一个失败就全部回滚，回执逐文件给 `hash=`。',
            '- `patch` 只认标准 unified diff（正文里必须有 `@@ -a,b +c,d @@` 头）；不小心写成双段也不报死：按 `edit` 双段执行，并在回执标 `⚠`。',
            '- `write` / `edit` / `apply` 的回执带 `hash=<内容哈希>`；要核对写没写对，和 `stat` 的 `hash=` 比一下即可。',
            '',
            '- ✅ `write /a.js` 换行 `<<<` 换行 内容 换行 `<<<`（或 `>>>`）',
            '- ❌ `write /a.js` 换行 内容（没有定界，脚本不知道正文边界）',
            '',
            '## 3. 命令表（' + COMMAND_NAMES.length + ' 个）',
            '',
            '| 类别 | 命令 | 说明 |',
            '| --- | --- | --- |',
            manualCommandTable(),
            '',
            '记不住就 `help`：不带参数按类别列出全部命令，带参数给用法与坑（如 `help edit`）。',
            '',
            '`grep` 找**内容**（不写路径 = 从 `/` 搜，只有 `/__trash` 除外）；`find` 按**文件名 / 路径**找（glob：`*` `?` `**`）。别混。',
            '',
            '- 别名也认：`cat/ls/rm/mv/cp/save/del/search/合并/插入/读/写/改/删/搜索…`。命令名写错 1 个字母、**名字 ≥4 个字母**且候选唯一时会按正确命令执行，并在回执该条后标 `⚠命令名 reed → read（按最接近的命令执行）`（短名如 `cd` 不自动纠，避免误伤）；整批没有别的失败时状态码才是 `AUTO` —— 自愈绝不静默。',
            '',
            '### 3.1 高频形状（省来回的关键）',
            '',
            '- `find /src "*.js"` → 列文件（`ext=js,md` 过滤、`depth=1` 只看一层、`dirs` 只看目录）；`sort=mtime` 最近改的在前，`since=10m` / `recent=2h` 只看这段时间改过的。',
            '- `edit /src "旧名" "新名"` → 整个目录批量替换（等价 `grep -l` + 逐个 `edit`，一批撤销；可用 `ext=` 限后缀）。',
            '- `insert /src/a.js 12 <<<…<<<` → 在 L12 前插一段；`insert #锚点 <<<…<<<` → 在锚点行**后**插。**两者默认方向相反，混用时用 `before` / `after` 写明确。**',
            '- `insert /dst 25 from=/src 10-20` → 把 `/src` 的 L10-20 粘到 `/dst` 的 L25 前（内容不必重打）。',
            '- `merge /out.md /01.md /02.md` → 按给定顺序首尾拼接；源写 `/p/*.md` 时按自然序（02 在 10 前），也可 `sort=mtime`。',
            '- `split /big.md 500` → 每片 500 行，切成 `big.p1.md`、`big.p2.md`…；按结构切用 `sep=###`（分隔符行不进任何片）；`to=/目录` 换输出目录。',
            '  分片**自动发路径令牌**（`@p1…@pn`），下一轮 `edit @p1 …` 或 `merge /all @p1 @p2` 直接对接。',
            '- `copy /src /dst 10-20` → 只把那一段裁出来存成 `/dst`（目标存在要 `force`）；`rmline /src 10-20` → 裁掉那一段。',
            '- `sort /list.txt uniq` → 就地排序 + 去重（`numeric` 按数值、`reverse` 反向；已经有序会明说未改动）。',
            '- **glob 批量**：`delete /tmp/*.txt force`、`copy /src/*.md /out`、`move /src/*.txt /out` —— 整批原子，写内部区一律拒绝；**glob 删除必须加 `force`**，命中目录还要 `recursive`。',
            '- **批量交付（附件）**：`upload /src`（目录，含子目录）或 `upload /a.js /b.js`（多个路径）→ 打成 **zip 附件**发到聊天里（平台没附件入口时回退为下载）。想快速了解整个项目，**先 `upload /项目目录` 一次拿全**，比一轮轮 `read` 分段读省得多。',
            '- **优先批量**：`apply`（一次写多个文件）、`edit /目录 "旧" "新"`（全目录替换）、`grep -l` + 令牌、glob 一条命令、一轮里多条命令并排写 —— 一条命令一个来回是最贵的写法，能并就并。',
            '',
            '## 4. 两个令牌',
            '',
            '`grep` 与带行号的 `read` 的每一行都带锚点；`grep -l` / `find` / 命中行 / 回执尾部的工作集都带路径令牌。两者都可以**直接当路径用**，把「定位」和「重打路径」都省掉。',
            '',
            '### 4.1 锚点 `#a3f`（管「哪一行」）',
            '',
            '回执里出现 `#a3f /src/util.js:12  export function add(…)`，下一轮直接：',
            '',
            '```dsw',
            '<dsw>',
            'edit #a3f',
            '<<<',
            'export const add = (a, b) => a + b;',
            '<<<',
            '</dsw>',
            '```',
            '',
            '- `read #a3f` 读**锚点所在行 ±3 行**（带行号）。要更大范围有两种写法：',
            '  · 相对：`read #a3f 20` = 锚点行起往下共 20 行；`read #a3f -10` = 锚点行起往上共 10 行（定位一段函数体比 ±3 够用）。',
            '  · 绝对：`read #a3f 120-160` = 该文件的第 120-160 行（**显式行区间优先**，`#a3f` 只用来确定是哪个文件）。',
            '- 文件变了会自动重定位（唯一命中），回执标 `⚠锚点重定位 L12→L15`（这类冒险型自愈每条命令各有一次额度，见 §2）。',
            '- ❌ `edit /src/util.js 12-15` 直接写行号 → 文件一改就漂移。优先用锚点。',
            '',
            '### 4.2 路径令牌 `@p1`（管「哪个文件」）',
            '',
            '`grep -l` / `find` / `grep` 的命中行 / 回执尾部的工作集都会给路径发一个 `@pN`；任何吃路径的命令都能用。',
            '',
            '回执 `@p1  /src/util.js` → 下一轮 `read @p1` / `edit @p1 "旧" "新"` / `rmline @p1 12-15` / `merge /out.md @p1 @p2`。',
            '',
            '- 写进命令行的 `@pN`、`from=@pN` 都会被展开成真实路径，路径不必再写一遍。',
            '- 令牌随会话持久化（刷新后仍可用）；同一路径稳定同一个令牌，不会每轮换号。',
            '- 文件被移动、且**同名文件全容器唯一**时自动重定位，回执里标一行 `⚠令牌 @p1 重定位 /旧 → /新`；改了名（basename 变了）**不**自动跟随，会报失效并给候选 —— 这是刻意的：`fsMove` 没有路径历史，靠猜会把内容写到错文件。',
            '- 上限：会话内 1000 个，超了淘汰最旧的。失效就重新 `find` / `grep -l` 取一个。',
            '',
            '## 5. 回执',
            '',
            '```',
            '⟦fs⟧ <状态> <成功>/<总数> · <耗时>ms',
            '<逐条事实，每行一条>',
            '— <路径> —                       内容载荷（read / grep 的正文）',
            '◀ 仅在需要你决策时出现的一句提示',
            '⟦/fs⟧',
            '```',
            '',
            '**状态码只有 6 个**：`OK` 全成功 · `AUTO` 全成功且有自动修正 · `PARTIAL` 有失败**或不认识的参数被忽略** · `NOOP` 没有有效命令 · `SKIP` 相同批次刚执行过（**必回执**）· `DENY` 整批被安全策略拒。',
            '',
            '优先级 **`PARTIAL` 压 `AUTO`、`AUTO` 压 `OK`**：同批只要有一条失败、或有一条把不认识的参数当没看见地执行了，就是 `PARTIAL`，即便别的命令自愈成功也仍然是 `PARTIAL`（自愈的 `⚠` 照旧逐条标出，不会因为升级成 `PARTIAL` 就消失）；全部成功且有自愈才是 `AUTO`。',
            '',
            '**`AUTO` 必带 diff**：自动修正改了文件时，回执末尾会多一段 `⚙ AUTO：脚本自动改了这些` + 逐行 `- 旧 → + 新`。改了什么一目了然，不必再 `read` 一遍核对。',
            '',
            '**行首记号**：',
            '',
            '| 记号 | 含义 |',
            '| --- | --- |',
            '| `✓` `+` `-` `~` | 成功（读 / 新增 / 删除 / 修改） |',
            '| `◦ dry …` | 这条没有落盘（它所在的域写了 `dry`）；读命令标「预演：dry 结束即回滚」，写命令标「只校验，未写入」 |',
            '| `↩ …（已回滚）` | 原子批次回滚了 |',
            '| `⤺` | 单命令失败：它写到一半的改动已被单独回滚（同批其它命令不受影响） |',
            '| `↶ …` / `↷ …` | `undo` / `redo` 的结果（写明回到第几档、这一趟动了哪些路径） |',
            '| `♻ restore …` | 从回收站取回 |',
            '| `✗ …` | 失败，下面自带候选与「改法」 |',
            '| `⚠…` | 自动修正（参数不认识 / 锚点重定位 / 缩进补回 …） |',
            '',
            '`♻` 专表 `restore`，`↩` 专表原子回滚，两者不混用。',
            '',
            '**各命令的专属措辞**：',
            '',
            '- **执行时机**：容器只在你这条回复**完全输出完**之后才识别命令 —— 流式输出过程中不会执行半截命令，也不会插话打断你。所以执行域可以放在回复的任意位置（要边说边写就继续写，写完再收尾）。让容器知道你说完了：最后一行写 `◆`（见 §9），写了它就不必再等平台信号。',
            '- 目录结构发生变化时，回执附工作集尾部（cwd + 变更文件行数 + 同目录邻居），通常不必再 `list` 一轮。',
            '- `grep` 回执写「查了 M 个文件，其中 K 个有命中（N 处）」：M = 查过的文件数，K = 有命中的文件数，N = 命中行数；0 命中会写清查过哪些范围。',
            '- 检索开关可叠加，回执回显生效项：`-i` 忽略大小写 · `-e` 正则 · `-v` 反选 · `-l` 只列文件名 · `-c` 只报每个文件的命中处数 · `ext=js,md` 只搜这些后缀 · `ctx=2` 每处带前后各 2 行（`ctx` 硬顶 50） · `limit=500` 提高命中上限（默认 ' + grepMax + '，硬顶 2000）。',
            '  搜索词可以是**纯数字**或与开关同名的词（`grep /f 42`、`grep /f item` 都按搜索词处理，加不加引号一样）；只有位置占满之后 `-i` / 正则 这类开关才生效（`grep /f alpha -i`）。不认识的参数照旧标 `⚠`。',
            '- `find /src "*.js"` 按**文件名**找（不是搜内容）：`ext=` `depth=` `dirs` 可用；`sort=mtime` 最近改的在前、`since=10m` / `recent=2h` 只看这段时间改过的（回执带 `3m前` 相对时间）。`diff /a /b` 给两文件差异摘要（处数 + 前几处）。',
            '- `edit` 成功的 summary 带行内 diff `⟨- 旧 → + 新⟩`（多行只给首行 + 行数），改完不必再 `read` 一遍核对。`edit <目录> "旧" "新"` 会替换该目录下所有文件（跳过系统区 / 回收站），一批撤销；`ext=` 限后缀、`limit=` 限文件数。',
            '- `read /f head=20` / `read /f tail=20` 只看头尾，不必先知道总行数；与显式行区间同时给时以行区间为准。',
            '- `rmline` 回执显示**被删原文**（`- 2| bbb`，带删前行号）+ 一行删后锚点（`删后 L2| ddd`），**不用 `>` 标删后的邻居** —— 别把邻居当成刚删掉的行、又删一遍。',
            '- 一批里 ≥2 处行改动时，回执表头下加一行总账 `Σ 本批 N 条改动 / M 个文件：共删 X 行，/f a → b 行（-X）`；批量删行后不必自己累加，也不必逐条核对行号漂移（行号按批前快照解读）。',
            '- `stat` 的 `hash=` 是内容摘要（**64 位**，打印成 **14 位 base36**；同内容同摘要、不同内容几乎不可能同摘要）。它是校验用的、不是加密哈希，看到 14 个字符是正常的。`stat` 同时给 `mtime=`（两次 `stat` / `read` 数字对不上时先看时间戳，判断文件是真的变过还是别的原因）和 `chars=`（按**码点**计；中文 / emoji 下它与 `bytes=`、与 UTF-16 长度都不同）。',
            '- **幂等只覆盖三类写入**：`write` / `edit` / `patch`，以及会改计划的 `plan`（`on` `off` `add` `done` `doing` `todo` `del` `clear`）。这几种跨消息重发，在 **' + winSec + ' 秒窗口**内回 `SKIP`（回执写「已于 Ns 前执行 / 还剩 Ns」，加 `force` 强制重跑；8 秒、10 秒后重发同样 `SKIP`）。',
            '- ⚠ **其余写操作不受幂等保护，重发会真的再执行一次**（`append` 会重复追加）：`append` `insert` `rmline` `apply` `merge` `split` `sort` `mkdir` `move` `copy` `delete` `undo` `redo` `restore` `upload`。读命令从不拦截。',
            '  窗口只识别「同一条消息内容的重发」：同一条消息里连着写两次同名文件是两条不同命令，两条都执行、不回 `SKIP` —— 那不是重发，是两步操作。',
            '',
            '## 6. 出错怎么办',
            '',
            '回执里的 `✗` 行自带候选与「改法」，照着改即可，不需要重读整个文件：',
            '',
            '```',
            '⟦fs⟧ PARTIAL 2/3 · 21ms',
            '✓ read /src/app.js → 见下',
            '✗ edit /src/app.js 片段未找到',
            '  候选 L40 #c92  function add(a,b) { … }',
            '◀ 改法：edit #c92 <<<…<<<',
            '⟦/fs⟧',
            '```',
            '',
            '一批里冒出**多条「未知命令」**时，回执会先给一行 `◀ 病因诊断：…` 指向真实原因（不是末端症状）：',
            '',
            '- **「疑似 heredoc 提前闭合」**：正文里有一整行的 `<<<` 被当成了闭合符，后面的正文变成了命令行。对策：定界符加长（`<<<<<` 开、`<<<<<` 关），或 `write /路径 base64` 走编码通道。',
            '- **「疑似内联写法被换行切开」**：`edit /f "旧" "新"` 被物理换行切成两行。对策：改用双段正文（`<<< old` → `;;;` → 新 → `<<<`），或行区间 + 定界正文。',
            '',
            '## 7. 危险操作与权限',
            '',
            '**闸门按这个顺序判，先命中的那个决定回执措辞**（同一条命令可能踩多个闸门，只报第一个）：',
            '',
            '1. 危险命令必须在执行域里（`delete`（**单个文件也算**）、`upload`、`restore`、`undo`、`redo`）；',
            '2. 计划模式（开启时拦一切写，计划文件 `/__sys/plan.md` 例外）；',
            '3. 内部区只读（`/__sys/*`、`/__trash/*`）。',
            '',
            '所以同一条 `write /__sys/x`：计划模式开着 → 回执写「计划模式：写操作已拦截」；没开计划 → 写「系统区 / 回收站对 AI 只读：…」。两个都对，只是先到先报。',
            '',
            '**系统区 `/__sys/*` 与回收站 `/__trash/*` 对你只读**：`read` / `grep` / `list` / `tree` / `stat` 可以，**不能** `write` / `append` / `edit` / `patch` / `mkdir` / `move` / `copy` / `delete`（回执直接 `DENY`）。被拒的只是那一条，同批对用户目录的写照常执行。',
            '',
            '- 唯一例外是计划文件 `/__sys/plan.md`：用 `plan add/done/doing/todo/del/clear` 维护；要整篇重写就先 `plan on`，再 `write /__sys/plan.md`。',
            '- 系统文件（含 `/__sys/手册.md`）只有人能在面板里改（文件页 → 阅读 / 编辑内容）。要留档、要写笔记 → 写用户目录，例如 `write /notes.md`。',
            '- `grep` **能**搜 `/__sys/*`（含手册本身；不写路径 = 从 `/` 整容器搜）。只有 `/__trash/*` 不参与 `grep`。',
            '',
            '**删除与回收站**：',
            '',
            '- ❌ `delete /src` → 非空目录拒绝删除。✅ `delete /src recursive`。',
            '- 删除（单个文件也算）、`upload`、`restore`、`undo/redo` 必须写在执行域里；域外兜底执行永不覆盖它们。',
            '- 删除一律进回收站：`restore list` 看序号 → `restore 1`（序号）/ `restore /原路径` / `restore <备份名>` 还原；`restore purge` 清空。',
            '- `restore list` 每行末尾就是 `/__trash/<备份名>`；`list /__trash` 看到的是**同一份事实**，`read /__trash/<备份名>` 能看被删文件的内容（回收站对你只读，写不了）。',
            '- 回收站内容**不参与 `grep`**（`restore list` / `list /__trash` 才是查它的方式 —— 不然「已删内容」会被搜成命中）。',
            '- `restore list` 是纯读，计划模式下也放行；`restore 1` 会改文件，照拦。恢复成功的条目**立刻离开回收站**，不会留在 `restore list` 里（也就不可能对同一路径反复 restore）。',
            '',
            '**glob 批量**（`delete /tmp/*.txt`、`copy /src/*.md /out`、`move /src/*.txt /out`）：整批**原子**（一条失败全部回滚）；任一目标落在内部区（`/__sys`、`/__trash`）→ 整条拒绝（不能借 glob 绕过系统区只读）；**glob 删除必须加 `force`**，命中目录还要 `recursive`。',
            '',
            '**域外兜底**：域外内容只有「像命令」（命令占比 ≥60%、长度 <400 字符）**且全是只读命令**时才可能被兜底执行；写命令一律要执行域。',
            '',
            '## 8. 计划模式',
            '',
            '计划放在容器文件 `/__sys/plan.md`，**一条一行**，三种状态（符号固定，回执 / 浮层 / 每轮附带都用它）：',
            '',
            '| 写法 | 状态 | 符号 |',
            '| --- | --- | --- |',
            '| `- [ ] 条目` | 待完成 | `○` |',
            '| `- [~] 条目` | 进行中 | `⟳` |',
            '| `- [x] 条目` | 完成 | `✓` |',
            '',
            '`plan` 命令（计划内外都能用；AI 可以自己开启计划）：',
            '',
            '| 命令 | 作用 |',
            '| --- | --- |',
            '| `plan on` | 开启计划模式：写操作被拦截，只有计划文件本身能写（同批后面的写命令当场就被拦） |',
            '| `plan list` | 列出条目与状态（等价 `read /__sys/plan.md`） |',
            '| `plan add <条目>` | 追加一条「待完成」 |',
            '| `plan done <序号 / last / 文字>` | 标记完成（`plan doing …` 进行中、`plan todo …` 待完成同理）；**`last` = 最后一条** |',
            '| `plan del <序号或文字>` / `plan clear` | 删除一条 / 清空 |',
            '| `plan off` | ❌ **只有用户能退**（面板「计划」→ 退出计划），AI 写会被回绝 |',
            '',
            '- ✅ `plan done 2`（按序号）、`plan done last`（最后一条，同批里 `plan add` 之后直接用它标完成）、`plan done 改造出站`（按文字片段，唯一命中才认）。',
            '- ⚠ 计划**只用 `plan` 命令维护，不要裸写 `/__sys/plan.md`**：对计划文件用 `write` / `edit` / `patch` 会被 `DENY`（回执直接告诉你改用 `plan`）；就算绕过去了，平台也会把行首的 `- [ ]` 当 Markdown 吃掉，条目会解析成 0 条。',
            '- ✅ 计划模式开启后，容器**每一轮都附带当前计划与每条状态**，不必再 `read`。它是**独立的一块**、附在同一条消息末尾（不是回执内部）；计划为空、面板关掉「每轮附带计划进度」、或正处在终止符暂停时都不附。',
            '- ❌ 计划模式下写其它文件 → 回执 `DENY`。先把计划改好，等用户退出计划模式再动文件。',
            '',
            '## 9. 收尾符与终止符',
            '',
            '两个符号都写在**回复的最后一行**，容器靠它们判断「说完了没有」和「要不要提醒用户」：',
            '',
            '| 符号 | 什么时候写 | 效果 |',
            '| --- | --- | --- |',
            '| `◆` | **每条回复的最后一行**（写在代码围栏**之外**，作为整条回复的最后一个字符） | 容器立刻认定这条回复已输出完，马上识别命令、发回执 |',
            '| `■` | 只有两种情况：① 整个任务全部跑完（不是一轮对话结束）② 需要用户介入 | 容器提醒用户（震动 / 提示音 / 状态条 / 面板），并进入**终止符暂停**：不再自动执行、不再回执 |',
            '',
            '- ✅ 每轮结尾写 `◆`（可以单独一行，也可以紧跟在最后一句后面，必须是整条回复的最后一个字符）。',
            '- ✅ 任务全部跑完：最后一行 `■ 任务全部完成`。',
            '- ✅ 需要用户介入：最后一行 `■ 需要你确认：是否覆盖 /src/app.js`。',
            '- ❌ 一轮对话结束就写 `■` —— 那是「请用户停下看这里」的信号，每写一次容器就暂停一次，滥用会变成噪声。',
            '- ❌ 把 `■` 写在正文或文件内容的中间 —— 容器只认回复尾部（最后 400 字符）。',
            '- ❌ 不要两个都写：最后一行是 `■` 时就不用再写 `◆`（容器两个都认，同时写只是啰嗦）。',
            '- ❌ 尾部还挂着未闭合的执行域（没写结尾的 ``` 或 `</dsw>`）时写 `■` 无效：容器不信任这个符号（不提醒、不暂停），先把执行域闭合。',
            '- 忘了写 `◆` 不会出错：容器会退回「平台流式标记 + 正文静止 1.2s」的判定，只是慢一点。',
            '',
            '### 写了 `■` 之后会发生什么（你不需要做任何事）',
            '',
            '1. 容器先把你这条回复里的命令执行完、回执发出去（**回执不会被吞掉**）；',
            '2. 然后提醒用户，并进入终止符暂停：不再自动执行命令、不再回执、不再附带计划进度。**两种情况只提醒、不暂停**：你已经手动暂停过；或面板关掉了「终止符后自动暂停」。',
            '3. 容器只做**任务级重置**（本轮搭车标记清空、本任务失效待回传丢弃）；',
            '4. 用户再发一条新消息 → 容器自动恢复运行。',
            '',
            '容器**不会**因为 `■` 退出计划模式、不会清空计划文件、不会清 cwd / 文件系统 / 撤销栈 / 锚点表 / 幂等表。所以写 `■` 表示「这个任务到此为止」是完全安全的，但别把它当句号用。',
            '',
            '## 10. 断言与撤销',
            '',
            '- `expect /src/a.js "export const add"`：**后置断言** —— 断言失败 → 该批 `PARTIAL`、给出实际片段，**并且本批已写入的内容全部回滚**（文件不会停在失败状态；回执列出被回滚的路径）。所以「写完验一下」比「写完再看」安全，也比 `atomic` 好定位。',
            '- `undo` / `redo`：**一个批次 = 一步**（`undo 1` 回退上一批的全部写入，不是单条命令）；读批（`read` / `list` / `grep`…）不进撤销栈，所以「步数」与写入次数一一对应。',
            '- `undo` **不是删除**：它把容器整体拨回那一档，被移出的文件不进回收站，`restore` 找不回来 —— 但 `redo` 可以拨回去。',
            '- 撤销之后又发生新写入，重做分支作废（经典撤销栈语义），回执会说明回到第几档、动了哪些路径。',
            '- 同一个批次里也可以写 `undo` / `redo`：容器会先把本批尚未记档的写入物化成「本批这一档」再拨游标，所以 `write x1` → `write x2` → `undo 1` → `redo 1` 是互逆的，不会越过本批去动上一条历史。',
            '- `dry` 也是逐条的：只有写了 `dry` 的那个域整域回滚（作用范围见 §1）。回执首行永远是 `⟦fs⟧ …` 信封，`◦ dry …` 出现在**逐条事实**里：读命令标「预演：dry 结束即回滚」，写命令标「只校验，未写入」。dry 域里的 `read` / `list` / `stat` 看到的是「假设写完之后」的预演状态（这正是 dry 的用途），**批次一结束全部回滚**；下一轮再读就不存在了，别把预演当成真写成功。',
            '- 越权（系统区写 / 计划模式写）只拒那一条：同批其它命令照常执行，被拒的那条回一行 `DENY` 事实。',
            '',
            '## 11. 速查',
            '',
            '这一节只列**形状**，规则与注意事项在对应小节里（§1–§10），不在这里重复。',
            '',
            '````',
            '执行域   dsw 围栏（```dsw … ```，等价 <dsw> … </dsw>）  域外不执行；未闭合整域不执行   §1',
            '修饰符   dsw 围栏后跟 atomic | dry | force（或 <dsw atomic> 等）           §1',
            '正文     <<< 内容 <<<                     短替换：edit /f "旧" "新"      §2',
            '编码     write /f base64 <<<…<<<      静音告警：write /f --no-warn …     §2',
            '读       read /f | read /f 10-20 | read /f full | read #a3f | read @p1',
            '写       write /f <<<…<<<   append /f <<<…<<<   edit /f "旧" "新"   edit /目录 "旧" "新"',
            '改       insert /f 12 <<<…<<<   insert /dst 25 from=/src 10-20   rmline /f 12-15   patch /f <<<…<<<',
            '批       apply <<< @@ /a → 内容 @@ /b → 内容 <<<   merge /out /01 /02   split /big 500   sort /f uniq',
            '搬       mkdir /d   move /a /b   copy /a /b   delete /f [recursive]   copy /src /dst 10-20',
            'glob     delete /tmp/*.txt force   copy /src/*.md /out   move /src/*.txt /out',
            '附件     upload /f（单文件）   upload /目录   upload /a /b（打成 zip）    §3.1',
            '找       grep /路径 "词" [-i -e -v -l -c ext= ctx= limit=]（-n 不必写） §5',
            '         find /路径 "*.js" [ext= depth= dirs sort=mtime since=]   diff /a /b',
            '看       list /d   tree /   stat /f',
            '控制     cd /d   expect /f "必须出现的文本"（失败→本批回滚）           §10',
            '令牌     #a3f 锚点（±3 行）   @p1 路径令牌                             §4',
            '撤销     undo 1   redo 1   restore list   restore 1                    §10',
            '回执     OK AUTO PARTIAL NOOP SKIP DENY（优先级 PARTIAL > AUTO > OK）  §5',
            '         PARTIAL 也包括「有参数被忽略」；AUTO 必附 diff',
            '收尾     ◆ 每条回复最后一行        ■ 原因：任务跑完 / 需要介入          §9',
            '计划     plan on / add / done|doing|todo <序号|last|文字> / del / clear §8',
            '````'
        ].join('\n');
    }

    /* ---------------------------- L0 首发提示 ----------------------------
     * 这份提示词会**单独使用**（面板「复制首发提示」、或关掉「注入手册全文」时只发它），
     * 所以它必须自己站得住：域怎么写、正文怎么给、令牌怎么用、收尾符怎么用、不会就去 help。
     * 具体命令一律不背 —— 命令表由注册表生成，需要时 `help` 现查，不会漂。
     * 行数受 _p6_manual_selftest.js 约束（≤15 行），加内容请并进现有行。 */
    function buildBootstrapPrompt() {
        return [
            '你是 DSW 容器的操作员，可以读写容器里的虚拟文件系统：读写文件、检索、排序、切分合并、批量处理。',
            '',
            '要执行操作，把命令写进执行域：**整段放进带 `dsw` 标签的代码围栏，并在围栏内用 `<dsw>` 开头、`</dsw>` 收尾**（围栏让平台原样保留字符与标签；有些平台只保留代码内容、丢掉围栏标记，这样写两种情况都认；围栏单独用也行）。写命令在域外一律不执行：',
            '```dsw',
            '<dsw>',
            'read /',
            '</dsw>',
            '```',
            '- 命令格式：每行一条，`操作 路径 [参数]`；多行正文 `<<<` 开、`<<<` 收（`write /a.md` → `<<<` → 内容 → `<<<`）。正文里含**一整行** `<<<` 会提前闭合 —— 改用 `<<<<<`，或 `write /路径 base64` 编码传入（含 JS/CSS 等特殊字符时首选）。**围栏已让正文成为字面量，正文不必再自己包围栏**；正文里出现一整行三个反引号就把外层围栏加长到四个。`grep` / `find` 的路径必须写在搜索词前面（`grep /src "词"`）；不认识的参数会被回执标成 `PARTIAL`，别指望它生效。',
            '- 少来交互：优先批量（`apply` 一次写多个文件、`edit /目录 "旧" "新"`、glob、`grep -l`）与 `upload /目录`（一次打成 zip 附件，先看全项目再动手）；`read /f full` 一次读全，不必再去读落盘副本；`plan add X` 与 `plan done last` 可以同批写。',
            '- ` ```dsw dry ` = 只校验不写盘（只作用于它自己那个域）；`atomic`（整条消息全回滚）默认别用 —— 默认只回滚失败的那一条、状态给 `PARTIAL`，更好定位；要整批保真用 `expect /f "文本"`（断言失败自动回滚本批）。要让用户看到进度就用 `plan`：`plan add <条目>` 加一条，`plan doing|done|todo <序号|last|文字>` 改状态（○ 待完成 ⟳ 进行中 ✓ 完成）。',
            '- 回执里的两个令牌可以直接当路径用：`#a3f` 指向某一行（`edit #a3f <<<…<<<`；`read #a3f` 读该行 ±3 行，`read #a3f 20` 往下 20 行、`read #a3f -10` 往上 10 行），`@p1` 指向某个文件（`read @p1` / `edit @p1 "旧" "新"` / `merge /out @p1 @p2`）。`AUTO` 回执必带 diff，改了什么一目了然。',
            '- 每条回复的最后一行写 `◆` 收尾（容器靠它判断你说完了）。整个任务全部跑完、或需要用户介入（授权 / 选择 / 缺信息）时，最后一行**改写** `■ <一句原因>`（那时不要再写 `◆`）。',
            '- 旧写法（旧标记 `[[dsw]]`、`[read: /a]`、`§`、`fs` 围栏裸命令、域外裸命令）都不执行。**不记得命令就查，别猜**：`help` 按类别列出全部命令，`help <命令>` 给用法与常见坑（如 `help edit`）。',
            '你这条回复完全输出完之前，容器不会执行、也不会插话打断你；手册**按节随取，别背全文**：`help` 看目录、`help §2`（或 `help <命令>`）取那一节、`read ' + SYS_MANUAL_PATH + '` 取全文（协议 ' + PROTO_VERSION + '）。'
        ].join('\n');
    }
    const BOOTSTRAP_PROMPT = buildBootstrapPrompt();

    /* =========================================================================
     * 11b 手册投喂层：分节 / 按需即取 / 错点补课 / 冷启动微课
     *
     * 为什么不「一次性灌全本」：整本手册几千字，AI 读完记不住、记不准，
     * 到真要用的时候（正文怎么闭合、令牌怎么用）还是靠猜 —— 长文会随上下文被稀释。
     * 所以改成三段式，核心是「多次、少量、恰逢其时」：
     *   ① 首轮只给自足的 L0 + 一张**目录卡**：知道「手册分几节、可以按节取」就够；
     *   ② 按需即取（pull）：`help §2` / `help 正文` 现取**那一节**，`read /__sys/手册.md` 取全文；
     *   ③ 错点补课（push）：哪一轮踩了坑，回执就附一行「手册§N」——
     *      在他最需要的那一刻只给那一条，并做冷却，不刷屏；
     *   ④ 冷启动微课（reinforce）：会话头几轮每轮回执轮播一条最小契约，轮完就停。
     * ====================================================================== */

    let manualSecCache = null;
    // 从 buildManual() 的成品里按 `## N. 标题` 切节 —— 手册文本仍是**单一出处**，
    // 这里只做切分，不复制任何正文，改手册不会让两份漂移。
    function manualSections() {
        if (manualSecCache) return manualSecCache;
        const lines = String(buildManual()).split('\n');
        const secs = [];
        const head = [];
        let cur = null;
        for (const ln of lines) {
            const m = /^##\s+(\d+)[.、]\s*(.+?)\s*$/.exec(ln);
            if (m) { cur = { num: Number(m[1]), title: m[2], lines: [ln] }; secs.push(cur); }
            else if (cur) cur.lines.push(ln);
            else head.push(ln);
        }
        for (const s of secs) {
            s.text = s.lines.join('\n').replace(/\s+$/, '');
            s.summary = manualSectionSummary(s);
        }
        manualSecCache = { head: head.join('\n'), secs: secs };
        return manualSecCache;
    }

    // 一节的一句话摘要：取小节里第一个「像正文」的行
    // （跳过空行 / 代码围栏**内含**的行 / 表格；只去掉 ** 与反引号，**不碰下划线**——
    //  否则 /__sys/plan.md 会被搝成 /sys/plan.md 这种假路径）
    function manualSectionSummary(s) {
        let inFence = false;
        for (const ln of s.lines.slice(1)) {
            const t = ln.trim();
            if (/^```/.test(t)) { inFence = !inFence; continue; }
            if (inFence) continue;
            if (!t || /^\|/.test(t) || /^[-•]\s*$/.test(t)) continue;
            const plain = t.replace(/[`*]/g, '').replace(/^[-•]\s*/, '').trim();
            if (!plain) continue;
            return plain.length > 64 ? plain.slice(0, 63) + '…' : plain;
        }
        return '';
    }

    // 目录卡：只含「有哪些节 + 怎么按需取」，本身不含规则正文 —— 首轮随 L0 一起发。
    function manualTOC() {
        const got = manualSections();
        const out = ['## 手册目录（按需即取，不必背全文）', ''];
        for (const s of got.secs) out.push('§' + s.num + ' ' + s.title + (s.summary ? '：' + s.summary : ''));
        out.push('');
        out.push('要用某一节：`help §2`（或 `help 正文` / `help 令牌` 按关键词取）；全文 `read ' + SYS_MANUAL_PATH + '`。');
        out.push('上手先记这四节：§1 执行域（围栏写法）· §2 命令与正文 · §7 危险操作与权限 · §9 收尾符与终止符。');
        return out.join('\n');
    }

    // 按「节号 / 关键词」定位单节（给 help 用）
    function findManualSection(raw) {
        const secs = manualSections().secs;
        const q = String(raw == null ? '' : raw).trim();
        const m = /^[§#＃]?\s*(\d{1,2})$/.exec(q);
        if (m) {
            const n = Number(m[1]);
            const s = secs.filter(function (x) { return x.num === n; })[0];
            if (s) return { ok: true, section: s };
        }
        const key = q.replace(/[§#＃\s]/g, '').toLowerCase();
        if (key.length >= 2 && !/^\d+$/.test(key)) {
            // 分层挑：先按标题命中，再摘要，最后才扩展正文 —— 标题命中优先，避免「像很多节」
            const byTitle = secs.filter(function (x) { return x.title.toLowerCase().indexOf(key) !== -1; });
            const bySum = secs.filter(function (x) { return (x.summary || '').toLowerCase().indexOf(key) !== -1; });
            const byBody = secs.filter(function (x) { return x.text.toLowerCase().indexOf(key) !== -1; });
            const hits = byTitle.length ? byTitle : (bySum.length ? bySum : byBody);
            if (hits.length === 1) return { ok: true, section: hits[0] };
            if (hits.length > 1) return { ok: false, candidates: hits };
        }
        return { ok: false, candidates: [] };
    }

    // 错点补课：把「这一轮为什么错」映射到真正相关的那一节
    function manualSectionForFailure(results, diagnosis) {
        if (diagnosis) return 2;                        // heredoc 提前闭合 / 内联被换行 → §2 命令与正文
        const f = (results || []).filter(function (r) { return r && !r.ok; })[0];
        if (!f) return 0;
        const k = String(f.kind || '');
        if (k === 'denied') return 7;
        if (k === 'unknown-op' || k === 'legacy-syntax') return 3;
        if (k === 'anchor' || /锚点|令牌/.test(String(f.error || ''))) return 4;
        if (/dry|预演/.test(String(f.error || ''))) return 10;
        if (f.op === 'delete' || f.op === 'restore' || f.op === 'undo' || f.op === 'redo') return 7;
        return 2;
    }

    const manualHintAt = new Map();
    const MANUAL_HINT_COOLDOWN_MS = 120000;   // 同一节的补课 2 分钟内不重复念

    // 回执里附的那一行（不含前导 ◀）：带冷却，最多一行；无事可指时返回 null
    function manualHintLine(results, diagnosis) {
        const n = manualSectionForFailure(results, diagnosis);
        if (!n) return null;
        const now = Date.now();
        if (now - (manualHintAt.get(n) || 0) < MANUAL_HINT_COOLDOWN_MS) return null;
        const s = manualSections().secs.filter(function (x) { return x.num === n; })[0];
        if (!s) return null;
        manualHintAt.set(n, now);
        return '手册§' + s.num + ' ' + s.title + '：需要时 `help §' + s.num + '` 现取这一节';
    }

    // 冷启动微课：会话头几轮每轮轮播**一条**最小契约，轮完即停（少量多次 > 一次灌满）
    const MICRO_LESSONS = [
        '命令写在代码围栏里，围栏内用 <dsw> 开头、</dsw> 收尾；域外一律不执行。',
        '多行正文 `<<<` 开、`<<<` 收；正文里出现整行 `<<<` 就改用 `<<<<<`。',
        '围栏内是字面量，正文不必再自己包围栏；特殊字符多就 `write /f base64`。',
        '每条回复的最后一行写 `◆`；任务全部跑完或要用户介入，改写 `■ 原因`。',
        '定位用令牌 —— `#a3f` 指某一行、`@p1` 指某个文件，直接当路径用。',
        '少来交互 —— 能批量就批量（apply / 目录 glob / grep -l），`upload /目录` 一次打包看全项目。'
    ];
    let microLessonStep = 0;
    function microLessonText(maxLessons) {
        const cap = Math.max(0, Number(maxLessons == null ? MICRO_LESSONS.length : maxLessons));
        // 2.13.0：会话里已经出现过的微课不再重复发（原来只看步数，换 URL / 刷新后会从头再轮一遍）
        let ctxText = '';
        try { ctxText = String(contextHas('text') || ''); } catch (e) {}
        let skipped = 0;
        while (microLessonStep < cap && skipped < MICRO_LESSONS.length) {
            const lesson = MICRO_LESSONS[microLessonStep++ % MICRO_LESSONS.length];
            if (ctxText) {
                const probe = String(lesson).replace(/[`*]/g, '').slice(0, 18);
                if (probe && ctxText.indexOf(probe) !== -1) { skipped++; continue; }   // 上下文里有了 → 跳过
            }
            return lesson;
        }
        return '';
    }
    function resetManualFeed() { microLessonStep = 0; manualHintAt.clear(); }

/* >>> 12-gate.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const BURST_WINDOW_MS = 900;
    const LIVE_ARM_TTL_MS = 30 * 60 * 1000;
    const NAV_SUPPRESS_MS = 6000;
    const REBIND_GRACE_MS = 8000;
    const STREAM_MIN_DURATION_MS = 900;

    /* =========================================================================
     * 12 出生证明（§7 简化版）—— 只处理「本次页面亲历的发送之后」出生的消息
     * ====================================================================== */

    let liveArm = null;          // { conv, at, reason }
    let bornEls = new WeakSet();     // 已登记出生的消息元素
    const recentBirths = [];         // 渲染波检测
    let navSuppressUntil = 0;
    let rootVisitAt = Date.now();

    function resetBirthState() {
        liveArm = null;
        bornEls = new WeakSet();
        recentBirths.length = 0;
        navSuppressUntil = 0;
        rootVisitAt = Date.now();
        DSW.state.liveArm = null;
    }

    // #6 「用户主动发了一条消息」的几种见证理由（用于终止符暂停的自动恢复）。
    //    注意：'auto-send'（我们自己的回执发出）与 'composer-emptied'（可能是我们清空的输入框）
    //    都不算 —— 否则刚进入终止符暂停就会被自己的回执解除。
    const USER_SEND_REASONS = { 'user-enter': 1, 'user-enter-ce': 1, 'user-click': 1, 'user-inject': 1 };

    function witnessSend(reason) {
        liveArm = { conv: currentConversationKey(), at: Date.now(), reason: reason };
        DSW.state.liveArm = liveArm;
        log('witnessSend:', reason, liveArm.conv);
        if (USER_SEND_REASONS[reason] && typeof noteUserCommandSend === 'function') {
            try { noteUserCommandSend(reason); } catch (e) {}
        }
    }

    function isArmed() {
        if (!liveArm) return false;
        const cur = currentConversationKey();
        if (liveArm.conv !== cur) {
            if (liveArm.conv === 'root' && cur !== 'root' && Date.now() - liveArm.at <= REBIND_GRACE_MS) {
                liveArm.conv = cur;
                DSW.state.liveArm = liveArm;
            } else {
                return false;
            }
        }
        return (Date.now() - liveArm.at) <= LIVE_ARM_TTL_MS;
    }

    // 一条见证只服务一条回复
    function consumeArm() {
        if (!isArmed()) return false;
        liveArm = null;
        DSW.state.liveArm = null;
        return true;
    }

    function markBorn(el) { consumeArm(); bornEls.add(el); }

    function noteBirth(el, text) {
        const now = Date.now();
        let entry = recentBirths.filter(function (b) { return b.el === el; })[0];
        if (!entry) {
            entry = { el: el, at: now, firstAt: now, lastAt: now, firstLen: text.length, lastLen: text.length, samples: 1 };
            recentBirths.push(entry);
            while (recentBirths.length > 80) recentBirths.shift();
            return entry;
        }
        if (text.length !== entry.lastLen) {
            entry.lastLen = text.length;
            entry.lastAt = now;
            entry.samples++;
        }
        return entry;
    }

    function grewLikeStream(entry) {
        if (!entry || entry.samples < 2) return false;
        return (entry.lastAt - entry.firstAt) >= STREAM_MIN_DURATION_MS && entry.lastLen > entry.firstLen;
    }

    function judgeBirth(el, text) {
        if (bornEls.has(el)) return 'new';
        const entry = noteBirth(el, text);

        const windowStart = Date.now() - BURST_WINDOW_MS;
        const others = recentBirths.filter(function (b) { return b.el !== el && b.at >= windowStart; });
        if (others.length >= 1) return 'history';   // 渲染波 = 历史水合
        if (isArmed()) return 'new';
        if (Date.now() < navSuppressUntil) return 'history';
        if (grewLikeStream(entry)) return 'new';    // 真流式
        return 'history';
    }

    function onUrlChange() {
        navSuppressUntil = Date.now() + NAV_SUPPRESS_MS;
        rootVisitAt = Date.now();
        refreshUI();
    }

    /* ------------------------- 自发送识别（防自己回执被回显） ------------------------- */

    const recentlySent = new Map();

    function markSelfSent(text) {
        recentlySent.set(simpleHash(String(text).trim()), Date.now());
        const now = Date.now();
        for (const [k, v] of recentlySent) if (now - v > 60000) recentlySent.delete(k);
    }

    function isSelfSent(text) {
        const t = recentlySent.get(simpleHash(String(text).trim()));
        return t !== undefined && Date.now() - t < 60000;
    }

    /* ------------------------- 幂等批次表（§7） ------------------------- */

    function gateSummary() {
        const g = gateLoad();
        const now = Date.now();
        const fresh = g.batches.filter(function (b) { return now - b.at < CONFIG.IDEMPOTENT_WINDOW_MS; });
        const newest = fresh.length ? fresh[fresh.length - 1] : null;
        return {
            total: g.batches.length, fresh: fresh.length,
            last: g.batches.length ? g.batches[g.batches.length - 1].at : 0,
            // 面板「幂等」一栏直接给出「窗口内还有几条、最新一条还剩几秒」：
            // 判定重发为什么被 SKIP（或为什么没 SKIP）时有据可查，不必猜
            leftMs: newest ? Math.max(0, CONFIG.IDEMPOTENT_WINDOW_MS - (now - newest.at)) : 0
        };
    }

    function gateReset() {
        Store.set(GATE_PREFIX + currentConversationKey(), { gen: 1, batches: [] });
    }

/* >>> 13-fallback.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const READ_FALLBACK_MAX_LEN = 400;   // 域外文本长度上限
    const READ_FALLBACK_RATIO = 0.6;   // 域外「命令占比」下限

    /* =========================================================================
     * 13 执行域闸门（§5.1 收敛版）—— 只有两态：
     *   STRICT（默认，锁定）：只有 ```dsw 围栏（或 <dsw> … </dsw>）里的命令会执行。
     *   READ_FALLBACK（读兜底）：域外内容「像命令」（命令占比达标、长度受限）且**全是只读命令**时，
     *   只放行其中的只读命令。写命令与危险命令（delete/upload/restore/undo/redo）一律必须在执行域里。
     *
     * 为什么砍掉旧阶梯的「宽容档」：它会在「连续几次没用执行域」后升档，允许域外的**写**命令直接执行 ——
     * 这与「执行域显式化」「危险命令永不放宽」两条硬约束自相矛盾，而且升/降档状态机几乎不会触发，
     * 只是纯复杂度。现在窄口只剩一个：域外只读；要写文件就必须显式写执行域。
     * ====================================================================== */

    const DomainGate = (function () {
        return {
            // 只读兜底是否可用（代码常量，不进设置页；面板里只有一个「读兜底」说明）
            enabled() { return CONFIG.READ_FALLBACK !== false; },
            state() { return { mode: this.enabled() ? 'READ_FALLBACK' : 'STRICT', readFallback: this.enabled() }; },
            levelName() { return this.enabled() ? 'STRICT + 读兜底' : 'STRICT'; },
            reset() { /* 无会话状态可重置（这也是砍掉阶梯的直接收益之一） */ },

            // 决定这一条消息怎么执行；返回 { action, cmds, level, note, hint }
            decide(parsed) {
                if (parsed.hasDomain) {
                    return {
                        action: 'domain', cmds: parsed.domainCmds, level: 'domain', note: null,
                        staleMark: (parsed.legacyMarks && parsed.legacyMarks.length) ? parsed.legacyMarks[0] : null
                    };
                }
                if (parsed.unclosedDomains > 0) return { action: 'unclosed', cmds: [], level: 'STRICT', note: null };
                // 旧协议标记（[[dsw]] 等）：不识别、不兼容，但也绝不静默 —— 直接给新写法。
                if (parsed.legacyMarks && parsed.legacyMarks.length) {
                    return { action: 'legacy', cmds: [], level: 'STRICT', mark: parsed.legacyMarks[0], note: null };
                }
                // 代码块里有像命令的行、却没有执行域 → 不静默：直接告诉 AI 正确的域写法
                if (parsed.fencedCmds > 0) {
                    return {
                        action: 'none', cmds: [], level: 'STRICT', hintFenced: true,
                        hint: '代码块里看到 ' + parsed.fencedCmds + ' 条像命令的行，但没识别出执行域，本轮未执行；'
                            + '请在代码块内用 <dsw> 开头、</dsw> 收尾（开头三个反引号 + dsw 也可以）；2.13.2 优化手机文件夹（File System Access）的处理：文件内容落盘、真实文件镜像、启动全量读、文件夹读回**全部改成有界并发**（默认 6 路），并缓存目录句柄（以前镜像 200 个文件要 200×深度 次 getDirectoryHandle，现在只跟目录数有关）。手机存储上每次句柄操作都是真实IO，串行等就是白等：模拟每步 6ms 时，搬 200 个 blob 由 2.5s 降到 0.44s、镜像 120 个文件由 3.0s 降到 0.37s、读回由 1.27s 降到 0.37s。语义不变：权限到期仍把**没写完的**那几条原样放回队头（不丢内容、不改顺序），单条真失败仍只记一笔继续'
                    };
                }

                const bare = parsed.bare;
                if (!bare || !bare.candidates.length) return { action: 'none', cmds: [], level: 'STRICT', note: null };

                const readOnly = !bare.writeCandidates.length;
                if (!readOnly) {
                    // 域外有写命令：不执行，并说清正确写法（危险命令的最终拦截在执行层 dangerAllowed）
                    return {
                        action: 'none', cmds: [], level: 'STRICT',
                        hint: '检测到写命令但没放进执行域，本次未执行；请用 ```dsw 代码围栏（或 <dsw> … </dsw>）包住'
                    };
                }
                const dominated = bare.ratio >= READ_FALLBACK_RATIO
                    && bare.length < READ_FALLBACK_MAX_LEN;
                if (this.enabled() && dominated) {
                    return {
                        action: 'read', cmds: bare.readCandidates, level: 'READ_FALLBACK',
                        note: '读兜底：域外未使用执行域，仅执行只读命令'
                    };
                }
                return { action: 'none', cmds: [], level: 'STRICT', note: null };
            }
        };
    })();

/* >>> 16-plan.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const PLAN_INJECT_MAX_ITEMS = 20;   // 每轮附带的计划条目上限（超出只报总数）

    /* =========================================================================
     * 16 计划模式（§11.1）—— 计划 = 容器文件 /__sys/plan.md
     *
     *   · 一条一行，三种状态（符号固定，AI 与人都一样）：
     *       - [ ] 待完成   ○
     *       - [~] 进行中   ⟳
     *       - [x] 完成     ✓
     *   · 开启方式两种：① 用户在面板「设置 → 计划模式」手动开；
     *                  ② AI 用命令 `plan on` 开（退出只能由用户确认：写操作闸门不能被 AI 自己放开）。
     *   · 开启后：所有写操作被拦截（唯一例外 = 计划文件本身，AI 随时能改计划），
     *     并且每一轮出站消息都会搭车带上当前计划与每条的状态（并入同一条消息，不额外发）。
     *   · AI 用普通 read / write / edit 也能维护本文件；`plan` 命令只是更省事的入口。
     * ====================================================================== */

    const PLAN_STORE_PREFIX = 'dsw2:plan:';

    const PLAN_SYMBOLS = { done: '✓', doing: '⟳', todo: '○' };
    const PLAN_LABELS = { done: '完成', doing: '进行中', todo: '待完成' };
    const PLAN_CYCLE = ['todo', 'doing', 'done'];         // 点一下符号 → 下一个状态
    const PLAN_BOX_STATUS = { ' ': 'todo', x: 'done', X: 'done', '~': 'doing', '-': 'doing', '/': 'doing' };
    const PLAN_ITEM_RE = /^\s*(?:[-*+]\s*)?(?:\[([ xX~\-/])\]|([○⟳✓]))\s*(.+?)\s*$/;

    // 新建的计划文件是「空的」：只给格式说明与例子（注释行不算条目），
    // 免得 AI 把模板里的示例条目当成真任务。
    const PLAN_HEADER = [
        '# 计划',
        '',
        '<!-- 一条一行：- [ ] 待完成 ○ ／ - [~] 进行中 ⟳ ／ - [x] 完成 ✓；也可以用 plan 命令维护 -->',
        '<!-- 例：- [ ] 读取现有实现    - [~] 改造出站    - [x] 写测试 -->',
        ''
    ].join('\n');

    const PLAN_SUB_ALIAS = {
        list: 'list', ls: 'list', show: 'list', 列表: 'list', 查看: 'list', 状态: 'list',
        on: 'on', start: 'on', enable: 'on', 开启: 'on', 开始: 'on',
        off: 'off', exit: 'off', stop: 'off', 退出: 'off', 关闭: 'off',
        add: 'add', append: 'add', 添加: 'add', 新增: 'add', 加: 'add',
        done: 'done', finish: 'done', complete: 'done', 完成: 'done',
        doing: 'doing', progress: 'doing', wip: 'doing', 进行中: 'doing', 进行: 'doing',
        todo: 'todo', pending: 'todo', 待办: 'todo', 待完成: 'todo', 未完成: 'todo',
        del: 'del', delete: 'del', rm: 'del', remove: 'del', drop: 'del', 删除: 'del', 删: 'del',
        clear: 'clear', reset: 'clear', 清空: 'clear', 重置: 'clear'
    };

    function planKey() { return PLAN_STORE_PREFIX + currentConversationKey(); }

    function getPlanState() {
        const s = Store.get(planKey(), null);
        return Object.assign({ active: false, at: 0, approved: false, by: '' }, s || {});
    }

    function savePlanState(s) {
        // 批内（dry 校验 / atomic 回滚）改了计划状态也要能还原，否则「dry plan on」会把闸门真打开
        try { VirtualFS.batchRemember(planKey()); } catch (e) {}
        Store.set(planKey(), s);
    }

    function isPlanModeActive() { return !!getPlanState().active; }

    function planTouched() {
        try { renderPlanBar(); } catch (e) {}
        try { refreshUI(); } catch (e) {}
    }

    function enterPlanMode(by) {
        const s = getPlanState();
        s.active = true;
        s.at = Date.now();
        s.approved = false;
        s.by = by || 'user';
        savePlanState(s);
        ensurePlanFile();
        pushLog('已进入计划模式（写操作被拦截，计划文件 ' + SYS_PLAN_PATH + ' 除外）'
            + (s.by === 'ai' ? '，由 AI 用 plan on 开启' : ''), 'warn');
        planTouched();
        return s;
    }

    function exitPlanMode(by) {
        const s = getPlanState();
        s.active = false;
        s.approved = true;
        s.at = Date.now();
        s.by = by || 'user';
        savePlanState(s);
        pushLog('已退出计划模式（写操作放行，计划转为执行中）');
        planTouched();
        return s;
    }

    function ensurePlanFile() {
        if (!VirtualFS.resolveFile(SYS_PLAN_PATH)) {
            VirtualFS.write(SYS_PLAN_PATH, PLAN_HEADER);
        }
    }

    function readPlanText() {
        const r = VirtualFS.readRaw(SYS_PLAN_PATH);
        return r.ok ? r.content : '';
    }

    function planFileLines() { return String(readPlanText() || '').split('\n'); }

    function planWriteLines(lines) {
        const r = VirtualFS.write(SYS_PLAN_PATH, lines.join('\n'));
        planTouched();
        return r;
    }


    // 单个条目行 → { status, text }
    function parsePlanLine(line) {
        const m = PLAN_ITEM_RE.exec(String(line == null ? '' : line));
        if (!m) return null;
        const status = m[1] != null ? (PLAN_BOX_STATUS[m[1]] || 'todo') : (m[2] === '⟳' ? 'doing' : (m[2] === '✓' ? 'done' : 'todo'));
        const text = String(m[3] || '').trim();
        if (!text) return null;
        return { status: status, text: text };
    }

    // 解析整份计划：保序号（1 起）与行号（1 起，用于就地改状态）
    function parsePlanItems(text) {
        const lines = String(text == null ? '' : text).split('\n');
        const items = [];
        for (let i = 0; i < lines.length; i++) {
            const it = parsePlanLine(lines[i]);
            if (!it) continue;
            items.push({
                index: items.length + 1,
                lineNo: i + 1,
                status: it.status,
                done: it.status === 'done',
                doing: it.status === 'doing',
                symbol: PLAN_SYMBOLS[it.status],
                label: PLAN_LABELS[it.status],
                text: it.text
            });
        }
        return items;
    }

    function planProgress() {
        const items = parsePlanItems(readPlanText());
        return {
            items: items,
            total: items.length,
            done: items.filter(function (i) { return i.status === 'done'; }).length,
            doing: items.filter(function (i) { return i.status === 'doing'; }).length,
            todo: items.filter(function (i) { return i.status === 'todo'; }).length
        };
    }

    function planStatusText() {
        const p = planProgress();
        const s = getPlanState();
        if (!p.total) return s.active ? ('计划模式（' + SYS_PLAN_PATH + ' 为空）') : '未进入计划模式';
        return (s.active ? '计划中' : '已批准') + ' ' + p.done + '/' + p.total
            + (p.doing ? ' · ' + PLAN_SYMBOLS.doing + p.doing : '');
    }

    /* ------------------------- 维护（AI 与人共用） ------------------------- */

    function planFormatItem(status, text) {
        const box = status === 'done' ? 'x' : (status === 'doing' ? '~' : ' ');
        return '- [' + box + '] ' + String(text == null ? '' : text).trim();
    }

    function planAdd(text, status) {
        const t = String(text == null ? '' : text).trim();
        if (!t) return { ok: false, error: '条目内容为空' };
        const lines = planFileLines();
        if (!VirtualFS.resolveFile(SYS_PLAN_PATH)) {
            const w0 = VirtualFS.write(SYS_PLAN_PATH, PLAN_HEADER);
            if (!w0 || !w0.ok) return { ok: false, error: (w0 && w0.error) || '创建计划文件失败' };
            return planAdd(t, status);
        }
        while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
        lines.push(planFormatItem(status || 'todo', t));
        const w = planWriteLines(lines);
        if (!w || !w.ok) return { ok: false, error: (w && w.error) || '写入失败' };
        const p = planProgress();
        return { ok: true, index: p.total, text: t, status: status || 'todo' };
    }

    // 就地改一行的状态（保留其它行：注释、标题、自由文本都不动）
    function planSetLineStatus(lineNo, status) {
        const lines = planFileLines();
        const idx = lineNo - 1;
        if (idx < 0 || idx >= lines.length) return { ok: false, error: '第 ' + lineNo + ' 行不存在' };
        const it = parsePlanLine(lines[idx]);
        if (!it) return { ok: false, error: '第 ' + lineNo + ' 行不是计划条目' };
        lines[idx] = planFormatItem(status, it.text);
        const w = planWriteLines(lines);
        if (!w || !w.ok) return { ok: false, error: (w && w.error) || '写入失败' };
        return { ok: true, line: lineNo, status: status, text: it.text };
    }

    function planDeleteLine(lineNo) {
        const lines = planFileLines();
        const idx = lineNo - 1;
        if (idx < 0 || idx >= lines.length) return { ok: false, error: '第 ' + lineNo + ' 行不存在' };
        const it = parsePlanLine(lines[idx]);
        if (!it) return { ok: false, error: '第 ' + lineNo + ' 行不是计划条目' };
        lines.splice(idx, 1);
        const w = planWriteLines(lines);
        if (!w || !w.ok) return { ok: false, error: (w && w.error) || '写入失败' };
        return { ok: true, text: it.text, line: lineNo };
    }

    function planClear() {
        const w = VirtualFS.write(SYS_PLAN_PATH, PLAN_HEADER);
        if (!w || !w.ok) return { ok: false, error: (w && w.error) || '清空失败' };
        planTouched();
        return { ok: true, removed: 0 };
    }

    // 序号（1 起）/ 文字片段 / `last`（刚加的那条）→ 唯一条目
    function planFindItem(ref) {
        const p = planProgress();
        const s = String(ref == null ? '' : ref).trim().replace(/^["'“”]|["'“”]$/g, '');
        if (!s) return { error: '缺少条目：给序号（plan done 2）、`last`（最后一条）或文字片段（plan done 改造出站）' };
        // 2.13.0 `last`：`plan add X` 与 `plan done …` 同批时序号要等回执才知道，
        // 于是同批里根本标不准。`last` 直接指**当前最后一条**（含同批刚 plan add 的那条）。
        if (/^(last|最后|最后一条|末尾|末条|新加的?)$/i.test(s)) {
            if (!p.items.length) return { error: '计划还是空的，没有「最后一条」' };
            return { item: p.items[p.items.length - 1] };
        }
        if (/^\d+$/.test(s)) {
            const n = parseInt(s, 10);
            const hit = p.items.filter(function (i) { return i.index === n; })[0];
            if (!hit) return { error: '没有第 ' + n + ' 条（当前共 ' + p.total + ' 条）' };
            return { item: hit };
        }
        const hits = p.items.filter(function (i) { return i.text.indexOf(s) !== -1; });
        if (!hits.length) return { error: '没有包含「' + s + '」的条目' };
        if (hits.length > 1) {
            return { error: '有 ' + hits.length + ' 条都包含「' + s + '」，请用序号：' + hits.map(function (i) { return i.index; }).join(' / ') };
        }
        return { item: hits[0] };
    }

    // 面板里点一下状态符号 → 待完成 → 进行中 → 完成 → 待完成
    function cyclePlanItem(lineNo) {
        const p = planProgress();
        const it = p.items.filter(function (i) { return i.lineNo === lineNo; })[0];
        if (!it) return null;
        const next = PLAN_CYCLE[(PLAN_CYCLE.indexOf(it.status) + 1) % PLAN_CYCLE.length];
        const r = planSetLineStatus(lineNo, next);
        planTouched();
        return r.ok ? next : null;
    }

    /* ------------------------- 出站搭车：每轮附带计划与状态 ------------------------- */

    // 一行一条「符号 + 序号 + 文字」；给回执/面板/搭车块共用
    function planListText(max) {
        const p = planProgress();
        if (!p.total) return ['（计划还是空的：plan add <条目> 添加）'];
        const cap = Math.max(1, Number(max) || 12);
        const out = p.items.slice(0, cap).map(function (it) {
            return PLAN_SYMBOLS[it.status] + ' ' + it.index + '. ' + it.text;
        });
        if (p.total > cap) out.push('… 另有 ' + (p.total - cap) + ' 条（read ' + SYS_PLAN_PATH + ' 看全部）');
        return out;
    }

    // 计划模式开启时，每一条出站消息都搭车带上它（由 15-outbox 在合并点调用 → 并入同一条消息）
    function planOutboundText() {
        if (!isPlanModeActive()) return '';
        let cfg = {};
        try { cfg = getUiCfg() || {}; } catch (e) { cfg = {}; }
        if (cfg.planInject === false) return '';      // 设置里可关
        const p = planProgress();
        if (!p.total) return '';
        const cap = Math.max(1, Number(PLAN_INJECT_MAX_ITEMS) || 20);
        const lines = ['【当前计划】' + p.done + '/' + p.total + '（'
            + PLAN_SYMBOLS.done + ' 完成 ' + PLAN_SYMBOLS.doing + ' 进行中 ' + PLAN_SYMBOLS.todo + ' 待完成）'];
        for (const it of p.items.slice(0, cap)) lines.push(PLAN_SYMBOLS[it.status] + ' ' + it.index + '. ' + it.text);
        if (p.total > cap) lines.push('… 还有 ' + (p.total - cap) + ' 条（read ' + SYS_PLAN_PATH + '）');
        lines.push('（plan doing|done|todo <序号> 更新状态）');
        return lines.join('\n');
    }

    /* ------------------------- plan 命令 ------------------------- */

    function planSub(cmd) {
        const raw = String((cmd && cmd.path) || '').trim().toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, '');
        if (!raw) return '';
        return PLAN_SUB_ALIAS[raw] || raw;
    }

    // 会改计划的子命令：进幂等表（重发同一批 → SKIP，不会重复添加条目）
    function planIsMutating(cmd) {
        if (!cmd || cmd.op !== 'plan') return false;
        return ['on', 'off', 'add', 'done', 'doing', 'todo', 'del', 'clear'].indexOf(planSub(cmd)) !== -1;
    }

    // 计划模式的写操作白名单：唯一能写的就是计划文件本身，而且只放「内容写入」
    // （删除/移动/复制这类结构操作仍拦截，免得计划文件在计划过程中被弄丢）
    function isPlanFileCmd(cmd, cwd) {
        if (!cmd) return false;
        if (['write', 'append', 'edit', 'patch'].indexOf(cmd.op) === -1) return false;
        if (cmd.anchor) {
            try {
                const e = AnchorStore.get(cmd.anchor);
                if (e && e.path === SYS_PLAN_PATH) return true;
            } catch (err) {}
        }
        try { return resolvePathArg(cmd.path || '', cwd || '/') === SYS_PLAN_PATH; } catch (err) { return false; }
    }

    const PLAN_USAGE = 'plan on / plan off（仅用户）/ plan list / plan add <条目> / plan done|doing|todo <序号或文字> / plan del <序号或文字> / plan clear';

    function planResult(summary, extra) {
        // 只有「查看」类子命令才回显条目清单：plan add 连发 N 条时逐条回显全文会把回执撑爆
        // （容器实测：8 条 add → 计划全文被回显 8 次）。add/done/del 的 summary 已经写明动的是哪一条。
        const act = (extra && extra.planAction) || '';
        const withBody = act === 'list' || act === 'on';
        return Object.assign({
            ok: true, op: 'plan', path: SYS_PLAN_PATH, summary: summary,
            changes: [], structure: false, body: withBody ? planListText(CONFIG.PLAN_RECEIPT_MAX_ITEMS) : []
        }, extra || {});
    }

    function planFail(cmd, error, extra) {
        const p = planProgress();
        return fail(cmd, SYS_PLAN_PATH, error, Object.assign({
            kind: 'plan',
            detail: planListText(6),
            fix: p.total ? ('当前 ' + p.total + ' 条；用法：' + PLAN_USAGE) : ('用法：' + PLAN_USAGE)
        }, extra || {}));
    }

    function doPlan(cmd) {
        const sub = planSub(cmd);
        const arg = (cmd.args || []).join(' ').trim();
        const p = planProgress();
        const active = isPlanModeActive();

        if (!sub || sub === 'list') {
            return planResult('plan list → ' + p.total + ' 条（'
                + PLAN_SYMBOLS.done + p.done + ' ' + PLAN_SYMBOLS.doing + p.doing + ' ' + PLAN_SYMBOLS.todo + p.todo + '）'
                + (active ? ' · 计划模式已开启' : ''), { planAction: 'list' });
        }
        if (sub === 'on') {
            if (active) return planResult('plan on → 计划模式本来就开着（写操作仍被拦截）', { planAction: 'on' });
            enterPlanMode('ai');
            return planResult('plan on → 已进入计划模式：写操作被拦截，只有 ' + SYS_PLAN_PATH + ' 能写', { planAction: 'on' });
        }
        if (sub === 'off') {
            if (!active) return planResult('plan off → 当前不在计划模式（写操作本来就放行）', { planAction: 'off' });
            return planFail(cmd, '退出计划模式需要用户确认（AI 不能自己放开写操作闸门）', {
                fix: '请用户点面板「计划」→ 退出计划；需要用户拍板就写 ■ 需要你确认：是否退出计划模式开始改文件'
            });
        }
        if (sub === 'add') {
            if (!arg) return planFail(cmd, 'plan add 缺少条目文字', { fix: 'plan add 改造出站节奏器' });
            const r = planAdd(arg, 'todo');
            if (!r.ok) return planFail(cmd, r.error);
            return planResult('plan add → ' + PLAN_SYMBOLS.todo + ' 第 ' + r.index + ' 条「' + r.text + '」', { planAction: 'add' });
        }
        if (sub === 'clear') {
            const r = planClear();
            if (!r.ok) return planFail(cmd, r.error);
            return planResult('plan clear → 已清空（当前 0 条）', { planAction: 'clear' });
        }
        if (['done', 'doing', 'todo', 'del'].indexOf(sub) >= 0) {
            if (!arg) return planFail(cmd, 'plan ' + sub + ' 缺少序号或文字片段', { fix: 'plan ' + sub + ' 2 · plan ' + sub + ' last（最后一条）· plan ' + sub + ' 改造出站' });
            const f = planFindItem(arg);
            if (f.error) return planFail(cmd, f.error);
            const it = f.item;
            if (sub === 'del') {
                const r = planDeleteLine(it.lineNo);
                if (!r.ok) return planFail(cmd, r.error);
                return planResult('plan del → 已删除第 ' + it.index + ' 条「' + it.text + '」（剩 ' + (p.total - 1) + ' 条）', { planAction: 'del' });
            }
            const st = sub === 'done' ? 'done' : (sub === 'doing' ? 'doing' : 'todo');
            const r = planSetLineStatus(it.lineNo, st);
            if (!r.ok) return planFail(cmd, r.error);
            return planResult('plan ' + sub + ' → ' + PLAN_SYMBOLS[st] + ' ' + PLAN_LABELS[st] + '：第 ' + it.index + ' 条「' + it.text + '」', { planAction: sub });
        }
        return planFail(cmd, '未知的 plan 子命令「' + (cmd.path || '') + '」');
    }

/* >>> 20-ckpt.js */
    /* =========================================================================
     * 20 检查点与恢复（§5 R7）
     *   每 N 批 / 每次 atomic 成功写检查点：进度 + 工作集摘要 + 阶梯状态
     *   刷新/崩溃后 load() 回读，面板可见；文件树与撤销栈本身已持久化，
     *   检查点补的是「进度与工作集摘要」，让 AI 不必从零重来。
     * ====================================================================== */

    const Ckpt = (function () {
        let data = null;
        let dirtyCount = 0;

        function key() { return CKPT_PREFIX + currentConversationKey(); }

        function build(reason) {
            const files = [];
            let bytes = 0;
            const walk = function (node, prefix, depth) {
                if (depth > 3 || files.length > 200) return;
                for (const name of Object.keys(node.children || {})) {
                    const c = node.children[name];
                    const p = prefix + name;
                    if (c.type === 'dir') { walk(c, p + '/', depth + 1); continue; }
                    if (INTERNAL_PREFIXES.some(function (x) { return p.indexOf(x) === 0; })) continue;
                    const raw = String(c.content == null ? '' : c.content);
                    const rawBytes = byteLen(raw);
                    bytes += rawBytes;
                    files.push({ path: p, lines: raw.split('\n').length, bytes: rawBytes });
                }
            };
            walk(VirtualFS.root, '/', 1);
            files.sort(function (a, b) { return b.bytes - a.bytes; });
            const idx = VirtualFS.undoIdx();
            return {
                v: 1,
                at: Date.now(),
                reason: reason || 'auto',
                conv: currentConversationKey(),
                cwd: DSW.state.cwd ? DSW.state.cwd() : '/',
                files: files.slice(0, 12),
                totalFiles: files.length,
                totalBytes: bytes,
                undo: { cursor: idx.cursor, first: idx.first, last: idx.last },
                batches: (typeof gateSummary === 'function' ? gateSummary().total : 0), errors: (typeof failCounts !== 'undefined' ? Object.keys(failCounts).length : 0),
                anchors: AnchorStore.size(),
                outbox: outbox.parts.length
            };
        }

        function persist(reason) {
            data = build(reason);
            Store.set(key(), data);
            dirtyCount = 0;
            return data;
        }

        return {
            load() {
                data = Store.get(key(), null);
                return data;
            },
            get() { return data; },
            summary() {
                if (!data) return null;
                return {
                    at: data.at, reason: data.reason, cwd: data.cwd,
                    files: data.totalFiles, bytes: data.totalBytes,
                    batches: data.batches, errors: data.errors,
                    top: (data.files || []).slice(0, 3).map(function (f) { return f.path + '(' + f.lines + 'L)'; })
                };
            },
            // 每 N 批写一次；atomic 成功立即写
            tick(reason, force) {
                dirtyCount++;
                if (force || dirtyCount >= 5) return persist(reason);
                return null;
            },
            save(force) { return persist(force ? 'pagehide' : 'manual'); },
            reset() { Store.del(key()); data = null; dirtyCount = 0; },
            text() {
                const s = this.summary();
                if (!s) return '本会话暂无检查点';
                return [
                    '检查点 ' + fmtClock(s.at) + '（' + s.reason + '）',
                    '批次 ' + s.batches + '　错误 ' + s.errors,
                    '文件 ' + s.files + ' / ' + fmtSize(s.bytes) + '　cwd=' + s.cwd,
                    '主要文件：' + (s.top.length ? s.top.join('、') : '（无）')
                ].join('\n');
            }
        };
    })();

/* >>> 13b-notify.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const TERMINATE_SCAN_TAIL = 400;

    /* =========================================================================
     * 13b 收尾符号 / 终止符号（§9.3）
     *
     *   ◆  回复结束符：AI 每条回复的最后一行写它。
     *      它是「这条回复真的说完了」的正向信号 —— 不必再靠平台流式标记 /
     *      「停止生成」按钮 / 正文静止 1.2s 去猜（那些信号残留时原来要等 2 分钟）。
     *
     *   ■  终止符号：只在两种情况出现 ——
     *      ① 整个任务全部跑完（不是一轮对话结束）
     *      ② 需要用户介入（要授权 / 要选择 / 缺信息 / 卡住了）
     *      容器识别到它就让用户手机震动 / 响提示音（可在面板里单选或多选）。
     *
     * 两个符号都只认「回复尾部」：避免把 AI 写进文件正文里的符号当成信号。
     * ====================================================================== */

    // 符号常量在 01-config.js 定义（提示词/手册也要用）；这里直接用，不重复声明

    // 符号后面允许跟的「噪声」（标点 / markdown 强调 / 空白 / 右括号）
    const TAIL_NOISE_RE = /[\s。.．,，、！!？?;；:：*`_~\-—–·•‘’“”"'）)】\]》」』]/;

    function scanTail() { return Math.max(0, Number(TERMINATE_SCAN_TAIL) || 400); }

    function stripTailNoise(text) {
        let i = text.length;
        while (i > 0 && TAIL_NOISE_RE.test(text.charAt(i - 1))) i--;
        return text.slice(0, i);
    }

    // 文本末尾（忽略尾随标点）是不是某个符号
    function tailMark(text) {
        const t = String(text == null ? '' : text);
        if (!t) return '';
        const body = stripTailNoise(t);
        for (const m of END_MARKS) {
            if (body.length >= m.length && body.slice(body.length - m.length) === m) return m;
        }
        if (body.length >= TERMINATE_MARK.length && body.slice(body.length - TERMINATE_MARK.length) === TERMINATE_MARK) return TERMINATE_MARK;
        return '';
    }

    // #4 终止符号：只看回复尾部若干字符，取「最靠下的一条以 ■ 开头的行」（允许 > 引用与 ** 强调）
    const TERMINATE_LINE_RE = /^[>*`_\-—\s]*■\s*/;

    function findTerminate(text) {
        const t = String(text == null ? '' : text);
        const cut = scanTail();
        const tail = t.length > cut ? t.slice(t.length - cut) : t;
        const lines = tail.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const raw = lines[i];
            const line = raw.replace(/^\s+/, '').replace(/\s+$/, '');
            if (!line) continue;
            const m = TERMINATE_LINE_RE.exec(line);
            if (!m) continue;
            const reason = line.slice(m[0].length).replace(/[\s*`_]+$/, '').trim();
            return { mark: TERMINATE_MARK, reason: reason, line: line, kind: classifyTerminate(reason) };
        }
        return null;
    }

    // 终止原因分类：① 任务全部跑完 ② 需要用户介入（认不出来时按「需要你介入」提醒，宁可多提醒不漏）
    const DONE_RE = /(全部|所有|整个|都|已).{0,8}(完成|跑完|做完|搞定|结束|完毕)|(任务|计划|工作).{0,6}(完成|结束|跑完|做完)|all\s+(tasks?\s+)?(done|complete)|finished|completed?\b/i;
    const NEED_RE = /介入|需要你|需要用户|请你|等你|你决定|你确认|确认|选择|授权|批准|输入|提供|指示|回答|卡住|阻塞|无法继续|不能继续|失败|报错|出错|冲突|need(s|ed)?\s+(your|user|human)|confirm|approve|blocked|input\s+required|manual\s+action/i;

    function classifyTerminate(reason) {
        const r = String(reason || '');
        if (!r) return 'unknown';
        const done = DONE_RE.test(r);
        const need = NEED_RE.test(r);
        if (need && !done) return 'need';
        if (done && !need) return 'done';
        if (need) return 'need';
        if (done) return 'done';
        return 'unknown';
    }

    // #6 终止符可信性：尾部挂着未闭合的执行域时，这个 ■ 不可信 ——
    //     多半是 AI 正写到一半（正文里恰好有 ■），此时按终止符处理会「不执行半截、却先暂停」。
    //     判据与「这条回复说完了吗」共用同一个解析结果：parseMessage().unclosedDomains。
    function terminateTrusted(text) {
        try {
            const parsed = parseMessage(String(text == null ? '' : text));
            if (parsed && parsed.unclosedDomains) return { ok: false, why: 'unclosed' };
        } catch (e) { /* 解析异常按可信处理（宁可提醒，不漏报） */ }
        return { ok: true, why: '' };
    }

    // #3/#4 一次性解析这条回复的两个符号（有快速路径：正文里没有这两个字符就直接返回）
    function detectMarks(text) {
        const t = String(text == null ? '' : text);
        const out = { end: false, endMark: '', terminate: null };
        if (!t) return out;
        let has = false;
        for (const m of END_MARKS) if (t.indexOf(m) !== -1) { has = true; break; }
        if (!has && t.indexOf(TERMINATE_MARK) === -1) return out;
        const tm = tailMark(t);
        const term = findTerminate(t);
        out.endMark = tm;
        out.end = tm !== '' || term !== null;
        out.terminate = term;
        return out;
    }

    // 「这条回复说完了」的正向信号（◆ 结尾，或尾部有 ■ 终止行）
    function hasReplyEndMark(text) {
        return detectMarks(text).end;
    }

    /* ------------------------- 提醒：一次短震 + 一个 ding -------------------------
     * 曾经有三种震动模式 × 三种提示音色 + 组合描述 + 「哪部分没生效」的失败分类。
     * 实测没人会去调它；而 WebAudio 在 iOS 上必须先有用户手势，第一次触发常常静默失败 ——
     * 那套失败分类其实是在给一个不可靠子系统找补。现在只留：
     *   一次短震 navigator.vibrate([200]) + 一个 880Hz / 0.18s 的 ding；
     *   两项各自可关（notifyVibrate / notifySound），失败只 pushLog 一行。
     * ====================================================================== */

    const notifyState = { count: 0, lastAt: 0, last: null };

    function resetNotifyState() {
        notifyState.count = 0;
        notifyState.lastAt = 0;
        notifyState.last = null;
    }

    function vibrateShort() {
        try {
            if (typeof navigator === 'undefined' || !navigator || typeof navigator.vibrate !== 'function') return false;
            return navigator.vibrate([200]) !== false;
        } catch (e) { return false; }
    }

    function beepDing() {
        try {
            const w = (typeof window !== 'undefined' && window) || null;
            const AC = w && (w.AudioContext || w.webkitAudioContext);
            if (!AC) return false;
            const ctx = new AC();
            try { if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume(); } catch (e) {}
            const at = (typeof ctx.currentTime === 'number' ? ctx.currentTime : 0) + 0.02;
            const dur = 0.18;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            if (gain.gain.setValueAtTime) {
                gain.gain.setValueAtTime(0.0001, at);
                gain.gain.exponentialRampToValueAtTime(0.25, at + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
            }
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(at);
            osc.stop(at + dur + 0.02);
            setTimeout(function () { try { if (ctx.close) ctx.close(); } catch (e) {} }, 700);
            return true;
        } catch (e) { return false; }
    }

    // #4 提醒：两项各自独立 —— 可同开、可只开一项、可全关（全关时只留状态条与日志）
    function fireReminder(kind, reason) {
        let cfg = {};
        try { cfg = getUiCfg() || {}; } catch (e) { cfg = {}; }
        const wantVibrate = cfg.notifyVibrate !== false;
        const wantSound = cfg.notifySound !== false;
        const out = {
            kind: kind || 'unknown', reason: reason || '',
            wantVibrate: wantVibrate, wantSound: wantSound,
            vibrate: wantVibrate ? vibrateShort() : false,
            sound: wantSound ? beepDing() : false
        };
        notifyState.count++;
        notifyState.lastAt = Date.now();
        notifyState.last = out;
        return out;
    }

    // 一行说清这次提醒到底响了没有（不做「哪部分没生效」的细分）
    function reminderText(r) {
        if (!r) return '';
        const parts = [];
        if (r.wantVibrate && r.vibrate) parts.push('震动');
        if (r.wantSound && r.sound) parts.push('提示音');
        if (parts.length) return parts.join(' + ');
        if (!r.wantVibrate && !r.wantSound) return '已关掉震动与提示音';
        return '提醒未生效（设备不支持或页面还没被点过）';
    }

    // 展示用原因：去掉与标题重复的开头，避免出现「AI 需要你介入：需要你确认：…」「任务全部完成：任务全部完成」
    // （原始原因仍完整保存在 notifyState.last.reason，便于排查）
    function displayReason(kind, reason) {
        let r = String(reason || '').trim();
        if (!r) return '';
        r = r.replace(/^(请|需要你|要你|需要用户|请你)\s*(介入|确认|选择|决定|授权|批准|输入|提供|指示|回复|注意)?\s*[：:，,、\-—]*\s*/, '');
        r = r.replace(/^(任务|工作|计划)?\s*(全部|所有|都|已经|已)?\s*(完成|跑完|做完|写完|写好|搞定|结束|完毕)[了。！!]*\s*[，,、\-—:：]*\s*/, '');
        r = r.trim();
        if (kind === 'done' && !r) return '';
        return r;
    }

    // #4 识别到终止符号：留痕 + 状态条 + 浮层 + 提醒（一次短震 / 一个 ding）
    function notifyTerminate(term) {
        const t = term || {};
        const kind = t.kind || 'unknown';
        const reason = String(t.reason || '');
        const shown = displayReason(kind, reason);
        const title = kind === 'done' ? '任务全部完成' : (kind === 'need' ? 'AI 需要你介入' : 'AI 报告任务终止');
        const r = fireReminder(kind, reason);
        const note = reminderText(r);
        if (note && /未生效|已关掉/.test(note)) pushLog('提醒：' + note, 'warn');
        pushLog('识别到终止符号 ' + TERMINATE_MARK + '（' + title + (shown ? '：' + shown : '') + '）· 提醒：' + note, 'warn');
        setStatus('received', title + (shown ? '：' + shown : ''));
        try { showToast(title + (shown ? '：' + shown : ''), 'warn'); } catch (e) {}
        return r;
    }

    // 面板「测试提醒」：只试震动/提示音，不写状态条
    function tryReminder() {
        const r = fireReminder('test', '测试');
        const text = '提醒测试：' + reminderText(r);
        try { showToast(text, 'warn'); } catch (e) {}
        pushLog(text);
        return r;
    }

/* >>> 14-runtime.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const BOOT_GLOBAL_TTL_MS = 12 * 60 * 60 * 1000;   // #5 全局注入记录有效期（跨 URL 变更/刷新防重复注入）
    const BOOT_MAX_RETRY = 5;   // #6 「有时不注入」：允许更多次重试机会
    const BOOT_THREAD_SETTLE_MS = 1500;   // #6 页面刚加载时先等会话内容渲染，再判断是不是新对话
    const DEBOUNCE_MS = 1200;
    const GENERATING_CACHE_MS = 300;   // 「正在生成」判定的缓存（避免高频 querySelector）
    const GENERATING_MAX_HOLD_MS = 120000;   // 正文已静止这么久仍显示「生成中」→ 按误判放行（防永久停摆）
    const GENERATING_POLL_MS = 1200;   // 未结束时的复查间隔（自驱动，不依赖 DOM 继续变化）
    const MESSAGE_SETTLE_MS = 1200;   // 消息文本静止这么久才算「回复完了」
    const SETTLE_LOG_GAP_MS = 5000;   // 「还在输出」提示的最小间隔
    const SETTLE_MAX_CHECKS = 1500;   // 复查次数上限（约 30 分钟）防死循环

    /* =========================================================================
     * 14 运行时：DOM 观察 · 出生裁决 · 命令处理流水线 · 自检提示注入
     * ====================================================================== */

    let observer = null;
    let pendingTimer = null;
    let lastDomActivity = Date.now();     // 真实 DOM 活动时间戳（§9.2 闸3）
    const streamingEls = new Map();
    let processedText = new WeakMap();

    /* ---- 「已处理回复」账本（问题 A：重复投递 + 重复执行的**根因**修复） ----
     * 判重原来只认**元素身份**（WeakMap/WeakSet）。平台重渲染会换掉节点、刷新页面会清空 WeakMap：
     * 元素一变，同一条回复就被当成新回复 → 命令再执行一遍、回执再发一遍。
     * 容器实测：一条消息 3 份相同回执、plan add 累加 3 倍、旧批次回执被重放 —— 都是这一个根因。
     * 改成「内容身份」：按 (会话, 这条回复在消息列表里的下标) 记住最后处理过的**文本**与结论，
     * 元素换不换、页面刷没刷新都不影响；文本真的变长时增量逻辑照旧（它只依赖 seen.text 的前缀关系）。
     * allOk=false 的记录只在幂等窗口内判重：上一轮有错时允许重试，无错时同一条回复永不重跑。
     */
    let msgLedger = null;
    function ledgerLoad() {
        if (msgLedger) return msgLedger;
        try { msgLedger = Store.get(CONFIG.MSG_LEDGER_PREFIX + currentConversationKey(), null) || {}; }
        catch (e) { msgLedger = {}; }
        return msgLedger;
    }
    function ledgerGet(i) {
        const rec = ledgerLoad()[String(i)];
        return rec && typeof rec.text === 'string' ? rec : null;
    }
    function ledgerPut(i, rec) {
        const l = ledgerLoad();
        const prev = l[String(i)] || {};
        rec.at = Date.now();
        l[String(i)] = Object.assign(prev, rec);   // 合并：born / symbol / allOk 各写各的，别互相抹掉
        const keys = Object.keys(l);
        if (keys.length > 200) {
            keys.sort(function (a, b) { return (l[a].at || 0) - (l[b].at || 0); });
            for (let k = 0; k + 200 < keys.length; k++) delete l[keys[k]];
        }
        try { Store.set(CONFIG.MSG_LEDGER_PREFIX + currentConversationKey(), l); } catch (e) {}
        // P1：账本是「同一条回复不重跑」的唯一依据，丢了就可能重复执行命令 ——
        // 所以不走 60ms 防抖，写完立刻催一次落盘（其余会话状态照旧批量落盘）。
        try { SessionState.flushNow(); } catch (e) {}
    }
    let lastScanRoots = [];     // 上一次扫描到的消息元素
    let domContinued = false;   // 本次扫描是否与上次共享消息元素（＝平台就地重渲染，而不是整块换了新 DOM）
    function ledgerReset() { msgLedger = null; }
    let cwd = '/';                        // 会话工作目录
    let cleanRounds = 0;                  // 连续无错轮次（§3.7 稳态回执）
    let handling = false;
    // #1/#6 暂停：一个布尔 + 一个「原因」。两种暂停的表现完全一样（球变暂停样式、不执行、
    // 不回执、不搭车），但语义与恢复方式不同：
    //   'manual'    双击悬浮球手动暂停 —— 只有再双击才恢复（用户新消息不自动恢复）
    //   'terminate' 终止符 ■ 触发的自动暂停 —— 用户再发一条新消息即自动恢复（任务边界）
    let paused = false;
    let pauseReason = '';                 // '' | 'manual' | 'terminate'
    let pauseInfo = null;                 // { reason, kind, text, at, round, dropped }
    let roundSeq = 0;                     // 本轮（一次「识别并回执」）的序号：用于区分「本轮回执」与「本任务旧待回传」
    const scriptStartedAt = Date.now();   // 脚本加载时刻（等会话 DOM 渲染完的基准）

    // #3/#4 每条消息已处理过的符号文本（同一条文本只提醒一次，防重复震动）
    let symbolCare = new WeakMap();

    function resetRuntimeState() {
        paused = false;
        pauseReason = '';
        pauseInfo = null;
        DSW.state.paused = false;
        DSW.state.pauseReason = '';
        DSW.state.pauseInfo = null;
        try { seenUserEls = new WeakSet(); } catch (e) {}
        resetBirthState();
        processedText = new WeakMap();
        symbolCare = new WeakMap();
        streamingEls.clear();
        cleanRounds = 0;
        cwd = '/';
        handling = false;
        stopSettleRecheck();
        settleChecks = 0;
        settleLogAt = 0;
        settleHoldWarned = false;
        genCache = { at: 0, val: false };
        try { resetManualFeed(); } catch (e) {}
        resetConvTrack();
    }

    /* ------------------------- #3 会话切换 / 新建对话 → 自动初始化 -------------------------
     * 三种情形分开对待（判据是「会话键」= URL 里的会话 id）：
     *   ① / → /a/chat/s/<id>：新对话刚拿到 id，**同一个**对话，只把状态迁移过去；
     *   ② 变成另一个会话 id：切换对话 → 会话级运行时状态全部初始化（文件系统与设置不动）；
     *   ③ 新对话页（URL 里没有 id）且消息区从「有内容」变成「空」：原地新建对话 → 初始化，
     *      并清掉上一轮新对话残留的注入记录 / 计划状态。
     * 每次初始化都会丢弃「属于别的会话的待回传」——回执发到另一个对话只会造成混乱。
     * ------------------------------------------------------------------------------ */

    let convTrack = { key: '', sawMessages: false };

    function resetConvTrack() { convTrack = { key: '', sawMessages: false }; }

    function noteConvMessages() {
        if (convTrack.sawMessages) return;
        if (hasExistingUserMessages() || hasAssistantMessages()) convTrack.sawMessages = true;
    }

    // 只重置「属于某个会话」的东西：暂停状态 / 设置 / 文件系统 / 出站节奏器都保留
    function resetConversationRuntime(reason) {
        cwd = '/';
        processedText = new WeakMap();
        symbolCare = new WeakMap();
        streamingEls.clear();
        cleanRounds = 0;
        handling = false;
        stopSettleRecheck();
        settleChecks = 0;
        settleLogAt = 0;
        settleHoldWarned = false;
        genCache = { at: 0, val: false };
        resetBirthState();
        bootScanCache = { at: 0, val: false };
        bootFallbackKey = '';
        try { composerCache = { el: null, at: 0 }; } catch (e) {}
        ledgerReset();
        try { resetManualFeed(); } catch (e) {}    // 投喂层：微课轮播计数与补课冷却都是按会话的，跟着归零
        try { resetComposerSentinels(); } catch (e) {}   // 3.2：哨兵残留会凭上一个会话的输入框误判一次 composer-emptied
        try { Ckpt.load(); } catch (e) {}          // 检查点也是按会话存的：读回新会话那一份
        pushLog('会话状态已初始化（' + reason + '）：cwd=/，锚点/幂等/阶梯按会话各自计');
    }

    // 同一个对话只是 URL 补上了 id：把会话级状态搬过去（计划、待回传标签）
    function migrateConversationState(fromKey, toKey) {
        try {
            const p = Store.get(PLAN_STORE_PREFIX + fromKey, null);
            if (p) { Store.set(PLAN_STORE_PREFIX + toKey, p); Store.del(PLAN_STORE_PREFIX + fromKey); }
        } catch (e) {}
        try { retagParts(fromKey, toKey); } catch (e) {}
    }

    function freshConversation(reason) {
        const key = convTrack.key;
        // 新建的新对话：上一个会话的待回传一条都不留；切到另一个已有会话：只丢不属于它的
        try {
            if (key === 'root') dropAllParts(reason); else dropForeignParts(key, reason);
        } catch (e) {}
        if (key === 'root') {
            let wasPlan = false;
            try { wasPlan = isPlanModeActive(); } catch (e) {}
            try { Store.del(PLAN_STORE_PREFIX + 'root'); } catch (e) {}
            try { resetBootstrapState(); } catch (e) {}       // 新对话要重新注入协议
            uiState.planExpanded = false;
            if (wasPlan) pushLog('新对话：计划模式已关闭（计划内容在 ' + SYS_PLAN_PATH + '，容器文件跨对话共享）');
        }
        resetConversationRuntime(reason);
        try { renderPlanBar(); } catch (e) {}
        refreshUI();
        setStatus('idle', '新对话：状态已初始化', { autoHide: 6000 });
    }

    function checkConversationSwitch() {
        let key = '';
        try { key = currentConversationKey(); } catch (e) { return false; }
        if (!convTrack.key) { convTrack.key = key; noteConvMessages(); return false; }
        if (key === convTrack.key) {
            // URL 没变（已在新对话页）：靠「消息区从有内容变空」识别又新建了一次
            if (convTrack.sawMessages && key === 'root' && !hasExistingUserMessages() && !hasAssistantMessages()) {
                convTrack.sawMessages = false;
                freshConversation('原地新建对话');
                return true;
            }
            noteConvMessages();
            return false;
        }
        const old = convTrack.key;
        convTrack.key = key;
        if (old === 'root' && key !== 'root') {
            migrateConversationState(old, key);
            noteConvMessages();
            pushLog('会话 URL 已补上 id（' + key + '）：状态已接管，不重复注入');
            return false;
        }
        convTrack.sawMessages = false;
        freshConversation(old === 'root' ? '新建对话' : '切换到另一个会话');
        noteConvMessages();
        return true;
    }

    /* ------------------------- 消息发现 ------------------------- */

    function findMessageRoots() {
        let candidates = [];
        try { candidates = Array.from(document.querySelectorAll(PLATFORM.msgSelector)); } catch (e) { candidates = []; }
        if (!candidates.length) return [];
        return candidates.filter(function (el) {
            for (const other of candidates) if (other !== el && other.contains(el)) return false;
            return true;
        });
    }

    /* ---- 渲染文本的「保空白」取法（本轮实测的 A3/A4 根因） ----
     * innerText 是**按渲染结果**取文本：浏览器的 CSS 空白折叠会把每行行首的空白整段吃掉
     * （`    four` → `four`，`a\n  b` → `a\nb`，tab 同样被吞）。而手册 §4 明确承诺定界正文
     * 「内容原样保留（缩进/空行/代码块都安全）」—— 用 innerText 时这条承诺是假的：
     * write 的缩进在进入解析器之前就没了；edit 因此永远精确匹配失败 → 走模糊匹配 → 手写缩进被改成顶格。
     * 这里自己走 DOM：文本节点原样取，<br> 换行，块级元素前后补换行，行尾 CR 归一。
     */
    // BUTTON：平台给每个代码块都挂「复制/下载」，按钮文字永远不是消息正文的一部分（最后一道网）
    const TEXT_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, CANVAS: 1, TEXTAREA: 1, BUTTON: 1 };
    const TEXT_BLOCK_TAGS = {
        P: 1, DIV: 1, LI: 1, UL: 1, OL: 1, TR: 1, TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1,
        H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, PRE: 1, BLOCKQUOTE: 1, SECTION: 1, ARTICLE: 1,
        HEADER: 1, FOOTER: 1, MAIN: 1, ASIDE: 1, NAV: 1, FIGURE: 1, FIGCAPTION: 1, DL: 1, DT: 1, DD: 1,
        HR: 1, FORM: 1, DETAILS: 1, SUMMARY: 1, ADDRESS: 1, FIELDSET: 1, CAPTION: 1
    };

    /* ---- 代码块「外壳」的识别（A3/A4 终诊三） ----
     * 平台渲染代码块的真实结构是包裹层，语言标签与按钮在 <pre> **之外**：
     *   <div class="code-block"><div class="code-header">python<button>复制</button><button>下载</button></div>
     *     <pre><code>def __init__(self):\n    pass</code></pre></div>
     * 只在 <pre> 内部拦截（上一轮的 fix①）会漏掉外壳：walk 先走 header，读回的正文首行会变成
     * 「python / 复制 / 下载」，write 就把这些垃圾写进文件。这里在包裹层上一次性取走代码正文、整层跳过。
     */
    const CODE_WRAP_RE = /(?:^|[\s_-])(?:code[\s_-]?(?:block|wrap(?:per)?|body|area)|md[\s_-]?code|markdown[\s_-]?code)(?:$|[\s_-])/i;
    const CODE_WRAP_WEAK_RE = /(?:^|[\s_-])(?:highlight(?:[\s_-]?source)?|hljs|syntax[\s_-]?highlight)(?:$|[\s_-])/i;
    const CODE_CHROME_RE = /(?:^|[\s_-])(?:code[\s_-]?(?:header|title|toolbar|lang)|lang(?:uage)?(?:[\s_-]?label)?|copy(?:[\s_-]?(?:btn|button))?|download)(?:$|[\s_-])/i;

    function classOf(el) {
        try {
            const c = el && el.className;
            if (typeof c === 'string') return c;
            if (c && typeof c.baseVal === 'string') return c.baseVal;   // SVG 的 className
        } catch (e) {}
        try { const a = el && el.getAttribute && el.getAttribute('class'); if (typeof a === 'string') return a; } catch (e) {}
        return '';
    }

    /* 该节点内部的代码正文元素（可能是它自己）。没有 textContent 的（老测试夹具）返回 null。 */
    function codeBodyOf(el) {
        try {
            if (!el || !el.querySelector) return null;
            const pre = el.querySelector('pre');
            if (pre) {
                let inner = pre;
                try { inner = pre.querySelector('code') || pre; } catch (e) { inner = pre; }
                return (typeof inner.textContent === 'string') ? inner : null;
            }
            if (String(el.tagName || '').toUpperCase() === 'CODE') return el;
        } catch (e) {}
        return null;
    }

    /* pre/code 是否落在**本节点的直接子代**上：代码若藏在某个子元素里，本节点就不是外壳，交给子元素处理。
     * 这条把「整条消息容器」排除掉：只有紧包着代码块的壳才可能被当成代码块。 */
    function ownsCodeDirect(el) {
        const kids = (el && el.childNodes) || [];
        for (let i = 0; i < kids.length; i++) {
            const k = kids[i];
            if (!k || k.nodeType !== 1) continue;
            const t = String(k.tagName || '').toUpperCase();
            if (t === 'PRE' || t === 'CODE') return true;
            if (codeBodyOf(k)) return false;   // 代码在更深的子元素里 → 本节点不是外壳
        }
        return false;
    }

    /* 去掉代码正文后，剩下的必须只是「外壳」：纯 ASCII 短标签（python / JavaScript / C++ / text），
     * 或语言标签 + 复制/下载/运行 这类外壳词。中文正文（如「看这段」）不会被误判成外壳。 */
    function codeChromeOnly(el, body) {
        const all = (typeof el.textContent === 'string') ? el.textContent : '';
        if (!all) return false;
        const rest = all.split(body.textContent).join('').replace(/\s+/g, ' ').trim();
        if (!rest) return true;
        const left = rest.replace(/(复制代码|复制链接|复制|下载|运行|编辑|展开|折叠|Copy|Download|Run|Edit|Try it|Code)/g, '').trim();
        if (!left) return true;
        return left.length <= 24 && /^[\x20-\x7E]+$/.test(left);
    }

    function isCodeWrapper(el) {
        const body = codeBodyOf(el);
        if (!body || !ownsCodeDirect(el)) return false;
        const cls = classOf(el);
        if (cls && CODE_WRAP_RE.test(cls)) return true;
        if (cls && CODE_WRAP_WEAK_RE.test(cls)) return codeChromeOnly(el, body);
        try {
            if (el.querySelector && el.querySelector('button,[role="button"]')) return codeChromeOnly(el, body);
        } catch (e) {}
        return false;
    }

    function renderedText(root) {
        let out = '';
        const breakBlock = function () { if (out && !out.endsWith('\n')) out += '\n'; };
        const walk = function (n, depth) {
            if (!n || depth > 60) return;
            const kids = n.childNodes || [];
            for (let i = 0; i < kids.length; i++) {
                const child = kids[i];
                if (!child) continue;
                if (child.nodeType === 3) { out += child.nodeValue || ''; continue; }
                if (child.nodeType !== 1) continue;
                const tag = String(child.tagName || '').toUpperCase();
                // 代码块按**字面量**取（终诊二：平台在脚本读到之前就按 Markdown 渲染成 DOM ——
                // 围栏外的 `__init__`→`init`、行首缩进/`#`/`-`/`>` 在进 DOM 前就物理消失了；围栏内是字面量，原样保留）。
                // 取 textContent 而不再往下 walk：代码块里的「复制/下载」按钮文字、语言标签不会混进正文。
                if (tag === 'PRE') {
                    let node = child;
                    try { if (child.querySelector) node = child.querySelector('code') || child; } catch (e) { node = child; }
                    // 真实 DOM 一定有 textContent；没有的（老测试夹具）退回原来的递归，行为不变
                    if (typeof node.textContent === 'string') {
                        out += node.textContent;
                        if (!out.endsWith('\n')) out += '\n';
                        continue;
                    }
                }
                // 包裹层：语言标签/复制按钮在 <pre> 之外，必须整层取走代码正文再跳过
                if (tag !== 'CODE' && isCodeWrapper(child)) {
                    const body = codeBodyOf(child);
                    if (body) {
                        out += body.textContent;
                        if (!out.endsWith('\n')) out += '\n';
                        continue;
                    }
                }
                // 外壳里的语言标签 / 工具栏本身（内部没有代码）：整块跳过，别把「python / 复制」当正文
                if (CODE_CHROME_RE.test(classOf(child)) && !codeBodyOf(child)) continue;
                if (TEXT_SKIP_TAGS[tag]) continue;
                if (tag === 'BR') { out += '\n'; continue; }
                const block = !!TEXT_BLOCK_TAGS[tag];
                if (block) breakBlock();
                walk(child, depth + 1);
                if (block) breakBlock();
            }
        };
        walk(root, 0);
        return out.replace(/\r\n?/g, '\n');
    }

    function nonEmptyLineCount(s2) {
        let n = 0;
        for (const l of String(s2 == null ? '' : s2).split('\n')) if (l.trim()) n++;
        return n;
    }

    function extractFullText(el) {
        let rich = '';
        try { rich = renderedText(el); } catch (e) { rich = ''; }
        let inner = '';
        try { inner = el.innerText; } catch (e) { inner = ''; }
        if (typeof inner !== 'string') inner = '';
        // 没有 innerText（无头环境 / 测试 DOM）：直接用保空白版本
        if (!inner.trim()) return rich || (el.textContent || '');
        if (!rich.trim()) return inner;
        // 安全闸：innerText 不含不可见节点，rich 会含。rich 多出行 = 大概率混进了隐藏/重复节点
        // （例如平台另存的一份原文），那种情况宁可退回 innerText，绝不把重复内容喂给解析器。
        if (nonEmptyLineCount(rich) > nonEmptyLineCount(inner)) return inner;
        return rich;
    }

    function isUserMessage(el) {
        const role = el.getAttribute && (el.getAttribute('data-role') || el.getAttribute('data-message-author-role') || el.getAttribute('data-message-role'));
        if (role === 'user') return true;
        if (role === 'assistant') return false;
        const cls = (el.className && el.className.toString ? el.className.toString() : '').toLowerCase();
        return /\buser\b/.test(cls) && !/assistant/.test(cls);
    }

    function isInThinkingRegion(el) {
        let cur = el, depth = 0;
        while (cur && depth < CONFIG.THINKING_MAX_DEPTH) {
            const cls = (cur.className && cur.className.toString ? cur.className.toString() : '').toLowerCase();
            if (/think|reason|thought/.test(cls)) return true;
            if (cur.dataset && (cur.dataset.thinking === 'true' || cur.dataset.reasoning)) return true;
            const kids = cur.children;
            if (kids) {
                for (let i = 0; i < Math.min(3, kids.length); i++) {
                    const text = (kids[i].textContent || '').trim().slice(0, 20);
                    if (/已深度思考|深度思考|Thinking|思考中/.test(text)) return true;
                }
            }
            cur = cur.parentElement;
            depth++;
        }
        return false;
    }

    function looksLikeLastMessage(el) {
        const roots = findMessageRoots();
        if (!roots.length) return true;
        let lastAssistant = null;
        for (const r of roots) {
            if (isUserMessage(r)) continue;
            if (isInThinkingRegion(r)) continue;
            lastAssistant = r;
        }
        if (!lastAssistant) return true;
        if (lastAssistant === el || lastAssistant.contains(el) || el.contains(lastAssistant)) return true;
        return false;
    }

    function markStreaming(el, text) {
        const now = Date.now();
        const info = streamingEls.get(el) || { lastAt: 0, lastLen: 0, text: null, changedAt: 0, seen: 0 };
        if (info.text !== text) {          // 文本变了 → 记「最后变化时刻」（判定回复是否已静止）
            info.text = text;
            info.changedAt = now;
        }
        info.lastAt = now;                 // 「最后一次看到」（DOM 活动代理）
        info.lastLen = text.length;
        info.seen = (info.seen || 0) + 1;
        streamingEls.set(el, info);
        if (streamingEls.size > 50) {
            const arr = Array.from(streamingEls.entries()).sort(function (a, b) { return a[1].lastAt - b[1].lastAt; });
            for (let i = 0; i < arr.length - 50; i++) streamingEls.delete(arr[i][0]);
        }
    }

    /* --------- 「AI 还在输出吗」/「这条回复输出完了吗」（§9.2 闸3 加强） ---------
     * 目的有两个，都不能少：
     *   ① 不执行半截命令：流式输出到一半就出现 ```dsw 开标记时，正文/闭标记还没到，
     *      此时执行会写进半截正文，甚至把「未闭合」的误判回执发出去；
     *   ② 不打断 AI 生成：生成中点「发送」会中断这次回答（各平台一致）。
     */

    function isVisibleEl(el) {
        try {
            if (el.getClientRects) return el.getClientRects().length > 0;
            if ('offsetParent' in el) return el.offsetParent !== null;
        } catch (e) {}
        return true;
    }

    // 消息元素自身或最近祖先上是否带「正在流式输出」标记
    function hasStreamMarker(el) {
        let cur = el, depth = 0;
        // 用 STREAM_MARKER_MAX_DEPTH（6）而不是 THINKING_MAX_DEPTH（25）：
        // 后者是「思考区」判定要的深搜，拿来做流式标记会一路走到 body，
        // 页面上任何一个残留的 streaming/generating 类名都会被算成「还在输出」——
        // 正是 STREAM_MARKER_MAX_DEPTH 的注释要避免的那件事。
        while (cur && depth < CONFIG.STREAM_MARKER_MAX_DEPTH) {
            const ds = cur.dataset || {};
            if (ds.isStreaming === 'true' || ds.isStreaming === '1' || ds.streaming === 'true' || ds.streaming === '1') return true;
            if (cur.getAttribute && (cur.getAttribute('data-is-streaming') === 'true' || cur.getAttribute('data-streaming') === 'true')) return true;
            const cls = (cur.className && cur.className.toString) ? cur.className.toString() : '';
            if (cls && STREAM_CLASS_RE.test(cls)) return true;
            cur = cur.parentElement;
            depth++;
        }
        return false;
    }

    // 输入框附近有没有「停止生成」按钮（生成中它的位置就在发送键那里）
    function hasStopControlNearComposer() {
        let btns = [];
        try { btns = collectNearbyButtons(); } catch (e) { btns = []; }
        for (const b of btns) {
            if (!isVisibleEl(b)) continue;
            let label = '';
            try { label = String(labelOf(b) || '').trim(); } catch (e) { label = ''; }
            if (label && STOP_LABEL_RE.test(label)) return true;
        }
        return false;
    }

    function hasGlobalStreamMarker() {
        for (const sel of STREAM_ATTR_SELECTORS) {
            try {
                const el = document.querySelector(sel);
                if (el && isVisibleEl(el)) return true;
            } catch (e) {}
        }
        return false;
    }

    let genCache = { at: 0, val: false };

    // 页面此刻是否正在生成回复（供「不执行半截」与「不打断」两处使用）
    function isGenerating() {
        const now = Date.now();
        if (genCache.at && now - genCache.at < GENERATING_CACHE_MS) return genCache.val;
        let val = false;
        try { val = hasStopControlNearComposer() || hasGlobalStreamMarker(); } catch (e) { val = false; }
        genCache = { at: now, val: val };
        return val;
    }

    // 这条回复是否已「输出完」：只有输出完才会进入识别/执行
    function isReplyComplete(el, text) {
        const info = streamingEls.get(el);
        if (!info) return false;                                     // ① 第一次看到：先记基线，下一轮稳了再说
        const changedAt = info.changedAt || 0;
        const quiet = changedAt ? Date.now() - changedAt : 0;
        const body = text == null ? String(info.text || '') : String(text);
        // #3 收尾符号（◆ 或 ■）：AI 给出的明确「我说完了」信号 ——
        // 只需一小段静止就认定说完，不再被平台流式标记 /「停止生成」残留拖着走。
        const marked = endSignalTrusted(body);
        const minQuiet = marked ? CONFIG.REPLY_END_SETTLE_MS : MESSAGE_SETTLE_MS;
        if (!changedAt || quiet < minQuiet) return false;             // ② 文本还在变
        if (marked) return true;                                      // ③ 有收尾符号 = 说完了
        const stream = hasStreamMarker(el);
        const generating = isGenerating();
        if (stream || generating) {
            // 防永久停摆：正文长时间完全静止却仍被判「生成中」，多半是标记/按钮误判 → 放行并留痕
            if (quiet < GENERATING_MAX_HOLD_MS) return false;
            if (!settleHoldWarned) {
                settleHoldWarned = true;
                pushLog('页面一直显示「生成中」，但正文已静止 ' + Math.round(quiet / 1000) + 's，按回复结束处理', 'warn');
            }
            return true;
        }                                                // ④ 元素/页面明确在生成
        return true;
    }

    // #3 收尾符号可信吗：符号在 → 还要确认 AI 不是正写到一半
    // （执行域未闭合 = 多半还在写 <<< 正文；正文恰好以 ◆/■ 结尾时不能当成「说完了」，
    //  否则会在流式中间执行半截命令、并发回执打断它）
    function endSignalTrusted(text) {
        if (!hasReplyEndMark(text)) return false;
        try {
            if (parseMessage(text).unclosedDomains) return false;
        } catch (e) {}
        return true;
    }

    // #3 最近一条 AI 回复是不是已经写了收尾符号（且文本已静止）——
    // 出站闸3 用它提前放行：「平台还在显示生成中」压不过 AI 明确的收尾信号。
    function replyMarkedDone() {
        try {
            const roots = findMessageRoots();
            for (let i = roots.length - 1; i >= 0; i--) {
                const el = roots[i];
                if (isUserMessage(el) || isInThinkingRegion(el)) continue;
                const info = streamingEls.get(el);
                if (!info || !info.changedAt) return false;
                if (Date.now() - info.changedAt < CONFIG.REPLY_END_SETTLE_MS) return false;
                return endSignalTrusted(extractFullText(el));
            }
        } catch (e) {}
        return false;
    }

    let settleTimer = null;
    let settleChecks = 0;
    let settleLogAt = 0;
    let settleHoldWarned = false;

    function stopSettleRecheck() {
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    }

    // 未输出完：不起任何副作用，安排一轮复查（不依赖 DOM 继续变化，思考期可能长时间无变更）
    function deferUntilReplySettled(reason) {
        const now = Date.now();
        if (now - settleLogAt > SETTLE_LOG_GAP_MS) {
            settleLogAt = now;
            pushLog('AI 还在输出，等这条回复完整结束再识别命令' + (reason ? '（' + reason + '）' : ''));
            setStatus('pending', '等 AI 回复结束');
        }
        if (settleTimer || paused) return;
        if (settleChecks >= SETTLE_MAX_CHECKS) return;
        settleTimer = setTimeout(function () {
            settleTimer = null;
            settleChecks++;
            try { processNewMessages(); } catch (e) { errlog('settle recheck threw:', e); }
        }, GENERATING_POLL_MS);
    }

    // §9.2 闸3：用真实 DOM 活动时间戳判定「AI 是否还在输出」
    function isAIStreaming() {
        const now = Date.now();
        if (replyMarkedDone()) return false;                                 // #3 AI 已写收尾符号：明确结束，优先于平台标记
        if (isGenerating()) return true;                                     // 平台明确在生成（最可靠）
        if (now - lastDomActivity < CONFIG.OUTBOX_STREAM_GUARD_MS) return true;
        for (const [el, info] of streamingEls) {
            if (!el.isConnected) continue;
            if (now - info.lastAt < CONFIG.OUTBOX_STREAM_GUARD_MS) return true;
        }
        return false;
    }

    function startObserver() {
        if (observer) return;
        observer = new MutationObserver(function () {
            lastDomActivity = Date.now();
            checkUrlChange();
            onDomActivity();
            if (pendingTimer) clearTimeout(pendingTimer);
            pendingTimer = setTimeout(function () {
                pendingTimer = null;
                try { processNewMessages(); } catch (e) { errlog('processNewMessages threw:', e); }
            }, DEBOUNCE_MS);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        DSW.state.observer = observer;
    }

    /* ------------------------- 事件驱动（替代轮询定时器，§9.1） ------------------------- */

    let lastUrl = '';
    try { lastUrl = location.href; } catch (e) { lastUrl = ''; }

    function checkUrlChange() {
        let href = '';
        try { href = location.href; } catch (e) { return; }
        if (href === lastUrl) return;
        lastUrl = href;
        try { checkConversationSwitch(); } catch (e) { errlog('checkConversationSwitch threw:', e); }   // #3
        bootScanCache = { at: 0, val: false };
        try { onUrlChange(); } catch (e) { errlog('onUrlChange threw:', e); }
    }

    // DOM 有活动时只做输入框哨兵（事件驱动、不做轮询）：
    // 新对话的注入不再自动发送，而是等用户第一次点发送时并进同一条消息（#4/#5）。
    function onDomActivity() {
        try { composerWatchTick(); } catch (e) {}
    }

    function installUrlWatchers() {
        try { window.addEventListener('popstate', checkUrlChange); } catch (e) {}
        try {
            const wrap = function (name) {
                const orig = history[name];
                if (typeof orig !== 'function') return;
                history[name] = function () {
                    const r = orig.apply(this, arguments);
                    checkUrlChange();
                    return r;
                };
            };
            wrap('pushState');
            wrap('replaceState');
        } catch (e) {}
        try { document.addEventListener('input', function () { try { composerWatchTick(); } catch (e) {} }, true); } catch (e) {}
    }

    /* ------------------------- 主流水线 ------------------------- */

    function processNewMessages(opts) {
        opts = opts || {};
        // #3 新建 / 切换对话：先判定并初始化状态，再处理消息（否则会拿上一个会话的基线误判）
        try { checkConversationSwitch(); } catch (e) { errlog('checkConversationSwitch threw:', e); }
        // #6 终止符暂停下：用户新消息 = 新任务 → 自动恢复（先做，本轮的 isPausedNow 才是最新状态）
        try { watchUserMessages(); } catch (e) {}
        const isPausedNow = paused && !opts.force;   // #1 暂停运行
        const roots = findMessageRoots();
        // 「平台就地重渲染」（消息元素被换掉、其它消息还在）与「整块换了新 DOM」（新会话/夹具重建）
        // 必须分开：只有前者才允许用账本判重，否则新消息会顶替同一位置上的旧记录被误吞。
        const prevRoots = lastScanRoots;
        lastScanRoots = roots;
        domContinued = prevRoots.some(function (el) { return roots.indexOf(el) >= 0; });
        let waited = false;                          // 本轮是否因为「回复没输出完」而等待
        for (let mi = 0; mi < roots.length; mi++) {
            const msgEl = roots[mi];
            if (isUserMessage(msgEl)) continue;
            if (isInThinkingRegion(msgEl)) continue;

            const fullText = extractFullText(msgEl);
            if (!fullText || !fullText.trim()) continue;

            markStreaming(msgEl, fullText);

            // #3/#4 收尾符号 / 终止符号：这条回复不含命令也要处理。
            // 符号在、但这条回复还没输出完 → 本轮先等（不执行半截、也不提前提醒）。
            const marks = detectMarks(fullText);
            const hasMarks = !!(marks.end || marks.terminate);
            if (hasMarks && !isReplyComplete(msgEl, fullText)) {
                if (isPausedNow) continue;               // 暂停中不排自驱动复查（恢复时会再扫一遍）
                waited = true;
                deferUntilReplySettled('等收尾符号稳定');
                continue;
            }

            // 暂停运行时：终止符号照常提醒（提醒不是自动化动作，不能因为暂停而漏掉），
            // 但绝不识别命令、绝不回执、绝不改变当前暂停原因（§2.5）。
            if (isPausedNow) {
                try { handleSymbols(msgEl, fullText); } catch (e) { errlog('handleSymbols threw:', e); }
                continue;
            }

            // —— 命令流水线（不含命令痕迹的回复直接跳过；尾部符号留到最后统一处理）——
            const parsedPeek = parseMessage(fullText);
            if (parsedPeek.hasDomain || parsedPeek.unclosedDomains || parsedPeek.bare.candidates.length) {
                // #4 这条文本已经处理过了：不要再让它进入「等回复结束」——
                // 否则回执早就发出去了、状态条却还挂着「等 AI 回复结束」。
                // 元素身份优先，元素被换掉 / 页面刷新后由账本兜底（会话 + 消息下标 + 文本）
                const led = ledgerGet(mi);
                // 认账本的两个前提：① 用户没刚发过消息（刚发过＝新的一轮，同一份文本必须照跑）；
                // ② 上一轮整体成功，或本次是「就地重渲染」且还在幂等窗口内（上一轮有错时允许重试）。
                // 账本只用来「补上被平台换掉的那个元素身份」：只有**就地重渲染**（其它消息元素还在）
                // 才认它 —— 整块换了新 DOM（新会话/刷新）时元素身份本来就该重算，
                // 那条路上的重复执行由 judgeBirth 的 born 记录拦（见 12-gate）。
                const ledUsable = !!(led && !isArmed() && domContinued
                    && (led.allOk === true || (led.allOk !== false
                        || (Date.now() - (led.at || 0)) < CONFIG.IDEMPOTENT_WINDOW_MS)));
                const seen = processedText.get(msgEl) || (ledUsable ? led : null);
                if (!(seen && seen.text === fullText)) {
                    // 「等回复输出完」闸门：半截输出里出现 ```dsw 就执行会写半截正文，
                    // 而且此时发回执会打断 AI 这次生成。没输出完 → 不识别、不执行、不回执。
                    if (!isReplyComplete(msgEl, fullText)) {
                        waited = true;
                        deferUntilReplySettled(hasStreamMarker(msgEl) || isGenerating() ? '正在生成' : '文本仍在变化');
                        continue;
                    }

                    // 文本只是在尾部增长（平台补渲染文本、AI 断续续写）：
                    // 上一次若真的执行过完整的域，这里**只能执行新增的那一段**。
                    // 旧写法会把整条文本重放一遍 → 同一批命令再执行一次（append 会重复追加），
                    // 还会把上一批的回执（或它的 SKIP）重复回传 —— 容器实测的「回执串台」。
                    // 上一次是未闭合域（什么都没执行）时不走增量：整条重放才能等到闭合后执行。
                    const grew = !!(seen && seen.text && fullText.length > seen.text.length
                        && fullText.indexOf(seen.text) === 0);
                    const delta = grew && seen.ranDomain;
                    const runText = delta ? fullText.slice(seen.text.length) : fullText;
                    const runParsed = delta ? parseMessage(runText) : parsedPeek;
                    const runsSomething = !!(runParsed.hasDomain || runParsed.unclosedDomains
                        || (runParsed.bare && runParsed.bare.candidates.length));

                    // 同一条回复的「已处理」结论同时记到元素与账本上（账本才是判重的权威）
                    const markSeen = function (text, ranDomain, allOk) {
                        const rec = { text: text, ranDomain: !!ranDomain, at: Date.now() };
                        if (allOk !== undefined) rec.allOk = !!allOk;
                        processedText.set(msgEl, rec);
                        ledgerPut(mi, rec);
                        return rec;
                    };
                    const verdict = judgeBirth(msgEl, fullText);
                    if (verdict === 'history') {
                        markSeen(fullText, false);
                    } else if (isSelfSent(fullText)) {
                        markSeen(fullText, false);
                    } else if (looksLikeLastMessage(msgEl)) {
                        const ranDomain = delta
                            ? (seen.ranDomain && !runsSomething) || !!(runParsed.hasDomain && !runParsed.unclosedDomains)
                            : !!(parsedPeek.hasDomain && !parsedPeek.unclosedDomains);
                        markSeen(fullText, ranDomain);
                        if (!bornEls.has(msgEl)) markBorn(msgEl);

                        if (runsSomething) {
                            let okAll = true;
                            try {
                                const res = handleMessage(runText, runParsed);
                                okAll = !(res && res.batch && res.batch.results
                                    && res.batch.results.some(function (r2) { return !r2.ok; }));
                            } catch (e) { okAll = false; errlog('handleMessage threw:', e); }
                            // 结论回填账本：无错 → 同一条回复永不重跑；有错 → 只在幂等窗口内判重（允许重试）
                            ledgerPut(mi, { text: fullText, ranDomain: ranDomain, allOk: okAll });
                        }
                    }
                } else if (!bornEls.has(msgEl)) {
                    // 就地重渲染（元素被换掉、文本没变）：命令与回执都不重跑，
                    // 但出生证明必须补记 —— 否则后面的 ◆/■ 会被当成历史消息，提醒/暂停被吞掉。
                    markBorn(msgEl);
                }
            }

            // #6 触发顺序：等输出完 → 解析执行域 → 执行命令 → 组装并发回执 → **再**识别尾部 ■。
            //    所以终止符处理放在命令流水线之后：本轮回执先入队，才进入暂停（暂停不吞掉它）。
            if (hasMarks) {
                try { handleSymbols(msgEl, fullText); } catch (e) { errlog('handleSymbols threw:', e); }
            }
        }
        if (!waited) { settleChecks = 0; settleHoldWarned = false; clearSettleStatus(); }   // 没有待等的消息 → 计数归零 + 状态复位
    }

    // #3/#4 收尾符号（◆）/ 终止符号（■）：
    //   'none' = 这条回复没有符号，交给命令流水线；
    //   'wait' = 有符号但这条还没输出完 → 本轮先等（不执行半截、不提前提醒）；
    //   'done' = 已处理（终止符号此时已提醒过用户，并可能已进入终止符暂停态）。
    // 调用时机（#6）：命令流水线**之后**，因此此时本轮回执已经入队。
    function handleSymbols(msgEl, fullText) {
        const marks = detectMarks(fullText);
        if (!marks.end && !marks.terminate) return 'none';
        if (!isReplyComplete(msgEl, fullText)) return 'wait';
        if (symbolCare.get(msgEl) === fullText) return 'done';       // 同一条文本只处理一次（防重复震动）
        symbolCare.set(msgEl, fullText);
        if (marks.terminate) {
            // 出生裁决：页面加载时水合出来的历史消息（旧会话里的 ■）不提醒、也不暂停，
            // 否则每次刷新都会响一声、还会把容器锁在暂停态。
            const verdict = bornEls.has(msgEl) ? 'new' : judgeBirth(msgEl, fullText);
            if (verdict === 'history') {
                pushLog('终止符号 ' + TERMINATE_MARK + ' 来自历史消息，不提醒（只在这次新回复上提醒）');
                return 'done';
            }
            // #6 尾部还挂着未闭合的执行域 → 不信任这个符号：不提醒、不暂停、也不执行半截。
            const trust = terminateTrusted(fullText);
            if (!trust.ok) {
                pushLog('终止符号 ' + TERMINATE_MARK + ' 后面还有未闭合的执行域：不信任（不提醒、不暂停），先补 ``` 或 </dsw>', 'warn');
                return 'done';
            }
            notifyTerminate(marks.terminate);
            // #6 ■ = 任务边界：进入终止符暂停 + 任务级重置（不是程序结束，不做容器级清空）
            try { enterTerminatePause(marks.terminate); } catch (e) { errlog('enterTerminatePause threw:', e); }
        } else {
            log('#3 识别到回复结束符 ' + marks.endMark + '（这条回复已输出完）');
        }
        return 'done';
    }

    // #4 「等 AI 回复结束」不能挂到「其实已经结束/已经处理完」之后：
    // 只有在确实还在生成、或出站队列里还有东西要发（交给节奏器显示）时才保留。
    function clearSettleStatus() {
        try {
            if (isGenerating()) return;
            if (typeof outbox !== 'undefined' && outbox && outbox.parts.length) return;
            const s = String((uiState && uiState.statusText) || '');
            if (/等 AI 回复结束/.test(s)) setStatus('idle', '等待命令', { autoHide: 5000 });
        } catch (e) {}
    }

    /**
     * 核心：一条消息 → 裁决 → 执行 → 回执。
     * 不产生副作用（不入队、不改状态条），便于测试与复用；handleMessage 负责副作用。
     */
    function runMessage(fullText, parsed, opts) {
        opts = opts || {};
        const startedAt = Date.now();
        const decision = DomainGate.decide(parsed);

        if (decision.action === 'none') {
            // 「代码块里有命令、但没有执行域」必须**回一条**：以前只写进面板日志，
            // AI 侧完全看不见 —— 于是用户看到的是「程序没反应」。（硬约束 3：静默停摆次数必须为 0）
            if (decision.hintFenced) {
                return {
                    action: 'none', decision: decision, batch: null,
                    receipt: composeNoop('代码块里的命令没有执行域，本轮未执行', decision.hint)
                };
            }
            return { action: 'none', decision: decision, receipt: null, batch: null };
        }
        if (decision.action === 'unclosed') {
            return {
                action: 'unclosed', decision: decision, batch: null,
                receipt: composeNoop('执行域未闭合（缺少 ``` 或 </dsw>），整域未执行', '补上闭标记后重发；未闭合的域永不执行（防半截命令）')
            };
        }
        if (decision.action === 'legacy') {
            // 旧协议标记：明确报错 + 给新写法（不兼容旧版，但绝不当没看见）
            const at = decision.mark && decision.mark.line ? ('L' + decision.mark.line + ' ') : '';
            return {
                action: 'legacy', decision: decision, batch: null,
                receipt: composeNoop(
                    '协议标记已更换：' + at + '“' + ((decision.mark && decision.mark.raw) || '[[dsw]]') + '”不再识别，本条未执行任何命令',
                    '执行域只用这两种（都是主流 Agent 的命令块形状）：'
                    + '① ```dsw 代码围栏（推荐）：开头 ```dsw、结尾 ```；'
                    + '② <dsw> … </dsw> 标签（修饰符写在标签里，如 <dsw atomic>）；'
                    + '围栏内是字面量，正文不必再自己包围栏'
                )
            };
        }
        const cmds = decision.cmds;
        if (!cmds.length) {
            // 空执行域也必须回一条（A11：`<dsw></dsw>` 以前整行不匹配开标记 → action=none → 完全静默）
            return {
                action: 'empty', decision: decision, batch: null,
                receipt: composeNoop('空执行域：域里没有任何有效命令（这条 NOOP 就是回执，不是没收到）',
                    '域里每行一条 `操作 路径 [参数]`；不打算执行就别写执行域')
            };
        }

        const isDomain = decision.action === 'domain';
        const atomic = cmds.some(function (c) { return c.domain && c.domain.atomic; });
        // dry 是「域级」修饰符：跟着每条命令自己的域走，不再整条消息一刀切。
        // （旧写法把「消息里只要有一个 dry 域」当成整批 dry → 同一条消息里其它域的真实写入被连带回滚。）
        // opts.dry 只在内部/测试调用时表示「整批 dry」。
        const dry = !!opts.dry;
        const force = cmds.some(function (c) { return c.domain && c.domain.force; });

        // 幂等（§7）：键 = 会话 + 执行域规范化文本 + cwd；只拦「设定型」命令
        const domainText = parsed.domains && parsed.domains.length
            ? parsed.domains.map(function (d) { return d.rawText || ''; }).join('\n')
            : fullText;
        const setType = cmds.some(function (c) {
            return c.op === 'write' || c.op === 'edit' || c.op === 'patch' || planIsMutating(c);
        });
        const key = idempotencyKey(domainText, cwd);
        if (setType && !force && isDomain) {
            const chk = gateCheck(key);
            if (chk.hit) {
                return { action: 'skip', decision: decision, batch: null, receipt: composeSkip(chk.ago), key: key };
            }
        }

        // #5 内部区只读判定（AI 侧）：解出这条命令真正会碰到的路径。
        //    锚点写法（`edit #a3f …`）的目标在锚点表里 —— 必须按锚点解析，
        //    否则「read 拿到的系统文件锚点」就能绕过这条规则去改系统文件。
        //    **路径令牌同理**：`move @p1 /__sys/x` 里的 @p1 必须在这里就展开成真实路径，
        //    否则这道安全闸门看到的只是字面量 `@p1`（不在内部区）→ 放行 → 越权。三处插入点里这处最关键。
        function realPathOf(raw, cwd) {
            if (isPathToken(raw)) {
                try {
                    const r = PathStore.resolve(raw);
                    if (r && r.ok) return r.path;
                } catch (err) {}
            }
            return resolvePathArg(raw, cwd);
        }
        function commandPathsOf(c, cwd) {
            let target = c.path;
            if (c.anchor) {
                try {
                    const entry = AnchorStore.get(c.anchor);
                    if (entry && entry.path) target = entry.path;
                } catch (err) {}
            }
            const paths = [realPathOf(target, cwd)];
            if ((c.op === 'move' || c.op === 'copy') && c.args && c.args[0]) {
                paths.push(realPathOf(c.args[0], cwd));
            }
            return paths;
        }

        //    「会不会改文件」判定：kind=write 的都算，但 restore list（不带条目、不 purge）只是列回收站 → 读。
        function isMutatingOp(c) {
            const meta = COMMANDS[c.op];
            if (!meta || meta.kind !== 'write') return false;
            if (c.op === 'restore') {
                if (c.flags && c.flags.purge) return true;
                if (c.flags && c.flags.list) return false;
                return !!(String((c.flags && c.flags.item) || c.path || '').trim());   // 带条目才是真恢复
            }
            return true;
        }

        function planDenied(c) {
            return {
                ok: false, op: c.op, path: c.path, kind: 'denied', deniedBy: 'plan',
                error: '计划模式：写操作已拦截',
                fix: '退出计划模式后重发（面板「计划」→ 退出；只有 ' + SYS_PLAN_PATH + ' 例外）',
                denyHint: '计划模式只读：计划文件仍可写（plan add/done/doing/todo），其它文件等用户确认退出后再改'
            };
        }

        function internalDenied(c, cwd) {
            const hitPath = commandPathsOf(c, cwd).filter(function (x) { return VirtualFS.isInternal(x); });
            const p = hitPath[0] || resolvePathArg(c.path, cwd);
            const isPlan = p === SYS_PLAN_PATH;
            return {
                ok: false, op: c.op, path: p, kind: 'denied', deniedBy: 'internal',
                error: isPlan
                    ? '计划文件不要用 write / edit / patch 直接改：用 plan 命令'
                    : '系统区 / 回收站对 AI 只读：' + p,
                fix: isPlan
                    ? 'plan add <条目> 加一条；plan done|doing|todo <序号|last|文字片段> 改状态；plan del / clear。要整篇重写就先 plan on。'
                    + '（同批里先 plan add 再 plan done last，不必等序号）'
                    : '系统文件（含 ' + SYS_MANUAL_PATH + '）只有人能在面板里改；要查规范用 `help §N` 或 read ' + SYS_MANUAL_PATH
                    + '；要留档请写用户目录，例如 write /notes.md',
                denyHint: '内部区（' + SYS_PREFIX + '* 与 ' + TRASH_PREFIX + '*）对 AI 只读：可以 read / grep / list / tree / stat，'
                    + '不能写 / 删 / 移 / 建；' + SYS_PLAN_PATH + ' 是唯一例外，而且只在计划模式开启时能用 write/edit/patch'
            };
        }

        // 逐条策略闸门（计划模式 / 内部区只读）。关键：**按命令逐条判、按顺序判** ——
        //   · 越权的那一条只拒它自己，同批合法命令照常执行（不是整批中止；要整批回滚用 atomic）；
        //   · `plan on` 与本批后面的命令同批时，后面的写命令当场就被拦住（不留一个批次的空窗期）；
        //   · restore list 属读，计划模式下也放行。
        function policyDeny(cmd, cwd) {
            if (!isMutatingOp(cmd)) return null;
            // 15：闸门顺序 = dry 域放行 → 危险命令（在 executeBatch 里先判）→ 计划模式 → 内部区只读。
            // dry 域只是「校验一遍」，不会写盘 —— 计划模式拦它没有意义（AI 连「这样写能不能过」都试不了）。
            // 但**内部区只读是权限**、不是写副作用，dry 也照样拦。
            const cmdDry = dry || !!(cmd && cmd.domain && cmd.domain.dry);
            const planActive = isPlanModeActive();
            if (planActive && isPlanFileCmd(cmd, cwd)) return null;        // 唯一例外：计划文件本身
            if (planActive && !cmdDry) return planDenied(cmd);
            // restore / undo / redo 不带路径（走恢复通道与撤销栈），不套「内部区路径」判定
            if (cmd.op === 'restore' || cmd.op === 'undo' || cmd.op === 'redo') return null;
            return commandPathsOf(cmd, cwd).some(function (p) { return VirtualFS.isInternal(p); })
                ? internalDenied(cmd, cwd) : null;
        }

        const batch = executeBatch(cmds, { cwd: cwd, atomic: atomic, dry: dry, isDomain: isDomain, guard: policyDeny });
        cwd = batch.cwd || cwd;

        const results = batch.results;
        const failed = results.some(function (r) { return !r.ok; });
        const denials = results.filter(function (r) { return r.kind === 'denied'; });
        const allDenied = results.length > 0 && denials.length === results.length;
        if (!failed && !batch.dry) {
            cleanRounds++;
            Ckpt.tick(atomic ? 'atomic' : 'auto', atomic);
        } else cleanRounds = 0;

        // 幂等记账：只有「整批成功」才记（失败不记账 → 重发正常执行）
        if (setType && !failed && !batch.dry && isDomain) gateNote(key);

        const steady = cleanRounds >= 2 && !failed;
        const denyHint = denials.map(function (r) { return r.denyHint; }).filter(Boolean)[0] || null;
        // 结构化故障的病因诊断（未知命令成批出现时才有值）：指向真实原因，而不是末端症状
        const rawForDiag = (parsed.domains || []).map(function (d) { return d.rawText || ''; }).join('\n');
        const diagnosis = failed ? diagnoseParseIssue(rawForDiag, results) : null;
        const rbPaths = (batch.rollbackPaths && batch.rollbackPaths.length) ? ('：' + batch.rollbackPaths.join('、')) : '';
        const rollbackHint = batch.rolledBack && atomic
            ? ('原子批次：首错已整批回滚' + rbPaths + '。下次去掉 atomic —— 默认的“只回滚失败那一条 + PARTIAL”更好定位')
            : (batch.rolledBackByExpect
                ? ('断言失败：本批写入已全部回滚' + rbPaths + '；改对后重发即可')
                : null);
        const receipt = composeReceipt(results, {
            ms: Math.max(1, Date.now() - startedAt),
            steady: steady,
            cwd: cwd,
            diagnosis: diagnosis,
            manualHint: failed ? manualHintLine(results, diagnosis) : null,
            hint: rollbackHint || (decision.staleMark ? ('L' + decision.staleMark.line + ' 还留着旧协议标记「' + decision.staleMark.raw + '」：新写法是 ```dsw 围栏或 <dsw> … </dsw>') : denyHint),
            cwdHint: 'cwd=' + cwd + (decision.note ? '；' + decision.note : '')
        });
        return {
            action: allDenied ? 'denied' : 'exec', decision: decision, batch: batch,
            results: results, denials: denials, denyKind: denials.length ? denials[0].deniedBy : null,
            receipt: receipt, steady: steady, key: key
        };
    }

    function handleMessage(fullText, parsed) {
        if (handling) { warn('handleMessage re-entered, skip'); return; }
        handling = true;
        try { ioNoteIn(fullText); } catch (e) {}    // 底部状态栏：入站字符（按文本指纹去重）
        // #6 给这一轮入队的回执打上轮次戳：终止符暂停时只保留「本轮回执」，其余按「本任务旧待回传」丢弃
        try { setOutboxRound(++roundSeq); } catch (e) {}
        try {
            const r = runMessage(fullText, parsed);
            if (r.action === 'none') {
                if (r.decision.hint) pushLog('未执行：' + r.decision.hint, 'warn');
                if (r.receipt) enqueueOutbound(r.receipt, 'feedback');   // 域识别失败也要让 AI 知道
                refreshUI();
                return;
            }
            if (r.action === 'skip') {
                enqueueOutbound(r.receipt, 'feedback');
                pushLog('幂等命中，回执 SKIP（未重复执行）');
                setStatus('received', '重复批次已跳过');
                refreshUI();
                return;
            }
            if (r.action === 'unclosed') { setStatus('received', '执行域未闭合'); }
            else if (r.action === 'legacy') { setStatus('received', '旧协议标记，未执行'); }
            else if (r.action === 'denied') { setStatus('received', r.denyKind === 'plan' ? '计划模式拦截' : '越权已拒绝'); }
            else if (r.action === 'empty') { setStatus('received', '空执行域'); }
            else {
                const results = r.batch.results;
                const okCount = results.filter(function (x) { return x.ok; }).length;
                const failed = results.some(function (x) { return !x.ok; });
                try { noteHealth(failed ? 'fail' : 'ok'); } catch (e) {}   // UI 健康度：最近一次成功/失败执行
                const dryN = r.batch.dryCount || 0;
                pushLog('回执 ' + okCount + '/' + results.length
                    + (r.batch.dry ? '（dry：只校验未写入）' : (dryN ? '（含 ' + dryN + ' 条 dry 校验）' : ''))
                    + (r.decision.action === 'read' ? '（读兜底）' : ''));
                setStatus(failed ? 'received' : 'sent', failed ? '有失败' : '已执行');
            }
            enqueueOutbound(r.receipt, 'feedback');
            refreshUI();
        } catch (e) {
            errlog('handleMessage threw:', e);
            // §0.2 不许静默：内部异常也必须产生回执
            try {
                enqueueOutbound(composeNoop('内部异常：' + (e && e.message ? e.message : String(e)), '这一批没有执行，请原样重发'), 'feedback');
            } catch (e2) {}
        } finally {
            handling = false;
        }
    }

    /* ------------------------- 自检提示注入（L0 触发句） ------------------------- */

    function bootstrapStateKey() { return STORE_BOOT_PREFIX + currentConversationKey(); }

    // URL 里的会话 id（没有 = 新对话页，例如 chat.deepseek.com/ 或 chatgpt.com/）
    function conversationIdInUrl() {
        try {
            const m = String(location.pathname || location.href || '').match(PLATFORM.convMatch);
            return m ? String(m[1]) : '';
        } catch (e) { return ''; }
    }

    function messageNodes() {
        try { return Array.from(document.querySelectorAll(PLATFORM.msgSelector + ',' + PLATFORM.userMsgSelector)); } catch (e) { return []; }
    }

    function threadText() {
        return messageNodes().map(function (n) { return n.textContent || ''; }).join('\n');
    }

    let bootScanCache = { at: 0, val: false };

    // #5 会话里是否已经有我们的协议信息。
    // 先用消息区文本；消息被平台折叠/截断渲染时退到整页文本。
    // （本脚本自己的面板在 shadow DOM 里，不会污染 body.innerText）
    function threadHasBootstrap(force) {
        const now = Date.now();
        if (!force && bootScanCache.at && now - bootScanCache.at < 800) return bootScanCache.val;
        let val = false;
        const t = threadText();
        if (t && (t.indexOf('你是 DSW 容器的操作员') !== -1 || t.indexOf('proto=DSW2') !== -1)) val = true;
        if (!val) {
            try {
                const body = String((document.body && document.body.innerText) || '');
                if (body && (body.indexOf('你是 DSW 容器的操作员') !== -1 || body.indexOf('proto=DSW2') !== -1)) val = true;
            } catch (e) {}
        }
        bootScanCache = { at: now, val: val };
        return val;
    }

    function hasExistingUserMessages() {
        try { return document.querySelectorAll(PLATFORM.userMsgSelector).length > 0; } catch (e) { return false; }
    }

    function hasAssistantMessages() {
        try { return document.querySelectorAll(PLATFORM.msgSelector).length > 0; } catch (e) { return false; }
    }

    // 用户消息区里是不是已经出现这段文字（判断平台有没有抢在我们前面把它发出去）
    function hasUserMessageWith(text) {
        const want = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (!want) return false;
        try {
            const nodes = Array.from(document.querySelectorAll(PLATFORM.userMsgSelector));
            for (let i = nodes.length - 1; i >= 0 && i >= nodes.length - 6; i--) {
                const t = String(nodes[i].textContent || '').replace(/\s+/g, ' ');
                if (t.indexOf(want) !== -1) return true;
            }
        } catch (e) {}
        return false;
    }

    // #4/#5：新对话不自动发送。等用户第一次点发送时，把「L0 触发句 + 手册全文」
    // 与用户那句话写进同一个输入框、作为同一条消息发出（§9.2：能合并就一条）。
    function injectionPayload() {
        const parts = [buildBootstrapPrompt()];
        // 默认只发**目录卡**（手册有哪些节 + 怎么按节取），不发全文：
        // 全文几千字一次性灌进去，AI 记不住、记不准。要全文的用户可在设置里开「注入手册全文」。
        if (CONFIG.INJECT_MANUAL !== false) parts.push(buildManual());
        else parts.push(manualTOC());
        return parts.join('\n\n');
    }

    /* 2.13.0 上下文里已有的东西不再重复投喂（省 token，也省 AI 的注意力）。
     * 判据用**会话里真实存在的文本**，不是本地记账：刷新 / 换 URL / 面板手动重注入都能撞上。
     * 三种情形都跳过：
     *   ① 协议信息已在会话里 → 整个 payload 都不发；
     *   ② 只发过提示词、没发过目录卡 → 只补目录卡；
     *   ③ 两者都在 → 什么都不发。
     * 缓存 3 秒，避免每轮扫描整页文本。 */
    const TOC_MARK = '## 手册目录';
    let ctxScanAt = 0, ctxScanVal = null;
    function contextHas(mark) {
        const now = Date.now();
        if (!ctxScanVal || now - ctxScanAt > 3000) {
            let t = '';
            try { t = threadText(); } catch (e) {}
            if (!t) { try { t = String((document.body && document.body.innerText) || ''); } catch (e) {} }
            const promptIn = t.indexOf('你是 DSW 容器的操作员') !== -1 || t.indexOf('proto=DSW2') !== -1;
            const tocIn = t.indexOf(TOC_MARK) !== -1;
            const manualIn = t.indexOf('# DSW 容器手册') !== -1;
            ctxScanVal = { prompt: promptIn, toc: tocIn || manualIn, text: t };
            ctxScanAt = now;
        }
        if (mark === 'prompt') return ctxScanVal.prompt;
        if (mark === 'toc') return ctxScanVal.toc;
        if (mark === 'text') return ctxScanVal.text || '';
        return false;
    }
    function invalidateContextScan() { ctxScanAt = 0; ctxScanVal = null; }

    /** 按上下文现状拼注入内容；返回 '' = 什么都不用发。 */
    function injectionPayloadFresh() {
        const hasPrompt = contextHas('prompt');
        const hasToc = contextHas('toc');
        if (hasPrompt && hasToc) return '';
        if (hasPrompt) return manualTOC();              // 只缺目录卡
        return injectionPayload();                        // 首投：提示词 + 目录卡（或全文）
    }

    function injectionState() { return Store.get(bootstrapStateKey(), null) || {}; }

    // #5 页面里已经能看到协议信息（刷新/换 URL 后 DOM 还在）→ 把「已注入」补记到当前会话键，
    // 否则 / → /a/chat/s/<id> 这种 URL 变化会让状态键对不上，第二句话又被注入一遍。
    function adoptInjection() {
        const st = injectionState();
        if (st.injectedAt) return;
        st.injectedAt = Date.now();
        st.adopted = true;
        Store.set(bootstrapStateKey(), st);
        Store.set(STORE_BOOT_GLOBAL, { at: st.injectedAt, key: currentConversationKey(), url: location.href, adopted: true });
    }

    function injectionPending() {
        if (CONFIG.AUTO_BOOTSTRAP === false) return false;
        if (paused) return false;
        if (!PLATFORM.matched && !PLATFORM.id) return false;
        // #5 页面上已经能看到协议信息 → 无论如何不再注入，并把状态补记到当前会话键
        if (threadHasBootstrap(true)) { adoptInjection(); return false; }
        const st = injectionState();
        if (st.injectedAt) return false;
        if ((st.retry || 0) > BOOT_MAX_RETRY) return false;
        // #5 全局注入记录（防 URL 变化/刷新后状态键对不上而重复注入）
        const g = Store.get(STORE_BOOT_GLOBAL, null);
        if (g && g.at && (Date.now() - g.at) < BOOT_GLOBAL_TTL_MS && g.key === currentConversationKey()) return false;
        // #6 新对话页（URL 里没有会话 id，例如 chat.deepseek.com/）：
        // 这里**不拿残留 DOM 当证据** —— 点「新对话」后旧会话的 DOM 常常还挂着，
        // 正是「有时不注入」的原因。是否已经注入过由「页面里能否看到协议信息」+ 注入记录判定。
        if (!conversationIdInUrl()) return true;
        if (hasExistingUserMessages() || hasAssistantMessages()) return false;   // 已有内容的会话：不注入
        // 有会话 id 但消息区还是空的：也可能只是页面刚加载还没渲染 → 等观察窗口再判断
        if (Date.now() - scriptStartedAt < BOOT_THREAD_SETTLE_MS) return false;
        return true;
    }

    // 信息在前、用户指令在后（模型最后看到的是用户要求）
    // 2.13.0：payload 走 injectionPayloadFresh() —— 上下文里已有的部分不再重复注入。
    function buildInjection(userText, payload) {
        const p = (payload == null) ? injectionPayloadFresh() : payload;
        const t = String(userText == null ? '' : userText).trim();
        if (!p) return t;
        return t ? (p + '\n\n---\n\n' + t) : p;
    }

    function markInjected() {
        const st = injectionState();
        invalidateContextScan();      // 2.13.0：刚投过的内容下一次扫描要重新判定
        st.injectedAt = Date.now();
        st.retry = (st.retry || 0) + 1;
        st.key = currentConversationKey();
        Store.set(bootstrapStateKey(), st);
        Store.set(STORE_BOOT_GLOBAL, { at: st.injectedAt, key: st.key, url: location.href });   // #5
        bootScanCache = { at: Date.now(), val: true };
    }

    /* ------------------------- #1 暂停 / 重新识别 ------------------------- */

    const PAUSE_MANUAL = 'manual';
    const PAUSE_TERMINATE = 'terminate';

    function isPaused() { return paused; }
    function pauseReasonOf() { return pauseReason; }
    function pauseInfoOf() { return pauseInfo; }
    function isTerminatePaused() { return paused && pauseReason === PAUSE_TERMINATE; }

    // 终止符暂停下允许「本轮回执」继续发出：暂停只阻止**后续**自动识别与执行，
    // 不吞掉已经处理完的本轮回执（§3）。队列里此时只剩本轮回执 —— 旧的已按 §9 丢弃。
    function pauseAllowsCarryFlush() { return isTerminatePaused(); }

    function terminateAutoPauseEnabled() {
        try { return getUiCfg().terminateAutoPause !== false; } catch (e) { return true; }
    }

    // 状态条文案：两种终止原因分开说（不是一句话糊过去）
    function terminatePauseText(kind) {
        return kind === 'done'
            ? '任务已结束，已暂停；发送新消息继续'
            : '需要你介入，已暂停；处理后可继续';
    }

    function markPausedUI(on) {
        try { if (uiBall) uiBall.classList.toggle('paused', !!on); } catch (e) {}
    }

    function setPaused(v) {
        const next = !!v;
        // 已经是终止符暂停时再点「暂停」→ 手动接管（原因改成手动，只有双击悬浮球才恢复）
        if (next === paused && !(next && pauseReason === PAUSE_TERMINATE)) return paused;
        if (next) {
            const wasTerminate = pauseReason === PAUSE_TERMINATE;
            paused = true;
            pauseReason = PAUSE_MANUAL;
            pauseInfo = { reason: PAUSE_MANUAL, kind: 'manual', text: '已暂停（双击悬浮球恢复）', at: Date.now() };
            DSW.state.paused = true;
            DSW.state.pauseReason = pauseReason;
            DSW.state.pauseInfo = pauseInfo;
            markPausedUI(true);
            stopPacerWait();
            stopSettleRecheck();
            pushLog(wasTerminate
                ? '已改为手动暂停（原来的终止符暂停被手动接管，只有双击悬浮球才恢复）'
                : '已暂停：不执行命令、不回传（双击悬浮球恢复）', 'warn');
            setStatus('paused', '已暂停（双击悬浮球恢复）');
        } else {
            const wasTerminate = pauseReason === PAUSE_TERMINATE;
            paused = false;
            pauseReason = '';
            pauseInfo = null;
            DSW.state.paused = false;
            DSW.state.pauseReason = '';
            DSW.state.pauseInfo = null;
            markPausedUI(false);
            pushLog(wasTerminate ? '终止符暂停已解除（手动恢复）' : '已恢复运行');
            setStatus('received', '已恢复运行');
            try { processNewMessages({ force: false }); } catch (e) {}
        }
        refreshUI();
        return paused;
    }

    /* ------------------- #6 终止符 ■：任务结束 → 终止符暂停 + 任务级重置 -------------------
     *   ■ 的含义是「整个任务跑完」或「需要你介入」，所以它是一次**任务边界**：
     *     · 暂停当前自动化（不执行命令、不回执、不搭车）
     *     · 只重置任务级状态（本任务旧待回传、搭车标记、暂停原因、状态条等待）
     *   绝不碰容器级状态：cwd / 文件系统 / 撤销栈 / 回收站 / 幂等批次表 / 锚点表 /
     *   计划模式与 plan.md / 会话 id / 出站节奏器发送历史 / 阶梯级别，全部原样保留。
     *   用户再发一条新消息 → 自动恢复（手动暂停不自动恢复）。
     * -------------------------------------------------------------------------------------- */

    function enterTerminatePause(term) {
        const t = term || {};
        const kind = t.kind || 'unknown';
        const text = terminatePauseText(kind);

        // ① 手动暂停中：只提醒，不改变暂停原因、不自动恢复（§2.5）
        if (paused && pauseReason === PAUSE_MANUAL) {
            pushLog('手动暂停中：终止符号只提醒，不自动暂停（暂停原因保持「手动」，不会自动恢复）');
            return false;
        }
        // ② 开关关闭：只提醒不自动暂停（提醒总开关与它互相独立）
        if (!terminateAutoPauseEnabled()) {
            pushLog('识别到终止符号，但「终止符后自动暂停」已关闭：只提醒，不暂停', 'warn');
            // 保留提醒原因（notifyTerminate 刚写上的那句），只在后面补一句说明
            const shown = String((uiState && uiState.statusText) || '');
            setStatus('received', shown ? shown + '（未自动暂停）' : '已提醒（未自动暂停）');
            return false;
        }

        // ③ 任务级重置：先清「本任务失效待回传」，只留本轮回执。
        //    队列自己的轮次戳就是唯一口径（handleMessage 每轮把两者同步为同一个数）。
        let dropped = 0;
        const keepRound = (typeof outboxRoundNow === 'function') ? outboxRoundNow() : roundSeq;
        try { dropped = dropTaskLeftoverParts(keepRound, '终止符'); } catch (e) { errlog('dropTaskLeftoverParts threw:', e); }
        stopPacerWait();                                      // 状态条上的等待提示
        stopSettleRecheck();
        settleChecks = 0;
        settleHoldWarned = false;

        // ④ 进入暂停态（样式与手动暂停一致，原因分开记录）
        paused = true;
        pauseReason = PAUSE_TERMINATE;
        pauseInfo = { reason: PAUSE_TERMINATE, kind: kind, text: text, at: Date.now(), round: keepRound, dropped: dropped };
        DSW.state.paused = true;
        DSW.state.pauseReason = pauseReason;
        DSW.state.pauseInfo = pauseInfo;
        markPausedUI(true);
        pushLog('进入终止符暂停态：' + text
            + '（不执行命令、不回执、不搭车；本任务旧待回传丢弃 ' + dropped + ' 条）', 'warn');
        setStatus('paused', text);

        // ⑤ 本轮回执优先发出：终止符暂停对「已在队列里的本轮回执」放行（但不搭车计划进度）
        try { if (outbox.parts.length) scheduleFlush(200); } catch (e) {}
        refreshUI();
        return true;
    }

    // 用户新消息：终止符暂停 = 任务边界 → 自动恢复并从 0 重新积累（手动暂停不自动恢复）
    function noteUserCommandSend(reason) {
        if (!isTerminatePaused()) return false;
        paused = false;
        pauseReason = '';
        pauseInfo = null;
        DSW.state.paused = false;
        DSW.state.pauseReason = '';
        DSW.state.pauseInfo = null;
        markPausedUI(false);
        pushLog('你发了新消息：终止符暂停已解除，开始新任务'
            + (reason ? '（' + reason + '）' : ''));
        setStatus('received', '已恢复运行（新任务）');
        refreshUI();
        try {
            setTimeout(function () {
                try { processNewMessages({ force: false }); } catch (e) { errlog('resume scan threw:', e); }
            }, 0);
        } catch (e) {}
        return true;
    }

    // 兜底：用户消息元素在 DOM 里新出现（有的平台发送走的是我们没拦到的路径）
    let seenUserEls = new WeakSet();
    function watchUserMessages() {
        let nodes = [];
        try { nodes = Array.from(document.querySelectorAll(PLATFORM.userMsgSelector)); } catch (e) { return false; }
        let hit = false;
        for (const n of nodes) {
            if (seenUserEls.has(n)) continue;
            seenUserEls.add(n);
            if (isTerminatePaused()) { noteUserCommandSend('检测到新的用户消息'); hit = true; }
        }
        return hit;
    }

    // 长按悬浮球：重新识别平台/输入框缓存，并把最近一条带命令的回复再识别一遍
    // （幂等仍在：write/edit/patch 90s 内重扫只会回 SKIP，不会写第二遍）
    function rescanCommands() {
        processedText = new WeakMap();
        // 不清 streamingEls：那是「回复是否已输出完」的判据基线，清了反而要多等一轮
        resetFailCounts();
        resetBirthState();
        try { composerCache = { el: null, at: 0 }; } catch (e) {}
        let hit = 0;
        let waiting = false;
        try {
            const roots = findMessageRoots();
            for (let i = roots.length - 1; i >= 0; i--) {
                const node = roots[i];
                if (isUserMessage(node) || isInThinkingRegion(node)) continue;
                const text = extractFullText(node);
                if (!text || !text.trim()) continue;
                const parsed = parseMessage(text);
                if (!parsed.hasDomain && !parsed.unclosedDomains && !parsed.bare.candidates.length) continue;
                if (isSelfSent(text)) continue;
                if (!isReplyComplete(node, text)) {          // 半截回复不重扫：同样会写半截/打断生成
                    waiting = true;
                    deferUntilReplySettled('正在生成');
                    break;
                }
                markBorn(node);
                handleMessage(text, parsed);
                hit++;
                break;                     // 只重扫最近一条，避免刷屏
            }
        } catch (e) { errlog('rescanCommands threw:', e); }
        if (waiting) {
            pushLog('长按重新识别：AI 还在输出，等这条回复结束再重扫');
            showToast('AI 还在输出，等回复结束再试', 'warn');
        } else {
            pushLog(hit ? '长按重新识别：已重扫最近一条执行域' : '长按重新识别：没找到含命令的回复');
            showToast(hit ? '已重新识别命令' : '没有新的命令', hit ? '' : 'warn');
        }
        refreshUI();
        return hit;
    }

    // 面板「重置注入」：清掉本会话的注入记录（含 #5 的全局记录）→ 下一次发送重新带上信息
    function resetBootstrapState() {
        Store.del(bootstrapStateKey());
        const g = Store.get(STORE_BOOT_GLOBAL, null);
        if (g && g.key === currentConversationKey()) Store.del(STORE_BOOT_GLOBAL);
        bootScanCache = { at: 0, val: false };
        bootFallbackKey = '';               // #6 允许再次补发
    }


/* >>> 15-outbox.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const CLICK_GAP_MS = 800;
    const LOOP_MAX_SENDS = 8;
    const OUTBOX_DEBOUNCE_MS = 2500;
    const PACER_LV12_PER_MIN = 6;   // 12s 档：1 分钟内 ≥6 条
    const PACER_LV20_PER_10MIN = 18;   // 20s 档：10 分钟内 ≥18 条
    const PACER_LV20_PER_MIN = 8;   // 20s 档：1 分钟内 ≥8 条
    const PACER_LV5_PER_MIN = 3;   // 5s 档：1 分钟内 ≥3 条
    const PACER_LV8_PER_MIN = 4;   // 8s 档：1 分钟内 ≥4 条
    const SEND_HARD_LIMIT_MS = 90000;
    const SEND_IDLE_GIVEUP_MS = 8000;
    const SEND_POSTCLICK_GRACE_MS = 2500;   // #7 按下发送后等这么久：清空/进入生成都算成功，之后绝不再按

    /* =========================================================================
     * 15 出站节奏器（§9.2）—— 统一队列 · 五道门 · 优先级 · 持久化 · 平台拒绝探针
     *   降级顺序：等待 → 合并延后 → 面板提示 → 最后才是剪贴板
     * ====================================================================== */

    // 优先级只决定「合并成一条消息时谁在前」——所有内容最终仍是一条消息（§9.2）。
    // #4 计划进度排最后：先给事实（回执），再给进度。
    const PRIO = {
        // error / checkpoint / nudge 只有测试会传（src 内部不产生），保留为测试钩子
        error: 0, feedback: 1, checkpoint: 2, nudge: 3, bootstrap: 2, plan: 4
    };

    let outbox = { parts: [], inFlight: false, since: 0, timer: null };

    // #6 轮次戳：handleMessage 每处理一轮就 +1 并同步过来。队列里的每条回执都记下自己属于哪一轮，
    //    这样终止符暂停时能分辨「本轮回执」（要发出去）与「本任务旧待回传」（按 §9 丢弃并留痕）。
    let outboxRound = 0;
    function setOutboxRound(n) { outboxRound = Math.max(0, Number(n) || 0); return outboxRound; }
    function outboxRoundNow() { return outboxRound; }

    // ---------------- 收发音量（底部状态栏：轮次 / 收 / 发 / 进度）----------------
    // 只做「本次会话」的粗粒度计量：出站在真正入队时累加；入站按文本指纹去重（同一轮
    // 重扫/重放不重复计），指纹表有上限，不会无限增长。字符数不是精确 token，只用于体感。
    let ioOutChars = 0, ioInChars = 0, ioSeen = [];
    function ioFingerprint(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        return h + ':' + s.length;
    }
    function ioNoteOut(text) { if (text) ioOutChars += String(text).length; }
    function ioNoteIn(text) {
        const s = String(text || '');
        if (!s) return;
        const fp = ioFingerprint(s);
        if (ioSeen.indexOf(fp) >= 0) return;
        ioSeen.push(fp);
        if (ioSeen.length > 40) ioSeen.shift();
        ioInChars += s.length;
    }
    function ioStats() { return { out: ioOutChars, in: ioInChars }; }
    function ioReset() { ioOutChars = 0; ioInChars = 0; ioSeen = []; }

    const REJECT_WORDS = [
        '频繁', '稍后', '太频繁', '操作过快', '请求过于频繁', '请稍后再试', '发送失败',
        'too many requests', 'rate limit', 'slow down', 'try again later', '429'
    ];

    // #2 节奏器等待最长 30s：任何等待来源（含平台限流提示）一律压到 30s 以内。
    // #2 全容器只有「节奏器等待」一个倒计时：平台限流提示不再单独冷却，而是写进同一个 until。
    function clampWaitMs(ms) {
        const v = Math.max(0, Math.round(ms || 0));
        return Math.min(v, CONFIG.PACER_MAX_WAIT_MS);
    }

    function clampUntil(until) {
        const now = Date.now();
        return Math.min(until || 0, now + CONFIG.PACER_MAX_WAIT_MS);
    }

    /* ------- #2 节奏器等待：6 个固定档位（3s→30s）· 固定条件触发 · 不随机 ------- */

    // 档位表（3s / 5s / 8s / 12s / 20s / 30s）来自配置，每档带一句「触发条件」原文；
    // 设置页与文档都读它，保证「面板上写的」就是「代码里判的」。
    function pacerTiers() {
        const list = (Array.isArray(CONFIG.PACER_TIERS) && CONFIG.PACER_TIERS.length)
            ? CONFIG.PACER_TIERS.slice()
            : [{ ms: 3000, need: '常规' }, { ms: 30000, need: '窗口已满' }];
        return list.sort(function (a, b) { return a.ms - b.ms; });
    }

    function pacerTierName(ms) {
        return Math.round((ms || 0) / 1000) + 's';
    }

    function sendsWithin(r, ms, now) {
        return r.sends.filter(function (t) { return now - t < ms; }).length;
    }

    // #2 固定条件 —— 档位完全由「发送历史 + 当前时刻」决定（纯函数，无随机、无状态）。
    //   **从最高档往下判断，先命中先取**（30s → 20s → 12s → 8s → 5s → 3s）：
    //     30s：平台提示太频繁 / 429 / 请求过于频繁；或 1 分钟内 ≥10 条；或 10 分钟内 ≥25 条
    //     20s：1 分钟内 ≥8 条；或 10 分钟内 ≥18 条
    //     12s：1 分钟内 ≥6 条；或 30 秒内 ≥6 条
    //      8s：1 分钟内 ≥4 条；或 30 秒内 ≥4 条
    //      5s：1 分钟内 ≥3 条；或 30 秒内 ≥3 条
    //   （三条「30 秒」阈值取与各自 1 分钟阈值同级：30 秒窗口 ⊂ 1 分钟窗口，取小会让连发在
    //     第 3 条就被 30 秒条款抢先升档，1 分钟只剩 7 条；同级后连发由 1 分钟阶梯主导 → 8 条/分钟）
    //      3s：其余情况（1 分钟内已发 ≤2 条）
    // 先判平台限流，再逐档往下比较 —— 所以「想等 30 秒」的要求是最高的：必须平台已经在抱怨，
    // 或者窗口确实被塞满了（1 分钟满 10 条 / 10 分钟满 25 条）。
    function pacerLevel(r, now) {
        const tiers = pacerTiers();
        const at = function (i) { return tiers[Math.min(i, tiers.length - 1)].ms; };
        const in30s = sendsWithin(r, 30000, now);
        const in1m = sendsWithin(r, 60000, now);
        const in10m = sendsWithin(r, 600000, now);
        // ① 平台限流（探针把窗口写进 r.until）
        if (r.until > now) {
            return { ms: at(5), level: 5, gate: true, reason: '平台限流提示后的等待' };
        }
        // ② 30s 档
        if (in1m >= CONFIG.OUTBOX_MAX_PER_MIN) {
            return { ms: at(5), level: 5, gate: true, reason: '1 分钟已发满 ' + CONFIG.OUTBOX_MAX_PER_MIN + ' 条' };
        }
        if (in10m >= CONFIG.OUTBOX_MAX_PER_10MIN) {
            return { ms: at(5), level: 5, gate: true, reason: '10 分钟已发满 ' + CONFIG.OUTBOX_MAX_PER_10MIN + ' 条' };
        }
        // ③ 20s 档
        if (in1m >= PACER_LV20_PER_MIN) {
            return { ms: at(4), level: 4, gate: false, reason: '1 分钟已发 ' + in1m + ' 条' };
        }
        if (in10m >= PACER_LV20_PER_10MIN) {
            return { ms: at(4), level: 4, gate: false, reason: '10 分钟已发 ' + in10m + ' 条' };
        }
        // ④ 12s 档
        if (in1m >= PACER_LV12_PER_MIN) {
            return { ms: at(3), level: 3, gate: false, reason: '1 分钟已发 ' + in1m + ' 条' };
        }
        if (in30s >= CONFIG.PACER_LV12_PER_30S) {
            return { ms: at(3), level: 3, gate: false, reason: '30 秒已发 ' + in30s + ' 条' };
        }
        // ⑤ 8s 档
        if (in1m >= PACER_LV8_PER_MIN) {
            return { ms: at(2), level: 2, gate: false, reason: '1 分钟已发 ' + in1m + ' 条' };
        }
        if (in30s >= CONFIG.PACER_LV8_PER_30S) {
            return { ms: at(2), level: 2, gate: false, reason: '30 秒已发 ' + in30s + ' 条' };
        }
        // ⑥ 5s 档
        if (in1m >= PACER_LV5_PER_MIN) {
            return { ms: at(1), level: 1, gate: false, reason: '1 分钟已发 ' + in1m + ' 条' };
        }
        if (in30s >= CONFIG.PACER_LV5_PER_30S) {
            return { ms: at(1), level: 1, gate: false, reason: '30 秒已发 ' + in30s + ' 条' };
        }
        // ⑦ 3s 档：其余情况
        return { ms: at(0), level: 0, gate: false, reason: '常规间隔：1 分钟内已发 ' + in1m + ' 条' };
    }

    function pacerWaitMs(r, now) { return pacerLevel(r, now).ms; }

    /* ------------------------- 持久化 ------------------------- */

    function outboxLoad() {
        const saved = Store.get(STORE_OUTBOX, null);
        if (saved && Array.isArray(saved.parts)) {
            outbox.parts = saved.parts.filter(function (p) { return p && p.text; });
            outbox.since = saved.since || 0;
        }
    }

    function outboxSave() {
        Store.set(STORE_OUTBOX, { parts: outbox.parts.slice(-40), since: outbox.since, at: Date.now() });
    }

    function rateLoad() {
        const r = Store.get(STORE_RATE, null);
        if (!r || !Array.isArray(r.sends)) return { sends: [], until: 0 };
        return r;
    }

    function rateSave(r) {
        const now = Date.now();
        r.sends = r.sends.filter(function (t) { return now - t < 10 * 60 * 1000; }).slice(-40);
        Store.set(STORE_RATE, r);   // 读-合并-写（跨标签页共享）
    }

    // 闸5：平台节奏。档位 = pacerLevel()（固定条件、纯函数），等待 = 档位 − 距上一条已过的时间
    // （小于 0 按 0，单次最长 30s）。因为档位不依赖任何「本轮抽到的值」，反复调用
    // （面板每秒刷新、定时器兜底唤醒）结果只会随时间单调变小，绝不会把等待改长或改短 ——
    // 不需要在存储里冻结一次抽签结果。
    function rateCheck() {
        if (CONFIG.RATE_LIMIT_ENABLED === false) return { ok: true, disabled: true };   // #8 关闭节奏器等待
        const now = Date.now();
        const r = rateLoad();
        const lv = pacerLevel(r, now);

        // 平台限流提示窗口未过（写进同一个 r.until，不叠加、不延长）→ 按绝对到期时刻倒计时
        if (r.until > now) {
            return { ok: false, wait: clampWaitMs(r.until - now), reason: lv.reason, why: lv.reason, level: lv.level, tierMs: lv.ms, gate: true };
        }
        // 窗口确实满了（30s 档且是硬条件：平台限流 / 1 分钟满 10 条 / 10 分钟满 25 条）：
        // 本轮固定等 30s，到点再试；仍满就再等一轮（平台仍在限流 → 探针再捕一次、再等一个 ≤30s 窗口）
        if (lv.gate) {
            return { ok: false, wait: clampWaitMs(lv.ms), reason: lv.reason, why: lv.reason, level: lv.level, tierMs: lv.ms, gate: true };
        }
        // 间隔闸：距上一条必须满本轮档位（档位越高要求越高）
        const last = r.sends[r.sends.length - 1];
        if (last && now - last < lv.ms) {
            return {
                ok: false,
                wait: clampWaitMs(lv.ms - (now - last)),
                reason: '最小间隔',
                why: lv.reason,
                level: lv.level,
                tierMs: lv.ms,
                gate: false
            };
        }
        return { ok: true };
    }

    function rateNote() {
        const r = rateLoad();
        r.sends.push(Date.now());
        rateSave(r);
    }

    function rateStatus() {
        const now = Date.now();
        const r = rateLoad();
        const lv = pacerLevel(r, now);
        return {
            in1m: r.sends.filter(function (t) { return now - t < 60000; }).length,
            in10m: r.sends.filter(function (t) { return now - t < 600000; }).length,
            until: r.until || 0,        // #2 唯一等待来源（节奏器等待）
            tierMs: lv.ms,              // #2 当前该用哪一档（固定条件算出来的）
            tierReason: lv.reason,      // #2 为什么是这一档
            level: lv.level
        };
    }

    /* ------------------------- 节奏器倒计时（§9.2） ------------------------- */

    // 等待不再是一个写在状态条上的静态数字：等待期间每秒刷新剩余时间，倒计时归零就立刻重试，
    // 而不是等下一次粗粒度的 scheduleFlush 唤醒（长冷却时也不用每 20s 空转一次）。
    // 定时器只在「此刻确实在等」时存活，等待一结束（发出去了 / 队列空了）立刻清掉——
    // 不引入常驻轮询（§9.1）。
    let pacerWait = null;      // { until, since, reason, state, lastShown }
    let pacerTimer = null;

    // 文案（#3）：有到期时刻 → 「节奏器等待·7s」；没有到期时刻 → 「等 AI 回复结束·已等4s」
    function pacerLabel() {
        if (!pacerWait) return '';
        const now = Date.now();
        if (pacerWait.until > now) return pacerWait.reason + '·' + Math.ceil((pacerWait.until - now) / 1000) + 's';
        return pacerWait.reason + '·已等' + Math.ceil((now - pacerWait.since) / 1000) + 's';
    }

    function pacerStatus() {
        if (!pacerWait) return { active: false, until: 0, reason: '', label: '', remainMs: 0, since: 0 };
        return {
            active: true,
            until: pacerWait.until,
            since: pacerWait.since,
            reason: pacerWait.reason,
            label: pacerLabel(),
            remainMs: Math.max(0, pacerWait.until - Date.now())
        };
    }

    function pacerTick() {
        if (!pacerWait) { stopPacerWait(); return; }
        if (pacerWait.until && Date.now() >= pacerWait.until) {
            // 倒计时归零 → 立刻重试（不再等下一次 scheduleFlush）
            stopPacerWait();
            pushLog('节奏器倒计时归零，立即回传');
            setStatus('pending', '节奏器到点，立即回传');
            flushNow();
            return;
        }
        const label = pacerLabel();
        if (label !== pacerWait.lastShown) {
            pacerWait.lastShown = label;
            setStatus(pacerWait.state, label);
            if (typeof refreshRateHint === 'function') refreshRateHint();
        }
    }

    // opts: { until?: 绝对时刻（有 → 倒计时；没有 → 只显示已等多久）, since?, reason?, state? }
    function startPacerWait(opts) {
        opts = opts || {};
        const now = Date.now();
        const reason = opts.reason || '节奏器等待';
        const same = pacerWait && pacerWait.reason === reason;
        // 至少留 200ms：避免 until 已过期时 pacerTick 立刻 flushNow → 再进同一道门 → 自激
        // #2 单次等待上限 30s（最高档）：超长的冷却也只倒计时到 30s，到点即重试
        const until = opts.until ? clampUntil(Math.max(opts.until, now + 200)) : 0;
        pacerWait = {
            until: until,
            since: same ? pacerWait.since : (opts.since || now),
            reason: reason,
            state: opts.state || (until ? 'cooling' : 'pending'),
            lastShown: ''
        };
        if (!pacerTimer) pacerTimer = setInterval(pacerTick, 1000);
        pacerTick();
    }

    function stopPacerWait() {
        if (pacerTimer) { clearInterval(pacerTimer); pacerTimer = null; }
        pacerWait = null;
    }

    /* ------------------------- 队列 ------------------------- */

    function enqueueOutbound(text, kind) {
        if (!text) return;
        // §9.2 一个整体：同一份内容不重复入队（幂等回执与纠正不会各发一遍）
        for (const p of outbox.parts) if (p.text === text) return;
        // A 的第二副面孔：同一份回执**已经发出去过**就不要再入队 —— 只判「未发队列」时，
        // 重渲染 / 旧批次重放会把同一批回执再发一遍（容器实测批 44 带出 39–43 全部回执）。
        if (isSelfSent(text)) { pushLog('出站去重：同样的内容刚发过，丢弃重复回执', 'warn'); return; }
        ioNoteOut(text);   // 只统计真正进队的内容（去重/自送去掉的都不算）
        const prio = PRIO[kind] == null ? 1 : PRIO[kind];
        // #3 记下这条属于哪个会话：切/新建对话时，属于别的会话的待回传一律丢弃，
        // 否则会把上一个对话的回执发到新对话里（AI 会一头雾水）。
        outbox.parts.push({ text: text, kind: kind || 'feedback', prio: prio, at: Date.now(), conv: safeConvKey(), round: outboxRound });
        // 优先级淘汰：超长时先丢 nudge / checkpoint
        if (outbox.parts.length > 12) {
            outbox.parts.sort(function (a, b) { return a.prio - b.prio || a.at - b.at; });
            outbox.parts = outbox.parts.slice(0, 12);
        }
        if (!outbox.since) outbox.since = Date.now();
        outboxSave();
        pushReceipt(text, kind);
        pushLog('出站队列 +1（' + (kind || 'feedback') + '），当前 ' + outbox.parts.length + ' 条');
        setStatus('pending', '待回传');
        scheduleFlush();
    }

    function safeConvKey() {
        try { return currentConversationKey(); } catch (e) { return 'root'; }
    }

    // #3 会话已切换：属于别的会话的待回传不再发送（保留属于当前会话的）
    function dropForeignParts(key, reason) {
        const want = key || safeConvKey();
        const before = outbox.parts.length;
        outbox.parts = outbox.parts.filter(function (p) { return !p.conv || p.conv === want; });
        const dropped = before - outbox.parts.length;
        if (dropped) {
            outboxSave();
            stopPacerWait();
            pushLog('会话已切换：丢弃 ' + dropped + ' 条属于上一个会话的待回传（' + (reason || '') + '）', 'warn');
        }
        return dropped;
    }

    // #3 新对话：上一个会话留下的待回传全部丢弃（新建的对话里不该出现旧回执，
    // 连标签为 root 的那些也算旧会话的 —— 它们是在这个新对话存在之前排队的）
    function dropAllParts(reason) {
        const n = outbox.parts.length;
        if (!n) return 0;
        outbox.parts = [];
        outboxSave();
        stopPacerWait();
        pushLog('新对话：丢弃 ' + n + ' 条上一个会话的待回传（' + (reason || '') + '）', 'warn');
        return n;
    }

    // #3 同一个对话从「新对话页」变成「带 id 的会话页」：队列里的待回传跟着改标签
    function retagParts(fromKey, toKey) {
        if (!fromKey || !toKey || fromKey === toKey) return 0;
        let n = 0;
        for (const p of outbox.parts) {
            if (p.conv === fromKey) { p.conv = toKey; n++; }
        }
        if (n) outboxSave();
        return n;
    }

    // #6 终止符暂停：只保留「本轮回执」（round === keepRound），其余按「本任务旧待回传」丢弃。
    //    裁决流水留痕（§9）；新任务开始时队列里不会串进上一个任务的待回传。
    function dropTaskLeftoverParts(keepRound, reason) {
        const keep = Number(keepRound) || 0;
        const before = outbox.parts.length;
        const kept = keep ? outbox.parts.filter(function (p) { return p.round === keep; }) : [];
        const dropped = before - kept.length;
        if (!dropped) return 0;
        outbox.parts = kept;
        outboxSave();
        if (!kept.length) stopPacerWait();
        pushLog('因终止符暂停，丢弃 ' + dropped + ' 条本任务待回传（只保留本轮回执 ' + kept.length + ' 条'
            + (reason ? '；' + reason : '') + '）', 'warn');
        return dropped;
    }

    function scheduleFlush(delay) {
        if (outbox.timer) return;
        outbox.timer = setTimeout(function () {
            outbox.timer = null;
            flushOutbox();
        }, delay == null ? OUTBOX_DEBOUNCE_MS : delay);
    }

    function mergeParts(parts) {
        const sorted = parts.slice().sort(function (a, b) { return a.prio - b.prio || a.at - b.at; });
        return sorted.map(function (p) { return p.text; }).join('\n\n---\n\n');
    }

    /* --------------------- #2/#4 搭车块（并入同一条消息） --------------------- */

    // 返回要并入本轮出站消息的附加块（可能为空）。约定：
    //   · 计划进度：计划模式开启时每轮都附（设置里可关）
    // 只在「五道门全过、真的要发了」的合并点调用，所以等待/失败不会白扣提醒。
    function mergeExtras() {
        const out = [];
        const now = Date.now();
        const conv = safeConvKey();
        try {
            const plan = (typeof planOutboundText === 'function') ? planOutboundText() : '';
            if (plan) out.push({ text: plan, kind: 'plan', prio: PRIO.plan, at: now, conv: conv });
        } catch (e) { warn('计划进度搭车失败：', e && e.message); }
        // 冷启动微课：会话头几轮每轮附**一条**最小契约（轮播、有限次）—— 少量多次地固化，
        // 比首轮灌全本记得牢；轮完就停，不会一直叨扰。
        try {
            const lesson = (typeof microLessonText === 'function') ? microLessonText() : '';
            if (lesson) out.push({ text: '【契约】' + lesson, kind: 'nudge', prio: PRIO.nudge, at: now, conv: conv });
        } catch (e) { warn('微课搭车失败：', e && e.message); }
        return out;
    }

    let lastRejectProbeAt = 0;

    // 平台拒绝探针：扫描页面提示（多平台关键词表）。
    // #2 命中后不再启动「平台限流冷却」，而是把一次等待窗口写进节奏器唯一的 until：
    //   · 已经在等待窗口里 → 不重置、不延长（否则倒计时会一轮轮累加，永远等不完）
    //   · 窗口过期后的下一次命中才会开一个新窗口
    function probePlatformReject() {
        if (CONFIG.RATE_LIMIT_ENABLED === false) return false;   // #8 关闭后不再等待
        // 节流 + 只看尾部 20K 字符：拒绝横幅总在输入框附近，没必要每次拼全页文本
        const now = Date.now();
        if (now - lastRejectProbeAt < 10000) return false;
        lastRejectProbeAt = now;
        try {
            const body = document.body || {};
            const text = String(body.innerText || body.textContent || '').slice(-20000).toLowerCase();
            if (!text) return false;
            for (const w of REJECT_WORDS) {
                if (text.indexOf(w.toLowerCase()) === -1) continue;
                const r = rateLoad();
                if (r.until > now) {
                    pushLog('平台仍提示限流（' + w + '）：沿用当前节奏器等待，不叠加倒计时', 'warn');
                    return true;
                }
                const wait = clampWaitMs(CONFIG.PACER_REJECT_WAIT_MS);
                r.until = now + wait;
                rateSave(r);
                pushLog('检测到平台限流提示（' + w + '）：并入节奏器等待 ' + Math.round(wait / 1000) + 's，到点自动重试（载荷已保留）', 'warn');
                return true;
            }
        } catch (e) {}
        return false;
    }

    function flushOutbox(force) {
        if (!outbox.parts.length) { stopPacerWait(); return; }             // 队列空了，等待状态一并清掉
        // 「自动回传」关掉时：只进队列、不自动发送（用户点「立即发送队列」才发，走 force=true）
        if (!force && getUiCfg().autoSend === false) {
            startPacerWait({ reason: '自动回传已关闭（点「立即发送队列」发送）', state: 'pending' });
            return;
        }
        if (typeof isPaused === 'function' && isPaused()) {
            // #1 暂停运行。但 #6 终止符暂停例外：它只阻止**后续**自动识别与执行，
            // 不吞掉已经处理完的本轮回执（队列里此刻只剩本轮回执，旧的已按 §9 丢弃）。
            const carry = typeof pauseAllowsCarryFlush === 'function' && pauseAllowsCarryFlush();
            if (!carry) { stopPacerWait(); return; }
        }
        if (outbox.inFlight) {                                              // 闸2 无在途发送
            startPacerWait({ reason: '在途发送中', state: 'pending' });
            scheduleFlush(1200);
            return;
        }
        if (handling) { scheduleFlush(1500); return; }
        if (isAIStreaming()) {                                              // 闸3 AI 已静默
            pushLog('AI 仍在输出，出站队列等待（' + outbox.parts.length + ' 条）');
            startPacerWait({ reason: '等 AI 回复结束', state: 'pending' });
            scheduleFlush(2500);
            return;
        }
        const composer = findComposer();
        if (!composer) {
            startPacerWait({ reason: '等输入框出现', state: 'pending' });
            scheduleFlush(2500);
            return;
        }
        if (!composerIsEmpty(composer) && !composerIsOurs(composer)) {       // 闸4 输入框空闲（不合并用户草稿）
            pushLog('输入框有用户草稿，出站队列等待清空', 'warn');
            startPacerWait({ reason: '等你清空输入框', state: 'pending' });
            scheduleFlush(3000);
            return;
        }
        if (probePlatformReject()) {
            // #2 平台限流也走同一个「节奏器等待」标签：只有一个倒计时，不累加
            const until = (rateLoad().until) || (Date.now() + clampWaitMs(CONFIG.PACER_REJECT_WAIT_MS));
            startPacerWait({ until: until, reason: '节奏器等待', state: 'cooling' });
            scheduleFlush(5000);
            return;
        }
        const rc = rateCheck();                                             // 闸5 平台节奏
        if (!rc.ok) {
            // 有明确到期时刻 → 动态倒计时；到点由 pacerTick 直接 flushNow
            startPacerWait({ until: Date.now() + rc.wait, reason: '节奏器等待', state: 'cooling' });
            // 文案（要求原文）：节奏器等待：最小间隔·12s 档（触发条件：1 分钟已发 6 条，还需 8s）
            const why = (rc.why && rc.why !== rc.reason) ? ('触发条件：' + rc.why + '，') : '';
            pushLog('节奏器等待：' + rc.reason + '·' + pacerTierName(rc.tierMs || rc.wait) + ' 档（'
                + why + '还需 ' + Math.round(rc.wait / 1000) + 's，倒计时已启动）');
            scheduleFlush(Math.min(rc.wait + 500, 20000));   // setInterval 不可用时的兜底唤醒
            return;
        }

        stopPacerWait();          // 五道门全过：等待结束

        // #4 搭车：计划进度在这里并入**同一条**消息（绝不单独发一条）。
        // 放在五道门之后、合并之前 —— 门没过就还没兑现，不会白扣掉一次提醒。
        // #6 终止符暂停态下不再搭车计划进度：只把本轮回执送出去。
        const extras = (typeof isPaused === 'function' && isPaused()) ? [] : mergeExtras();
        if (extras.length) outbox.parts = outbox.parts.concat(extras);

        if (outbox.parts.length > 1) {
            const kinds = unique(outbox.parts.map(function (p) { return p.kind; })).join('+');
            pushLog('出站合并 ' + outbox.parts.length + ' 条（' + kinds + '）→ 一条消息');
        }
        const merged = mergeParts(outbox.parts);
        outbox.parts = [];
        outbox.since = 0;
        outboxSave();
        outbox.inFlight = true;

        autoSend(merged).then(function (res) {
            outbox.inFlight = false;
            if (res && res.ok === true) {
                rateNote();
                cleanupComposerMark();
                setStatus('sent', '已回传');
                pushLog('出站合并发送（' + merged.length + ' 字符）');
                setTimeout(function () {
                    if (uiStatus && uiStatus.classList.contains('sent')) setStatus('idle', '等待命令', { autoHide: 8000 });
                }, 2200);
            } else if (res && res.ok === 'composer') {
                outbox.parts.unshift({ text: merged, kind: 'retry', prio: 0, at: Date.now() });
                outboxSave();
                setStatus('pending', '已填入输入框（待手动发送）');
                pushLog('冷却/退避：回执已写入输入框未发送（' + (res.reason || '') + '）', 'warn');
            } else if (res && res.ok === 'clipboard') {
                setStatus('pending', '已复制到剪贴板');
                pushLog('降级到剪贴板（最后手段）：' + (res.reason || ''), 'warn');
            } else {
                outbox.parts.unshift({ text: merged, kind: 'retry', prio: 0, at: Date.now() });
                outboxSave();
                setStatus('pending', '发送失败，已回队');
                pushLog('发送失败，回执已回队待重发：' + ((res && res.reason) || '未知'), 'error');
                scheduleFlush(6000);
            }
            refreshUI();
        }).catch(function (e) {
            outbox.inFlight = false;
            outbox.parts.unshift({ text: merged, kind: 'retry', prio: 0, at: Date.now() });
            outboxSave();
            errlog('flushOutbox 异常：', e);
        });
    }

    function flushNow(force) {
        if (outbox.timer) { clearTimeout(outbox.timer); outbox.timer = null; }
        flushOutbox(force);
    }

    /* ------------------------- 输入框 / 发送 ------------------------- */

    let composerCache = { el: null, at: 0 };
    let composerMark = '';      // 脚本自己写进输入框的标记

    function findComposer() {
        const now = Date.now();
        if (composerCache.el && composerCache.el.isConnected && now - composerCache.at < 400) return composerCache.el;
        let nodes = [];
        try { nodes = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]')); } catch (e) { nodes = []; }
        const visible = nodes.filter(function (el) {
            let r;
            try { r = el.getBoundingClientRect(); } catch (e) { return false; }
            if (r.width < 80 || r.height < 16) return false;
            if (r.bottom < 0 || r.top > (window.innerHeight || 800)) return false;
            return true;
        });
        if (!visible.length) { composerCache = { el: null, at: now }; return null; }
        visible.sort(function (a, b) { return b.getBoundingClientRect().top - a.getBoundingClientRect().top; });
        composerCache = { el: visible[0], at: now };
        return visible[0];
    }

    function isTextInputEl(el) {
        try {
            if (typeof HTMLTextAreaElement === 'undefined') return false;
            return !!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement);
        } catch (e) { return false; }
    }

    function composerValue(el) {
        if (!el) return '';
        if (isTextInputEl(el)) return el.value || '';
        return el.textContent || '';
    }

    function composerIsEmpty(el) {
        if (!el) return true;
        if (isTextInputEl(el)) return !String(el.value || '').trim();
        let clone = null;
        try { clone = el.cloneNode(true); } catch (e) { clone = null; }
        if (clone && clone.querySelectorAll) {
            clone.querySelectorAll('[data-slate-placeholder], [data-slate-zero-width], [class*="placeholder"]').forEach(function (n) {
                try { n.remove(); } catch (e) {}
            });
            return !String(clone.textContent || '').trim();
        }
        return !String(el.textContent || '').trim();
    }

    // 输入框里是不是脚本自己写的内容（不是用户草稿）
    function composerIsOurs(el) {
        if (!composerMark || !el) return false;
        const v = composerValue(el);
        return v.indexOf(composerMark) !== -1;
    }

    function cleanupComposerMark() { composerMark = ''; }

    function setComposerText(el, text) {
        if (isTextInputEl(el)) {
            const proto = (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement)
                ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && typeof desc.set === 'function') desc.set.call(el, text);
            else el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true };
        }
        if (el.isContentEditable) {
            try {
                el.focus();
                const before = String(el.textContent || '');
                try {
                    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true, cancelable: true }));
                } catch (e) {}
                if (String(el.textContent || '') === before) {
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    const ok = document.execCommand('insertText', false, text);
                    if (!ok) {
                        el.textContent = text;
                        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
                    }
                }
                return { ok: true };
            } catch (e) {
                return { ok: false, error: 'contenteditable 写入失败：' + e.message };
            }
        }
        return { ok: false, error: '输入框不是 textarea/input/contenteditable' };
    }

    const SEND_LABEL = /send|发送|submit|提交/i;
    const DANGER_LABEL = /sidebar|menu|search|history|settings|设置|搜索|新对话|new chat|侧边|侧栏|清空|clear|关闭|close|stop|停止/i;

    function labelOf(btn) {
        if (!btn || !btn.getAttribute) return '';
        const aria = btn.getAttribute('aria-label');
        if (aria) return String(aria);
        const tooltip = btn.getAttribute('data-tooltip') || btn.getAttribute('title') || '';
        if (tooltip) return String(tooltip);
        return String(btn.textContent || '').trim();
    }

    function collectNearbyButtons() {
        const composer = findComposer();
        const set = new Set();
        if (composer) {
            let p = composer;
            for (let i = 0; i < 5 && p; i++) {
                try { p.querySelectorAll('button, [role="button"]').forEach(function (b) { set.add(b); }); } catch (e) {}
                p = p.parentElement;
            }
        }
        try {
            document.querySelectorAll('button, [role="button"]').forEach(function (b) {
                const r = b.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && r.bottom > (window.innerHeight || 800) * 0.5) set.add(b);
            });
        } catch (e) {}
        return Array.from(set);
    }

    function pickSendButton() {
        const composer0 = findComposer();
        if (composer0 && PLATFORM.dsButtonSpecial) {
            const cr = composer0.getBoundingClientRect();
            let best = null;
            try {
                document.querySelectorAll('[class*="ds-button"]').forEach(function (el) {
                    const cls = (el.className && el.className.toString) ? el.className.toString() : '';
                    if (!/ds-button\b/.test(cls)) return;
                    if (!/primary/.test(cls) || !/filled/.test(cls)) return;
                    if (!el.querySelector('svg')) return;
                    const r = el.getBoundingClientRect();
                    if (r.width < 20 || r.height < 20) return;
                    if (r.left < cr.left - 60 || r.right > cr.right + 120) return;
                    if (r.top > cr.bottom + 200 || r.bottom < cr.top - 60) return;
                    if (!best || r.top < best.r.top) best = { el: el, r: r };
                });
            } catch (e) {}
            if (best) return { btn: best.el, method: 'ds-button', label: '' };
        }
        const candidates = collectNearbyButtons();
        for (const btn of candidates) {
            const label = labelOf(btn);
            if (!label) continue;
            if (SEND_LABEL.test(label) && !DANGER_LABEL.test(label)) return { btn: btn, method: 'label', label: label };
        }
        const composer = findComposer();
        if (composer) {
            const cRect = composer.getBoundingClientRect();
            for (const btn of candidates) {
                if (!btn.querySelector('svg')) continue;
                const label = labelOf(btn);
                if (DANGER_LABEL.test(label)) continue;
                const bRect = btn.getBoundingClientRect();
                if (bRect.width === 0 || bRect.height === 0) continue;
                const vOverlap = Math.min(cRect.bottom, bRect.bottom) - Math.max(cRect.top, bRect.top);
                if (vOverlap <= cRect.height * 0.3) continue;
                if (bRect.left > cRect.left + cRect.width * 0.55 && bRect.left < cRect.right + 200) {
                    return { btn: btn, method: 'geometry', label: label };
                }
            }
        }
        return { btn: null, method: 'enter' };
    }

    function isBtnDisabled(btn) {
        if (!btn) return false;
        try {
            if (btn.disabled === true) return true;
            if (btn.hasAttribute && btn.hasAttribute('disabled')) return true;
            if (btn.getAttribute && btn.getAttribute('aria-disabled') === 'true') return true;
            const cls = (btn.className && btn.className.toString) ? btn.className.toString() : '';
            if (/(^|[\s_-])disabled([\s_-]|$)/i.test(cls)) return true;
        } catch (e) {}
        return false;
    }

    function triggerSend(composerEl) {
        const startAt = Date.now();
        let firstEnabledAt = 0;
        let lastClickAt = 0;
        let sawNonEmpty = false;
        let dispatchedAt = 0;      // #7 已经按下发送的时刻（只要按过一次就绝不再按）
        let dispatchedMethod = '';
        return new Promise(function (resolve) {
            const attempt = function () {
                const now = Date.now();

                // #7 只按一次：按过之后只观察结果，绝不重复按 —— 重复按 = 再发一条 = 打断刚起的 AI 回答
                if (dispatchedAt) {
                    if (composerIsEmpty(composerEl)) { resolve({ ok: true, method: dispatchedMethod }); return; }
                    if (typeof isGenerating === 'function' && isGenerating()) {
                        resolve({ ok: true, method: dispatchedMethod, started: true }); return;   // 页面开始生成 = 发送成功
                    }
                    if (now - dispatchedAt > SEND_POSTCLICK_GRACE_MS) {
                        resolve({ ok: false, reason: '已按下一次发送，但输入框未清空、页面未进入生成；为避免重复发送已停手（可手动再点一次发送）' });
                        return;
                    }
                    setTimeout(attempt, 250);
                    return;
                }

                // 点下去之前再查一次：此刻 AI 若还在生成，点「发送」= 打断它的回答
                if (typeof isGenerating === 'function' && isGenerating()) {
                    resolve({ ok: false, reason: 'AI 正在输出，已取消这次点击（防打断）' });
                    return;
                }
                const picked = pickSendButton();
                const disabled = picked.btn ? isBtnDisabled(picked.btn) : false;
                const val = composerValue(composerEl);
                if (val && val.trim()) sawNonEmpty = true;

                if (composerIsEmpty(composerEl)) { resolve({ ok: true, method: picked.method }); return; }
                if (!sawNonEmpty) { resolve({ ok: false, reason: '输入框从未有过内容（写入可能失败）' }); return; }

                if (!disabled) {
                    if (!firstEnabledAt) firstEnabledAt = now;
                    if (now - lastClickAt >= CLICK_GAP_MS) {
                        if (picked.method === 'enter' || !picked.btn) {
                            const keyOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
                            composerEl.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
                            composerEl.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
                            composerEl.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
                        } else {
                            try { picked.btn.click(); } catch (e) { resolve({ ok: false, reason: '按钮点击异常：' + e.message }); return; }
                        }
                        lastClickAt = now;
                        dispatchedAt = now;              // #7 就此锁定：后面只等结果，不再按第二次
                        dispatchedMethod = picked.method;
                    }
                }
                if (firstEnabledAt && now - firstEnabledAt > SEND_IDLE_GIVEUP_MS) {
                    resolve({ ok: false, reason: '输入框未清空，发送可能失败' });
                    return;
                }
                if (now - startAt > SEND_HARD_LIMIT_MS) {
                    resolve({ ok: false, reason: '发送键长期不可用（附件仍在处理？已等待 ' + Math.round((now - startAt) / 1000) + 's）' });
                    return;
                }
                setTimeout(attempt, disabled ? 400 : 200);
            };
            setTimeout(attempt, 150);
        });
    }

    const recentSendTimes = [];
    let loopBreakUntil = 0;
    let sendFailCount = 0;
    let backoffUntil = 0;

    function checkSendCooldown() {
        const now = Date.now();
        if (loopBreakUntil > now) return { ok: false, reason: '检测到对话循环，已熔断至 ' + fmtClock(loopBreakUntil) };
        while (recentSendTimes.length && recentSendTimes[0] < now - 60000) recentSendTimes.shift();
        return { ok: true };
    }

    function noteSendForLoopGuard() {
        const now = Date.now();
        recentSendTimes.push(now);
        const inWindow = recentSendTimes.filter(function (t) { return now - t < CONFIG.LOOP_WINDOW_MS; });
        if (inWindow.length >= LOOP_MAX_SENDS) {
            loopBreakUntil = now + CONFIG.LOOP_BREAK_MS;
            pushLog('检测到对话循环（' + (CONFIG.LOOP_WINDOW_MS / 1000) + 's 内 ' + inWindow.length + ' 次自动发送），已熔断 ' + (CONFIG.LOOP_BREAK_MS / 60000) + ' 分钟', 'error');
        }
    }

    function fillComposerOnly(text, reason) {
        const composer = findComposer();
        if (!composer) return degradeToClipboard(text, reason + '（无输入框）');
        let payload = text;
        if (!composerIsEmpty(composer) && !composerIsOurs(composer)) {
            return degradeToClipboard(text, reason + '（输入框有你的草稿，未覆盖）');
        }
        const r = setComposerText(composer, payload);
        if (!r.ok) return degradeToClipboard(text, reason + '（写入输入框失败）');
        composerMark = text.slice(0, 24);
        pushLog('已写入输入框未发送（' + (reason || '') + '）', 'warn');
        return { ok: 'composer', reason: reason };
    }

    // 降级最后手段
    function degradeToClipboard(text, reason) {
        try { if (typeof GM_setClipboard === 'function') { GM_setClipboard(text); return { ok: 'clipboard', reason: reason }; } } catch (e) {}
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(function () {});
                return { ok: 'clipboard', reason: reason };
            }
        } catch (e) {}
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return { ok: ok ? 'clipboard' : false, reason: reason };
        } catch (e) {
            return { ok: false, reason: reason + ' / 剪贴板亦失败' };
        }
    }

    async function autoSend(text) {
        if (backoffUntil > Date.now()) {
            return fillComposerOnly(text, '退避中（还需 ' + Math.ceil((backoffUntil - Date.now()) / 1000) + 's）');
        }
        // 最后一道「不打断 AI」保险：生成中点发送会中断这次回答
        if (typeof isGenerating === 'function' && isGenerating()) {
            return { ok: false, reason: 'AI 仍在输出，暂不发送（防打断）' };
        }
        const cd = checkSendCooldown();
        if (!cd.ok) return fillComposerOnly(text, cd.reason);
        const composer = findComposer();
        if (!composer) return degradeToClipboard(text, '找不到输入框');
        if (!composerIsEmpty(composer) && !composerIsOurs(composer)) {
            return degradeToClipboard(text, '输入框非空（你可能正在打字）');
        }
        const setResult = setComposerText(composer, text);
        if (!setResult.ok) return degradeToClipboard(text, setResult.error);
        composerMark = text.slice(0, 24);
        markSelfSent(text);

        const sendResult = await triggerSend(composer);
        if (sendResult.ok) {
            sendFailCount = 0;
            backoffUntil = 0;
            noteSendForLoopGuard();
            witnessSend('auto-send');
            composerMark = '';
            return { ok: true };
        }
        sendFailCount++;
        if (sendFailCount >= 2) {
            const delay = Math.min(60000, 2000 * Math.pow(2, sendFailCount - 2));
            backoffUntil = Date.now() + delay;
            pushLog('连续发送失败 ' + sendFailCount + ' 次，退避 ' + (delay / 1000) + 's', 'error');
        }
        return fillComposerOnly(text, sendResult.reason || '发送失败');
    }

/* >>> 19-importexport.js */
    /* =========================================================================
     * 19 导入 / 导出（§11.1 保留）：本地文件 → 容器；容器 → JSON / ZIP
     * ====================================================================== */

    const CRC_TABLE = (function () {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();

    function crc32(u8) {
        let c = 0xffffffff;
        for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    }

    function utf8(str) {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(str));
        const out = [];
        const s = String(str);
        for (let i = 0; i < s.length; i++) {
            let c = s.charCodeAt(i);
            if (c < 0x80) out.push(c);
            else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
            else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        }
        return new Uint8Array(out);
    }

    function dosStamp() {
        const d = new Date();
        const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
        const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
        return { time: time, date: date };
    }

    function buildZip(files) {
        // files: [{ path: '/a/b.txt', content: '...' }]
        const chunks = [];
        const central = [];
        let offset = 0;
        const stamp = dosStamp();
        const push = function (u8) { chunks.push(u8); offset += u8.length; };

        for (const f of files) {
            const name = utf8(f.path.replace(/^\//, ''));
            const data = utf8(f.content);
            const crc = crc32(data);
            const local = new Uint8Array(30 + name.length);
            const dv = new DataView(local.buffer);
            dv.setUint32(0, 0x04034b50, true);
            dv.setUint16(4, 20, true);
            dv.setUint16(6, 0x0800, true);
            dv.setUint16(8, 0, true);
            dv.setUint16(10, stamp.time, true);
            dv.setUint16(12, stamp.date, true);
            dv.setUint32(14, crc, true);
            dv.setUint32(18, data.length, true);
            dv.setUint32(22, data.length, true);
            dv.setUint16(26, name.length, true);
            dv.setUint16(28, 0, true);
            local.set(name, 30);
            const localOffset = offset;
            push(local);
            push(data);

            const cen = new Uint8Array(46 + name.length);
            const cv = new DataView(cen.buffer);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint16(8, 0x0800, true);
            cv.setUint16(10, 0, true);
            cv.setUint16(12, stamp.time, true);
            cv.setUint16(14, stamp.date, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true);
            cv.setUint16(28, name.length, true);
            cv.setUint16(30, 0, true);
            cv.setUint16(32, 0, true);
            cv.setUint16(34, 0, true);
            cv.setUint16(36, 0, true);
            cv.setUint32(38, 0, true);
            cv.setUint32(42, localOffset, true);
            cen.set(name, 46);
            central.push(cen);
        }
        const centralStart = offset;
        for (const c of central) push(c);
        const end = new Uint8Array(22);
        const ev = new DataView(end.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(8, files.length, true);
        ev.setUint16(10, files.length, true);
        ev.setUint32(12, offset - centralStart, true);
        ev.setUint32(16, centralStart, true);
        push(end);

        const total = chunks.reduce(function (n, c) { return n + c.length; }, 0);
        const out = new Uint8Array(total);
        let p = 0;
        for (const c of chunks) { out.set(c, p); p += c.length; }
        return out;
    }

    function collectExport(node, prefix, out) {
        if (!node || node.type !== 'dir') return out;
        for (const name of Object.keys(node.children).sort()) {
            const c = node.children[name];
            const p = prefix + name;
            if (c.type === 'dir') collectExport(c, p + '/', out);
            else out.push({ path: p, content: String(c.content == null ? '' : c.content) });
        }
        return out;
    }

    function downloadBlob(blobOrBytes, filename, mime) {
        try {
            if (typeof URL === 'undefined' || !URL.createObjectURL) return false;
            const isBlob = typeof Blob !== 'undefined' && blobOrBytes instanceof Blob;
            const blob = isBlob ? blobOrBytes : new Blob([blobOrBytes], { type: mime || 'application/octet-stream' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 5000);
            return true;
        } catch (e) { return false; }
    }

    function stamp() {
        const d = new Date();
        const p = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    }

    function runExport() {
        const files = collectExport(VirtualFS.root, '/', []).filter(function (f) {
            return f.path.indexOf(TRASH_PREFIX) !== 0;
        });
        if (!files.length) { showToast('容器里没有可导出的文件', 'warn'); return; }
        const bytes = buildZip(files);
        const name = 'dsw-workspace-' + stamp() + '.zip';
        if (downloadBlob(bytes, name, 'application/zip')) showToast('已导出 ' + name + '（' + files.length + ' 个文件）');
        else showToast('当前环境不支持下载', 'warn');
    }

    function exportJson() {
        const json = JSON.stringify(VirtualFS.snapshot(), null, 2);
        if (downloadBlob(json, 'dsw-workspace-' + stamp() + '.json', 'application/json')) showToast('已导出 JSON（' + fmtSize(byteLen(json)) + '）');
        else { copyText(json); showToast('已复制 JSON 到剪贴板（' + fmtSize(byteLen(json)) + '）'); }
    }

    /* ---- 导入：单/多文件 + 整个文件夹（webkitdirectory）+ 严格校验 + 进度 ----
     * 根因：导入的不是「文本」，是**字节**。用 readAsText 等于把非法 UTF-8 交给浏览器猜
     * （非法字节静默变成 U+FFFD 写进容器），二进制文件也会变成一堆乱码。
     * 所以：先读 ArrayBuffer → 判二进制（NUL / 控制字符占比）→ 严格 UTF-8 校验 → 再落盘；
     * 「二进制 / 非法编码 / 超限 / 同名」分类跳过并**列清单**（不让用户猜为什么少了文件）。
     */
    function looksBinaryBytes(u8) {
        if (!u8 || !u8.length) return false;
        const n = Math.min(u8.length, 4096);
        let ctrl = 0;
        for (let i = 0; i < n; i++) {
            const b = u8[i];
            if (b === 0) return true;                              // NUL → 铁定二进制
            if (b < 0x09 || (b > 0x0D && b < 0x20)) ctrl++;        // 控制符（TAB/LF/CR/FF 例外）
        }
        return ctrl / n > 0.1;                                     // 控制符占比 >10%
    }

    // 手写严格 UTF-8 校验（也用于没有 TextDecoder 的老环境）：拒绝 overlong / 代理区 / 超范围 / 截断
    function manualUtf8(u8) {
        let out = '';
        let i = 0;
        const cont = function (k) { return i + k < u8.length && (u8[i + k] & 0xC0) === 0x80; };
        while (i < u8.length) {
            const b = u8[i];
            if (b < 0x80) { out += String.fromCharCode(b); i++; continue; }
            if (b >= 0xC2 && b <= 0xDF && cont(1)) { out += String.fromCharCode(((b & 0x1F) << 6) | (u8[i + 1] & 0x3F)); i += 2; continue; }
            if (b >= 0xE0 && b <= 0xEF && cont(1) && cont(2)) {
                const cp = ((b & 0x0F) << 12) | ((u8[i + 1] & 0x3F) << 6) | (u8[i + 2] & 0x3F);
                if (cp < 0x800 || (cp >= 0xD800 && cp <= 0xDFFF)) return { ok: false, error: 'UTF-8 非法（overlong 或代理区码点）' };
                out += String.fromCharCode(cp); i += 3; continue;
            }
            if (b >= 0xF0 && b <= 0xF4 && cont(1) && cont(2) && cont(3)) {
                const cp = ((b & 0x07) << 18) | ((u8[i + 1] & 0x3F) << 12) | ((u8[i + 2] & 0x3F) << 6) | (u8[i + 3] & 0x3F);
                if (cp < 0x10000 || cp > 0x10FFFF) return { ok: false, error: 'UTF-8 非法（码点超范围）' };
                const v = cp - 0x10000;
                out += String.fromCharCode(0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF)); i += 4; continue;
            }
            return { ok: false, error: 'UTF-8 非法（第 ' + (i + 1) + ' 个字节起）' };
        }
        return { ok: true, text: out };
    }

    function strictUtf8(u8) {
        if (!u8 || !u8.length) return { ok: true, text: '' };
        try {
            if (typeof TextDecoder === 'function') {
                const text = new TextDecoder('utf-8', { fatal: true }).decode(u8);
                return { ok: true, text: text };
            }
        } catch (e) {
            return { ok: false, error: '不是合法的 UTF-8' };
        }
        return manualUtf8(u8);
    }

    // 纯逻辑：吃「已经读成字节」的条目 → 落盘 + 分类跳过（便于单测，不依赖 FileReader）
    function importEntries(entries, opts) {
        opts = opts || {};
        const list = Array.isArray(entries) ? entries : [];
        const base = uiState.filesPath === '/' ? '' : uiState.filesPath;
        const res = { imported: 0, skipped: [], bytes: 0 };
        uiState.importProg = { done: 0, total: list.length, name: '' };
        try { refreshUI(); } catch (e) {}
        for (let i = 0; i < list.length; i++) {
            const e = list[i] || {};
            const rel = String(e.rel || e.name || 'file').replace(/^\/+/, '');
            uiState.importProg = { done: i, total: list.length, name: rel };
            updateImportProg();
            const u8 = e.bytes || new Uint8Array(0);
            if (u8.length > CONFIG.MAX_FILE_SIZE) { res.skipped.push({ name: rel, why: '超限 ' + fmtSize(u8.length) }); continue; }
            if (looksBinaryBytes(u8)) { res.skipped.push({ name: rel, why: '二进制（NUL 或控制符占比高）' }); continue; }
            const dec = strictUtf8(u8);
            if (!dec.ok) { res.skipped.push({ name: rel, why: dec.error }); continue; }
            const target = (base + '/' + rel).replace(/\/{2,}/g, '/');
            if (VirtualFS.resolve(target)) { res.skipped.push({ name: rel, why: '同名已存在（不覆盖）' }); continue; }
            const w = VirtualFS.write(target, dec.text, {});
            if (!w.ok) { res.skipped.push({ name: rel, why: w.error }); continue; }
            res.imported++;
            res.bytes += u8.length;
        }
        uiState.importProg = { done: list.length, total: list.length, name: '完成' };
        updateImportProg();
        setTimeout(function () { uiState.importProg = null; try { refreshUI(); } catch (e) {} }, 1800);
        return res;
    }

    function importReport(res) {
        const lines = ['导入 ' + res.imported + ' 个文件（' + fmtSize(res.bytes) + '）'];
        if (res.skipped.length) {
            lines.push('跳过 ' + res.skipped.length + ' 个：');
            for (const s of res.skipped.slice(0, 8)) lines.push('· ' + s.name + ' —— ' + s.why);
            if (res.skipped.length > 8) lines.push('· …其余 ' + (res.skipped.length - 8) + ' 个见日志');
        }
        return lines.join('\n');
    }

    function readBytes(file) {
        return new Promise(function (resolve) {
            try {
                const r = new FileReader();
                r.onload = function () { try { resolve(new Uint8Array(r.result || new ArrayBuffer(0))); } catch (e) { resolve(null); } };
                r.onerror = function () { resolve(null); };
                r.readAsArrayBuffer(file);
            } catch (e) { resolve(null); }
        });
    }

    async function importFiles(files, opts) {
        const list = Array.from(files || []);
        const entries = [];
        for (const f of list) {
            // 文件夹导入保留目录结构：webkitRelativePath 形如 "src/components/App.tsx"
            const rel = String(f.webkitRelativePath || f.name || 'file');
            const bytes = await readBytes(f);
            if (!bytes) { entries.push({ rel: rel, bytes: new Uint8Array(0) }); continue; }
            entries.push({ rel: rel, bytes: bytes });
        }
        return importEntries(entries, opts);
    }

    /* 进度行：导入大目录时不能让用户干等（3/47  src/components/App.tsx） */
    function updateImportProg() {
        try {
            if (!uiPanel) return;
            const box = uiPanel.querySelector('.dsw2-importprog');
            if (!box) return;
            const p = uiState.importProg;
            box.textContent = p ? (p.done + '/' + p.total + '  ' + (p.name || '')) : '';
        } catch (e) {}
    }

    /* ---------- 交付端口（core 的 upload 调用这里） ----------
     * 双模式：先试**页面附件入口**（平台声明了 attach.fileInput）把文件放进聊天；
     * 不行再回退浏览器下载，并在回执里说清是哪一种、为什么。碰 document/File/DataTransfer 的都在这里。
     */
    function attachToComposer(name, content, mime) {
        try {
            const cfg = (typeof PLATFORM !== 'undefined' && PLATFORM && PLATFORM.attach) || null;
            const sel = cfg && cfg.fileInput;
            if (!sel) return { ok: false, why: '本平台没有声明附件入口' };
            if (typeof document === 'undefined' || !document.querySelector) return { ok: false, why: '无 DOM' };
            const input = document.querySelector(sel);
            if (!input) return { ok: false, why: '页面上找不到文件输入框' };
            if (typeof File !== 'function' || typeof DataTransfer !== 'function') return { ok: false, why: '环境不支持 File/DataTransfer' };
            const file = new File([content], name, { type: mime || cfg.mime || 'text/plain;charset=utf-8' });
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true, how: 'attach' };
        } catch (e) {
            return { ok: false, why: (e && e.message) || '附件写入失败' };
        }
    }

    function deliverFile(name, content) {
        const sizeText = fmtSize(byteLen(content));
        const att = attachToComposer(name, content);
        if (att.ok) {
            return { ok: true, attach: true, summary: '⇧ 已放进输入框（附件）' + name + ' ' + sizeText + ' —— 在聊天里点发送即可' };
        }
        const made = downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), name);
        return {
            ok: false, attach: false,
            summary: made
                ? ('⇩ 已下载 ' + name + ' ' + sizeText + (att.why ? '；本平台没有附件入口（' + att.why + '），已回退为下载' : ''))
                : ('⇩ ' + name + ' 已就绪（' + sizeText + '）' + (att.why ? '；本平台没有附件入口（' + att.why + '）' : '')),
            warn: made ? [] : ['当前环境不支持自动下载，请在文件页手动导出']
        };
    }

    function pickFilesForImport(folder) {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            if (folder) {
                input.webkitdirectory = true;                 // 整个文件夹（保留目录结构）
                input.setAttribute('webkitdirectory', '');
                input.setAttribute('directory', '');
            }
            input.style.display = 'none';
            input.addEventListener('change', function () {
                const files = Array.from(input.files || []);
                Promise.resolve(importFiles(files, {})).then(function (res) {
                    const text = importReport(res);
                    showToast('导入完成：' + res.imported + ' 个' + (res.skipped.length ? '，跳过 ' + res.skipped.length + ' 个' : ''),
                        res.skipped.length ? 'warn' : '');
                    for (const line of text.split('\n')) pushLog(line, res.skipped.length ? 'warn' : '');
                    refreshUI();
                }).catch(function (e) {
                    showToast('导入失败：' + (e && e.message ? e.message : e), 'warn');
                });
            });
            document.body.appendChild(input);
            input.click();
            setTimeout(function () { try { input.remove(); } catch (e) {} }, 60000);
        } catch (e) {
            showToast('当前环境不支持文件选择', 'warn');
        }
    }

/* >>> 17-css.js */
    /* =========================================================================
     * 17 样式（新 UI · 全屏上滑面板 · 大标题 + 底部页签 · 灰底白卡）
     *   对位 preview/希望三：悬浮球（环形进度 + 未读角标）→ 全屏面板；
     *   头部 = 状态点 + 大标题 + 配色钮 + 收起钮；体征读数 + 四枚动作（刷新/注入/快照/清空）；
     *   计划条贴头部下方；内容区灰底白卡；底部四页签（文件/回执/设置/关于）。
     *   配色 = 五套调色板 × 浅/深，由 18-ui 把 token 直接内联到 .dsw2-root（所以主题切换无死角）。
     *   硬约束：触控区不缩（按钮 ≥44px、行 ≥52px）；无 emoji；不改宿主页样式（Shadow DOM + all:initial）。
     * ====================================================================== */

    const CSS = [
        ':host{all:initial}',
        '.dsw2-root{--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;',
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;pointer-events:none;',
        'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;',
        'font-size:14px;line-height:1.45;color:var(--fg);-webkit-text-size-adjust:100%}',
        '.dsw2-root *{box-sizing:border-box}',
        '.dsw2-root button{font-family:inherit;font-size:inherit;color:inherit;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}',
        '.dsw2-root :focus-visible{outline:2px solid var(--ac);outline-offset:2px}',
        '.dsw2-root svg{width:100%;height:100%;display:block}',

        /* 悬浮球 */
        '.ball{position:fixed;width:56px;height:56px;border-radius:50%;pointer-events:auto;z-index:3;',
        'background:var(--sf);border:1px solid var(--ln);box-shadow:0 5px 18px rgba(0,0,0,.32);',
        'display:flex;align-items:center;justify-content:center;touch-action:none;transition:transform .12s}',
        '.ball svg{position:absolute;top:0;left:0;width:100%;height:100%;transform:rotate(-90deg)}',
        '.ball .ic{position:relative;font:600 13px/1 var(--mono);letter-spacing:.02em;color:var(--ac)}',
        '.ball .ic.pause{display:none}',
        '.ball.paused .ic.dsw{display:none}',
        '.ball.paused .ic.pause{display:block}',
        '.ball.paused{border-style:dashed;border-color:var(--wn)}',
        '.ball.paused .ic{color:var(--wn)}',
        '.ball .badge{display:none;position:absolute;top:-1px;right:-1px;width:13px;height:13px;border-radius:50%;background:var(--er);box-shadow:0 0 0 2px var(--bg)}',
        '.ball.has-log .badge{display:block}',
        '.ball.holding::after{content:"";position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px;border-radius:50%;border:2px solid var(--ac);animation:dswhold .55s linear forwards}',
        '@keyframes dswhold{from{transform:scale(.75);opacity:.9}to{transform:scale(1);opacity:.15}}',
        '.ball.pulse{animation:dswpulse .45s ease}',
        '@keyframes dswpulse{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}',
        '.ball.dragging{transform:scale(1.06)}',

        /* 状态提示（跟随悬浮球） */
        '.hint{position:fixed;left:0;top:0;max-width:min(280px,calc(100vw - 24px));pointer-events:none;z-index:2;',
        'background:var(--sf);border:1px solid var(--ln);border-left:3px solid var(--ln);border-radius:10px;padding:8px 10px;',
        'box-shadow:0 6px 22px rgba(0,0,0,.3);opacity:0;transition:opacity .18s}',
        '.hint.on{opacity:1}',
        '.hint .h1{font-size:13px;font-weight:600}',
        '.hint .h2{font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:2px;word-break:break-all}',
        '.hint.received{border-left-color:var(--ac)}',
        '.hint.pending{border-left-color:var(--wn)}',
        '.hint.sent{border-left-color:var(--ok)}',
        '.hint.cooling{border-left-color:var(--er)}',
        '.hint.paused{border-left-color:var(--wn)}',

        /* Toast */
        '.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:7;',
        'max-width:calc(100vw - 32px);background:var(--sf);border:1px solid var(--ln);color:var(--fg);',
        'padding:10px 14px;border-radius:10px;font-size:13px;pointer-events:none;opacity:0;',
        'transition:opacity .2s,transform .2s;box-shadow:0 8px 26px rgba(0,0,0,.32)}',
        '.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
        '.toast.warn{border-color:var(--wn)}',
        '.toast.err{border-color:var(--er)}',
        /* 底部 Tab 已移除：Toast 不再需要抬高，回到 .toast 的默认 26px 即可 */

        /* 面板 */
        '.panel{position:fixed;left:0;right:0;top:0;bottom:0;height:100dvh;display:flex;flex-direction:column;',
        'background:var(--bg);z-index:4;',
        'pointer-events:auto;overflow:hidden;transform:translateY(101%);',
        'transition:transform .26s cubic-bezier(.2,.8,.2,1)}',
        '.panel.on{transform:translateY(0)}',

        /* 头部 */
        '.ph{position:relative;z-index:4;flex:none;padding:calc(10px + env(safe-area-inset-top)) 12px 9px;border-bottom:1px solid var(--ln);background:var(--bg)}',
        '.ph1{display:flex;align-items:center;gap:8px}',
        '.ph1 .dot{width:7px;height:7px;border-radius:50%;background:var(--ok);flex:none}',
        '.ph1 .dot.pz{background:var(--wn)}',
        '.ph1 .ttl{flex:1;min-width:0;font-size:15px;font-weight:600;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.ibtn{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--dim)}',
        '.ibtn svg{width:16px;height:16px}',
        '.ibtn:hover{background:var(--sf);color:var(--fg)}',
        '.ibtn.on{background:var(--sf);color:var(--ac)}',

        /* 计划条 */
        '.planbar{flex:none;border-bottom:1px solid var(--ln);background:var(--sf)}',
        '.psum{display:flex;align-items:center;gap:8px;padding:8px 12px;min-height:44px;cursor:pointer}',
        '.bdg{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid currentColor;color:var(--ac);flex:none}',
        '.ptxt{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.pct{font-family:var(--mono);font-size:11px;color:var(--dim)}',
        '.pbar{height:3px;background:var(--ln)}',
        '.pbar i{display:block;height:100%;background:var(--ac);transition:width .25s}',
        '.pitems{padding:2px 6px 8px}',
        '.pitem{display:flex;align-items:center;gap:6px;min-height:44px}',
        '.pstat{width:44px;height:44px;border-radius:8px;font-size:15px;color:var(--dim);flex:none}',
        '.pstat.run{color:var(--ac)}.pstat.done{color:var(--ok)}',
        '.pstat:hover{background:var(--bg)}',
        '.ptxt2{font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.pitem.done .ptxt2{color:var(--dim);text-decoration:line-through}',
        '.pempty{font-size:12px;color:var(--dim);padding:8px 10px;font-family:var(--mono)}',
        '.pfoot{display:flex;gap:6px;padding:6px 4px 2px}',

        /* 内容区 */
        '.pbody{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:10px 12px 18px}',

        /* 面包屑 / 工具 */
        '.crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;font-family:var(--mono);font-size:12px;margin-bottom:8px}',
        '.crumbs button{color:var(--ac);padding:8px 6px;border-radius:6px;font-family:inherit;font-size:12px}',
        '.crumbs .sep{color:var(--dim)}',
        '.crumbs .up{color:var(--dim);width:32px;padding:8px 0;display:flex}',
        '.crumbs .up svg{width:14px;height:14px}',
        '.btn{min-height:44px;padding:0 14px;border-radius:9px;border:1px solid var(--ln);background:var(--sf);',
        'font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:6px;color:var(--fg)}',
        '.btn.pri{background:var(--ac);color:var(--acf);border-color:var(--ac);font-weight:600}',
        '.btn.dgr{color:var(--er);border-color:var(--er)}',
        '.btn.sm{min-height:38px;padding:0 11px;font-size:12px}',
        '.btn[disabled]{opacity:.4;pointer-events:none}',
        '.form{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}',
        '.form--create{margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)}',
        '.inp{flex:1 1 140px;min-width:0;height:44px;border:1px solid var(--ln);border-radius:9px;background:var(--sf);',
        'color:var(--fg);padding:0 12px;font-family:var(--mono);font-size:13px;outline:none}',
        '.inp:focus{border-color:var(--ac)}',
        '.inp::placeholder{color:var(--dim)}',

        /* 列表行 */
        '.row{display:flex;align-items:center;gap:10px;min-height:52px;padding:4px 4px 4px 6px;border-bottom:1px solid var(--ln);cursor:pointer}',
        '.row:hover{background:var(--sf)}',
        '.row .ic{width:20px;height:20px;flex:none;color:var(--dim)}',
        '.row .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.row .meta{font-family:var(--mono);font-size:11px;color:var(--dim);flex:none}',
        '.row .more{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--dim);border-radius:8px}',
        '.row .more:hover{background:var(--bg);color:var(--fg)}',
        '.row.sys{background:linear-gradient(90deg,var(--sf),transparent 60%)}',
        '.row.sys .nm{font-family:var(--mono);color:var(--dim)}',
        '.row.sys .ic{color:var(--wn)}',
        '.row .ck{width:20px;height:20px;flex:none;border:1.5px solid var(--ln);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--acf)}',
        '.row.sel .ck{background:var(--ac);border-color:var(--ac)}',

        /* 空状态 */
        '.empty{padding:28px 10px;text-align:center;color:var(--dim);font-size:13px;line-height:1.7}',
        '.empty b{color:var(--fg)}',
        '.empty .eg{font-family:var(--mono);font-size:12px;background:var(--sf);border:1px solid var(--ln);',
        'border-radius:8px;padding:8px 10px;margin:10px 0;word-break:break-all;color:var(--fg)}',

        /* 文件详情页 —— 文本编辑器式布局：标题栏 / 动作条 / 带行号的代码区 / 状态栏 */
        '.btn svg{width:15px;height:15px;flex:none}',
        '.pbody--editor{display:flex;flex-direction:column;padding:0;overflow:hidden}',
        '.ed{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--sf)}',
        '.ed-main{flex:1;min-height:0;display:flex;overflow:hidden;background:var(--sf)}',
        '.ed-wrap{flex:1;min-height:0;display:flex;overflow:hidden;background:var(--sf)}',
        '.ed-gutter{flex:none;width:46px;overflow:hidden;padding:12px 0;text-align:right;',
        'font-family:var(--mono);font-size:12px;line-height:1.75;color:var(--dim);background:var(--sf);',
        'border-right:1px solid var(--ln);user-select:none;-webkit-user-select:none}',
        '.ed-gutter .g{padding-right:9px}',
        '.ta{flex:1;min-width:0;min-height:0;font-family:var(--mono);font-size:12px;line-height:1.75;',
        'background:var(--sf);color:var(--fg);border:none;border-radius:0;padding:12px;resize:none;outline:none;',
        'white-space:pre;overflow:auto;tab-size:4}',
        '.ta:focus{box-shadow:inset 2px 0 0 var(--ac)}',
        '.ed-status{flex:none;display:flex;align-items:center;gap:12px;padding:6px 10px calc(6px + env(safe-area-inset-bottom));',
        'border-top:1px solid var(--ln);background:var(--bg);font-family:var(--mono);font-size:10.5px;color:var(--dim);',
        'overflow-x:auto;white-space:nowrap}',
        '.ed-status .sp{flex:1}',
        '.ed-status b{color:var(--fg);font-weight:600}',
        '.ed-status .ro{color:var(--wn)}',
        '.ed-status .rw{color:var(--ok)}',

        /* 回执筛选：固定等宽标签 —— 强制一排、左右等距、均分空间、禁止横向滚动 */
        '.filters{display:flex;flex-wrap:nowrap;justify-content:space-between;gap:4px;',
        'overflow:hidden;padding:12px 16px;-webkit-overflow-scrolling:auto}',
        '.filters button{flex:1 1 0;min-width:0;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
        'min-height:36px;padding:0 4px;border-radius:9px;border:1px solid var(--ln);font-size:12px;color:var(--dim)}',
        '.filters button.on{background:var(--ac);color:var(--acf);border-color:var(--ac);font-weight:600}',
        '.rc{border:1px solid var(--ln);border-left-width:3px;border-left-style:solid;border-left-color:var(--dim);',
        'border-radius:9px;padding:9px 11px;margin-bottom:8px;background:var(--sf)}',
        '.rc.ok{border-left-color:var(--ok)}.rc.auto{border-left-color:var(--ac)}',
        '.rc.partial{border-left-color:var(--wn)}.rc.deny{border-left-color:var(--er)}.rc.noop{border-left-color:var(--dim)}',
        '.rc .rh{display:flex;align-items:center;gap:8px}',
        '.rc .k{font-family:var(--mono);font-size:10px;padding:1px 5px;border-radius:4px;border:1px solid currentColor;color:var(--dim)}',
        '.rc.ok .k{color:var(--ok)}.rc.auto .k{color:var(--ac)}.rc.partial .k{color:var(--wn)}.rc.deny .k{color:var(--er)}',
        '.rc .t{font-family:var(--mono);font-size:11px;color:var(--dim);margin-left:auto}',
        '.rc .sum{font-size:13px;margin-top:6px;word-break:break-word}',
        '.rc .det{font-family:var(--mono);font-size:11px;color:var(--dim);white-space:pre-wrap;word-break:break-all;',
        'margin-top:7px;border-top:1px dashed var(--ln);padding-top:7px;line-height:1.7}',
        '.sh{font-size:12px;font-weight:600;color:var(--dim);margin:16px 0 6px;letter-spacing:.02em}',
        '.log{display:flex;gap:8px;font-family:var(--mono);font-size:11px;padding:7px 0;border-bottom:1px solid var(--ln);line-height:1.5}',
        '.log .tm{color:var(--dim);flex:none}',
        '.log .lv{flex:none;width:26px}',
        '.log .ms{flex:1;word-break:break-word}',
        '.log.info .lv{color:var(--ac)}.log.warn .lv{color:var(--wn)}.log.err .lv{color:var(--er)}',

        /* 设置 */
        '.set{display:flex;align-items:center;gap:10px;min-height:48px;padding:8px 11px;border-bottom:1px solid var(--ln)}',
        '.set:last-child{border-bottom:none}',
        '.set.col{display:block;padding:11px}',
        '.set.btns{gap:6px;flex-wrap:wrap;padding:10px 11px}',
        '.set[data-tog]{cursor:pointer}',
        '.set .lb{flex:1;font-size:13px;line-height:1.5}',
        '.set.col .lb{display:block}',
        '.set .sub{display:block;font-size:11px;color:var(--dim);font-family:var(--mono);margin-top:4px;line-height:1.6}',
        '.set .mn{font-family:var(--mono);color:var(--ac);font-weight:600}',
        '.sw{width:46px;height:28px;border-radius:14px;background:var(--ln);position:relative;flex:none;transition:background .18s}',
        '.sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;',
        'background:var(--bg);transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
        '.sw.on{background:var(--ac)}',
        '.sw.on::after{transform:translateX(18px);background:#fff}',
        '.stat{display:flex}',
        '.stat button{flex:1;min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-right:1px solid var(--ln)}',
        '.stat button:last-child{border-right:none}',
        '.stat b{font-family:var(--mono);font-size:19px;color:var(--ac)}',
        '.stat span{font-size:11px;color:var(--dim)}',
        '.colwrap{padding:8px 10px}',
        '.swatch{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:0 9px;border-radius:8px;border:1px solid transparent;font-size:13px}',
        '.swatch.on{border-color:var(--ac);background:var(--sf)}',
        '.swatch i{width:15px;height:15px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(128,128,128,.35)}',
        '.swatch i+i{margin-left:-13px}',
        '.swatch span{margin-left:6px}',
        '.seg{display:flex;gap:5px;padding:6px 10px 11px}',
        '.seg button{flex:1;min-height:40px;border:1px solid var(--ln);border-radius:8px;font-size:12px;color:var(--dim)}',
        '.seg button.on{background:var(--ac);color:var(--acf);border-color:var(--ac);font-weight:600}',

        /* 全局悬浮菜单（⋮）：绝对定位 + 阴影 + 平滑淡入 */
        '.pm-scrim{position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;display:none}',
        '.pm-scrim.on{display:block}',
        '.popup-menu{position:absolute;top:calc(100% + 4px);right:12px;z-index:3;',
        'min-width:200px;max-width:min(310px,calc(100vw - 24px));max-height:calc(100dvh - 140px);overflow-y:auto;',
        'background:var(--sf);border:1px solid var(--ln);border-radius:12px;padding:6px;',
        'box-shadow:0 14px 38px rgba(0,0,0,.42);',
        'opacity:0;transform:translateY(-8px) scale(.98);transform-origin:top right;pointer-events:none;',
        'transition:opacity .16s ease,transform .16s cubic-bezier(.2,.8,.2,1)}',
        '.popup-menu.on{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
        '.pm-g{margin-top:5px;padding-top:5px;border-top:1px solid var(--ln)}',
        '.pm-g:first-child{margin-top:0;padding-top:0;border-top:none}',
        '.pm-t{font-family:var(--mono);font-size:10px;letter-spacing:.07em;color:var(--dim);padding:5px 10px 3px}',
        '.pm-i{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 10px;',
        'border-radius:8px;font-size:14px;text-align:left;color:var(--fg)}',
        '.pm-i:hover{background:var(--bg)}',
        '.pm-i.on{color:var(--ac);font-weight:600}',
        '.pm-i.dgr{color:var(--er)}',
        '.pm-i .pm-ic{flex:none;width:17px;height:17px;display:flex;align-items:center;justify-content:center;color:var(--dim)}',
        '.pm-i .pm-ic svg{width:17px;height:17px}',
        '.pm-i.on .pm-ic{color:var(--ac)}',
        '.pm-i.dgr .pm-ic{color:var(--er)}',
        '.pm-i .pm-lb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.pm-i .pm-k{margin-left:auto;flex:none;font-family:var(--mono);font-size:10px;color:var(--dim)}',

        /* 手风琴折叠面板（设置 / 关于） */
        '.acc{display:block}',
        '.accordion-item{border:1px solid var(--ln);border-radius:10px;margin-bottom:10px;overflow:hidden;background:var(--bg)}',
        '.accordion-header{display:flex;align-items:center;gap:9px;width:100%;min-height:48px;padding:0 12px;',
        'font-size:13px;font-weight:600;letter-spacing:.03em;color:var(--dim);background:var(--sf);text-align:left}',
        '.accordion-header:hover{color:var(--fg)}',
        '.accordion-item.open .accordion-header{color:var(--fg)}',
        '.accordion-header .ah-ic{flex:none;width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--dim)}',
        '.accordion-header .ah-ic svg{width:16px;height:16px;transition:transform .24s cubic-bezier(.2,.8,.2,1)}',
        '.accordion-item.open .accordion-header .ah-ic svg{transform:rotate(90deg)}',
        '.accordion-header .ah-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.accordion-header .ah-b{flex:none;font-family:var(--mono);font-size:10px;color:var(--dim)}',
        '.accordion-body{max-height:0;overflow:hidden;visibility:hidden;',
        'transition:max-height .28s cubic-bezier(.2,.8,.2,1),visibility .28s}',
        '.accordion-item.open .accordion-body{max-height:8000px;visibility:visible}',
        '.accordion-body>.set:first-child{border-top:none}',
        '.accordion-body>.set:last-child{border-bottom:none}',

        /* 底部动作面板 */
        '.mask{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:5;',
        'opacity:0;pointer-events:none;transition:opacity .18s}',
        '.mask.on{opacity:1;pointer-events:auto}',
        '.sheet{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--sf);border-top:1px solid var(--ln);',
        'border-radius:14px 14px 0 0;padding:8px 10px calc(14px + env(safe-area-inset-bottom));',
        'transform:translateY(110%);transition:transform .22s cubic-bezier(.2,.8,.2,1);pointer-events:auto;',
        'max-height:80vh;overflow:auto}',
        '.sheet.on{transform:translateY(0)}',
        '@media(min-width:760px){.sheet{left:auto;right:16px;bottom:16px;width:420px;border-radius:14px;border:1px solid var(--ln)}}',
        '.sheet .sh-t{font-size:11px;color:var(--dim);font-family:var(--mono);padding:8px 12px 4px}',
        '.sheet button{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:0 12px;border-radius:9px;font-size:14px;text-align:left}',
        '.sheet button:hover{background:var(--bg)}',
        '.sheet button.dgr{color:var(--er)}',
        '.sheet .dotc{width:14px;height:14px;border-radius:50%;flex:none}',
        /* 面板按类型分组：每组一个小标题；每个功能键前面一枚非 emoji 的 SVG 图标 */
        '.sheet .sh-g{margin-top:6px;border-top:1px solid var(--ln);padding-top:9px}',
        '.sheet .si{flex:none;width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:var(--dim)}',
        '.sheet .si svg{width:18px;height:18px}',
        '.sheet button.dgr .si{color:var(--er)}',

        /* 对话框 */
        '.modal{position:fixed;top:0;left:0;right:0;bottom:0;z-index:8;background:rgba(0,0,0,.5);',
        'display:none;align-items:center;justify-content:center;padding:16px;pointer-events:auto}',
        '.modal.on{display:flex}',
        '.dlg{width:100%;max-width:380px;background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:16px;',
        'box-shadow:0 16px 48px rgba(0,0,0,.45)}',
        '.modal.on .dlg{animation:dswdlg .18s cubic-bezier(.2,.8,.2,1)}',
        '@keyframes dswdlg{from{transform:translateY(10px) scale(.97);opacity:.35}to{transform:none;opacity:1}}',
        '.dlg .inp{display:block;width:100%;flex:none;margin-bottom:2px}',
        '.dlg h3{margin:0 0 8px;font-size:16px}',
        '.dlg p{margin:0 0 12px;font-size:13px;color:var(--dim);line-height:1.6}',
        '.dlg .row2{display:flex;gap:8px;margin-top:12px}',
        '.dlg .row2 .btn{flex:1}',
        /* ---- 2.13.3 首次运行的「个性化设置」引导层（底部抽屉，自适应） ---- */
        '.ob-mask{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9;background:rgba(0,0,0,.55);',
        'display:none;align-items:flex-end;justify-content:center;pointer-events:auto}',
        '.ob-mask.on{display:flex}',
        /* 宽度随屏走：手机占满、桌面居中限宽；高度用 dvh 避开地址栏跳动 */
        '.ob{width:100%;max-width:560px;max-height:min(92dvh,92vh);display:flex;flex-direction:column;',
        'background:var(--bg);border:1px solid var(--ln);border-bottom:none;border-radius:18px 18px 0 0;',
        'overflow:hidden}',
        /* 只有中间这一块滚，头与脚常驻 —— 手机上滑动时按钮不会跑出屏幕 */
        '.ob-h{padding:14px 16px 10px;border-bottom:1px solid var(--ln);flex:none}',
        '.ob-h h3{margin:0;font-size:16px;letter-spacing:.01em}',
        '.ob-b{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
        '.ob-sec{padding:12px 16px 0}',
        '.ob-sec>.st{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--dim);margin:0 0 7px}',
        /* 选项卡：三列自适应，换行也不挤 */
        '.ob-pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px}',
        '.ob-pick button{min-height:40px;padding:6px 8px;border:1px solid var(--ln);border-radius:10px;',
        'background:var(--sf);font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px}',
        '.ob-pick button.on{border-color:var(--ac);background:var(--ac);color:var(--acf);font-weight:600}',
        '.ob-pick button:disabled{opacity:.42}',
        '.ob-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;opacity:.8}',
        '.ob-note{font-size:12px;color:var(--dim);line-height:1.55;margin:7px 0 0}',
        /* 紧凑键值表：一行一件事，不再是段落 */
        '.ob-list{background:var(--sf);border:1px solid var(--ln);border-radius:12px;overflow:hidden}',
        '.ob-list>div{display:flex;gap:8px;align-items:baseline;padding:7px 11px;font-size:12.5px;',
        'line-height:1.5;border-top:1px solid var(--ln)}',
        '.ob-list>div:first-child{border-top:none}',
        '.ob-list .k{flex:none;min-width:52px;color:var(--dim)}',
        '.ob-list .v{flex:1;min-width:0}',
        '.ob-list code{font-family:var(--mono);font-size:11.5px;background:var(--bg);padding:1px 4px;border-radius:5px}',
        /* 手势 / 入口：网格自适应，窄屏自动变一列 */
        '.ob-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}',
        '.ob-grid>div{background:var(--sf);border:1px solid var(--ln);border-radius:10px;padding:7px 10px;',
        'font-size:12px;line-height:1.45}',
        '.ob-grid b{display:block;font-size:12.5px;margin-bottom:1px}',
        '.ob-grid span{color:var(--dim)}',
        '.ob-foot{flex:none;display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));',
        'border-top:1px solid var(--ln);background:var(--bg)}',
        '.ob-foot .btn{flex:1;min-height:46px}',
        '.ob .set{border-bottom:none}',
        '.ob .set .lb{font-size:13px}',
        '.ob .set .sub{font-size:11px;line-height:1.45}',
        '.ob .colwrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px;padding:0}',
        /* 引导层里的配色改成竖向小磁贴：设置页那一行是给宽屏看的，窄屏里名字会溢出 */
        '.ob .swatch{flex-direction:column;gap:3px;justify-content:center;min-height:58px;font-size:12px;padding:5px 4px}',
        '.ob .swatch span{margin-left:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
        '.ob .seg{gap:5px;padding:6px 0 0}',

        /* 导入进度（19-importexport 的 updateImportProg 直接查这个类名） */
        '.dsw2-importprog{margin:0 2px 8px;font-size:12px;color:var(--dim);font-family:var(--mono);font-variant-numeric:tabular-nums}',

        '@media (prefers-reduced-motion:reduce){.dsw2-root *{transition:none !important;animation:none !important}}'
    ].join('');

/* >>> 18-ui.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到） ---- */
    const LONG_PRESS_MS = 550;
    const TAP_GAP_MS = 320;
    const BALL_SIZE = 56;

    /* =========================================================================
     * 18 UI：悬浮球 · 全屏面板（文件 / 回执 / 设置 / 关于）· 状态提示 · Toast · 计划条
     *   新 UI（预览版「希望三」）落地：结构、手势、配色与预览一致；
     *   所有数据来自真实后端（VirtualFS / uiReceipts / uiLogs / 计划 / 出站 / 检查点）。
     * ====================================================================== */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ------------------------- 调色板（五套 × 浅/深） ------------------------- */
    const THEMES = {
        ledger: {
            n: '铅字台账',
            l: { bg: '#f1eee5', sf: '#fffdf6', fg: '#191917', dim: '#6a685f', ln: '#d9d4c4', ac: '#b5521b', acf: '#fff8f0', ok: '#2e7d4f', wn: '#9a6a08', er: '#b8342a' },
            d: { bg: '#141412', sf: '#1d1c19', fg: '#ece8dc', dim: '#94907f', ln: '#322f28', ac: '#e0803c', acf: '#1a1208', ok: '#5cbf85', wn: '#d6a03a', er: '#f0705f' }
        },
        tundra: {
            n: '苔原静默',
            l: { bg: '#eef1ef', sf: '#f8fbfa', fg: '#17201e', dim: '#5f6f6b', ln: '#d2dbd8', ac: '#1f6f63', acf: '#ffffff', ok: '#2c7a58', wn: '#8a7418', er: '#b0403a' },
            d: { bg: '#0e1514', sf: '#16201e', fg: '#dfeae6', dim: '#8a9c97', ln: '#25322f', ac: '#4fc3ab', acf: '#06201b', ok: '#4ec98a', wn: '#d4b23f', er: '#f07b6f' }
        },
        hazard: {
            n: '警示胶带',
            l: { bg: '#f2f2ef', sf: '#ffffff', fg: '#15171a', dim: '#63686c', ln: '#d4d7d9', ac: '#6a5c00', acf: '#ffffff', ok: '#2e7d4f', wn: '#a06a00', er: '#c03028' },
            d: { bg: '#121316', sf: '#1b1d21', fg: '#e9ecef', dim: '#8b9298', ln: '#2c3036', ac: '#ffd400', acf: '#14161a', ok: '#52c07e', wn: '#e0a83c', er: '#f2685c' }
        },
        blueprint: {
            n: '蓝晒图',
            l: { bg: '#eaeef4', sf: '#f8fafd', fg: '#101a2a', dim: '#5c6a7d', ln: '#d0d8e4', ac: '#1f5fb0', acf: '#ffffff', ok: '#2f7d5a', wn: '#9a6a10', er: '#bb3a33' },
            d: { bg: '#0b1220', sf: '#111c2e', fg: '#dde7f5', dim: '#8798b0', ln: '#1f2d44', ac: '#57a3f0', acf: '#04121f', ok: '#4fc48c', wn: '#daa94a', er: '#f0776a' }
        },
        redshift: {
            n: '红移',
            l: { bg: '#f6eeea', sf: '#fff9f6', fg: '#221714', dim: '#786a64', ln: '#e2d5cf', ac: '#c73f2a', acf: '#ffffff', ok: '#2d7a52', wn: '#9c6b0c', er: '#b02a26' },
            d: { bg: '#1a1110', sf: '#241817', fg: '#f2e4df', dim: '#a08d86', ln: '#3a2926', ac: '#ff8a6a', acf: '#240d07', ok: '#55c48b', wn: '#dca94a', er: '#ff6f60' }
        }
    };
    const THEME_KEYS = Object.keys(THEMES);
    const DEFAULT_PALETTE = 'ledger';

    /* ------------------------- 图标（纯 SVG，无 emoji） ------------------------- */
    const IC = {
        x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
        pal: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 2v6h6"/></svg>',
        ref: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 2v3.2h-3.2"/></svg>',
        inj: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5v8M5 6.5l3 3 3-3"/><path d="M2.5 12.5h11"/></svg>',
        snap: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M5.5 3.5l1-2h3l1 2"/><circle cx="8" cy="8" r="2.2"/></svg>',
        trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.8 9.5h6.4L12 4"/></svg>',
        dir: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M1.5 3.5h4.2l1.4 2h7.4v8h-13z"/></svg>',
        file: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3.5 1.5h5.5l3.5 3.5v9.5h-9z"/><path d="M9 1.5V5h3.5"/></svg>',
        back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5L5 8l4.5 4.5"/></svg>',
        tabs: ICONS.receipt,
        gear: ICONS.settings,
        info: ICONS.info,
        plus: ICONS.plus,
        folderPlus: ICONS.folderPlus,
        folderDown: ICONS.folderDown,
        upload: ICONS.upload,
        download: ICONS.download,
        list: ICONS.list,
        edit: ICONS.edit,
        pen: ICONS.pen,
        eye: ICONS.eye,
        check: ICONS.check,
        undo: ICONS.undo,
        redo: ICONS.redo,
        restore: ICONS.restore,
        copy: ICONS.copy,
        plan: ICONS.plan,
        /* —— 别名补齐（undefined Bug 的根因）——
         * 下面这些名字原先只在 ICONS 里，IC 上没有；而文件页 / 更多面板 / 编辑器动作条
         * 直接拼 `IC.xxx`，取到 undefined 时会把字面量 "undefined" 拼进 innerHTML，
         * 于是界面出现「undefined新建文件夹」「undefined更多」这类脏字。
         * 全部显式映射一遍，彻底断掉这条 undefined 通路。 */
        settings: ICONS.settings,
        receipt: ICONS.receipt,
        close: ICONS.close,
        dots: ICONS.dots,
        /* 顶部 ⋮（竖排三点）：与列表行里的横排「更多」区分开 */
        moreV: '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3.2" r="1.45" fill="currentColor"/><circle cx="8" cy="8" r="1.45" fill="currentColor"/><circle cx="8" cy="12.8" r="1.45" fill="currentColor"/></svg>',
        filePlus: ICONS.filePlus,
        folder: ICONS.folder,
        folderUp: ICONS.folderUp,
        paste: ICONS.paste,
        save: ICONS.save,
        selectAll: ICONS.selectAll,
        refresh2: ICONS.refresh2,
        archive: ICONS.archive,
        layers: ICONS.layers,
        importTo: ICONS.importTo,
        clipboard: ICONS.clipboard,
        next: ICONS.next,
        search: ICONS.search,
        filter: ICONS.filter,
        moon: ICONS.moon,
        sun: ICONS.sun,
        logo: ICONS.logo,
        refresh: ICONS.refresh
    };
    /* 兜底取图标：任何未知键都返回空串，绝不把 "undefined" 拼进 DOM */
    function ic(name) {
        const v = IC[name];
        return (typeof v === 'string' && v) ? v : '';
    }

    /* ------------------------- 状态 ------------------------- */
    let uiShadow = null;
    let uiHost = null;
    let uiRoot = null;
    let uiPanel = null;
    let uiBall = null;
    let uiStatus = null;   // 状态提示（运行时有代码用 uiStatus.classList.contains('sent') 判断）
    let uiToast = null;
    let uiPlanBar = null;
    let uiMask = null;
    let uiSheet = null;
    let uiModal = null;
    let uiMenu = null;        // 右上角 ⋮ 弹出的全局菜单
    let uiPmScrim = null;     // 菜单遮罩（点击关闭）
    let modalCb = null;       // 当前确认悬浮窗的「确认」回调（对话框复用时不会残留旧的）
    const uiLogs = [];
    const uiReceipts = [];


    const uiState = {
        tab: 'files',
        view: 'list',            // list | editor
        filesPath: '/',
        editing: null,           // { path, content, readonly }
        newEntry: null,          // { type:'file'|'dir' }
        rename: null,            // { path, name, dir }
        batchMode: false,
        selected: {},            // 全路径 → true
        planOpen: false,
        receiptFilter: 'all',
        toolbarMore: false,
        importProg: null,
        rateHintEl: null,
        statusText: '',
        sheetItems: null,
        menuOpen: false,         // 右上角 ⋮ 菜单展开态
        acc: {},                 // 手风琴折叠态：分组 key → true(展开)
        ballPos: null,
        unread: false
    };

    let uiCfg = null;
    let hintTimer = null;
    let toastTimer = null;
    let ballTapTimer = null;
    let ballLastTapAt = 0;
    let rowLongPressAt = 0;   // 列表项长按刚触发时，吞掉随之而来的那次「点击打开文件」

    function getUiCfg() {
        if (!uiCfg) {
            uiCfg = Object.assign({
                autoSend: true,
                autoBootstrap: true,
                injectManual: false,
                rateLimit: true,
                planMode: false,
                debug: false,
                notifyVibrate: true,
                notifySound: true,
                terminateAutoPause: true,
                planInject: true,
                theme: 'auto',       // auto / light / dark
                palette: DEFAULT_PALETTE,
                fsMedia: 'gm',       // P3b-2：内容介质 gm / opfs / fsa（绑定文件夹时置为 fsa）
                autoGrant: true      // P3b-3：绑过文件夹后自动无感续授权（默认开）
            }, Store.get(STORE_UI_CFG, {}) || {});
            if (THEME_KEYS.indexOf(uiCfg.palette) < 0) uiCfg.palette = DEFAULT_PALETTE;
        }
        return uiCfg;
    }
    function saveUiCfg(patch) {
        uiCfg = Object.assign(getUiCfg(), patch);
        Store.set(STORE_UI_CFG, uiCfg);
        return uiCfg;
    }

    /* ------------------------- 主题 ------------------------- */
    function themePref() {
        const t = getUiCfg().theme;
        return (t === 'light' || t === 'dark') ? t : 'auto';
    }
    function currentPalette() {
        const p = getUiCfg().palette;
        return THEMES[p] ? p : DEFAULT_PALETTE;
    }
    function systemDark() {
        try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
        catch (e) { return false; }
    }
    function isDark() {
        const t = themePref();
        return t === 'dark' || (t === 'auto' && systemDark());
    }
    function applyTheme() {
        const dark = isDark();
        const p = (THEMES[currentPalette()] || THEMES[DEFAULT_PALETTE])[dark ? 'd' : 'l'];
        const keys = ['bg', 'sf', 'fg', 'dim', 'ln', 'ac', 'acf', 'ok', 'wn', 'er'];
        if (uiRoot) for (let i = 0; i < keys.length; i++) uiRoot.style.setProperty('--' + keys[i], p[keys[i]]);
        // 类同时挂宿主与 root：老测试钩子（hostEl/rootEl）与兼容样式都依赖它
        if (uiHost) uiHost.classList.toggle('dsw2-dark', dark);
        if (uiRoot) uiRoot.classList.toggle('dsw2-dark', dark);
    }
    function toggleTheme() {
        const next = isDark() ? 'light' : 'dark';
        saveUiCfg({ theme: next });
        applyTheme();
        pushLog('主题：' + (next === 'dark' ? '深色' : '浅色'));
        showToast(next === 'dark' ? '已切换深色主题' : '已切换浅色主题');
    }
    try {
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const onMq = function () { if (themePref() === 'auto') applyTheme(); };
            if (mq.addEventListener) mq.addEventListener('change', onMq);
            else if (mq.addListener) mq.addListener(onMq);
        }
    } catch (e) {}

    /* ------------------------- 日志 / 回执 ------------------------- */
    function pushLog(msg, type) {
        uiLogs.push({ at: Date.now(), msg: String(msg), type: type || 'info' });
        while (uiLogs.length > 200) uiLogs.shift();
        if (uiBall) {
            if (type === 'error' || type === 'warn') { uiState.unread = true; uiBall.classList.add('has-log'); }
        }
        if (uiState.tab === 'receipt' && uiPanel && uiPanel.classList.contains('open')) renderBody();
    }
    function pushReceipt(text, kind) {
        uiReceipts.push({ at: Date.now(), text: String(text), kind: kind || 'feedback' });
        while (uiReceipts.length > 20) uiReceipts.shift();
        if (uiState.tab === 'receipt' && uiPanel && uiPanel.classList.contains('open')) renderBody();
    }

    /* ------------------------- Toast / 状态提示 ------------------------- */
    function showToast(message, type) {
        if (!uiToast) return;
        uiToast.textContent = message;
        uiToast.className = 'toast on' + (type ? ' ' + type : '');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { if (uiToast) uiToast.className = 'toast' + (type ? ' ' + type : ''); }, 2200);
    }

    // 状态提示副行：队列 / 本分钟发送数 / cwd（只在「有问题」时多一段）
    function shortCwd() {
        let p = '/';
        try { p = DSW.state.cwd ? DSW.state.cwd() : '/'; } catch (e) { p = '/'; }
        p = String(p || '/');
        if (p === '/' || p === '') return '/';
        const segs = p.split('/').filter(Boolean);
        return segs.length <= 2 ? p : '…/' + segs.slice(-2).join('/');
    }
    function statusSummary() {
        const parts = [];
        try { if (outbox.parts.length) parts.push('队列' + outbox.parts.length); } catch (e) {}
        try {
            const r = rateStatus();
            if (r) parts.push((r.in1m || 0) + '/' + CONFIG.OUTBOX_MAX_PER_MIN);
        } catch (e) {}
        parts.push(shortCwd());
        try { if (!findComposer()) parts.push('⚠输入框未找到'); } catch (e) {}
        try { if (lastExecFailAt > lastExecOkAt) parts.push('⚠失败 ' + fmtClock(lastExecFailAt)); } catch (e) {}
        return parts.join(' · ');
    }

    function placeHint() {
        if (!uiStatus || !uiBall) return;
        let w = 0, h = 0, bx = 0, by = 0;
        try {
            const r = uiStatus.getBoundingClientRect();
            w = r.width; h = r.height;
            const b = uiBall.getBoundingClientRect();
            bx = b.left + b.width / 2; by = b.top;
        } catch (e) { return; }
        const vw = window.innerWidth || 360;
        const left = Math.min(Math.max(8, bx - w / 2), Math.max(8, vw - w - 8));
        const top = Math.max(8, by - 14 - h);
        uiStatus.style.left = left + 'px';
        uiStatus.style.top = top + 'px';
    }

    function setStatus(state, text, opts) {
        opts = opts || {};
        uiState.statusText = text || '';
        if (!uiStatus) return;
        const h1 = uiStatus.querySelector('.h1');
        const h2 = uiStatus.querySelector('.h2');
        if (h1) h1.textContent = text || '';
        if (h2) h2.textContent = statusSummary();
        uiStatus.className = 'hint on ' + (state || 'idle');
        placeHint();
        if (hintTimer) clearTimeout(hintTimer);
        if (opts.autoHide) hintTimer = setTimeout(function () { if (uiStatus) uiStatus.classList.remove('on'); }, opts.autoHide);
    }

    /* 健康度（UI 报告第 13 项）：脚本是否还在工作 */
    let lastExecOkAt = 0;
    let lastExecFailAt = 0;
    function noteHealth(kind) {
        if (kind === 'ok') lastExecOkAt = Date.now();
        else if (kind === 'fail') lastExecFailAt = Date.now();
    }
    function healthLine() {
        const parts = [];
        parts.push(lastExecOkAt ? ('最近成功 ' + fmtClock(lastExecOkAt)) : '本会话还没成功执行过');
        if (lastExecFailAt) parts.push('最近失败 ' + fmtClock(lastExecFailAt));
        try { parts.push('适配 ' + (PLATFORM.matched ? PLATFORM.id : '通用')); } catch (e) {}
        try { parts.push(findComposer() ? '输入框 正常' : '输入框 未找到'); } catch (e) {}
        return parts.join(' · ');
    }

    function rateHintText() {
        const rate = rateStatus();
        const wait = pacerStatus();
        const tiers = pacerTiers();
        const range = tiers.map(function (t) { return pacerTierName(t.ms); }).join('/');
        const top = pacerTierName(tiers[tiers.length - 1].ms);
        return '队列 ' + outbox.parts.length + ' 条'
            + (outbox.inFlight ? '（发送中）' : '')
            + '　本分钟 ' + rate.in1m + '/' + CONFIG.OUTBOX_MAX_PER_MIN
            + '　10 分钟 ' + rate.in10m + '/' + CONFIG.OUTBOX_MAX_PER_10MIN
            + (CONFIG.RATE_LIMIT_ENABLED === false
                ? '　已关闭等待'
                : '　本轮档位 ' + pacerTierName(rate.tierMs) + '（' + rate.tierReason + '）')
            + (wait.active ? '　' + wait.label : '')
            + '　固定六档 ' + range + '（不随机）'
            + '　平台限流 → ' + top;
    }
    function refreshRateHint() {
        const node = uiState.rateHintEl;
        if (!node || node.isConnected === false) return;
        try { node.textContent = rateHintText(); } catch (e) {}
    }

    /* ------------------------- 体征读数 ------------------------- */
    function fmtChars(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 100000) return (n / 1000).toFixed(1) + 'k';
        return Math.round(n / 1000) + 'k';
    }
    function statusBarData() {
        let io = { out: 0, 'in': 0 };
        try { io = ioStats() || io; } catch (e) {}
        let round = 0;
        try { round = outboxRoundNow(); } catch (e) {}
        let prog = '--';
        try {
            const p = planProgress();
            prog = p.total ? Math.round(p.done / p.total * 100) + '%' : '--';
        } catch (e) {}
        return { round: String(round), 'in': fmtChars(io['in']), out: fmtChars(io.out), prog: prog };
    }
    function statusBarText() {
        const d = statusBarData();
        return '轮次 ' + d.round + '　收 ' + d['in'] + '　发 ' + d.out + '　进度 ' + d.prog;
    }
    /* 兼容旧钩子 DSW.ui.statusBar.refresh：顶部体征读数行已随头部动作条一起移除，
       面板里不再有 .readout 节点，这里刻意做成 no-op（不抛错、不改任何状态）。 */
    function refreshStatusBar() {
        if (!uiPanel) return;
        const box = uiPanel.querySelector('.readout');
        if (!box) return;
        const d = statusBarData();
        box.innerHTML = '轮次 <b>' + esc(d.round) + '</b> · 收 <b>' + esc(d['in']) + '</b> · 发 <b>'
            + esc(d.out) + '</b> · 进度 <b>' + esc(d.prog) + '</b>';
    }

    /* ------------------------- DOM 小工具 ------------------------- */
    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }
    // 往已有容器里追加一段 HTML。**不能**用 `container.innerHTML +=` —— 那会把容器里
    // 已经挂好监听器的节点（新建/重命名表单、确认卡）整段重新解析，监听器全丢、输入也丢。
    function appendHTML(parent, html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        while (tmp.firstChild) parent.appendChild(tmp.firstChild);
        return parent;
    }
    // 按钮：可选传入第 4 个参数 icon（SVG 字符串），在文案前加一枚非 emoji 的图标。
    function button(label, cls, onClick, icon) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (cls || '');
        if (icon) b.innerHTML = icon + (label != null && label !== '' ? '<span>' + esc(label) + '</span>' : '');
        else b.textContent = label;
        if (onClick) b.addEventListener('click', onClick);
        return b;
    }
    function confirmMatches(expected, typed) {
        return String(typed == null ? '' : typed).trim() === String(expected);
    }
    /* 确认一律走居中悬浮窗（复用 .modal / .dlg）：
       expected 为空 → 普通两键确认；expected 有值 → 必须原样输入该词，确认键才可点。 */
    function askConfirm(title, expected, hint, action) {
        if (!uiModal) { showToast('确认框不可用：面板还没初始化', 'err'); return; }
        const text = hint || (expected ? ('输入“' + expected + '”确认') : '此操作不可撤销');
        const run = function () {
            try { if (action) action(); }
            catch (e) { showToast('执行失败：' + (e && e.message ? e.message : e), 'err'); }
        };
        if (expected) confirmBox({ title: title, text: text, word: String(expected), ok: '确认', cb: run });
        else confirmAsk({ title: title, text: text, ok: '确认', cb: run });
    }
    function isSysPath(path) { return VirtualFS.isSysPath(path); }
    function parentPath(p) {
        const t = String(p || '/');
        if (t === '/' || !t) return '/';
        const cut = t.replace(/\/[^/]*$/, '');
        return cut || '/';
    }
    function countFiles(node) {
        if (!node || node.type !== 'dir') return node && node.type === 'file' ? 1 : 0;
        let n = 0;
        for (const k of Object.keys(node.children || {})) n += countFiles(node.children[k]);
        return n;
    }
    function countBytes(node) {
        if (!node || typeof node !== 'object') return 0;
        if (node.type === 'file') return byteLen(node.content);
        let n = 0;
        for (const k of Object.keys(node.children || {})) n += countBytes(node.children[k]);
        return n;
    }
    function copyText(text) {
        try { if (typeof GM_setClipboard === 'function') { GM_setClipboard(text); return; } } catch (e) {}
        try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; } } catch (e) {}
    }

    /* ---- 空值兜底：界面里绝不允许出现字面量 "undefined" / "NaN" ---- */
    function safeNum(n, dft) {
        const v = Number(n);
        return isFinite(v) ? v : (dft == null ? 0 : dft);
    }
    // 尺寸：拿不到/非法一律回 "0B"，绝不让 fmtSize 抛错或漏出 undefined
    function safeSize(n) {
        try {
            const v = Number(n);
            if (!isFinite(v) || v < 0) return '0B';
            return fmtSize(v) || '0B';
        } catch (e) { return '0B'; }
    }
    function safeStr(s, dft) {
        const v = (s == null ? '' : String(s));
        return v === '' ? (dft == null ? '' : dft) : v;
    }
    // 顶部标题：编辑器里显示当前文件名，其余一律「DSW 容器工作区」
    function panelTitle() {
        if (uiState.view === 'editor' && uiState.editing && uiState.editing.path) {
            return safeStr(String(uiState.editing.path).split('/').pop(), '文件');
        }
        return 'DSW 容器工作区';
    }

    function diagText() {
        let stats = {};
        try { stats = debugStats(); } catch (e) {}
        // 存储状态也要进诊断：面板上那行字容易被看漏，而排障时最先要问的就是「数据到底落在哪一层」
        let store = {};
        try {
            const ss = SessionState.status();
            const fm = FsMedia.status();
            const ms = FsMedia.mirrorStats();
            const hd = VirtualFS.head();
            store = {
                session: { backend: ss.backend, keys: ss.keys, dirty: ss.dirty, error: ss.error || '' },
                media: { name: fm.media, blobs: fm.blobs, pending: fm.pending, fails: fm.fails, error: fm.error || '' },
                tree: { commit: hd.seq, snapshot: hd.baseSeq, incremental: hd.seq - hd.baseSeq },
                mirror: ms ? { files: VirtualFS.mirrorState(), fails: ms.fails, pending: ms.pending, error: ms.error || '' } : null,
                folder: {
                    blocked: FsMedia.blocked() ? FsMedia.blocked().reason : '',
                    auto: (function () {
                        const ag = FsMedia.autoState();
                        return { state: ag.state, enabled: ag.enabled, armed: ag.armed, tries: ag.tries, why: ag.why, error: ag.error || '' };
                    })()
                },
                corrupt: VirtualFS.corrupt() || '',
                missing: VirtualFS.missingBlobs().map(function (m) { return m.path; })
            };
        } catch (e) { store = { error: String(e && e.message ? e.message : e) }; }
        return JSON.stringify(Object.assign({
            version: VERSION, proto: PROTO_VERSION, url: location.href, platform: PLATFORM.id
        }, stats, { storage: store }), null, 2);
    }

    /* ------------------------- 面板骨架 ------------------------- */
    function createUI() {
        if (document.getElementById('dsw2-host')) return;

        const host = document.createElement('div');
        host.id = 'dsw2-host';
        host.style.cssText = 'width:0;height:0;position:fixed;z-index:2147483646;';
        document.body.appendChild(host);

        let shadow;
        try { shadow = host.attachShadow({ mode: 'open' }); } catch (e) { shadow = host; }
        uiShadow = shadow;
        uiHost = host;

        const style = document.createElement('style');
        style.textContent = CSS;
        shadow.appendChild(style);

        const root = document.createElement('div');
        root.className = 'dsw2-root';
        shadow.appendChild(root);
        uiRoot = root;

        /* 状态提示（与悬浮球同级；先插入，悬浮球/面板后绘制压住它） */
        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.innerHTML = '<div class="h1"></div><div class="h2"></div>';
        root.appendChild(hint);
        uiStatus = hint;

        /* 悬浮球：环形进度 + DSW 字样 + 未读角标 */
        const ball = document.createElement('button');
        ball.className = 'ball';
        ball.type = 'button';
        ball.setAttribute('aria-label', '打开 DSW 工作区');
        ball.innerHTML =
            '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="none" stroke="var(--ln)" stroke-width="2"/>' +
            '<circle class="ring" cx="28" cy="28" r="25" fill="none" stroke="var(--ac)" stroke-width="2.5" ' +
            'stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="157"/></svg>' +
            '<span class="ic dsw">DSW</span><span class="ic pause">❙❙</span><span class="badge"></span>';
        root.appendChild(ball);
        uiBall = ball;
        uiState.ballPos = loadBallPos();
        applyBallPosition();
        installBallDrag();

        /* Toast */
        uiToast = document.createElement('div');
        uiToast.className = 'toast';
        root.appendChild(uiToast);

        /* 全屏面板：头部 + 菜单遮罩 + 计划条 + 内容区（底部 Tab 已废弃） */
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.innerHTML =
            '<div class="ph"></div>' +
            '<div class="pm-scrim"></div>' +
            '<div class="planbar" style="display:none"></div>' +
            '<div class="pbody"></div>';
        root.appendChild(panel);
        uiPanel = panel;
        uiPlanBar = panel.querySelector('.planbar');
        uiPmScrim = panel.querySelector('.pm-scrim');
        if (uiPmScrim) uiPmScrim.addEventListener('click', function () { closeMenu(); });

        /* 遮罩 / 底部动作面板 / 对话框 */
        uiMask = document.createElement('div');
        uiMask.className = 'mask';
        uiMask.addEventListener('click', closeSheet);
        root.appendChild(uiMask);

        uiSheet = document.createElement('div');
        uiSheet.className = 'sheet';
        root.appendChild(uiSheet);

        uiModal = document.createElement('div');
        uiModal.className = 'modal';
        uiModal.addEventListener('click', onModalClick);
        root.appendChild(uiModal);

        /* 事件统一委托到 root（shadow 内所有可点元素） */
        root.addEventListener('click', onRootClick, true);

        window.addEventListener('resize', function () {
            applyBallPosition();
            placeHint();
        });

        applyTheme();
        render();
        // 2.13.3：引导层**不自动弹**。只在用户主动点开工作区时弹（见 togglePanel）——
        // 聊天页一加载就掉下来一层遮罩会挡住正在看的内容，而且用户还没开始用，
        // 那时的选择多半不是他真想要的。改成球旁一句持久提示，点了工作区才问。
        if (!onboardSeen()) {
            try { markBallHint(); } catch (e) {}
        } else {
            setTimeout(function () { setStatus('idle', '等待第一条命令', { autoHide: 6000 }); }, 600);
        }
    }

    /* ------------------------- 2.13.3 首次运行：个性化设置 + 使用说明 -------------------------
     * 之前只在设置页里“默默”摆着所有开关，新用户第一次打开完全不知道该动哪里。
     * 这里做一层**只弹一次**的引导：把「程序实际有的东西」摆出来让你当场选完，
     * 顺带把悬浮球手势、面板入口路径、协议写法一次说清。
     * 内容全部由真实实现反推（FsMedia 状态 / getUiCfg / 菜单项），
     * 以后加了选项这里跟着长，不会出现“面板里有、引导里没有”的悬空说明。 */
    let uiOnboard = null;

    function onboardSeen() { return !!Store.get(STORE_UI_ONBOARD, false); }
    function markOnboardSeen() { Store.set(STORE_UI_ONBOARD, true); }
    function onboardMedia() { try { return FsMedia.status().media || 'gm'; } catch (e) { return 'gm'; } }

    /* 引导层不自动弹，改成在球旁挂一句持久提示（点我）。
     * 只写一句，不铺开 —— 第一次打开的用户看到的是「下一步做什么」，不是说明书。
     * 这句不设自动隐藏；一旦引导层被看完（markOnboardSeen）就换成普通状态。 */
    const ONBOARD_HINT = '点球打开工作区';
    function markBallHint() { setStatus('idle', ONBOARD_HINT, {}); }
    function clearBallHint() {
        if (uiState.statusText === ONBOARD_HINT) setStatus('idle', '等待第一条命令', { autoHide: 6000 });
    }/* 三个存放位置：**一行一个按钮 + 一句当前选项的解释**，
     * 不再是三段描述文字（手机上三段字会把面板擑得老长，还抓不到重点）。 */
    function onboardMediaCards() {
        const cur = onboardMedia();
        const sup = (function () { try { return FsMedia.supported(); } catch (e) { return false; } })();
        const st = (function () { try { return FsMedia.status(); } catch (e) { return {}; } })();
        const bound = folderHandleName.length > 0;
        const opts = [
            { k: 'gm', t: '油猴存储', tip: '免授权、最省事；容量小，清浏览器数据会丢。' },
            { k: 'opfs', t: '浏览器沙盒', tip: '容量大，不受清缓存影响；文件管理器里看不到。' },
            {
                k: 'fsa', t: '文件夹', tip: sup
                    ? '按原路径落成真文件（/src/a.js），能看能改能备份；需授权一次。'
                    : '本浏览器不支持选文件夹。',
                badge: bound ? folderHandleName : '推荐'
            }
        ];
        let h = '<div class="ob-pick">';
        for (const o of opts) {
            const dis = (o.k === 'fsa' && !sup);
            h += '<button type="button" class="' + (cur === o.k ? 'on' : '') + '" data-om="' + o.k + '"'
                + (dis ? ' disabled' : '') + '>'
                + (o.badge ? '<i class="ob-dot"></i>' : '')
                + esc(o.t) + '</button>';
        }
        h += '</div>';
        // 只解释**当前选中**的那个：想换的人自己点，点了就换解释。
        const curOpt = opts.find((o) => o.k === cur) || opts[0];
        h += '<p class="ob-note">' + esc(curOpt.tip)
            + (cur === 'fsa' && bound ? '（已绑定「' + esc(folderHandleName) + '」）' : '')
            + (cur === 'gm' ? '当前 ' + safeNum(st.blobs) + ' 块内容。' : '')
            + '</p>';
        if (sup) {
            h += '<div class="set btns"><button class="btn sm" data-a="bindFolder">'
                + (bound ? '重新选文件夹…' : '选择文件夹…') + '</button>'
                + (bound ? '<button class="btn sm dgr" data-a="unbindFolder">解绑</button>' : '')
                + '</div>';
        }
        return h;
    }

    /* 引导层里的开关：与设置页的 swRow 结构一致，只是开关属性换成 data-otog，
     * 避免和面板委托撞车（引导层不在面板里，点不到设置页那一套）。 */
    function obSw(key, label, sub, on) {
        return '<div class="set" data-otog="' + key + '"><span class="lb">' + label +
            (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span>' +
            '<span class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '"></span></div>';
    }
    /* 副标题一律 ≤ 12 字：这层是「扫一眼」的地方，不是说明书。
     * 想知道细节的，点「完成」后去设置页 / 手册，那里有完整解释。 */
    function onboardSwitches() {
        const c = getUiCfg();
        const pm = (function () { try { return getPlanState().active; } catch (e) { return false; } })();
        return obSw('autoSend', '自动回传', '执行完自动发回执', c.autoSend !== false) +
            obSw('autoBootstrap', '新对话注入', '换对话时自动教 AI 下命令', c.autoBootstrap !== false) +
            obSw('rateLimit', '节奏器', '发太快时自动降速', c.rateLimit !== false) +
            obSw('notifyVibrate', '震动提醒', 'AI 回完长消息时震一下', c.notifyVibrate !== false) +
            obSw('notifySound', '提示音', '同上，声音版', c.notifySound !== false) +
            obSw('terminateAutoPause', '说完自动停', '识别到 ■ 就暂停，省电', c.terminateAutoPause !== false) +
            obSw('planMode', '计划模式', '只允许写计划文件', !!pm);
    }

    function onboardHTML() {
        const cfg = getUiCfg();
        let look = '<div class="colwrap">';
        for (const k of THEME_KEYS) {
            const t = THEMES[k];
            const c = isDark() ? t.d : t.l;
            look += '<button class="swatch' + (currentPalette() === k ? ' on' : '') + '" data-oth="' + k + '">' +
                '<i style="background:' + c.ac + '"></i><i style="background:' + c.bg + '"></i><span>' + t.n + '</span></button>';
        }
        look += '</div><div class="seg">' +
            '<button class="' + (themePref() === 'light' ? 'on' : '') + '" data-otm="light">浅</button>' +
            '<button class="' + (themePref() === 'dark' ? 'on' : '') + '" data-otm="dark">深</button>' +
            '<button class="' + (themePref() === 'auto' ? 'on' : '') + '" data-otm="auto">自动</button></div>';

        return '<div class="ob-h"><h3>DSW 已就位</h3></div>' +

            '<div class="ob-b">' +

            '<div class="ob-sec"><p class="st">内容存在哪里</p>' + onboardMediaCards() + '</div>' +

            '<div class="ob-sec"><p class="st">配色与明暗</p>' + look + '</div>' +

            '<div class="ob-sec"><p class="st">偏好</p><div class="set">' + onboardSwitches() + '</div></div>' +

            '<div class="ob-sec"><p class="st">悬浮球</p><div class="ob-grid">' +
            '<div><b>单击</b><span>开 / 关工作区</span></div>' +
            '<div><b>双击</b><span>暂停识别</span></div>' +
            '<div><b>长按</b><span>重扫本页命令</span></div>' +
            '<div><b>拖动</b><span>换位置</span></div>' +
            '</div></div>' +

            '<div class="ob-sec"><p class="st">面板入口</p><div class="ob-grid">' +
            '<div><b>✕</b><span>收起工作区</span></div>' +
            '<div><b>⋮</b><span>全部功能都在里面</span></div>' +
            '<div><b>回执</b><span>命令结果，出错先看这里</span></div>' +
            '<div><b>文件</b><span>单击进去，长按出菜单</span></div>' +
            '</div></div>' +

            '<div class="ob-sec"><p class="st">AI 怎么下命令</p><div class="ob-list">' +
            '<div><span class="k">写法</span><span class="v"><code>```dsw</code> 代码块，内首 <code>&lt;dsw&gt;</code> 尾 <code>&lt;/dsw&gt;</code></span></div>' +
            '<div><span class="k">不懂</span><span class="v">问 AI <code>help</code> 或 <code>read 手册</code></span></div>' +
            '</div>' +
            '<div class="set btns"><button class="btn sm" data-a="copyEg">复制示例</button>' +
            '<button class="btn sm" data-a="inject">发给 AI</button></div></div>' +

            '<div style="height:12px"></div>' +
            '</div>' +

            '<div class="ob-foot">' +
            '<button class="btn" data-ob="later">稍后</button>' +
            '<button class="btn pri" data-ob="done">完成</button>' +
            '</div>';
    }

    function closeOnboard(silent) {
        if (!uiOnboard) return;
        try { uiOnboard.remove(); } catch (e) {}
        uiOnboard = null;
        if (!silent) markOnboardSeen();
    }
    function refreshOnboard() {
        if (!uiOnboard) return;
        const box = uiOnboard.querySelector('.ob');
        if (box) box.innerHTML = onboardHTML();
    }
    function showOnboarding(force) {
        if (!uiRoot) return;
        if (uiOnboard) { refreshOnboard(); return; }
        if (!force && onboardSeen()) return;
        const mask = el('div', 'ob-mask on');
        mask.appendChild(el('div', 'ob'));
        uiRoot.appendChild(mask);
        uiOnboard = mask;
        refreshOnboard();
        pushLog('首次运行引导已打开');
    }
    /* 引导层里点遮罩 = 稍后再说（不写“已看过”，下次开页面还会弹） */
    function maybeCloseOnboardByBackdrop(e) {
        if (!uiOnboard) return;
        if (e.target === uiOnboard) closeOnboard(true);   // 点遮罩 = 稍后，不写已看过
    }

    function handleOnboardClick(t) {
        const om = t.closest('[data-om]');
        if (om) {
            const k = om.getAttribute('data-om');
            if (k === 'fsa') { handleAction('bindFolder'); return; }
            try {
                FsMedia.useMedium(k).then(function (r) {
                    saveUiCfg({ fsMedia: k });
                    showToast('已切到' + (k === 'opfs' ? '浏览器沙盒' : '油猴存储') + '，搬入 ' + safeNum(r.moved) + ' 块内容');
                    pushLog('容器存放位置 → ' + (k === 'opfs' ? '浏览器沙盒' : '油猴存储') + '（搬入 ' + safeNum(r.moved) + ' 块）');
                    refreshOnboard();
                }, function (e) {
                    showToast('切换失败：' + ((e && e.message) || e), 'err');
                    refreshOnboard();
                });
            } catch (e) { showToast('切换失败：' + ((e && e.message) || e), 'err'); }
            return true;
        }
        const oth = t.closest('[data-oth]');
        if (oth) { saveUiCfg({ palette: oth.getAttribute('data-oth') }); applyTheme(); refreshOnboard(); return true; }
        const otm = t.closest('[data-otm]');
        if (otm) { saveUiCfg({ theme: otm.getAttribute('data-otm') }); applyTheme(); refreshOnboard(); return true; }
        const otog = t.closest('[data-otog]');
        if (otog) {
            const key = otog.getAttribute('data-otog');
            toggleCfg(key);
            if (key === 'autoSend' || key === 'rateLimit' || key === 'autoBootstrap') applyCfgSideEffects(key);
            refreshOnboard();
            return true;
        }
        const ob = t.closest('[data-ob]');
        if (ob) {
            const k = ob.getAttribute('data-ob');
            if (k === 'done') {
                markOnboardSeen();
                closeOnboard(true);
                clearBallHint();
                showToast('设置完成');
                pushLog('首次运行引导已完成');
                handleAction('inject');
                return true;
            }
            closeOnboard(true);       // 稍后：不记“已看过”，下次点开工作区还会再问一次
            showToast('随时点悬浮球 · 面板 › ⋮ › 设置 回来改');
            return true;
        }
        const a = t.closest('[data-a]');
        if (a) {
            const act = a.getAttribute('data-a');
            // 这两个会改到引导层自己显示的状态（绑定/解绑）→ 完事后重画引导
            if (act === 'bindFolder' || act === 'unbindFolder' || act === 'grantFolder') {
                // 绑定/解绑内部会调 refreshFolderName()，那边会把引导层重画 —— 不用自己排定时器
                handleAction(act, a);
                return true;
            }
            handleAction(act, a);
            return true;
        }
        return true;   // 引导层内部的其它点击一律吃掉，不往下传
    }
    /* 引导层里的开关也要把配置推到运行时（toggleCfg 本身已经做大部分，这里补齐
     * 引导里可能新增的 key，避免两处逻辑漂移）。 */
    function applyCfgSideEffects(key) {
        const cfg = getUiCfg();
        try {
            if (key === 'rateLimit') CONFIG.RATE_LIMIT_ENABLED = cfg.rateLimit !== false;
            else if (key === 'autoBootstrap') CONFIG.AUTO_BOOTSTRAP = cfg.autoBootstrap !== false;
        } catch (e) {}
    }

    /* ------------------------- 悬浮球：位置与手势 ------------------------- */
    function loadBallPos() {
        let bp = Store.get(STORE_BALL_POS, null);
        const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
        if (bp && bp.left == null && bp.right != null) {
            bp = { left: vw - Number(bp.right || 18) - BALL_SIZE, top: vh - Number(bp.bottom || 96) - BALL_SIZE };
        }
        if (!bp || bp.left == null) bp = { left: vw - BALL_SIZE - 18, top: vh - BALL_SIZE - 96 };
        return { left: bp.left, top: bp.top };
    }
    function applyBallPosition() {
        if (!uiBall) return;
        const M = 6;
        const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
        uiState.ballPos = uiState.ballPos || loadBallPos();
        uiState.ballPos.left = clamp(uiState.ballPos.left, M, Math.max(M, vw - BALL_SIZE - M));
        uiState.ballPos.top = clamp(uiState.ballPos.top, M, Math.max(M, vh - BALL_SIZE - M));
        uiBall.style.left = uiState.ballPos.left + 'px';
        uiBall.style.top = uiState.ballPos.top + 'px';
        placeHint();
    }
    function setBallProgress(ratio) {
        try {
            const ring = uiBall && uiBall.querySelector('.ring');
            if (!ring) return;
            const r = clamp(Number(ratio) || 0, 0, 1);
            ring.setAttribute('stroke-dashoffset', String(Math.round(157 * (1 - r))));
        } catch (e) {}
    }

    function installBallDrag() {
        if (!uiBall) return;
        const usePointer = (typeof window !== 'undefined') && !!window.PointerEvent;
        let moved = false, aborted = false, longFired = false;
        let startX = 0, startY = 0, originX = 0, originY = 0;
        let longPressTimer = null;
        let ringTimer = null;
        let lastTouchAt = 0;

        const clearLongPress = function () {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
            if (uiBall) uiBall.classList.remove('holding');
        };
        const pointOf = function (e) {
            if (e.touches && e.touches.length) return e.touches[0];
            if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
            return e;
        };
        const detach = function () {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('touchcancel', onAbort);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onAbort);
        };
        const onDown = function (e) {
            if (e.type === 'mousedown' && Date.now() - lastTouchAt < 700) return;   // 合成鼠标事件去重
            if (e.type === 'touchstart') lastTouchAt = Date.now();
            if (e.type === 'pointerdown' && e.isPrimary === false) return;
            if (e.type === 'mousedown' && e.button != null && e.button !== 0) return;
            const p = pointOf(e);
            moved = false;
            aborted = false;
            longFired = false;
            startX = p.clientX; startY = p.clientY;
            const r = uiBall.getBoundingClientRect();
            originX = r.left; originY = r.top;
            uiBall.classList.add('dragging');
            clearLongPress();
            // 长按 550ms 是「无反馈的黑洞」→ 按下 200ms 先亮进度环
            ringTimer = setTimeout(function () {
                ringTimer = null;
                if (moved || longFired) return;
                uiBall.classList.add('holding');
            }, 200);
            longPressTimer = setTimeout(function () {
                longPressTimer = null;
                if (moved || longFired) return;
                longFired = true;
                if (ballTapTimer) { clearTimeout(ballTapTimer); ballTapTimer = null; }
                ballLastTapAt = 0;
                try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
                uiBall.classList.remove('holding');
                pulse();
                try { rescanCommands(); } catch (err) {}
                showToast('已重新识别页面里的命令');
            }, LONG_PRESS_MS);
            if (usePointer) {
                window.addEventListener('pointermove', onMove, { passive: false });
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onAbort);
            } else {
                window.addEventListener('mousemove', onMove, { passive: false });
                window.addEventListener('touchmove', onMove, { passive: false });
                window.addEventListener('mouseup', onUp);
                window.addEventListener('touchend', onUp);
                window.addEventListener('touchcancel', onAbort);
            }
        };
        const onMove = function (e) {
            const p = pointOf(e);
            const dx = p.clientX - startX, dy = p.clientY - startY;
            if (Math.abs(dx) + Math.abs(dy) > 6) { moved = true; clearLongPress(); }
            if (!moved) return;
            if (e.cancelable) e.preventDefault();
            uiState.ballPos = { left: originX + dx, top: originY + dy };
            applyBallPosition();
        };
        const onAbort = function () {
            clearLongPress();
            detach();
            aborted = true;
            if (uiBall) uiBall.classList.remove('dragging');
        };
        const onUp = function (e) {
            detach();
            clearLongPress();
            if (uiBall) uiBall.classList.remove('dragging');
            if (e && e.touches && e.touches.length) return;
            if (aborted) { aborted = false; return; }
            if (moved) { Store.set(STORE_BALL_POS, uiState.ballPos); return; }
            if (longFired) return;
            const now = Date.now();
            if (now - ballLastTapAt < TAP_GAP_MS) {          // 双击 = 暂停/恢复
                ballLastTapAt = 0;
                if (ballTapTimer) { clearTimeout(ballTapTimer); ballTapTimer = null; }
                try { setPaused(!isPaused()); } catch (err) {}
                pulse();
                return;
            }
            ballLastTapAt = now;
            if (ballTapTimer) clearTimeout(ballTapTimer);
            ballTapTimer = setTimeout(function () {         // 单击 = 开/收面板
                ballTapTimer = null;
                ballLastTapAt = 0;
                togglePanel();
            }, TAP_GAP_MS);
        };
        const hasTouch = (typeof window !== 'undefined') && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));
        uiBall.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        if (usePointer) uiBall.addEventListener('pointerdown', onDown);
        else if (hasTouch) {
            uiBall.addEventListener('touchstart', onDown, { passive: true });
            uiBall.addEventListener('mousedown', onDown);
        } else {
            uiBall.addEventListener('click', function () { togglePanel(); });
        }
    }
    function pulse() {
        try {
            if (!uiBall) return;
            uiBall.classList.remove('pulse');
            void uiBall.offsetWidth;
            uiBall.classList.add('pulse');
            setTimeout(function () { if (uiBall) uiBall.classList.remove('pulse'); }, 240);
        } catch (e) {}
    }

    /* ------------------------- 面板开关 ------------------------- */
    function closePanel() {
        if (!uiPanel) return;
        uiPanel.classList.remove('on');
        if (uiRoot) uiRoot.classList.remove('open');
        closeMenu();
        closeSheet();
    }
    function togglePanel() {
        if (!uiPanel) return;
        const willOpen = !uiPanel.classList.contains('on');
        uiPanel.classList.toggle('on', willOpen);
        if (uiRoot) uiRoot.classList.toggle('open', willOpen);
        if (willOpen) {
            applyTheme();
            uiState.unread = false;
            if (uiBall) uiBall.classList.remove('has-log');
            render();
            // 首次运行：用户主动点开工作区了，这时弹引导层才不打扰（面板已就绪、状态是准的）
            if (!onboardSeen()) setTimeout(function () { try { showOnboarding(false); } catch (e) {} }, 120);
            else clearBallHint();
        } else {
            closeMenu();
        }
    }

    /* ------------------------- 渲染：总入口 ------------------------- */
    function render() {
        renderHead();
        renderPlan();
        renderBody();
        syncBall();
    }
    function syncBall() {
        if (!uiBall) return;
        const paused = (function () { try { return isPaused(); } catch (e) { return false; } })();
        uiBall.classList.toggle('paused', paused);
        uiBall.classList.toggle('has-log', !!uiState.unread);
        // 暂停字形由 CSS 按 .ball.paused 自动切换（.ic.dsw / .ic.pause），
        // 这样运行时的 markPausedUI 只改类名，球上的字也跟着变。
        let ratio = 0;
        try { const p = planProgress(); ratio = p.total ? p.done / p.total : 0; } catch (e) {}
        setBallProgress(ratio);
    }
    function refreshUI() {
        if (uiPanel && uiPanel.classList.contains('open')) renderBody();
    }

    /* ------------------------- 头部 + 全局 ⋮ 菜单 ------------------------- */
    /* 菜单分组：导航 / 控制台 / 当前页上下文（文件 · 编辑器）/ 危险操作。
     * 原来的底部 Tab（文件·回执·设置·关于）与头部动作条（刷新·注入·快照·清空）
     * 全部收进这里，并按 uiState.view / uiState.tab 动态给出上下文子项。 */
    function menuGroups() {
        const groups = [];
        const inEditor = !!(uiState.view === 'editor' && uiState.editing);

        /* 组 1：导航 */
        const navOn = function (t) { return !inEditor && uiState.tab === t; };
        groups.push({ t: '导航', items: [
            { t: '文件', icon: ic('dir'), tab: 'files', on: navOn('files') },
            { t: '回执', icon: ic('receipt'), tab: 'receipt', on: navOn('receipt') },
            { t: '设置', icon: ic('settings'), tab: 'settings', on: navOn('settings') },
            { t: '关于', icon: ic('info'), tab: 'about', on: navOn('about') }
        ] });

        /* 组 2：控制台（原头部四枚动作） */
        groups.push({ t: '控制台', items: [
            { t: '刷新', icon: ic('refresh2'), a: 'refresh' },
            { t: '注入协议信息', icon: ic('inj'), a: 'inject' },
            { t: '快照（检查点 + JSON）', icon: ic('snap'), a: 'snap' },
            { t: '清空日志', icon: ic('list'), a: 'clearLogs' },
            { t: '切换配色', icon: ic('pal'), a: 'theme' },
            { t: '收起工作区', icon: ic('x'), a: 'close' },
            { t: '首次运行设置与说明', icon: ic('info'), a: 'onboard' }
        ] });

        if (inEditor) {
            /* 上下文：编辑器 —— 文本编辑 / 文件管理 两个子分组 */
            const rd = !!uiState.editing.readonly;
            const text = [
                { t: '全选', icon: ic('selectAll'), a: 'edSelAll' },
                { t: '复制', icon: ic('copy'), a: 'edCopy' },
                { t: '粘贴', icon: ic('paste'), a: 'edPaste' }
            ];
            if (!rd) text.push({ t: '保存', icon: ic('save'), a: 'save' });
            groups.push({ t: '文本编辑', items: text });

            const fm = [{ t: '返回列表', icon: ic('back'), a: 'back' }];
            if (rd) fm.push({ t: '解除只读并编辑', icon: ic('pen'), a: 'unlockEdit' });
            fm.push({ t: '另存为附件', icon: ic('download'), a: 'attach' });
            if (!VirtualFS.isInternal(uiState.editing.path)) {
                fm.push({ t: '删除文件', icon: ic('trash'), a: 'delFile', dgr: true });
            }
            groups.push({ t: '文件管理', items: fm });
        } else if (uiState.tab === 'files') {
            /* 上下文：文件页（原 .tools 平铺按钮全部收进来） */
            let items;
            if (uiState.batchMode) {
                items = [
                    { t: '全选', icon: ic('selectAll'), a: 'selall' },
                    { t: '全不选', icon: ic('close'), a: 'selnone' },
                    { t: '删除选中', icon: ic('trash'), a: 'delSel', dgr: true },
                    { t: '退出批量', icon: ic('back'), a: 'exitbatch' }
                ];
            } else {
                items = [
                    { t: '新建文件夹', icon: ic('folderPlus'), a: 'mkdir' },
                    { t: '新建文件', icon: ic('filePlus'), a: 'mkfile' },
                    // 2.13.0 批量附件：当前目录（含子目录）一键打包成 zip 发到聊天里
                    { t: '把当前目录打成附件（zip）', icon: ic('download'), a: 'attachDir' },
                    { t: '更多操作…', icon: ic('settings'), a: 'more' },
                    { t: '批量选择', icon: ic('check'), a: 'batchToggle' }
                ];
            }
            groups.push({ t: '文件', items: items });
        }

        /* 组 3：危险操作 */
        groups.push({ t: '危险操作', items: [
            { t: '清空容器', icon: ic('trash'), a: 'clear', dgr: true }
        ] });
        return groups;
    }
    function menuHTML() {
        const groups = menuGroups();
        let h = '';
        for (const g of groups) {
            h += '<div class="pm-g"><div class="pm-t">' + esc(g.t) + '</div>';
            for (const it of g.items) {
                const attr = it.tab ? (' data-tab="' + esc(it.tab) + '"') : (' data-a="' + esc(it.a) + '"');
                h += '<button type="button" class="pm-i' + (it.on ? ' on' : '') + (it.dgr ? ' dgr' : '') + '"' + attr + '>' +
                    '<span class="pm-ic">' + (it.icon || '') + '</span>' +
                    '<span class="pm-lb">' + esc(it.t) + '</span>' +
                    '</button>';
            }
            h += '</div>';
        }
        return h;
    }
    function closeMenu() {
        if (!uiState.menuOpen) return;
        uiState.menuOpen = false;
        renderHead();
    }
    function toggleMenu() {
        uiState.menuOpen = !uiState.menuOpen;
        renderHead();
    }
    function renderHead() {
        const box = uiPanel && uiPanel.querySelector('.ph');
        if (!box) return;
        let paused = false;
        try { paused = isPaused(); } catch (e) {}
        const open = !!uiState.menuOpen;
        box.innerHTML =
            '<div class="ph1">' +
            '<span class="dot' + (paused ? ' pz' : '') + '"></span>' +
            '<span class="ttl">' + esc(panelTitle()) + '</span>' +
            // 2.13.0：收起工作区从 ⋮ 菜单里提出来，放在「更多」旁边的图标 —— 单手操作时
            // 「关掉面板」是最高频动作，藏在两层菜单里既慢又难找。
            '<button type="button" class="ibtn" data-a="close" aria-label="收起工作区" title="收起工作区">' + ic('x') + '</button>' +
            '<button type="button" class="ibtn' + (open ? ' on' : '') + '" data-a="menu" aria-label="更多"' +
            ' aria-expanded="' + (open ? 'true' : 'false') + '">' + ic('moreV') + '</button>' +
            '</div>' +
            '<div class="popup-menu' + (open ? ' on' : '') + '" role="menu">' + menuHTML() + '</div>';
        uiMenu = box.querySelector('.popup-menu');
        if (uiPmScrim) uiPmScrim.classList.toggle('on', open);
    }
    function syncHeadTitle() {
        const n = uiPanel && uiPanel.querySelector('.ph1 .ttl');
        if (n) n.textContent = panelTitle();
    }

    /* ------------------------- 计划条 ------------------------- */
    function renderPlan() {
        if (!uiPlanBar) return;
        const s = getPlanState();
        const p = planProgress();
        if (!s.active && !(s.approved && p.total)) { uiPlanBar.style.display = 'none'; uiPlanBar.innerHTML = ''; return; }
        const total = p.total || 0, done = p.done || 0;
        const pct = total ? Math.round(done / total * 100) : 0;
        const badge = s.active ? '规划中' : '执行中';
        let cur = '';
        for (const it of p.items) { if (it.status === 'doing') { cur = it.text; break; } }
        if (!cur) for (const it of p.items) { if (it.status === 'todo') { cur = it.text; break; } }
        if (!cur) cur = total ? '全部完成' : '—';
        let h = '<div class="psum" data-a="togglePlan">' +
            '<span class="bdg">' + badge + '</span>' +
            '<span class="ptxt">计划 ' + (total ? done + '/' + total : '（空）') + ' · ' + esc(cur) + '</span>' +
            '<span class="pct">' + pct + '%</span></div>' +
            '<div class="pbar"><i style="width:' + pct + '%"></i></div>';
        if (uiState.planOpen) {
            h += '<div class="pitems">';
            if (!total) {
                h += '<div class="pempty">计划还是空的：让 AI 用 plan add &lt;条目&gt; 写入</div>';
            } else {
                for (let i = 0; i < p.items.length; i++) {
                    const it = p.items[i];
                    const sym = it.status === 'done' ? PLAN_SYMBOLS.done : (it.status === 'doing' ? PLAN_SYMBOLS.doing : PLAN_SYMBOLS.todo);
                    const cls = it.status === 'doing' ? 'run' : (it.status === 'done' ? 'done' : '');
                    h += '<div class="pitem ' + it.status + '">' +
                        '<button class="pstat ' + cls + '" data-a="cyc" data-i="' + it.lineNo + '" aria-label="切换状态">' + sym + '</button>' +
                        '<span class="ptxt2">' + esc(it.index + '. ' + it.text) + '</span></div>';
                }
            }
            h += '<div class="pfoot">' +
                '<button class="btn sm" data-a="goSys">查看文件</button>' +
                '<button class="btn sm" data-a="planState">' + (s.active ? '退出计划' : '重新进入计划') + '</button>' +
                '</div></div>';
        }
        uiPlanBar.innerHTML = h;
        uiPlanBar.style.display = 'block';
    }
    // 兼容旧钩子名：运行时与 DSW.ui.renderPlanBar 都按这个名字调用
    function renderPlanBar() { renderPlan(); }

    /* ------------------------- 正文 ------------------------- */
    function renderBody() {
        if (!uiPanel) return;
        const body = uiPanel.querySelector('.pbody');
        if (!body) return;
        syncHeadTitle();
        try { refreshStatusBar(); } catch (e) {}
        body.className = 'pbody';
        body.innerHTML = '';

        try {
            if (uiState.view === 'editor' && uiState.editing) renderEditor(body);
            else if (uiState.tab === 'files') renderFilesTab(body);
            else if (uiState.tab === 'receipt') renderReceiptTab(body);
            else if (uiState.tab === 'settings') renderSettingsTab(body);
            else renderAboutTab(body);
        } catch (e) {
            body.appendChild(el('div', 'empty', '面板渲染出错：' + (e && e.message ? e.message : String(e))));
        }
        renderPlan();
        syncBall();
    }

    /* ------------------------- 文件页 ------------------------- */
    function crumbs(p) {
        const parts = String(p).split('/');
        let h = '<button data-a="cr" data-p="/">/</button>';
        let acc = '';
        for (let i = 0; i < parts.length; i++) {
            if (!parts[i]) continue;
            acc += '/' + parts[i];
            h += '<span class="sep">›</span><button data-a="cr" data-p="' + esc(acc) + '">' + esc(parts[i]) + '</button>';
        }
        return h;
    }
    function renderFilesTab(body) {
        const node = VirtualFS.resolve(uiState.filesPath);
        if (!node || node.type !== 'dir') {
            const box = el('div', 'empty');
            box.innerHTML = '<b>路径不存在：' + esc(uiState.filesPath) + '</b><br>它可能被删除了，或者名字打错了。';
            const b = button('回到根目录', 'sm', function () { uiState.filesPath = '/'; render(); });
            b.style.marginTop = '10px';
            box.appendChild(b);
            body.appendChild(box);
            return;
        }
        appendHTML(body, '<div class="crumbs">' +
            (uiState.filesPath !== '/' ? '<button class="up" data-a="up" aria-label="上一级">' + IC.back + '</button>' : '') +
            crumbs(uiState.filesPath) + '</div>');

        /* 文件页顶部一行纯文字：容器现在存在哪。
         * 只显示状态本身 —— 「油猴储存」或者你绑定的文件夹名，不加底色、不加说明。 */
        {
            const line = el('div', '', storeLineLabel());
            line.setAttribute('data-store', (FsMedia.status().media === 'fsa' || FsMedia.blocked()) ? 'fsa' : FsMedia.status().media);
            line.style.cssText = 'font-size:11px;line-height:1.4;padding:0 2px 6px;' +
                'color:var(--dim);opacity:.8;background:none;border:0;';
            body.appendChild(line);
        }

        /* 原来的 .tools 平铺按钮（新建 / 更多 / 批量）已全部收进右上角 ⋮ 菜单，
           列表上方只留面包屑，界面更干净。 */

        if (uiState.importProg) {
            body.appendChild(el('div', 'dsw2-importprog',
                uiState.importProg.done + '/' + uiState.importProg.total + '  ' + (uiState.importProg.name || '')));
        }

        if (uiState.rename && uiState.rename.dir !== uiState.filesPath) uiState.rename = null;
        if (uiState.rename) {
            const form = el('div', 'form');
            const input = el('input', 'inp');
            input.placeholder = '新名称';
            input.value = uiState.rename.name || '';
            input.addEventListener('input', function () { uiState.rename.value = input.value; });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); submitRename(input.value); }
                else if (e.key === 'Escape') { uiState.rename = null; renderBody(); }
            });
            form.appendChild(input);
            form.appendChild(button('重命名', 'pri sm', function () { submitRename(input.value); }));
            form.appendChild(button('取消', 'sm', function () { uiState.rename = null; renderBody(); }));
            body.appendChild(form);
            setTimeout(function () { try { input.focus(); if (input.select) input.select(); } catch (e) {} }, 30);
        }

        const names = Object.keys(node.children || {});
        /* 默认排序（2026-10 规则）：
           0) /__sys 系统区永远置顶 —— 它是容器自己的文件（手册 / 计划），不该被用户文件淹没；
           1) 规则一：文件都在文件夹上面；
           2) 规则二：同一类型内按创建顺序，建得早的在上面、后建的排后面。
              children 是普通对象，Object.keys 的插入顺序就是创建顺序（持久化也按此顺序序列化），
              所以直接用「原始下标」比较即可；这样不依赖 sort 的稳定性，老 WebView 结果也一致。
           9) /__trash 回收站永远置底（保持原设计）。 */
        const rankOf = function (nm, nd) {
            if (nm === '__sys') return 0;
            if (nm === '__trash') return 9;
            return (nd && nd.type === 'dir') ? 2 : 1;
        };
        const bornIdx = {};
        for (let i = 0; i < names.length; i++) bornIdx[names[i]] = i;
        names.sort(function (a, b) {
            const ra = rankOf(a, node.children[a]), rb = rankOf(b, node.children[b]);
            if (ra !== rb) return ra - rb;
            return bornIdx[a] - bornIdx[b];
        });

        if (!names.length) {
            const box = el('div', 'empty');
            box.innerHTML = '这个文件夹是空的。<br>可以让 AI 写文件，也可以自己建：' +
                '<div class="eg">write ' + esc((uiState.filesPath === '/' ? '' : uiState.filesPath) + '/a.md') + '</div>' +
                '<div class="eg">```dsw\nwrite /hello.md\n<<<\n你好\n<<<\n```</div>';
            box.appendChild(button('复制示例', 'sm', function () {
                copyText('```dsw\nwrite /hello.md\n<<<\n你好\n<<<\n```');
                showToast('示例已复制，粘给 AI 即可');
            }));
            body.appendChild(box);
        } else {
            let h = '';
            for (const n of names) {
                const child = node.children[n];
                if (!child || typeof child !== 'object') continue;   // 兜底：坏节点不渲染成 undefined
                const full = (uiState.filesPath === '/' ? '' : uiState.filesPath) + '/' + n;
                const sys = isSysPath(full);
                const isDir = child.type === 'dir';
                /* meta 先算成数字/字符串再兜底，任何空值都不会漏成 "undefined" / "NaN" */
                let meta;
                if (isDir) {
                    meta = safeNum(Object.keys(child.children || {}).length) + ' 项';
                } else {
                    const text = String(child.content == null ? '' : child.content);
                    meta = safeNum(text.split('\n').length) + 'L · ' + safeSize(byteLen(text));
                }
                h += '<div class="row' + (sys ? ' sys' : '') + (uiState.batchMode && uiState.selected[full] ? ' sel' : '') + '" data-name="' + esc(n) + '">';
                if (uiState.batchMode) h += '<span class="ck">' + (uiState.selected[full] ? '✓' : '') + '</span>';
                h += '<span class="ic">' + (isDir ? ic('dir') : ic('file')) + '</span>' +
                    '<span class="nm">' + esc(safeStr(n, '(未命名)')) + '</span><span class="meta">' + esc(meta) + '</span>';
                if (!uiState.batchMode) h += '<button class="more" data-more="' + esc(n) + '" aria-label="更多操作">' + ic('dots') + '</button>';
                h += '</div>';
            }
            appendHTML(body, h);
            installRowLongPress(body);
        }

        /* 新建的命名表单贴在列表最下面：不再挡在列表上方、也不遮住第一行 */
        if (uiState.newEntry) {
            const form = el('div', 'form form--create');
            const input = el('input', 'inp');
            input.placeholder = uiState.newEntry.type === 'dir' ? '文件夹名，例如 src/components' : '文件名，例如 src/a.js';
            input.value = uiState.newEntry.value || '';
            input.addEventListener('input', function () { uiState.newEntry.value = input.value; });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); doCreateEntry(input.value); }
                else if (e.key === 'Escape') { uiState.newEntry = null; renderBody(); }
            });
            form.appendChild(input);
            form.appendChild(button('创建', 'pri sm', function () { doCreateEntry(input.value); }));
            form.appendChild(button('取消', 'sm', function () { uiState.newEntry = null; renderBody(); }));
            body.appendChild(form);
            setTimeout(function () {
                try { form.scrollIntoView({ block: 'nearest' }); input.focus(); } catch (e) {}
            }, 30);
        }
    }

    /* 列表项长按 = 弹出上下文菜单（重命名 / 删除）；短按仍走点击委托（打开文件夹 / 文件）。
       触摸与鼠标都支持；长按触发后把这一轮点击吞掉，避免又打开一次文件。 */
    function installRowLongPress(scope) {
        if (!scope || !scope.querySelectorAll) return;
        const rows = scope.querySelectorAll('.row[data-name]');
        const LP = 500;
        for (const row of rows) {
            let timer = null, sx = 0, sy = 0, active = false, lastTouchAt = 0;
            const clear = function () {
                if (timer) { clearTimeout(timer); timer = null; }
                active = false;
            };
            const fire = function () {
                timer = null;
                if (!active) return;
                rowLongPressAt = Date.now();
                try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
                const name = row.getAttribute('data-name');
                const full = (uiState.filesPath === '/' ? '' : uiState.filesPath) + '/' + name;
                const nd = VirtualFS.resolve(uiState.filesPath);
                const ch = nd && nd.children ? nd.children[name] : null;
                if (ch) openRowSheet(name, full, ch);
            };
            const onStart = function (e) {
                if (uiState.batchMode) return;                 // 批量模式下长按不弹菜单
                if (e.type === 'touchstart') lastTouchAt = Date.now();
                if (e.type === 'mousedown') {
                    if (e.button != null && e.button !== 0) return;
                    if (Date.now() - lastTouchAt < 800) return;  // 合成鼠标事件去重
                }
                const p = (e.touches && e.touches[0]) || e;
                sx = p.clientX; sy = p.clientY;
                active = true;
                if (timer) clearTimeout(timer);
                timer = setTimeout(fire, LP);
            };
            const onMove = function (e) {
                if (!active) return;
                const p = (e.touches && e.touches[0]) || e;
                if (Math.abs(p.clientX - sx) + Math.abs(p.clientY - sy) > 10) clear();
            };
            const onEnd = function () { clear(); };
            row.addEventListener('touchstart', onStart, { passive: true });
            row.addEventListener('touchmove', onMove, { passive: true });
            row.addEventListener('touchend', onEnd);
            row.addEventListener('touchcancel', onEnd);
            row.addEventListener('mousedown', onStart);
            row.addEventListener('mousemove', onMove);
            row.addEventListener('mouseup', onEnd);
            row.addEventListener('mouseleave', onEnd);
            row.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        }
    }

    function doCreateEntry(rawName) {
        const v = String(rawName || '').trim();
        if (!v) { showToast('名字不能为空', 'warn'); return; }
        const segs = v.split('/').filter(function (x) { return x; });
        if (!segs.length) { showToast('名字不能为空', 'warn'); return; }
        const cur = VirtualFS.resolve(uiState.filesPath);
        if (!cur || cur.type !== 'dir') { showToast('当前目录不可用', 'err'); return; }
        let base = uiState.filesPath === '/' ? '' : uiState.filesPath;
        const k = segs.pop();
        const target = (base + '/' + segs.concat([k]).join('/')).replace(/\/{2,}/g, '/');
        const r = uiState.newEntry.type === 'dir'
            ? VirtualFS.mkdir(target)
            : VirtualFS.write(target, '', {});
        if (!r || !r.ok) { showToast((r && r.error) || '创建失败', 'err'); return; }
        uiState.newEntry = null;
        pushLog('面板创建 ' + target);
        showToast('已创建 ' + k);
        render();
    }

    function beginRename(path, name) {
        uiState.rename = { path: path, name: name, dir: uiState.filesPath };
        renderBody();
    }
    function submitRename(rawName) {
        const st = uiState.rename;
        if (!st) return;
        const name = String(rawName || '').trim();
        if (!name) { showToast('请输入新名称', 'warn'); return; }
        if (name === st.name) { uiState.rename = null; renderBody(); return; }
        if (/[\/\\]/.test(name)) { showToast('名称里不能有 / 或 \\', 'warn'); return; }
        const to = (st.dir === '/' ? '' : st.dir) + '/' + name;
        const exist = VirtualFS.resolve(to);
        const doMove = function (force) {
            const r = VirtualFS.move(st.path, to, force ? { force: true } : {});
            if (!r || r.ok !== true) { showToast((r && r.error) || '重命名失败', 'err'); return; }
            pushLog('面板重命名 ' + st.path + ' → ' + to);
            showToast('已重命名为 ' + name);
            uiState.rename = null;
            render();
        };
        if (exist) {
            if (exist.type === 'dir') { showToast('已存在同名文件夹：' + to, 'err'); return; }
            askConfirm('覆盖 ' + name, name, '输入 “' + name + '” 确认覆盖；原内容进撤销栈，可用 undo 找回', function () { doMove(true); });
            return;
        }
        doMove(false);
    }

    function navTo(p) {
        const n = VirtualFS.resolve(p);
        if (!n) { showToast('路径不存在：' + p, 'err'); return; }
        if (n.type !== 'dir') { openFile(p); return; }
        uiState.filesPath = p;
        uiState.view = 'list';
        uiState.newEntry = null;
        uiState.batchMode = false;
        uiState.selected = {};
        uiState.toolbarMore = false;
        render();
    }
    function openFile(p, readonly) {
        const node = VirtualFS.resolve(p);
        if (!node || node.type !== 'file') { showToast('文件不存在：' + p, 'err'); return; }
        uiState.editing = { path: p, content: String(node.content == null ? '' : node.content), readonly: !!readonly };
        uiState.view = 'editor';
        uiState.draft = null;          // 换文件不继承上一个文件的草稿
        uiState.pasteCaret = null;
        render();
    }

    /* ------------------------- 文件详情页 ------------------------- */
    /* ------------------------- 文件详情页（文本编辑器式） ------------------------- */

    // 当前编辑区的文本：优先取 textarea 实时值，其次草稿，最后文件内容
    function editorText() {
        const st = uiState.editing;
        if (!st) return '';
        const ta = uiPanel && uiPanel.querySelector('#ta');
        if (ta) return ta.value;
        if (uiState.draft != null) return uiState.draft;
        return String(st.content == null ? '' : st.content);
    }

    // 读剪贴板（异步）。WebView 里可能弹权限框或直接拒绝 —— 都留给调用方降级提示。
    function readClipboardText(cb) {
        let done = false;
        const finish = function (text, err) { if (done) return; done = true; cb(text, err); };
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function (t) { finish(t, null); }, function (e) { finish(null, e); });
                setTimeout(function () { finish(null, new Error('timeout')); }, 6000);
                return;
            }
        } catch (e) {}
        finish(null, new Error('unsupported'));
    }

    function edSelectAll() {
        const st = uiState.editing;
        if (!st) return;
        const ta = uiPanel.querySelector('#ta');
        if (ta) {
            try { ta.focus(); ta.select(); } catch (e) {}
            showToast('已全选（' + ta.value.length + ' 字符）');
            return;
        }
        copyText(String(st.content == null ? '' : st.content));
        showToast('本环境不支持选中，已改为复制全文');
    }

    function edCopy() {
        const st = uiState.editing;
        if (!st) return;
        const ta = uiPanel.querySelector('#ta');
        const full = ta ? ta.value : String(st.content == null ? '' : st.content);
        let text = '';
        if (ta && ta.selectionStart !== ta.selectionEnd) text = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        if (text) { copyText(text); showToast('已复制选中内容（' + text.length + ' 字符）'); return; }
        copyText(full);
        showToast('已复制全文（' + full.length + ' 字符）');
    }

    function edPaste() {
        const st = uiState.editing;
        if (!st) return;
        if (st.readonly) { showToast('只读文件不能粘贴：先在右上角 ⋮ 菜单里选「解除只读并编辑」', 'warn'); return; }
        readClipboardText(function (text, err) {
            if (err || text == null) { showToast('读不到剪贴板：请长按编辑区用系统「粘贴」', 'warn'); return; }
            if (!text) { showToast('剪贴板是空的', 'warn'); return; }
            const ta = uiPanel.querySelector('#ta');
            if (!ta) { showToast('编辑区还没就绪，请重开这个文件', 'warn'); return; }
            const s = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
            const e = ta.selectionEnd == null ? s : ta.selectionEnd;
            uiState.draft = ta.value.slice(0, s) + text + ta.value.slice(e);
            uiState.pasteCaret = s + text.length;
            uiState.focusEd = true;
            renderBody();
            showToast('已粘贴 ' + text.length + ' 字符');
        });
    }

    function edSave() {
        const st = uiState.editing;
        if (!st) return;
        const text = editorText();
        const r = VirtualFS.write(st.path, text, {});
        if (!r || !r.ok) { showToast((r && r.error) || '保存失败', 'err'); return; }
        pushLog('面板保存 ' + st.path);
        showToast('已保存');
        uiState.draft = null;
        uiState.editing = { path: st.path, content: text, readonly: false };
        render();
    }

    function renderEditor(body) {
        const st = uiState.editing;
        const node = VirtualFS.resolve(st.path);
        if (!node || node.type !== 'file') {
            body.appendChild(el('div', 'empty', '文件不存在：' + st.path));
            body.appendChild(button('返回', 'sm', function () { uiState.view = 'list'; uiState.editing = null; render(); }));
            return;
        }
        const readonly = !!st.readonly;
        body.className = 'pbody pbody--editor';
        const content = String(st.content == null ? '' : st.content);
        /* 沉浸式：不再有「阅读态 / 编辑态」的 UI 区隔 —— 打开就是全屏编辑器（可写文件可编辑），
           系统文件仍带只读权限（ta.readOnly），但同样用全屏文本域呈现，可直接选中复制。
           文本操作 / 文件管理全部收进右上角 ⋮ 菜单。 */

        const ed = el('div', 'ed');

        /* 代码区：全屏 textarea + 行号槽（无动作条、无标题栏；只读文件用 ta.readOnly 限制） */
        const main = el('div', 'ed-main');
        let ta = null;
        let updateStatus = function () {};
        const wrap = el('div', 'ed-wrap');
        const gutter = el('div', 'ed-gutter');
        ta = document.createElement('textarea');
        ta.className = 'ta';
        ta.id = 'ta';
        ta.spellcheck = false;
        ta.wrap = 'off';
        ta.readOnly = readonly;
        ta.setAttribute('autocapitalize', 'off');
        ta.setAttribute('autocorrect', 'off');
        if (readonly) ta.setAttribute('aria-readonly', 'true');
        const startText = (uiState.draft != null ? uiState.draft : content);
        ta.value = startText;
        if (!readonly) uiState.draft = startText;
        let lastN = -1;
        const paintGutter = function () {
            const n = String(ta.value == null ? '' : ta.value).split('\n').length;
            if (n === lastN) return;
            lastN = n;
            let gh = '';
            for (let i = 1; i <= n; i++) gh += '<div class="g">' + i + '</div>';
            gutter.innerHTML = gh;
        };
        paintGutter();
        gutter.scrollTop = ta.scrollTop;
        ta.addEventListener('scroll', function () { gutter.scrollTop = ta.scrollTop; });
        ta.addEventListener('input', function () {
            if (!readonly) uiState.draft = ta.value;
            paintGutter();
            updateStatus();
        });
        ta.addEventListener('keyup', function () { updateStatus(); });
        ta.addEventListener('click', function () { updateStatus(); });
        wrap.appendChild(gutter);
        wrap.appendChild(ta);
        main.appendChild(wrap);
        ed.appendChild(main);

        /* 极简状态栏：位置 / 行 / 字符 / 字节 / 编码 / 换行 / 读写态 */
        const status = el('div', 'ed-status');
        const posEl = el('span', 'ps', 'Ln 1, Col 1');
        const lineEl = el('span');
        const charEl = el('span');
        const byteEl = el('span');
        status.appendChild(posEl);
        status.appendChild(lineEl);
        status.appendChild(charEl);
        status.appendChild(byteEl);
        status.appendChild(el('span', 'sp'));
        status.appendChild(el('span', '', 'UTF-8'));
        status.appendChild(el('span', '', 'LF'));
        status.appendChild(el('span', readonly ? 'ro' : 'rw', readonly ? '只读' : '可编辑'));
        ed.appendChild(status);

        updateStatus = function () {
            const text = ta ? String(ta.value == null ? '' : ta.value) : content;
            lineEl.innerHTML = '行 <b>' + safeNum(text.split('\n').length) + '</b>';
            charEl.innerHTML = '字符 <b>' + safeNum(text.length) + '</b>';
            byteEl.innerHTML = '字节 <b>' + safeNum(byteLen(text)) + '</b>';
            if (ta) {
                const caret = ta.selectionStart == null ? 0 : ta.selectionStart;
                const before = String(ta.value || '').slice(0, caret);
                const ln = before.split('\n').length;
                const col = caret - before.lastIndexOf('\n');
                posEl.textContent = 'Ln ' + safeNum(ln) + ', Col ' + safeNum(col);
            }
        };
        updateStatus();

        body.appendChild(ed);

        if (ta && uiState.focusEd) {
            uiState.focusEd = false;
            const caret = uiState.pasteCaret;
            uiState.pasteCaret = null;
            setTimeout(function () {
                try {
                    ta.focus();
                    if (caret != null) ta.selectionStart = ta.selectionEnd = Math.min(caret, ta.value.length);
                } catch (e) {}
            }, 30);
        } else if (ta && uiState.pasteCaret != null) {
            const caret = uiState.pasteCaret;
            uiState.pasteCaret = null;
            setTimeout(function () { try { ta.selectionStart = ta.selectionEnd = Math.min(caret, ta.value.length); } catch (e) {} }, 0);
        }
    }

    function uiDelete(path, cb) {
        const name = String(path).split('/').pop();
        const node = VirtualFS.resolve(path);
        if (!node) { showToast('文件不存在：' + path, 'err'); return; }
        askConfirm('删除「' + name + '」', null, '会进回收站，可用 restore 恢复', function () {
            const r = VirtualFS.delete(path, { recursive: node.type === 'dir' });
            if (!r || !r.ok) { showToast((r && r.error) || '删除失败', 'err'); return; }
            pushLog('面板删除 ' + path);
            showToast('已删除 ' + name);
            if (cb) cb();
            render();
        });
    }

    /* ------------------------- 回执页 ------------------------- */
    const RECEIPT_FILTERS = [
        { key: 'all', label: '全部' },
        { key: 'error', label: '错误' },
        { key: 'warn', label: '警告' },
        { key: 'cmd', label: '命令' },
        { key: 'pacer', label: '节奏器' }
    ];
    function receiptKind(text) {
        const t = String(text == null ? '' : text);
        if (/⟦fs⟧\s+DENY/.test(t)) return 'deny';
        if (/⟦fs⟧\s+PARTIAL/.test(t)) return 'partial';
        if (/⟦fs⟧\s+AUTO/.test(t)) return 'warn';
        if (/✗/.test(t)) return 'error';
        return 'cmd';
    }
    function logKindOf(l) {
        const msg = String(l && l.msg || '');
        if (l && l.type === 'error') return 'error';
        if (l && l.type === 'warn') return 'warn';
        if (/节奏器|等待|限流|冷却/.test(msg)) return 'pacer';
        return 'info';
    }
    const FILTER_KINDS = {
        error: ['error', 'deny', 'partial'],
        warn: ['warn', 'partial'],
        cmd: ['cmd', 'ok', 'noop', 'skip', 'info'],
        pacer: ['pacer']
    };
    function filterMatch(kindKey, kind) {
        if (!kindKey || kindKey === 'all') return true;
        const list = FILTER_KINDS[kindKey];
        return !!list && list.indexOf(kind) !== -1;
    }
    function receiptCounts() {
        const c = { all: 0, error: 0, warn: 0, cmd: 0, pacer: 0 };
        const tally = function (kind) {
            for (const k of Object.keys(FILTER_KINDS)) if (filterMatch(k, kind)) c[k]++;
            c.all++;
        };
        for (const r of uiReceipts) tally(receiptKind(r.text));
        for (const l of uiLogs) tally(logKindOf(l));
        return c;
    }
    function receiptClass(text) {
        if (/⟦fs⟧\s+OK/.test(text)) return 'ok';
        if (/⟦fs⟧\s+AUTO/.test(text)) return 'ok';
        if (/⟦fs⟧\s+PARTIAL/.test(text)) return 'partial';
        if (/⟦fs⟧\s+DENY/.test(text)) return 'deny';
        return 'noop';
    }
    function renderReceiptTab(body) {
        const key = uiState.receiptFilter || 'all';
        const counts = receiptCounts();
        let h = '<div class="filters">';
        for (const f of RECEIPT_FILTERS) {
            const c = safeNum(counts[f.key]);
            h += '<button type="button" class="' + (key === f.key ? 'on' : '') + '" data-f="' + esc(f.key) + '"' +
                ' title="' + esc(f.label + ' ' + c) + '">' + esc(f.label) + ' ' + c + '</button>';
        }
        h += '</div>';
        appendHTML(body, h);

        let list = [];
        for (let i = uiReceipts.length - 1; i >= 0; i--) {
            const r = uiReceipts[i];
            const kind = receiptKind(r.text);
            if (!filterMatch(key, kind)) continue;
            list.push(r);
        }
        if (!list.length && !uiLogs.length) {
            body.appendChild(el('div', 'empty', '还没有回执。\nAI 在 ```dsw 代码围栏里发命令后，这里会显示每一条回执与裁决理由。'));
            return;
        }
        for (const r of list) {
            const cls = receiptClass(r.text);
            const card = el('div', 'rc ' + cls);
            const rh = el('div', 'rh');
            rh.appendChild(el('span', 'k', receiptKindLabel(r.text)));
            rh.appendChild(el('span', 't', fmtClock(r.at)));
            card.appendChild(rh);
            const sum = el('div', 'sum', firstLine(r.text));
            card.appendChild(sum);
            const rest = restText(r.text);
            if (rest) card.appendChild(el('div', 'det', rest));
            body.appendChild(card);
        }

        let logShown = 0;
        if (uiLogs.length) {
            let lh = '';
            for (let i = uiLogs.length - 1; i >= 0 && i >= uiLogs.length - 60; i--) {
                const l = uiLogs[i];
                if (!filterMatch(key, logKindOf(l))) continue;
                const lv = l.type === 'info' ? '信息' : (l.type === 'warn' ? '警告' : '错误');
                const cls = l.type === 'info' ? 'info' : (l.type === 'warn' ? 'warn' : 'err');
                lh += '<div class="log ' + cls + '"><span class="tm">' + esc(fmtClock(l.at)) + '</span>' +
                    '<span class="lv">' + lv + '</span><span class="ms">' + esc(l.msg) + '</span></div>';
                logShown++;
            }
            if (logShown) {
                appendHTML(body, '<h3 class="sh">运行流水</h3>' + lh);
            }
        }
        if (!list.length && !logShown) body.appendChild(el('div', 'empty', '当前过滤条件下没有内容（换一个分类看看）。'));
    }
    function firstLine(text) {
        const s = String(text == null ? '' : text);
        const i = s.indexOf('\n');
        return i < 0 ? s : s.slice(0, i);
    }
    function restText(text) {
        const s = String(text == null ? '' : text);
        const i = s.indexOf('\n');
        return i < 0 ? '' : s.slice(i + 1).trim();
    }
    function receiptKindLabel(text) {
        const t = String(text == null ? '' : text);
        const m = t.match(/⟦fs⟧\s+(OK|AUTO|PARTIAL|DENY|NOOP|SKIP)/);
        if (m) return m[1];
        if (/✗/.test(t)) return 'FAIL';
        return 'LOG';
    }

    /* ------------------------- 设置页 ------------------------- */
    function swRow(key, label, sub, on) {
        return '<div class="set" data-tog="' + key + '"><span class="lb">' + label +
            (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span>' +
            '<span class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '"></span></div>';
    }
    function planModeHintText() {
        const s = getPlanState();
        const p = planProgress();
        if (s.active) return '规划中：AI 只能写计划文件，写别的会被拦下并要你确认';
        if (s.approved && p.total) return '执行中：' + p.done + '/' + p.total + ' 完成';
        return '未开启：AI 可自由写文件';
    }
    /* ------------------------- 手风琴折叠面板 ------------------------- */
    /* 设置 / 关于原先是一长串 .grp 卡片，太长；现在每个分组只露标题，
       点标题就地切换 open（事件委托里直接切类，见 onRootClick），max-height + 箭头旋转做平滑动画。 */
    function accItem(key, title, inner, badge) {
        const open = !!uiState.acc[key];
        return '<div class="accordion-item' + (open ? ' open' : '') + '" data-acc-id="' + esc(key) + '">' +
            '<button type="button" class="accordion-header" data-acc="' + esc(key) + '">' +
            '<span class="ah-ic">' + ic('next') + '</span>' +
            '<span class="ah-t">' + esc(title) + '</span>' +
            (badge ? '<span class="ah-b">' + esc(badge) + '</span>' : '') +
            '</button>' +
            '<div class="accordion-body">' + inner + '</div></div>';
    }

    /* ------------------- P3b-2：容器存放位置面板 -------------------
     * 渲染必须是同步的，而「有没有绑定文件夹」是异步查的，所以在内存里缓存一份名字，
     * 绑定/解绑/启动后刷新它。 */
    let folderHandleName = [];
    let folderBusy = false;
    function refreshFolderName() {
        try {
            FsMedia.handleName().then(function (n) {
                folderHandleName = n || [];
                try { render(); } catch (e) {}
                // 引导层开着时，存储位置那一栏也得跟着变（绑定/解绑是异步的）
                try { refreshOnboard(); } catch (e) {}
            }, function () {});
        } catch (e) {}
    }

    /* P3b-3：把自动续授权的状态翻译成人话（面板上那一行）。 */
    function autoGrantLine(ag) {
        if (!ag.enabled) return '已关闭 —— 权限掉了就得自己点「立即授权」';
        switch (ag.state) {
            case 'granted': return '已开启 —— 浏览器还记着这个文件夹，刷新页面也不用再点';
            case 'asking': return '正在补授权…';
            case 'stale': return ag.armed
                ? '已开启 —— 你在页面上随便点一下（点输入框、发消息都算）就会自动接上，通常不会弹窗'
                : '已开启，但还没找到机会重试';
            case 'denied': return '这次你点了「不允许」，本页不再打扰你；重新打开页面会自动再试一次';
            case 'unbound': return '还没绑定文件夹';
            case 'off': return '已关闭';
            default: return '待命中';
        }
    }

    /* folderHandleName 初值是 []（表示「还不知道/没绑定」），刷新后才是字符串。
     * 直接插进字符串时数组会 toString 成名字，看着没错，但抽出来单用时就会漏出数组 —— 统一收敛一下。 */
    function folderNameText() {
        if (!folderHandleName) return '';
        return typeof folderHandleName === 'string' ? folderHandleName : String(folderHandleName);
    }

    /* 文件页顶部那一行「容器存在哪」的纯文字（抽出来是为了能被测试直接调用）。
     * 只要状态：油猴储存 / 浏览器沙盒 / 你绑定的文件夹名。没有说明、没有底色。 */
    function storeLineLabel() {
        const fm = FsMedia.status();
        const nm = folderNameText();
        if (fm.media === 'fsa' || FsMedia.blocked()) return nm || '文件夹';
        return fm.media === 'opfs' ? '浏览器沙盒' : '油猴储存';
    }
    function setFolderNameForTest(n) { folderHandleName = n || []; }

    function folderSummaryText() {
        const fm = FsMedia.status();
        const blk = FsMedia.blocked();
        if (blk) return '⚠ ' + blk.where + '（正在自动接上）';
        const where = fm.media === 'fsa' ? '自己的文件夹'
            : (fm.media === 'opfs' ? '浏览器沙盒' : '油猴存储');
        return where + (folderHandleName.length ? '「' + folderHandleName + '」' : '');
    }

    function folderPanelHTML() {
        const fm = FsMedia.status();
        const sup = FsMedia.supported();
        const bound = folderHandleName.length > 0;
        const isFsa = fm.media === 'fsa';
        const blk = FsMedia.blocked();
        const ag = FsMedia.autoState();
        let h = '<div class="set col"><span class="lb">当前：' + esc(folderSummaryText()) +
            '<span class="sub">' + (blk ? '内容还在，只是暂时读不到' : safeNum(fm.blobs) + ' 块内容') +
            (fm.pending ? ' · 待落盘 ' + safeNum(fm.pending) : '') +
            (fm.deferred ? ' · 等授权补写 ' + safeNum(fm.deferred) : '') +
            (fm.error ? ' · ⚠ ' + esc(fm.error) : '') + '</span></span></div>';

        if (blk) {
            h += '<div class="set col"><span class="lb">⚠ 文件夹暂时没接上，已进入只读保护<span class="sub">' +
                '原因：' + esc(blk.reason) + '\n' +
                '为什么不让写：内容都在' + esc(blk.where) + '里、现在读不到；这时候如果还允许写，' +
                '新内容会落到另一个地方，等你授权回来就分成两半 —— 那部分会永久读不到。\n' +
                '**不用你去设置里点**：只要浏览器还记得这个文件夹，你在页面上随便点一下' +
                '（点输入框、发消息、敲键盘都算）就会自动接上，通常连弹窗都没有。\n' +
                '万一弹了「不允许 / 允许」，点允许就好；要是点了不允许，这一页就不再打扰你，' +
                '重新打开页面会再自动试一次。' +
                '</span></span></div>';
        } else {
            h += '<div class="set col"><span class="lb">说明<span class="sub">' +
                '存进「自己的文件夹」后：容器里的文件会**按原路径**出现在这个文件夹里' +
                '（比如容器的 /src/a.js 就是文件夹里的 src/a.js），可以用文件管理器直接看、改、备份。\n' +
                '文件夹里的 .dsw 目录是容器的内部记录（历史版本、撤销、去重内容）：平时不用管，但**别删**。\n' +
                '你在文件夹里改了或新增了文件，下次打开页面会自动读进容器。\n' +
                '系统区（/__sys：手册、计划）不会写到你的文件夹里 —— ' +
                '免得系统文件躺在手机存储里被文件管理器误删（容器的只读保护管不到容器外）。\n' +
                '存在「油猴存储」里：省事，但容量小，清浏览器数据就没了。\n' +
                '绑定或切换时，容器内容会**自动搬过去**，不会丢。' +
                '</span></span></div>';
        }

        if (!sup) {
            h += '<div class="set col"><span class="lb">这台浏览器不支持选择文件夹<span class="sub">' +
                '（没有 showDirectoryPicker）—— 只能继续用油猴存储。</span></span></div>';
            return h;
        }

        h += '<div class="set btns">';
        h += '<button class="btn sm' + (blk ? ' pri' : '') + '" data-a="bindFolder">' +
            (bound ? '重新选文件夹…' : '绑定文件夹…') + '</button>';
        if (bound) h += '<button class="btn sm' + (blk ? ' pri' : '') + '" data-a="grantFolder">立即授权</button>';
        if (bound) h += '<button class="btn sm" data-a="autoGrantToggle">自动续授权：' + (ag.enabled ? '开' : '关') + '</button>';
        if (isFsa && !blk) h += '<button class="btn sm dgr" data-a="unbindFolder">解绑（搬回油猴存储）</button>';
        h += '<button class="btn sm" data-a="folderRefresh">刷新状态</button>';
        h += '</div>';

        if (bound) {
            h += '<div class="set col"><span class="lb">自动续授权<span class="sub">' +
                esc(autoGrantLine(ag)) + '\n' +
                '浏览器的规矩：授权动作必须由你「碰一下屏幕」触发，所以彻底免点击做不到；' +
                '但绑过一次之后，这件事**不需要你再进设置** —— 加载时先静默检查一次，' +
                '掉了就等你下一次点屏幕时自动补上（浏览器还记着就不会弹窗）。' +
                '</span></span></div>';
        }

        if (bound && !isFsa && !blk && fm.error) {
            h += '<div class="set col"><span class="lb">⚠ 文件夹没在用<span class="sub">' +
                '点一下上面的「立即授权」即可（浏览器要求由你点一下才给权限）。</span></span></div>';
        }
        return h;
    }

    function renderSettingsTab(body) {
        const cfg = getUiCfg();
        const planNow = getPlanState();
        const planPr = planProgress();
        const range = pacerTiers().map(function (t) { return pacerTierName(t.ms); }).join('/');
        const fileCount = safeNum(countFiles(VirtualFS.root));
        let h = '<div class="acc">';

        /* 概览 */
        h += accItem('set.overview', '概览',
            '<div class="stat">' +
            '<button data-a="goFiles"><b>' + fileCount + '</b><span>文件</span></button>' +
            '<button data-a="goUndo"><b>' + safeNum(VirtualFS.undoIdx().cursor) + '</b><span>可撤销</span></button>' +
            '<button data-a="goAbout"><b>' + safeNum(AnchorStore.size()) + '</b><span>锚点</span></button></div>' +
            '<div class="set btns"><button class="btn sm" data-a="onboard">首次运行设置与说明…</button></div>',
            fileCount + ' 文件');

        /* 协议 */
        h += accItem('set.proto', '协议',
            '<div class="set col"><span class="lb">执行域与读兜底<span class="sub">' +
            '只有 ```dsw 围栏（或 <dsw> … </dsw>）里的命令会执行；读兜底只在域外内容「像命令」且全是只读命令时生效，' +
            '写命令与危险命令（delete / upload / restore / undo / redo）永不放宽。' +
            '</span></span></div>' +
            '<div class="set btns"><button class="btn sm" data-a="resetAnchor">重置锚点表</button>' +
            '<button class="btn sm" data-a="resetIdem">重置幂等表</button></div>');

        /* 出站 */
        h += accItem('set.outbox', '出站',
            swRow('autoSend', '自动回传', '关掉后只进队列，要手动点「立即发送队列」', cfg.autoSend !== false) +
            swRow('rateLimit', '节奏器等待', '发得太快时自动等一等（' + range + ' 档，最长 30 秒）', cfg.rateLimit !== false) +
            '<div class="set col"><span class="lb">队列 <b class="mn">' + safeNum(outbox.parts.length) + '</b> 条 · 本分钟 <b class="mn">' +
            safeNum(rateStatus().in1m) + '/' + CONFIG.OUTBOX_MAX_PER_MIN + '</b> · 10 分钟 <b class="mn">' +
            safeNum(rateStatus().in10m) + '/' + CONFIG.OUTBOX_MAX_PER_10MIN + '</b> · 当前档位 <b class="mn">' +
            esc(pacerTierName(rateStatus().tierMs)) + '</b><span class="sub" id="ratehint"></span></span></div>' +
            '<div class="set btns"><button class="btn sm" data-a="flush">立即发送队列</button></div>' +
            '<div class="set col"><span class="lb">什么时候会等 30 秒？<span class="sub">' +
            '一分钟内已发 ' + CONFIG.OUTBOX_MAX_PER_MIN + ' 条，或十分钟内已发 ' + CONFIG.OUTBOX_MAX_PER_10MIN +
            ' 条时，节奏器会拉长到 30 秒一档，直到窗口滑出。档位完全由固定条件决定，不随机。' +
            '</span></span></div>',
            '队列 ' + safeNum(outbox.parts.length));

        /* 新对话 */
        h += accItem('set.conv', '新对话',
            swRow('autoBootstrap', '新对话注入', '打开新对话时自动把协议信息排进队列', cfg.autoBootstrap !== false) +
            swRow('injectManual', '注入手册全文', '默认只发手册目录卡（按节现取）；打开则首轮连全文一起发', cfg.injectManual === true) +
            '<div class="set btns"><button class="btn sm" data-a="copyInject">复制注入内容</button>' +
            '<button class="btn sm" data-a="resetInject">重置注入记录</button></div>');

        /* 提醒 */
        h += accItem('set.notify', '提醒',
            swRow('notifyVibrate', '震动', '一次短震（200ms）', cfg.notifyVibrate !== false) +
            swRow('notifySound', '提示音', '一个 880Hz 的「叮」（0.18s）', cfg.notifySound !== false) +
            swRow('terminateAutoPause', '终止符后自动暂停', '与「终止符号提醒」互相独立：可以只提醒不暂停', cfg.terminateAutoPause !== false) +
            '<div class="set btns"><button class="btn sm" data-a="testAlert">测试提醒</button></div>');

        /* 计划 */
        h += accItem('set.plan', '计划',
            swRow('planMode', '进入计划模式', planModeHintText(), !!planNow.active) +
            swRow('planInject', '每轮附带计划进度', '计划与每条状态并进当轮回执（同一条消息）', cfg.planInject !== false) +
            '<div class="set col"><span class="lb">计划文件长什么样？<span class="sub">计划存在 ' + esc(SYS_PLAN_PATH) +
            '，一条一行：' + PLAN_SYMBOLS.todo + ' 待完成 / ' + PLAN_SYMBOLS.doing + ' 进行中 / ' + PLAN_SYMBOLS.done + ' 完成。' +
            (planPr.total ? '\n' + esc(planListText(CONFIG.PLAN_RECEIPT_MAX_ITEMS).join('\n')) : '') + '</span></span></div>' +
            '<div class="set btns"><button class="btn sm" data-a="newPlan">新建计划文件</button>' +
            '<button class="btn sm" data-a="copyPlan">复制计划</button>' +
            '<button class="btn sm dgr" data-a="clearPlan">清空计划</button></div>',
            planPr.total ? (planPr.done + '/' + planPr.total) : '');

        /* 数据 */
        h += accItem('set.data', '数据',
            '<div class="set col"><span class="lb">检查点<span class="sub">' + esc(Ckpt.text()).replace(/\n/g, '<br>') + '</span></span></div>' +
            '<div class="set btns"><button class="btn sm" data-a="undo">撤销</button>' +
            '<button class="btn sm" data-a="redo">重做</button>' +
            '<button class="btn sm" data-a="restore">恢复</button>' +
            '<button class="btn sm" data-a="checkpoint">写检查点</button>' +
            '<button class="btn sm" data-a="exportJson">导出 JSON</button>' +
            '<button class="btn sm" data-a="exportZip">导出 ZIP</button></div>');

        /* P3b-2：容器存在哪 —— 真实文件夹 / 浏览器沙盒 / 油猴存储 */
        h += accItem('set.folder', '容器存放位置', folderPanelHTML(), folderSummaryText());

        /* 外观 */
        const mode = themePref();
        let look = '<div class="colwrap">';
        for (const k of THEME_KEYS) {
            const t = THEMES[k];
            const c = isDark() ? t.d : t.l;
            look += '<button class="swatch' + (currentPalette() === k ? ' on' : '') + '" data-th="' + k + '">' +
                '<i style="background:' + c.ac + '"></i><i style="background:' + c.bg + '"></i><span>' + t.n + '</span></button>';
        }
        look += '</div><div class="seg">' +
            '<button class="' + (mode === 'light' ? 'on' : '') + '" data-md="light">浅色</button>' +
            '<button class="' + (mode === 'dark' ? 'on' : '') + '" data-md="dark">深色</button>' +
            '<button class="' + (mode === 'auto' ? 'on' : '') + '" data-md="auto">跟随系统</button></div>';
        h += accItem('set.look', '外观', look, THEMES[currentPalette()] ? THEMES[currentPalette()].n : '');

        h += '</div>';
        appendHTML(body, h);

        /* 清空容器（危险动作的终站） */
        const big = el('button', 'btn dgr');
        big.type = 'button';
        big.style.cssText = 'width:100%;min-height:52px;font-size:15px;font-weight:600';
        big.textContent = '清空容器';
        big.addEventListener('click', function () { clearContainer(); });
        body.appendChild(big);

        const hintNode = body.querySelector('#ratehint');
        if (hintNode) {
            uiState.rateHintEl = hintNode;
            hintNode.textContent = rateHintText();
        }
    }

    /* ------------------------- 关于页 ------------------------- */
    function renderAboutTab(body) {
        const pauseText = pauseReasonOf() === 'terminate' ? '终止符（发新消息即恢复）'
            : (pauseReasonOf() === 'manual' ? '手动（双击悬浮球恢复）' : '未暂停');
        const ckpt = Ckpt.summary();
        const platformText = (PLATFORM.name || PLATFORM.id) + (PLATFORM.matched ? '' : '（通用适配）');
        // P1：存储状态分两级显示 —— 会话状态层（IDB，打开失败自动退回 GM）+ 其余仍走 GM。
        let storeText;
        try {
            const ss = SessionState.status();
            storeText = (ss.backend === 'idb' ? 'IDB 会话状态' : '会话状态退回 GM') +
                '（' + safeNum(ss.keys) + ' 项' + (ss.dirty ? ' · 待落盘 ' + safeNum(ss.dirty) : '') + '）' +
                (typeof GM_getValue === 'function' ? ' · GM 可用' : ' · GM 不可用（内存）') +
                (ss.error ? ' · ' + ss.error : '');
        } catch (e) {
            storeText = typeof GM_getValue === 'function' ? 'GM 存储可用' : 'GM 存储不可用（降级内存）';
        }
        // P3a：容器树的提交状态（base+log+head）、内容缺失、只读保护 —— 出问题必须看得见
        let fsText = '';
        try {
            if (VirtualFS.corrupt()) fsText = '容器树读取失败，只读保护中（' + VirtualFS.corrupt() + '）';
            else {
                const hd = VirtualFS.head();
                fsText = '容器树 提交#' + safeNum(hd.seq) + (hd.seq > hd.baseSeq ? '（快照#' + safeNum(hd.baseSeq) + ' + 增量 ' + (hd.seq - hd.baseSeq) + '）' : '');
                const miss = VirtualFS.missingBlobs();
                if (miss.length) fsText += ' · ⚠ 内容缺失 ' + miss.length + ' 个文件';
            }
            const fm = FsMedia.status();
            fsText += '　内容介质 ' + esc(fm.media) + '（' + safeNum(fm.blobs) + ' 块'
                + (fm.pending ? ' · 待落盘 ' + safeNum(fm.pending) : '')
                + (fm.error ? ' · ' + esc(fm.error) : '') + '）';
        } catch (e) {}
        const files = safeNum(countFiles(VirtualFS.root));
        const bytes = safeSize(countBytes(VirtualFS.root));
        const gs = gateSummary();
        let h = '<div class="acc">';

        h += accItem('about.version', '版本',
            '<div class="set col"><span class="lb">DSW-VFS · 协议 ' + esc(PROTO_VERSION) + ' · v' + esc(VERSION) +
            '<span class="sub">平台：' + esc(safeStr(platformText, '通用')) + '　存储：' + esc(storeText) +
            '　文件 ' + files + ' / ' + bytes + (fsText ? '　' + esc(fsText) : '') + '</span></span></div>',
            'v' + safeStr(VERSION, '-'));

        h += accItem('about.sys', '系统状态',
            '<div class="set col"><span class="lb">' + (isPaused() ? '已暂停 · ' + esc(pauseText) : '运行中 · 等待命令') +
            '<span class="sub">' + esc(healthLine()) + '</span>' +
            '<span class="sub">锚点 ' + safeNum(AnchorStore.size()) + '　幂等 ' + safeNum(gs.total) + '（窗口内 ' + safeNum(gs.fresh) + '）' +
            '　撤销 ' + safeNum(VirtualFS.undoIdx().cursor) + '</span></span></div>' +
            '<div class="set btns"><button class="btn sm" data-a="resume">' + (isPaused() ? '恢复运行' : '暂停运行') + '</button></div>',
            isPaused() ? '已暂停' : '运行中');

        h += accItem('about.gesture', '手势',
            '<div class="set col"><span class="lb">单击浮球：打开 / 收起工作区<span class="sub">双击：暂停 / 恢复运行</span>' +
            '<span class="sub">长按约 0.55 秒：重新识别页面里的命令</span>' +
            '<span class="sub">按住拖动：移动浮球位置</span></span></div>' +
            '<div class="set col"><span class="lb">列表项长按：重命名 / 删除<span class="sub">右上角 ⋮：导航 / 控制台 / 当前页操作 / 危险操作</span></span></div>');

        h += accItem('about.manual', '手册与协议',
            '<div class="set btns"><button class="btn sm" data-a="copyManual">复制完整手册</button>' +
            '<button class="btn sm" data-a="copyFirst">复制首发提示</button>' +
            '<button class="btn sm" data-a="copyDiag">复制诊断信息</button></div>' +
            '<div class="set col"><span class="lb">协议速览<span class="sub">' +
            '完整规范在容器文件 ' + esc(SYS_MANUAL_PATH) + '（协议 ' + esc(PROTO_VERSION) + '）。\n' +
            '执行域：```dsw … ```（等价 <dsw> … </dsw>）；域外永不执行，未闭合永不执行。\n' +
            '命令（' + COMMAND_NAMES.length + ' 个）：' + COMMAND_NAMES.join(' ') + '。\n' +
            '回执状态码：OK / AUTO / PARTIAL / NOOP / SKIP / DENY。\n' +
            '检查点：' + esc(ckpt ? (fmtClock(ckpt.at) + ' · ' + ckpt.batches + ' 批次 · ' + ckpt.files + ' 文件') : '本会话暂无检查点') +
            '</span></span></div>' +
            '<div class="set col"><span class="lb">存储键<span class="sub">容器树（同步层，始终在油猴存储）：fs:head　fs:base:<seq>　fs:log:<seq>　undo:<seq> + undo:idx　trash　bootstrap:last\n内容（介质可换，见「容器存放位置」）：fs:blob:<hash>　→　油猴存储时就是它；OPFS 时是沙盒里的 blobs/<hash>；自己的文件夹时是 <文件夹>/.dsw/blobs/<hash>，另外每个活文件还按原路径镜像一份（系统区除外，不写到文件夹）\n跨平台小状态（油猴存储）：outbox　rate　ui:cfg　ui:ball-pos\n会话状态（IndexedDB，按 origin）：anchor:<会话>　pathtok:<会话>　gate:<会话>　ckpt:<会话>　msgs:<会话>　plan:<会话>　bootstrap:<会话>\n句柄（IndexedDB）：dsw2-fsa/h/container　→　你绑定的文件夹（换文件夹会覆盖）</span></span></div>');

        h += '</div>';
        appendHTML(body, h);
    }

    /* ------------------------- 底部导航（已废弃） -------------------------
     * 底部四页签（文件 / 回执 / 设置 / 关于）整体移除，导航改由右上角 ⋮ 菜单承担：
     * 菜单里带 data-tab 的按钮复用了同一条点击委托分支，见 onRootClick / menuGroups。 */

    /* ------------------------- 底部动作面板 / 对话框 ------------------------- */
    function openSheet(title, items) {
        uiState.sheetItems = items || [];
        let h = '<div class="sh-t">' + esc(title) + '</div>';
        let lastGroup = null;
        for (let i = 0; i < uiState.sheetItems.length; i++) {
            const it = uiState.sheetItems[i];
            // 按类型分组：items 里带 g（组名）的会在换组时插一个小标题
            if (it.g && it.g !== lastGroup) {
                h += '<div class="sh-t sh-g">' + esc(it.g) + '</div>';
                lastGroup = it.g;
            }
            h += '<button data-si="' + i + '"' + (it.d ? ' class="dgr"' : '') + '>'
                + '<span class="si">' + (it.icon || '') + '</span>'
                + '<span>' + esc(it.t) + '</span></button>';
        }
        uiSheet.innerHTML = h;
        uiSheet.classList.add('on');
        uiMask.classList.add('on');
    }
    function closeSheet() {
        if (uiSheet) uiSheet.classList.remove('on');
        if (uiMask) uiMask.classList.remove('on');
        uiState.sheetItems = null;
    }
    function openThemeSheet() {
        uiState.sheetItems = [];
        let h = '<div class="sh-t">配色</div>';
        const dark = isDark();
        for (const k of THEME_KEYS) {
            const t = THEMES[k];
            const c = dark ? t.d : t.l;
            h += '<button data-th="' + k + '"><i class="dotc" style="background:' + c.ac + '"></i><span>' + t.n +
                (currentPalette() === k ? '（当前）' : '') + '</span></button>';
        }
        const mode = themePref();
        h += '<div class="sh-t" style="margin-top:6px">明暗</div>' +
            '<button data-md="light"><span>浅色' + (mode === 'light' ? '（当前）' : '') + '</span></button>' +
            '<button data-md="dark"><span>深色' + (mode === 'dark' ? '（当前）' : '') + '</span></button>' +
            '<button data-md="auto"><span>跟随系统' + (mode === 'auto' ? '（当前）' : '') + '</span></button>';
        uiSheet.innerHTML = h;
        uiSheet.classList.add('on');
        uiMask.classList.add('on');
    }
    // 「更多」面板：按类型分组（新建 → 导入 → 导出 → 视图/选择），每组按键配非 emoji 的 SVG 图标
    function openMoreSheet() {
        const batching = !!uiState.batchMode;
        openSheet('更多操作', [
            { g: '新建', t: '新建文件夹', icon: IC.folderPlus, f: function () { uiState.newEntry = { type: 'dir' }; render(); } },
            { t: '新建文件', icon: IC.filePlus, f: function () { uiState.newEntry = { type: 'file' }; render(); } },

            { g: '导入', t: '导入文件', icon: IC.upload, f: function () { pickFilesForImport(false); } },
            { t: '导入文件夹', icon: IC.importTo, f: function () { pickFilesForImport(true); } },

            { g: '导出', t: '导出文件', icon: IC.file, f: function () { openExportFilePicker(); } },
            { t: '导出文件夹（ZIP）', icon: IC.archive, f: function () { exportFolder(uiState.filesPath); } },
            { t: '导出工作区（ZIP）', icon: IC.layers, f: function () { runExport(); } },

            { g: '视图 / 选择', t: '刷新', icon: IC.refresh2, f: function () { showToast('已刷新'); render(); } },
            { t: batching ? '退出批量' : '批量选择', icon: IC.check, f: function () {
                uiState.batchMode = !uiState.batchMode;
                uiState.selected = {};
                renderBody();
            } }
        ]);
    }
    function openRowSheet(name, full, child) {
        const internal = VirtualFS.isInternal(full);
        const items = [];
        if (child.type === 'dir') {
            items.push({ g: '打开', t: '打开', icon: IC.folder, f: function () { navTo(full); } });
        } else if (internal) {
            items.push({ g: '打开', t: '阅读（只读）', icon: IC.eye, f: function () { openFile(full, true); } });
            items.push({ t: '编辑内容', icon: IC.pen, f: function () { openFile(full, false); } });
        } else {
            items.push({ g: '打开', t: '打开', icon: IC.file, f: function () { openFile(full, false); } });
        }
        if (child.type === 'file') items.push({ g: '导出', t: '导出这个文件', icon: IC.download, f: function () { exportFile(full); } });
        if (!internal) {
            items.push({ g: '管理', t: '重命名', icon: IC.pen, f: function () { beginRename(full, name); } });
            items.push({ t: '删除', d: 1, icon: IC.trash, f: function () { uiDelete(full); } });
        }
        openSheet(name, items);
    }
    function openExportFilePicker() {
        const base = uiState.filesPath;
        const node = VirtualFS.resolve(base);
        if (!node || node.type !== 'dir') { showToast('路径不存在', 'warn'); return; }
        const files = [];
        const walk = function (n, prefix, depth) {
            if (depth > 6 || files.length > 120) return;
            for (const nm of Object.keys(n.children || {})) {
                const c = n.children[nm];
                const p = prefix + nm;
                if (c.type === 'dir') walk(c, p + '/', depth + 1);
                else files.push(p);
            }
        };
        walk(node, base === '/' ? '/' : base + '/', 0);
        if (!files.length) { showToast('这里还没有文件', 'warn'); return; }
        const items = files.slice(0, 80).map(function (p) {
            return { t: p, f: function () { exportFile(p); } };
        });
        openSheet('导出文件（选一个下载）', items);
    }
    function exportFile(path) {
        const node = VirtualFS.resolve(path);
        if (!node || node.type !== 'file') { showToast('不是文件：' + path, 'warn'); return; }
        const name = String(path).split('/').pop() || 'file.txt';
        const content = String(node.content == null ? '' : node.content);
        if (downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), name)) showToast('已导出 ' + name);
        else { copyText(content); showToast('当前环境不支持下载，已复制内容到剪贴板', 'warn'); }
    }
    function exportFolder(path) {
        const node = VirtualFS.resolve(path);
        if (!node || node.type !== 'dir') { showToast('只能导出文件夹', 'warn'); return; }
        const prefix = path === '/' ? '/' : path + '/';
        const files = collectExport(node, prefix, []).filter(function (f) { return f.path.indexOf(TRASH_PREFIX) !== 0; });
        if (!files.length) { showToast('这个文件夹里没有可导出的文件', 'warn'); return; }
        const bytes = buildZip(files);
        const base = path === '/' ? 'workspace' : (String(path).split('/').pop() || 'folder');
        const name = 'dsw-' + base + '-' + stamp() + '.zip';
        if (downloadBlob(bytes, name, 'application/zip')) showToast('已导出 ' + name + '（' + files.length + ' 个文件）');
        else showToast('当前环境不支持下载', 'warn');
    }
    function openRestoreSheet() {
        const trash = Store.get(STORE_TRASH, { items: [] }) || { items: [] };
        const items = (trash.items || []).slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        if (!items.length) { showToast('回收站是空的'); return; }
        const rows = items.slice(0, 30).map(function (it, i) {
            return {
                t: (i + 1) + '. ' + (it.src || '?') + '  ' + fmtSize(it.bytes || 0) + '  ' + fmtClock(it.at),
                f: function () {
                    const r = VirtualFS.restore({ item: String(i + 1) });
                    if (r && r.ok) { pushLog('面板恢复 ' + (it.src || '')); showToast('已恢复到 ' + (r.path || it.src)); }
                    else showToast((r && r.error) || '恢复失败', 'err');
                    render();
                }
            };
        });
        rows.push({
            t: '清空回收站（永久删除）', d: 1, f: function () {
                askConfirm('清空回收站', '清空', '输入 “清空” 确认：回收站条目会被永久删除，无法恢复', function () {
                    VirtualFS.restore({ purge: true });
                    pushLog('面板清空回收站', 'warn');
                    showToast('回收站已清空', 'warn');
                    render();
                });
            }
        });
        openSheet('从回收站恢复', rows);
    }

    /* 悬浮窗只有这一份点击处理：按 data-cf 决定确认/取消，回调只可能在当前窗口上。
       好处：无论上一个框是普通确认还是输入确认，都不会留下会误触发的旧监听。 */
    function onModalClick(e) {
        const t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentNode);
        const b = t && t.closest ? t.closest('[data-cf]') : null;
        if (!b) return;
        if (b.disabled) return;                       // 输入没对上时「确认」是 disabled
        const ok = b.getAttribute('data-cf') === '1';
        const cb = ok ? modalCb : null;
        modalCb = null;
        uiModal.classList.remove('on');
        if (cb) { try { cb(); } catch (err) { showToast('执行失败：' + (err && err.message ? err.message : err), 'err'); } }
    }
    // 普通两键确认
    function confirmAsk(o) {
        modalCb = o.cb || null;
        uiModal.innerHTML = '<div class="dlg"><h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
            '<div class="row2"><button type="button" class="btn" data-cf="0">取消</button>' +
            '<button type="button" class="btn dgr" data-cf="1">' + esc(o.ok || '确认') + '</button></div></div>';
        uiModal.classList.add('on');
    }
    // 需要一字不差输入指定词的确认（删除 / 清空 / 覆盖）
    function confirmBox(o) {
        modalCb = o.cb || null;
        uiModal.innerHTML = '<div class="dlg"><h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
            '<input class="inp" id="cfInp" autocomplete="off" placeholder="输入「' + esc(o.word) + '」以确认">' +
            '<div class="row2"><button type="button" class="btn" data-cf="0">取消</button>' +
            '<button type="button" class="btn dgr" data-cf="1" id="cfOk" disabled>' + esc(o.ok || '确认') + '</button></div></div>';
        uiModal.classList.add('on');
        const inp = uiModal.querySelector('#cfInp');
        const ok = uiModal.querySelector('#cfOk');
        inp.addEventListener('input', function () { ok.disabled = inp.value.trim() !== String(o.word); });
        setTimeout(function () { try { inp.focus(); } catch (e) {} }, 40);
    }

    /* ------------------------- 事件委托 ------------------------- */
    function onRootClick(e) {
        const t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentNode);
        if (!t || !t.closest) return;
        /* 长按弹上下文菜单后，松手浏览器会补发一次 click（此时命中的可能是刚弹出的遮罩）：
           700ms 内一律吞掉，免得又打开文件、或把菜单/面板立刻关掉。 */
        if (Date.now() - rowLongPressAt < 700) return;
        /* 引导层优先：它盖在最上面，里面的任何点击都**不往下传**
         * （否则点开关会同时触发面板的委托，关掉面板或弹两次确认框）。 */
        if (uiOnboard && uiOnboard.contains(t)) { maybeCloseOnboardByBackdrop(e); handleOnboardClick(t); return; }
        const inSheet = !!(uiSheet && uiSheet.contains(t));
        const inModal = !!(uiModal && uiModal.contains(t));

        /* 全局 ⋮ 菜单：先于其它委托处理开关与「点外部关闭」 */
        if (t.closest('[data-a="menu"]')) { toggleMenu(); return; }
        const inMenu = !!(uiMenu && uiMenu.contains(t));
        if (uiState.menuOpen && !inMenu) { closeMenu(); return; }   // 点外部只收起菜单，不触发下层控件
        if (inMenu) closeMenu();   // 菜单项：先收起，再让下面的通用委托执行动作

        /* 手风琴（设置 / 关于）：点标题就地切换，不整页重渲，动画才平滑 */
        const ah = t.closest('.accordion-header');
        if (ah) {
            const item = ah.parentNode;
            if (item && item.classList) {
                item.classList.toggle('open');
                const key = ah.getAttribute ? ah.getAttribute('data-acc') : null;
                if (key) uiState.acc[key] = item.classList.contains('open');
            }
            return;
        }

        // 对话框 / 面板内的通用钮
        const si = t.closest('[data-si]');
        if (si && inSheet && uiState.sheetItems) {
            const it = uiState.sheetItems[parseInt(si.getAttribute('data-si'), 10)];
            closeSheet();
            if (it && it.f) setTimeout(function () { try { it.f(); } catch (err) { showToast('执行失败：' + (err && err.message ? err.message : err), 'err'); } }, 10);
            return;
        }
        const th = t.closest('[data-th]');
        if (th) {
            saveUiCfg({ palette: th.getAttribute('data-th') });
            applyTheme();
            closeSheet();
            render();
            return;
        }
        const md = t.closest('[data-md]');
        if (md) {
            saveUiCfg({ theme: md.getAttribute('data-md') });
            applyTheme();
            closeSheet();
            render();
            return;
        }
        const f = t.closest('[data-f]');
        if (f) { uiState.receiptFilter = f.getAttribute('data-f'); renderBody(); return; }
        if (inModal) return;   // 对话框内部由各自的监听处理

        const tab = t.closest('[data-tab]');
        if (tab) {
            uiState.tab = tab.getAttribute('data-tab');
            uiState.view = 'list';
            uiState.editing = null;
            uiState.toolbarMore = false;
            render();
            return;
        }
        const cr = t.closest('[data-a="cr"]');
        if (cr) { navTo(cr.getAttribute('data-p')); return; }
        const more = t.closest('[data-more]');
        if (more) {
            const name = more.getAttribute('data-more');
            const full = (uiState.filesPath === '/' ? '' : uiState.filesPath) + '/' + name;
            const node = VirtualFS.resolve(uiState.filesPath);
            const child = node && node.children ? node.children[name] : null;
            if (child) openRowSheet(name, full, child);
            return;
        }
        const tog = t.closest('[data-tog]');
        if (tog) { toggleCfg(tog.getAttribute('data-tog')); return; }
        const a = t.closest('[data-a]');
        if (a) { handleAction(a.getAttribute('data-a'), a); return; }
        const row = t.closest('.row');
        if (row) {
            if (Date.now() - rowLongPressAt < 700) return;   // 刚长按弹过菜单，这次点击忽略
            const name = row.getAttribute('data-name');
            if (!name) return;
            const full = (uiState.filesPath === '/' ? '' : uiState.filesPath) + '/' + name;
            if (uiState.batchMode) {
                uiState.selected[full] = !uiState.selected[full];
                renderBody();
                return;
            }
            const node = VirtualFS.resolve(uiState.filesPath);
            const child = node && node.children ? node.children[name] : null;
            if (!child) return;
            if (child.type === 'dir') navTo(full);
            else openFile(full, VirtualFS.isInternal(full));
        }
    }

    function toggleCfg(key) {
        const cfg = getUiCfg();
        const next = !cfg[key];
        const patch = {};
        patch[key] = next;
        saveUiCfg(patch);
        try {
            if (key === 'rateLimit') CONFIG.RATE_LIMIT_ENABLED = next;
            else if (key === 'autoBootstrap') CONFIG.AUTO_BOOTSTRAP = next;
            else if (key === 'injectManual') CONFIG.INJECT_MANUAL = next;
        } catch (e) {}
        if (key === 'planMode') {
            if (next) enterPlanMode('user'); else exitPlanMode('user');
        }
        if (key === 'autoSend' && next) { try { flushNow(true); } catch (e) {} }
        pushLog('设置：' + key + ' = ' + (next ? '开' : '关'));
        showToast((next ? '已开启：' : '已关闭：') + cfgLabel(key));
        render();
    }
    function cfgLabel(key) {
        return {
            autoSend: '自动回传', rateLimit: '节奏器等待', autoBootstrap: '新对话注入',
            injectManual: '注入手册全文', notifyVibrate: '震动', notifySound: '提示音',
            terminateAutoPause: '终止符后自动暂停', planMode: '计划模式', planInject: '每轮附带计划进度'
        }[key] || key;
    }

    /* ------------------------- 业务动作 ------------------------- */
    function clearContainer() {
        askConfirm('清空容器', '清空', '输入 “清空” 确认：用户文件全部删除（/__sys/ 保留），不可撤销', function () {
            VirtualFS.clear();
            uiState.filesPath = '/';
            uiState.view = 'list';
            uiState.editing = null;
            pushLog('面板清空容器', 'warn');
            showToast('已清空', 'warn');
            render();
        });
        return true;
    }

    function handleAction(a, node) {
        switch (a) {
            case 'close': closePanel(); break;
            case 'theme': openThemeSheet(); break;
            case 'onboard': showOnboarding(true); break;
            case 'refresh': showToast('已刷新'); render(); break;
            case 'inject':
                try {
                    const payload = injectionPayloadFresh();      // 2.13.0：上下文已有则不重发
                    if (!payload) {
                        pushLog('面板注入：协议信息已在会话里，跳过');
                        showToast('上下文里已有，无需重复注入');
                        break;
                    }
                    enqueueOutbound(payload, 'bootstrap');
                    pushLog('面板注入：协议信息已排队');
                    showToast('协议信息已排队发送');
                    setStatus('pending', '协议信息已排队');
                } catch (e) { showToast('注入失败：' + (e && e.message ? e.message : e), 'err'); }
                break;
            case 'snap':
                try { Ckpt.save(false); } catch (e) {}
                try { exportJson(); } catch (e) { showToast('快照导出失败：' + (e && e.message ? e.message : e), 'err'); }
                pushLog('面板写快照（检查点 + JSON 导出）');
                break;
            case 'clear': clearContainer(); break;
            /* P3b-2：容器存放位置。绑定/授权必须在**用户点击的调用栈里**直接调用
             * showDirectoryPicker / requestPermission —— 浏览器硬性要求，不能延后到 setTimeout。 */
            case 'bindFolder': {
                if (folderBusy) { showToast('正在处理，请稍候'); break; }
                folderBusy = true;
                FsMedia.bindDirectory().then(function (r) {
                    folderBusy = false;
                    saveUiCfg({ fsMedia: 'fsa' });
                    showToast('已绑定「' + r.name + '」，搬入 ' + r.moved + ' 块内容');
                    pushLog('容器存放位置 → 文件夹「' + r.name + '」（搬入 ' + r.moved + ' 块内容）');
                    refreshFolderName();
                    render();
                }, function (e) {
                    folderBusy = false;
                    showToast('绑定失败：' + (e && e.message ? e.message : e), 'err');
                    pushLog('绑定文件夹失败：' + (e && e.message ? e.message : e), 'error');
                    render();
                });
                break;
            }
            case 'grantFolder': {
                if (folderBusy) { showToast('正在处理，请稍候'); break; }
                folderBusy = true;
                FsMedia.grantDirectory().then(function (r) {
                    folderBusy = false;
                    saveUiCfg({ fsMedia: 'fsa' });
                    showToast('已授权「' + r.name + '」');
                    pushLog('文件夹已授权：' + r.name);
                    refreshFolderName();
                    render();
                }, function (e) {
                    folderBusy = false;
                    showToast('授权失败：' + (e && e.message ? e.message : e), 'err');
                    render();
                });
                break;
            }
            case 'unbindFolder': {
                if (folderBusy) { showToast('正在处理，请稍候'); break; }
                folderBusy = true;
                FsMedia.unbindDirectory().then(function (r) {
                    folderBusy = false;
                    saveUiCfg({ fsMedia: 'gm' });
                    showToast('已解绑，搬回 ' + r.moved + ' 块内容（文件夹里的没删，你自己处理）');
                    pushLog('容器存放位置 → 油猴存储（搬回 ' + r.moved + ' 块）；原文件夹内容保留', 'warn');
                    refreshFolderName();
                    render();
                }, function (e) {
                    folderBusy = false;
                    showToast('解绑失败：' + (e && e.message ? e.message : e), 'err');
                    render();
                });
                break;
            }
            case 'folderRefresh': refreshFolderName(); showToast('已刷新'); break;
            case 'autoGrantToggle': {
                const now = !getUiCfg().autoGrant;
                saveUiCfg({ autoGrant: now });
                FsMedia.setAutoGrant(now);
                if (now) {
                    // 打开就立刻探测一次：权限还在就马上接上，不在就挂好手势监听等下一次点击
                    FsMedia.autoProbe('手动开启').then(function (st) {
                        showToast(st === 'granted' ? '自动续授权已开启，文件夹已接上'
                            : '自动续授权已开启：下次点屏幕时会自动补上授权');
                        render();
                    }, function () { render(); });
                } else {
                    showToast('自动续授权已关闭，权限掉了要自己点「立即授权」');
                    render();
                }
                pushLog('自动续授权 → ' + (now ? '开' : '关'));
                break;
            }
            case 'togglePlan': uiState.planOpen = !uiState.planOpen; renderPlan(); break;
            case 'cyc': {
                const lineNo = parseInt(node.getAttribute('data-i'), 10);
                const next = cyclePlanItem(lineNo);
                if (next) showToast('第 ' + lineNo + ' 条 → ' + (PLAN_LABELS[next] || next));
                renderPlan();
                refreshUI();
                break;
            }
            case 'goSys':
                uiState.tab = 'files'; uiState.view = 'list'; uiState.filesPath = SYS_PREFIX.replace(/\/$/, '');
                render();
                break;
            case 'planState':
                if (getPlanState().active) { exitPlanMode('user'); saveUiCfg({ planMode: false }); showToast('已退出计划模式'); }
                else { enterPlanMode('user'); saveUiCfg({ planMode: true }); showToast('已重新进入计划模式'); }
                render();
                break;
            case 'up': navTo(parentPath(uiState.filesPath)); break;
            case 'goRoot': navTo('/'); break;
            case 'goFiles': uiState.tab = 'files'; uiState.view = 'list'; render(); break;
            case 'goUndo': {
                const r = VirtualFS.undo(1);
                showToast(r && r.ok ? '已撤销' : ((r && r.error) || '没有可撤销的步骤'), r && r.ok ? '' : 'warn');
                render();
                break;
            }
            case 'goAbout': uiState.tab = 'about'; render(); break;
            case 'mkdir': uiState.newEntry = { type: 'dir' }; renderBody(); break;
            case 'mkfile': uiState.newEntry = { type: 'file' }; renderBody(); break;
            case 'cancelNew': uiState.newEntry = null; renderBody(); break;
            case 'more': openMoreSheet(); break;
            case 'menu': toggleMenu(); break;
            case 'batchToggle':
                uiState.batchMode = !uiState.batchMode;
                uiState.selected = {};
                renderBody();
                break;
            case 'clearLogs':
                uiLogs.length = 0;
                uiReceipts.length = 0;
                showToast('已清空日志与回执');
                renderBody();
                break;
            case 'unlockEdit':
                if (uiState.editing) {
                    const p = uiState.editing.path;
                    const c = String(uiState.editing.content == null ? '' : uiState.editing.content);
                    uiState.editing = { path: p, content: c, readonly: false };
                    uiState.draft = c;
                    uiState.focusEd = true;
                    pushLog('面板解除只读 ' + p);
                    showToast('已切换为可编辑');
                    render();
                }
                break;
            case 'selall': {
                const nd = VirtualFS.resolve(uiState.filesPath);
                uiState.selected = uiState.selected || {};
                for (const n of Object.keys((nd && nd.children) || {})) {
                    uiState.selected[(uiState.filesPath === '/' ? '' : uiState.filesPath) + '/' + n] = true;
                }
                renderBody();
                break;
            }
            case 'selnone': uiState.selected = {}; renderBody(); break;
            case 'exitbatch': uiState.batchMode = false; uiState.selected = {}; renderBody(); break;
            case 'delSel': {
                const names = Object.keys(uiState.selected || {}).filter(function (k) { return uiState.selected[k]; });
                if (!names.length) { showToast('还没选任何项', 'warn'); break; }
                if (names.some(function (p) { return VirtualFS.isInternal(p); })) { showToast('系统区 / 回收站不能批量删除', 'warn'); break; }
                askConfirm('删除选中的 ' + names.length + ' 项', '删除', '输入 “删除” 确认：' + names.length + ' 项都会进回收站，可用 restore 恢复', function () {
                    let ok = 0;
                    for (const p of names) {
                        const r = VirtualFS.delete(p, { recursive: true });
                        if (r && r.ok) ok++;
                    }
                    pushLog('面板批量删除 ' + ok + '/' + names.length + ' 项');
                    showToast('已删除 ' + ok + ' 项', ok === names.length ? '' : 'warn');
                    uiState.selected = {};
                    uiState.batchMode = false;
                    render();
                });
                break;
            }
            case 'back': uiState.view = 'list'; uiState.editing = null; render(); break;
            case 'save': edSave(); break;
            case 'edSelAll': edSelectAll(); break;
            case 'edCopy': edCopy(); break;
            case 'edPaste': edPaste(); break;
            case 'attachDir': {
                const dir = uiState.filesPath || '/';
                const r = uploadZip({ op: 'upload', line: 0 }, [dir], [dir], []);
                showToast((r && r.summary) ? r.summary : '已生成附件', (r && r.ok) ? '' : 'warn');
                pushLog('批量附件：' + dir + ' → ' + ((r && r.summary) || '已处理'));
                closeMenu();
                render();
                break;
            }
            case 'attach':
                if (uiState.editing) {
                    try {
                        const r = doUpload({ op: 'upload', flags: {} }, uiState.editing.path);
                        showToast((r && r.summary) ? r.summary : '已尝试生成附件', r && r.ok ? '' : 'warn');
                    } catch (e) { showToast('附件失败：' + (e && e.message ? e.message : e), 'err'); }
                }
                break;
            case 'delFile': if (uiState.editing) uiDelete(uiState.editing.path, function () { uiState.view = 'list'; uiState.editing = null; }); break;
            case 'copyEg':
                copyText('```dsw\nwrite /hello.md\n<<<\n你好\n<<<\n```');
                showToast('示例已复制');
                break;
            case 'resetAnchor': AnchorStore.reset(); pushLog('锚点表已重置'); showToast('锚点表已清空'); render(); break;
            case 'resetIdem': gateReset(); pushLog('幂等批次表已重置'); showToast('幂等批次表已清空'); render(); break;
            case 'flush': flushNow(true); showToast('已触发发送'); render(); break;
            case 'copyInject': {
                const payload = injectionPayloadFresh() || injectionPayload();
                copyText(payload);
                showToast('注入内容已复制（' + payload.length + ' 字符）');
                break;
            }
            case 'resetInject': resetBootstrapState(); showToast('下次发送会带上信息'); break;
            case 'testAlert': tryReminder(); break;
            case 'newPlan': ensurePlanFile(); pushLog('已确保 ' + SYS_PLAN_PATH + ' 存在'); showToast('已新建 ' + SYS_PLAN_PATH); render(); break;
            case 'copyPlan': copyText(planListText(999).join('\n')); showToast('计划已复制'); break;
            case 'clearPlan':
                confirmBox({
                    title: '清空计划', text: '计划里的所有条目会被删除，AI 需要重新规划。请输入「清空」确认。',
                    word: '清空', ok: '清空计划', cb: function () { planClear(); pushLog('计划已清空', 'warn'); showToast('计划已清空'); render(); }
                });
                break;
            case 'undo': {
                const r = VirtualFS.undo(1);
                showToast(r && r.ok ? '已撤销' : ((r && r.error) || '没有可撤销的步骤'), r && r.ok ? '' : 'warn');
                render();
                break;
            }
            case 'redo': {
                const r = VirtualFS.redo(1);
                showToast(r && r.ok ? '已重做' : ((r && r.error) || '没有可重做的步骤'), r && r.ok ? '' : 'warn');
                render();
                break;
            }
            case 'restore': openRestoreSheet(); break;
            case 'checkpoint': Ckpt.save(false); pushLog('已写入检查点'); showToast('检查点已写'); render(); break;
            case 'exportJson': exportJson(); break;
            case 'exportZip': runExport(); break;
            case 'resume': try { setPaused(!isPaused()); } catch (e) {} render(); break;
            case 'copyManual': copyText(buildManual()); showToast('手册已复制'); break;
            case 'copyFirst': copyText(BOOTSTRAP_PROMPT); showToast('提示词已复制'); break;
            case 'copyDiag': copyText(diagText()); showToast('诊断信息已复制'); break;
            default: break;
        }
    }

    /* ------------------------- 测试钩子用（渲染进游离容器） ------------------------- */
    function settingsEl() {
        const box = document.createElement('div');
        renderSettingsTab(box);
        return box;
    }
    function filesEl() {
        const box = document.createElement('div');
        const keep = uiState.view;
        uiState.view = 'list';
        try { renderFilesTab(box); } finally { uiState.view = keep; }
        return box;
    }
    function editorEl() {
        const box = document.createElement('div');
        if (uiState.editing) renderEditor(box);
        return box;
    }

/* >>> 90-main.js */
    /* ---- 本模块专属常量（原 CONFIG 项；只在本模块用到，2026 收敛搬进来） ---- */
    const BOOT_FALLBACK_SEND = true;   // #6 兜底：没并进用户那条时，等 AI 说完再把信息补发一条
    const COMPOSER_WITNESS_MAX_GAP_MS = 20000;
    let DEBUG = false;   // 运行时开关（本地设置可改），所以是 let 不是 const

    /* =========================================================================
     * 90 接线：发送见证拦截 · 输入框哨兵 · 测试钩子 · 启动
     * ====================================================================== */

    let interceptorsInstalled = false;

    const REGEN_LABEL = /重新生成|重新回答|再生成|重试|regenerate|retry|redo response/i;

    // #7 接管期间（injectGuardUntil）需要吞掉的「发送动作」事件：
    // 平台把发送绑在哪个事件上无法预知（keydown / keyup / click / pointerup / touchend / submit），
    // 只拦 click 的话，平台在 pointerup 上先发一次、我们再发一次 = 两条消息 = 打断刚起的回答。
    const SEND_ACTION_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'];

    function swallowEvent(e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
        try { if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (err) {}
    }

    // 这个元素看起来是不是「发送键」（文案或几何位置命中）
    function looksLikeSendTarget(node) {
        let btn = null;
        try { btn = node && node.closest && node.closest('button, [role="button"], [class*="ds-button"], [class*="send"]'); } catch (e) { btn = null; }
        if (!btn) return false;
        const label = labelOf(btn);
        if (label && REGEN_LABEL.test(label)) return false;
        if (label && SEND_LABEL.test(label) && !DANGER_LABEL.test(label)) return true;
        try {
            const picked = pickSendButton();
            if (picked && picked.btn && (picked.btn === btn || picked.btn.contains(btn))) return true;
        } catch (e) {}
        return false;
    }

    function installSendInterceptors() {
        if (interceptorsInstalled) return;
        interceptorsInstalled = true;

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
            if (!e.isTrusted) return;
            // #7 接管窗口内：Enter 一律吞掉，平台不可能靠 keydown 抢发
            if (Date.now() < injectGuardUntil) { swallowEvent(e); return; }
            const t = e.target;
            if (!t) return;
            if (isTextInputEl(t) || t.isContentEditable) {
                const v = composerValue(t);
                if (!v || !v.trim()) return;
                witnessSend('user-enter');
                // #5 新对话首次发送：把提示词+手册并进这一条
                if (tryInjectThenSend(t)) { swallowEvent(e); }
            }
        }, true);

        document.addEventListener('keypress', function (e) {
            if (e.key !== 'Enter' || !e.isTrusted) return;
            if (Date.now() < injectGuardUntil) swallowEvent(e);
        }, true);

        document.addEventListener('keyup', function (e) {
            if (e.key !== 'Enter' || e.shiftKey) return;
            if (!e.isTrusted) return;
            if (Date.now() < injectGuardUntil) {        // 刚注入接管过发送：这次 keyup 不再触发平台发送
                swallowEvent(e);
                return;
            }
            const t = e.target;
            if (t && t.isContentEditable) witnessSend('user-enter-ce');
        }, true);

        document.addEventListener('click', function (e) {
            if (!e.isTrusted) return;                   // 我们自己派发的合成 click 要放行（平台靠它发送）
            // #7 接管窗口内：发送键的点击一律吞掉（平台的发送由我们唯一一次点击完成）
            if (Date.now() < injectGuardUntil && looksLikeSendTarget(e.target)) { swallowEvent(e); return; }
            let btn = null;
            try { btn = e.target && e.target.closest && e.target.closest('button, [role="button"], [class*="ds-button"]'); } catch (err) { btn = null; }
            if (!btn) return;
            const label = labelOf(btn);
            if (label && REGEN_LABEL.test(label)) return;
            if (!looksLikeSendTarget(e.target)) return;
            const composer = findComposer();
            if (!composer || !composerValue(composer).trim()) return;
            witnessSend('user-click');
            // #5 新对话首次发送：拦下平台的发送，先并进信息再由我们发出（一次、可控）
            if (tryInjectThenSend(composer)) { swallowEvent(e); }
        }, true);

        // #7 指针/触摸类发送动作：接管窗口内一律吞掉（有的平台在 touchend/pointerup 上就发了）
        for (const type of SEND_ACTION_EVENTS) {
            if (type === 'click') continue;
            document.addEventListener(type, function (e) {
                if (!e.isTrusted) return;
                if (Date.now() >= injectGuardUntil) return;
                if (looksLikeSendTarget(e.target)) swallowEvent(e);
            }, true);
        }

        // 表单提交也算发送
        document.addEventListener('submit', function (e) {
            if (Date.now() < injectGuardUntil) swallowEvent(e);
        }, true);
    }

    /**
     * #5：新对话里用户第一次点发送时，把「L0 触发句 + 手册全文」与用户这句话
     * 合成同一条消息写进输入框并发出。返回 true = 已接管这次发送。
     */
    let injectGuardUntil = 0;

    // #6 兜底：用户那条已经出去了（平台抢先发了/我们没赶上），就等 AI 说完再把协议信息补发一条。
    // 走统一出站队列 → 闸3 会等 AI 输出结束，绝不打断正在进行的回答。
    let bootFallbackKey = '';

    function injectFallbackSend(reason) {
        if (BOOT_FALLBACK_SEND === false) return false;
        const key = currentConversationKey();
        if (bootFallbackKey === key) return false;      // 同一个会话只补发一次
        bootFallbackKey = key;
        markInjected();
        const payload = injectionPayloadFresh();       // 2.13.0：上下文里已有的部分不再重发
        if (!payload) { pushLog('协议信息已在会话里，无需补发'); return false; }
        enqueueOutbound(payload, 'bootstrap');
        pushLog('注入没能并进你那条消息（' + (reason || '未知') + '）：已排队，等 AI 说完再补发协议信息', 'warn');
        setStatus('pending', '协议信息待补发');
        return true;
    }

    function tryInjectThenSend(composerEl) {
        try {
            if (typeof injectionPending !== 'function' || !injectionPending()) return false;
            const composer = composerEl && (isTextInputEl(composerEl) || composerEl.isContentEditable) ? composerEl : findComposer();
            if (!composer) return false;
            const userText = composerValue(composer).trim();
            if (!userText) return false;

            // 2.13.0：上下文里提示词 / 目录卡都已在 → 本次不接管（避免把同一份东西再塞一遍）
            const fresh = injectionPayloadFresh();
            if (!fresh) { markInjected(); invalidateContextScan(); pushLog('协议信息已在会话里，本次发送不再注入'); return false; }

            // #7 先设接管窗口，再改输入框、再发送：用户这一次按下产生的其它事件全部无效
            injectGuardUntil = Date.now() + 1600;
            const combined = buildInjection(userText, fresh);
            const setResult = setComposerText(composer, combined);
            if (!setResult || !setResult.ok) {
                pushLog('新对话注入失败：' + ((setResult && setResult.error) || '写输入框失败'), 'warn');
                injectGuardUntil = 0;
                return false;
            }
            markInjected();
            invalidateContextScan();
            markSelfSent(combined);
            witnessSend('user-inject');
            pushLog('新对话注入：提示词' + (CONFIG.INJECT_MANUAL !== false ? ' + 手册' : '') + '已与你的消息合并为一条（' + combined.length + ' 字符）');
            setStatus('pending', '已并入信息，发送中…');

            // #6 平台会不会已经抢先把用户那条发出去了？真发出去了就不再点第二次（那就是打断）
            if (typeof hasUserMessageWith === 'function' && hasUserMessageWith(userText)) {
                pushLog('检测到你的消息已经被平台发出：不再重复发送，改为等 AI 说完补发协议信息', 'warn');
                setComposerText(composer, '');
                injectFallbackSend('平台抢先发送');
                return true;
            }

            triggerSend(composer).then(function (res) {
                if (res && res.ok) pushLog('注入消息已发送');
                else {
                    pushLog('注入消息发送失败：' + ((res && res.reason) || '未知'), 'warn');
                    injectFallbackSend((res && res.reason) || '发送未成功');
                }
            }).catch(function (err) {
                errlog('inject send threw:', err);
                injectFallbackSend('发送异常');
            });
            return true;
        } catch (e) {
            errlog('tryInjectThenSend threw:', e);
            return false;
        }
    }

    let lastComposerValue = '';
    let lastNonEmptyAt = 0;
    // 3.2：会话切换时把哨兵清零（否则可能凭上一个会话的输入框状态误判一次 composer-emptied）
    function resetComposerSentinels() { lastComposerValue = ''; lastNonEmptyAt = 0; }

    // 输入框哨兵：由事件（input / DOM 变化）驱动，不做轮询（§9.1）
    function composerWatchTick() {
        const el = findComposer();
        if (!el) { lastComposerValue = ''; return; }
        const v = composerValue(el);
        if (v && v.trim()) lastNonEmptyAt = Date.now();
        if (lastComposerValue !== '' && v === '') {
            if (lastNonEmptyAt && Date.now() - lastNonEmptyAt <= COMPOSER_WITNESS_MAX_GAP_MS) {
                witnessSend('composer-emptied');
            }
        }
        lastComposerValue = v;
    }


    /* ------------------------- 测试钩子 ------------------------- */

    function exposeForTesting() {
        // 扁平导出：键名与内部函数名一致的一律用简写（省掉 90 余行 `DSW.X = X;`）；
        // 需要分组或改名的（pause/pacer/notify/plan/conv/outboxHelpers/ui）见下方各块。
        Object.assign(DSW, {
            parseMessage, normalizeProtocolText, extractDomains, oldSyntaxHint, scanDomainLines, scanHeredoc,
            parseCommandLine, parseFlags, splitTokens, normalizeOp, resolvePathArg,
            executeBatch, executeCmd, composeReceipt, composeNoop, composeSkip, buildWorkSetTail,
            diagnoseParseIssue, decodeBase64, parseDurationMs,
            VirtualFS, fs: VirtualFS, AnchorStore, PathStore, isPathToken, DomainGate, Ckpt,
            failCountOf, gateCheck, gateNote, gateReset, gateSummary, debugStats,
            importHelpers: { looksBinaryBytes, strictUtf8, manualUtf8, importEntries, importReport },
            idempotencyKey, buildManual, BOOTSTRAP_PROMPT,
            findComposer, composerValue, composerIsEmpty, setComposerText, pickSendButton, composerWatchTick,
            judgeBirth, witnessSend, consumeArm, isArmed,
            handleMessage, runMessage, processNewMessages, enqueueOutbound,
            injectionPending, injectionPayload, buildInjection, markInjected, tryInjectThenSend,
            setPaused, isPaused,
            doLint, flagSuspiciousEmphasis, suggestBase64
        });
        // #6 暂停状态机：手动暂停 / 终止符暂停共用一套表现，原因分开记录
        DSW.pause = {
            isPaused: isPaused,
            reason: pauseReasonOf,
            info: pauseInfoOf,
            isTerminate: isTerminatePaused,
            allowsCarryFlush: pauseAllowsCarryFlush,
            text: terminatePauseText,
            autoPauseEnabled: terminateAutoPauseEnabled,
            enterTerminate: enterTerminatePause,
            noteUserSend: noteUserCommandSend,
            watchUserMessages: watchUserMessages
        };
        DSW.rescanCommands = rescanCommands;
        DSW.resetBootstrapState = resetBootstrapState;
        DSW.conversationIdInUrl = conversationIdInUrl;
        DSW.threadHasBootstrap = threadHasBootstrap;
        DSW.hasUserMessageWith = hasUserMessageWith;
        DSW.injectFallbackSend = injectFallbackSend;
        DSW.triggerSend = triggerSend;
        DSW.flushOutbox = flushOutbox;
        DSW.flushNow = flushNow;
        DSW.autoSend = autoSend;
        DSW.outboxState = function () { return outbox; };
        DSW.rateStatus = rateStatus;
        DSW.rateLoad = rateLoad;
        DSW.rateNote = rateNote;
        DSW.rateCheck = rateCheck;
        DSW.pacerStatus = pacerStatus;
        DSW.pacerLabel = pacerLabel;
        DSW.pacerTick = pacerTick;
        DSW.startPacerWait = startPacerWait;
        DSW.stopPacerWait = stopPacerWait;
        // #2 节奏器等待的 6 个固定档位（3/5/8/12/20/30s）与固定触发条件（确定性，无随机）
        DSW.pacer = {
            tiers: pacerTiers,
            level: pacerLevel,
            ms: pacerWaitMs,
            tierName: pacerTierName
        };
        DSW.mergeParts = mergeParts;
        DSW.probePlatformReject = probePlatformReject;
        DSW.PRIO = PRIO;
        DSW.isAIStreaming = isAIStreaming;
        DSW.isGenerating = isGenerating;
        DSW.isReplyComplete = isReplyComplete;
        DSW.replyMarkedDone = replyMarkedDone;
        DSW.endSignalTrusted = endSignalTrusted;
        DSW.hasStreamMarker = hasStreamMarker;
        DSW.deferUntilReplySettled = deferUntilReplySettled;
        DSW.handleSymbols = handleSymbols;
        // #3/#4 收尾符号 / 终止符号 / 提醒
        DSW.notify = {
            detectMarks: detectMarks,
            hasReplyEndMark: hasReplyEndMark,
            tailMark: tailMark,
            findTerminate: findTerminate,
            classifyTerminate: classifyTerminate,
            notifyTerminate: notifyTerminate,
            terminateTrusted: terminateTrusted,
            fireReminder: fireReminder,
            tryReminder: tryReminder,
                displayReason: displayReason,
            reset: resetNotifyState,
            state: notifyState,
                    endMarks: END_MARKS,
            terminateMark: TERMINATE_MARK
        };
        DSW.buildZip = buildZip;
        // P3b 介质层（文件夹提速的直测入口：ready/flush/mirror 各要多久、掉了多少）
        DSW.media = {
            FsMedia: FsMedia,
            syncFromFolder: fsSyncFromFolder,
            mirrorToFolder: mirrorToFolder,
            purgeSystemMirror: purgeSystemMirror
        };
        DSW.parseUnifiedDiff = parseUnifiedDiff;
        DSW.similarity = similarity;
        DSW.levenshtein = levenshtein;
        DSW.simpleHash = simpleHash;
        DSW.contentHash = contentHash;
        DSW.Store = Store;
        DSW.CONFIG = CONFIG;
        DSW.ICONS = ICONS;
        DSW.PLATFORM = PLATFORM;
        DSW.COMMANDS = COMMANDS;
        // 11b 手册投喂层：分节 / 目录 / 按需取 / 错点补课 / 冷启动微课（便于直测）
        DSW.manual = {
            sections: manualSections,
            toc: manualTOC,
            find: findManualSection,
            hintLine: manualHintLine,
            lesson: microLessonText,
            lessons: MICRO_LESSONS,
            reset: resetManualFeed
        };
        DSW.plan = {
            enter: enterPlanMode, exit: exitPlanMode, active: isPlanModeActive,
            status: planStatusText, progress: planProgress, items: parsePlanItems, path: SYS_PLAN_PATH,
            state: getPlanState, listText: planListText, symbols: PLAN_SYMBOLS, labels: PLAN_LABELS,
            cycle: PLAN_CYCLE, add: planAdd, setStatus: planSetLineStatus, del: planDeleteLine,
            clear: planClear, find: planFindItem, ensureFile: ensurePlanFile,
            cycleItem: cyclePlanItem, outboundText: planOutboundText,
            isPlanFileCmd: isPlanFileCmd, isMutating: planIsMutating, sub: planSub, run: doPlan,
            text: readPlanText
        };
        // #3 会话切换 / 新建对话 → 自动初始化
        DSW.conv = {
            check: checkConversationSwitch, reset: resetConvTrack,
            state() { return { key: convTrack.key, sawMessages: convTrack.sawMessages }; },
            fresh: freshConversation, migrate: migrateConversationState
        };
        DSW.outboxHelpers = {
            mergeExtras: mergeExtras, dropForeignParts: dropForeignParts, dropAllParts: dropAllParts,
            retagParts: retagParts,
            // #6 终止符暂停：只留本轮回执，其余按「本任务旧待回传」丢弃
            dropTaskLeftoverParts: dropTaskLeftoverParts,
            setRound: setOutboxRound, roundNow: outboxRoundNow,
            safeConvKey: safeConvKey
        };
        DSW.ui = {
            render: renderBody, state: uiState, setStatus: setStatus, log: pushLog, receipts: uiReceipts, logs: uiLogs,
            statusText() { return String(uiState.statusText || ''); },
            cfg: getUiCfg, saveCfg: saveUiCfg,
            isSysPath: isSysPath,
            planBarEl() { return uiPlanBar; },
            panelEl() { return uiPanel; },   // 测试用：看渲染出来的面板（回执过滤/文件行等）
            renderPlanBar: renderPlanBar,
            // 回执页过滤是纯函数矩阵，直接给测试用（面板 DOM 在无头沙箱里不方便渲染）
            _filter: { match: filterMatch, kindOf: logKindOf, filters: RECEIPT_FILTERS },
            panel: { open: togglePanel, close: closePanel, maskEl() { return uiMask; } },
            // 健康度与危险操作确认：都是纯逻辑/状态，便于直测
            health: { note: noteHealth, line: healthLine },
            // 主题：浅/深切换（pref/isDark 纯逻辑，toggle 走完整 UI 路径，hostEl/rootEl 验证类挂载）
            // 两个元素都要验：token 规则是 `:host, .dsw2-root`，只挂宿主切不动主题（历史 bug）
            theme: { pref: themePref, isDark: isDark, apply: applyTheme, toggle: toggleTheme, hostEl: function () { return uiHost; }, rootEl: function () { return uiRoot; } },
            // 底部全局状态栏：计量直测（导航是纯 CSS 分段控制器，没有需要直测的 JS）
            io: { stats: ioStats, reset: ioReset, noteIn: ioNoteIn, noteOut: ioNoteOut },
            statusBar: { refresh: refreshStatusBar, text: statusBarText },
            confirm: { matches: confirmMatches, ask: askConfirm },
            // 2.13.3 首次运行引导层：HTML 是纯函数，状态/点击处理都是薄壳，直测它们
            onboard: {
                html: onboardHTML,
                open: showOnboarding,
                close: closeOnboard,
                refresh: refreshOnboard,
                seen: onboardSeen,
                markSeen: markOnboardSeen,
                click: handleOnboardClick,
                media: onboardMedia,
                el: function () { return uiOnboard; }
            },
            settingsEl: settingsEl,
            filesEl: filesEl,
            editorEl: editorEl,
            beginRename: beginRename,
        };
        DSW.test = {
            resetFs() { VirtualFS.resetStore(); VirtualFS.resetToEmpty(); VirtualFS.persist(); },
            resetAll() {
                VirtualFS.resetStore();
                VirtualFS.resetToEmpty();
                try { VirtualFS.undoReset(); } catch (e) {}        // 撤销栈也是持久状态，测试要从干净基线开始
                try { Store.del(STORE_TRASH); } catch (e) {}       // 回收站也是持久状态，测试要干净
                try { Store.del(planKey()); } catch (e) {}          // 计划模式状态同理
                try { SessionState.clearAll(); } catch (e) {}       // P1：会话状态层（IDB / GM 兜底）一起清
                AnchorStore.reset();
                try { PathStore.reset(); } catch (e) {}
                gateReset();
                resetFailCounts();
                try { ioReset(); } catch (e) {}
                Ckpt.reset();
                resetRuntimeState();
                resetNotifyState();
                roundSeq = 0;
                try { setOutboxRound(0); } catch (e) {}
            },
            setCwd(v) { cwd = v; },
            getCwd() { return cwd; },
            ballEl() { return uiBall; },
            panelEl() { return uiPanel; },   // 既有测试钩子（球/面板交互类用例）
            resetRounds() { cleanRounds = 0; },
            // 消息文本提取（保空白）：给「缩进被 innerText 吃掉」这类回归留一个可直测的入口
            extractFullText(el) { return extractFullText(el); },
            renderedText(el) { return renderedText(el); }
        };
        DSW.state.cwd = function () { return cwd; };
    }


    // 调试用状态快照（原来的「§12 验收指标」模块已删：采集 10 项数字既不进决策也不给行动，
    // 需要时调 DSW.debugStats() 手动取一份当前状态即可，不占 UI、不落存储）
    function debugStats() {
        let gate = null;
        try { gate = gateSummary(); } catch (e) {}
        let rate = null;
        try { rate = rateStatus(); } catch (e) {}
        return {
            cwd: (typeof cwd === 'string' ? cwd : '/'),
            paused: !!paused, pauseReason: pauseReason || '',
            anchors: AnchorStore.size(), gate: gate, rate: rate,
            outbox: outbox.parts.length,
            planActive: (typeof isPlanModeActive === 'function' ? isPlanModeActive() : false)
        };
    }

    function installGlobalGuards() {
        try {
            window.addEventListener('error', function (ev) {
                errlog('全局异常：', ev && ev.message);
                pushLog('全局异常：' + ((ev && ev.message) || '?'), 'error');
            });
            window.addEventListener('unhandledrejection', function (ev) {
                warn('未处理的 Promise 拒绝：', ev && ev.reason);
            });
        } catch (e) {}
    }

    /* ------------------------- 启动 ------------------------- */

    /* 启动提示：在**第一个 await 之前**就显示出来。
     * 为什么不能用 setStatus / 面板：那两者要等 createUI() 才存在，而 SessionState.ready() /
     * FsMedia.ready() / syncFromFolder() 都可能耗时若干百毫秒 —— 这段时间里用户看不到任何反馈，
     * 会以为脚本没生效。这里用一个独立的轻量小胶囊（不占宿主 id、不进面板），启动完成后收起。 */
    let bootTipNode = null;
    function showBootTip(text) {
        try {
            if (typeof document === 'undefined') return;
            if (!bootTipNode || !bootTipNode.isConnected) {
                const host = document.createElement('div');
                host.id = 'dsw2-boot';
                host.style.cssText = 'position:fixed;left:0;right:0;bottom:16px;display:flex;justify-content:center;'
                    + 'z-index:2147483647;pointer-events:none;';
                let shadow;
                try { shadow = host.attachShadow({ mode: 'open' }); } catch (e) { shadow = host; }
                const pill = document.createElement('div');
                pill.style.cssText = 'max-width:80vw;padding:7px 14px;border-radius:999px;'
                    + 'font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;'
                    + 'background:rgba(37,99,235,.94);color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);'
                    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                shadow.appendChild(pill);
                (document.body || document.documentElement).appendChild(host);
                bootTipNode = pill;
            }
            bootTipNode.textContent = String(text == null ? '' : text);
        } catch (e) {}
    }
    function hideBootTip() {
        try {
            const h = document.getElementById('dsw2-boot');
            if (h && h.parentNode) h.parentNode.removeChild(h);
        } catch (e) {}
        bootTipNode = null;
    }

    async function init() {
        // 启动提示必须最先出现：此时面板 / 悬浮球都还没建，下面几个 await 又可能很慢。
        showBootTip('DSW 程序正在启动…');
        pushLog('程序正在启动…');
        try {
            // P1：会话状态层就位后再动任何持久状态。ready() 永不 reject（失败自动降级 GM），
            // 所以这里不会因为 IDB 被禁用而卡住整个脚本启动。
            await SessionState.ready();
            SessionState.sweep();

            // 配置必须在 FsMedia.ready() **之前**读出来：ready() 要靠 CONFIG.FS_MEDIA 决定
            // 用哪个介质。2.9.0 之前这里顺序是反的 —— ready() 拿到的永远是默认的 'gm'，
            // 于是「绑过文件夹却在用 GM」：内容都在文件夹里读不到，写入还落到 GM 形成分裂。
            const cfg = getUiCfg();
            CONFIG.AUTO_BOOTSTRAP = cfg.autoBootstrap !== false;
            CONFIG.INJECT_MANUAL = cfg.injectManual !== false;
            CONFIG.RATE_LIMIT_ENABLED = cfg.rateLimit !== false;
            CONFIG.FS_MEDIA = cfg.fsMedia || 'gm';      // P3b-2：内容介质跟着用户上次的选择
            FsMedia.setAutoGrant(cfg.autoGrant !== false);   // P3b-3：自动无感续授权
            DEBUG = !!cfg.debug;

            // P3b：内容介质就位（默认 GM；配成 opfs / fsa 时失败会自动退回 GM）。
            // fsa 的权限到期时会退到 GM 并进入只读保护，同时**自动**挂好续授权（不需要用户去设置）。
            await FsMedia.ready();
            refreshFolderName();

            VirtualFS.init();
            // P3b-2b：容器树就位后，把用户文件夹里被改过/新增的文件读回来（只有文件夹介质才做）
            try { await VirtualFS.syncFromFolder(); } catch (e) { warn('从文件夹读回失败：', e && e.message); }
            // 2.10.0：系统区不再镜像进用户文件夹；顺手清掉旧版可能留下的 __sys 副本
            try { VirtualFS.purgeSystemMirror(); } catch (e) { warn('清理文件夹里的系统区失败：', e && e.message); }
            Ckpt.load();
            outboxLoad();
            exposeForTesting();
            installGlobalGuards();
            installSendInterceptors();
            installUrlWatchers();     // 事件驱动：history/popstate/input，不用轮询（§9.1）
            startObserver();          // 观察器回调顺带驱动输入框哨兵与提示词注入检查
            createUI();
            hideBootTip();            // 面板就绪，收起启动提示（此后由状态条接管）
            scheduleFlush(3000);
            onDomActivity();

            window.addEventListener('pagehide', function () {
                if (observer) { observer.disconnect(); observer = null; }
                if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
                outboxSave();
                Ckpt.save(true);
                try { SessionState.flushNow(); } catch (e) {}   // P1：会话状态最后的落盘机会
            });

            DSW.state.recentBirths = recentBirths;
            DSW.state.liveArm = liveArm;
            log('initialized v' + VERSION + ' proto=' + PROTO_VERSION);
            pushLog('脚本已加载 v' + VERSION + '（协议 ' + PROTO_VERSION + '）');
        } catch (e) {
            hideBootTip();            // 启动失败也要收起，绝不留下一个永远转的「正在启动」
            errlog('init failed:', e);
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
        else init();
    }

/* >>> 99-tail.js */
})();

