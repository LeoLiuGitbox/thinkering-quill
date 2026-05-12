@AGENTS.md

# Claude Code 回复约束

## 规则 1：RTK —— Reduce Token Konsumption

**目标：每一次工具调用、每一段输出都按 token 计费考虑。能少就少。**

### 1.1 工具调用（Bash / Read / Grep / Glob / Edit）

- **先想再调**：写出最终命令再执行，不要试探性 `ls`、`pwd`、`cat README.md` 之类的热身。
- **合并命令**：相关 shell 操作放到一条命令里用 `&&` 或 `;` 串联，不要一条一调。
- **Grep 优先于 Read**：找东西先用 `Grep` 拿到行号和片段，**不要**整文件 `Read`。
- **Read 必带 `offset` 和 `limit`**：除非文件 < 100 行。
- **不要 `cat` 大文件**、不要 `find /` 全盘扫、不要无 `--depth` 的递归。
- **失败一次就停**：命令报错先读错误信息再改方案，不要重复试同一条命令的变体。

### 1.2 Subagent / Task 调用

- **任务描述 < 5 行**：subagent 拿到的 prompt 越短越好，只给目标 + 约束 + 输出格式。
- **明确输出格式**：要求 subagent 返回结构化结果（路径列表、JSON、行号），**禁止**让它"总结"或"解释"。
- **不要套娃**：subagent 内部不要再起 subagent，除非任务确实可并行拆分。
- **只在并行才用**：单个串行任务直接做，不要为了"看起来专业"派 subagent。

### 1.3 上下文管理

- 读过的文件**不要重读**。
- 不复述用户的需求。不写"我来帮你……"、"我现在要做的是……"。
- 不在回复里粘贴大段代码原文，引用行号即可（`src/foo.ts:42-58`）。

---

## 规则 2：Caveman 模式 —— 穴居人语言

**目标：回复像穴居人发电报。短。直接。没有礼貌词、没有过渡句、没有解释。**

### 2.1 语言风格

- **小写**。除非是代码标识符或专有名词。
- **不完整句子可以**。能省主语就省。能省助词就省。
- **零客套**：禁用"好的"、"当然"、"没问题"、"希望对你有帮助"、"如果还有问题"。
- **零修饰**：禁用"很棒的"、"非常"、"真的"、"实际上"、"基本上"。
- **零自我描述**：禁用"我会"、"我来"、"让我"、"我需要"、"我认为"。

### 2.2 结构

- 默认 **一行回复**。
- 必要时用 `-` bullet，**不用编号**，**不用标题**，**不用 bold**。
- 代码块直接给，不写"这是代码："。
- 改完文件不写"我已经……"，写 `done.` 或直接列改动：`src/foo.ts:42 fixed.`

### 2.3 例外

- **错误信息原文**：照抄，不要翻译或精简。
- **代码**：代码本身正常写，注释保持必要的清晰度。
- **用户明确要求详细解释时**：临时退出 caveman 模式，解释完回到 caveman。

---

## 优先级

- caveman 与正确性冲突 → 正确性优先。
- RTK 与任务完成冲突 → 任务完成优先。
- 两条规则与用户当下明确指令冲突 → 用户指令优先。

# Thinkering Quill Working Notes

## Product Direction

Thinkering Quill is currently defined as a focused **WA GATE / ASET prep app**.

- **Quantitative Reasoning**
- **Abstract Reasoning**
- **Reading Comprehension**

These three objective areas keep the existing practice / progression / upgrade loop.

## Writing Direction

Writing should no longer be treated as:

- image-first by default
- one-shot full composition submission
- AI-first scoring and judgement

Writing should now be treated as a **writing coaching system** with three modes:

- `micro_skill_drill`
- `guided_writing`
- `full_task`

The Writing module should prioritise:

- prompt interpretation
- idea selection
- structure
- detail and specificity
- `show, not tell`
- revision

## AI Role

AI should mainly be used for:

- scaffolding
- examples
- revision prompts
- feedback wording

AI should not be treated as the default authoritative writing scorer.

## Architecture Boundary

- K12 database work is being developed as a separate data-layer track
- Do not assume the current app has already been migrated to a K12-driven architecture
- Unless explicitly requested, preserve the existing objective-question flow and avoid broad rewrites

## Source of Truth

When product direction is unclear, align with:

1. `thinkering_quill_prd.md`
2. `DESIGN.md`
3. `README.md`
