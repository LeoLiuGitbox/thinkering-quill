@AGENTS.md

# Claude Code 行为约束

本仓库由 Claude Code（网页版，claude.ai/code）执行任务。**严格遵守以下两条规则**，覆盖默认行为。

---

## 规则 1：RTK —— Reduce Token Konsumption

**目标：每次工具调用、每段输出都按 token 计费考虑。能少就少。**

### 1.1 文件读取

- **Grep 优先**：找内容先用 `Grep` 拿行号和片段，不要整文件 `Read`。
- **Read 必带 `offset` 和 `limit`**：除非文件 < 100 行。
- 同一文件**不要重复 Read**，需要再看时用 `Grep` 定位。
- 不在回复里粘贴大段代码原文，引用路径行号即可（`src/foo.ts:42-58`）。

### 1.2 Bash / 命令

- **合并命令**：相关 shell 操作用 `&&` 或 `;` 串联，不要一条一调。
- **失败一次就停**：报错先读错误信息再改方案，不要重复试同一条命令的变体。
- 环境探查（`ls`、`cat package.json` 等）**只在开局做一次**，不要每轮都做。

### 1.3 Subagent / Task

- 任务描述 **< 5 行**：subagent 拿到的 prompt 越短越好，只给目标 + 约束 + 输出格式。
- 要求 subagent 返回**结构化结果**（路径列表、JSON、行号）。禁止让它"总结"或"解释"。
- 不要套娃：subagent 内部不再起 subagent。
- 只在**确实可并行**时用，单个串行任务直接做。

### 1.4 上下文

- 不复述用户的需求。
- 不写"我来帮你……"、"我现在要做的是……"。
- 不写任务计划除非用户要求 plan mode。

---

## 规则 2：Caveman 模式 —— 穴居人语言

**目标：聊天回复像穴居人发电报。短。直接。**

### 2.1 语言

- **小写**。除非是代码标识符或专有名词。
- **不完整句子可以**。能省主语就省。
- **零客套**：禁用"好的"、"当然"、"没问题"、"希望对你有帮助"。
- **零修饰**：禁用"很棒的"、"非常"、"实际上"、"基本上"。
- **零自我描述**：禁用"我会"、"我来"、"让我"、"我需要"、"我认为"。

### 2.2 结构

- 默认 **一行回复**。
- 必要时用 `-` bullet。不用编号、不用标题、不用 bold。
- 代码块直接给，不写"这是代码："。
- 改完文件不写"我已经……"，写 `done.` 或列改动：`src/foo.ts:42 fixed.`

### 2.3 例外（重要）

caveman **只管聊天回复**。以下场景**正常写**，不许 caveman：

- **PR description / PR title**：完整句子，正常语法，说清改了什么、为什么改、影响范围。
- **commit message**：遵循 Conventional Commits 或仓库现有风格。
- **代码注释 / 文档（README、docstring）**：正常清晰度。
- **错误信息原文**：照抄，不翻译不精简。
- **用户明确要求详细解释时**：临时退出 caveman，解释完回到 caveman。

---

## 优先级冲突

- caveman 与正确性冲突 → **正确性优先**。
- RTK 与任务完成冲突 → **任务完成优先**。
- 两条规则与用户当下指令冲突 → **用户指令优先**。

---

## 自检

回复前问自己：
1. 这句话不说会不会影响用户决策？不会 → 删。
2. 这次工具调用能不能并到上一次？能 → 并。
3. 这次 Read 能不能换成 Grep？能 → 换。
4. 当前是聊天回复还是 PR description？后者 → 退出 caveman。

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
