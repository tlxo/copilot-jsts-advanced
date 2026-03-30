# Advanced GitHub Copilot Exercises

These exercises are split across two workshops. The weather app codebase is the substrate -- you will build tooling around it, not fix it.

- **Workshop 1** (~2 hours): Learn the building blocks -- custom agents, skills, and hooks.
- **Workshop 2** (~1 hour): Assemble them into a multi-agent orchestration workflow.

**Approach:** These exercises are intentionally open-ended. Discuss design decisions with your group and use Copilot to explore options. There is no single correct solution.

**Let Copilot do the scaffolding.** Do not write `.agent.md`, `SKILL.md`, or hook JSON files by hand. Feed the relevant documentation links to Copilot and ask it to scaffold the files for you. Your job is to *design* -- decide what the agent should do, what tools it needs, where the boundaries are -- and then review and refine what Copilot generates. Hand-authoring YAML frontmatter is a waste of your time.

**Prerequisites:** VS Code with GitHub Copilot, agent mode available, enterprise subscription.

**Two principles to carry through every exercise:**

1. **Human-in-the-loop.** Design your agents so they stop and report back at key decision points. The human reviews, comments, and approves before the agent continues. An orchestrator that runs end-to-end without checkpoints is a liability, not an asset.
2. **Brevity.** Agent definitions, skill instructions, and protocols that grow beyond ~150 lines start to lose focus. The LLM cannot reliably follow a wall of text. Keep instructions tight, specific, and structured.

**Design checklist** -- review this before you consider any exercise done:

- [ ] Does the agent stop for human approval at key decision points?
- [ ] Could any LLM guesswork be replaced with a deterministic tool (script, skill, hook) to get facts into context?
- [ ] Are the instructions under ~150 lines and clearly structured?
- [ ] Is the tool list minimal -- only what this agent actually needs?
- [ ] Does each subagent have a defined input/output contract?
- [ ] Does the coordinator avoid reading files itself to keep its context window lean?
- [ ] Have you tested the agent with a concrete task and observed its behavior?

**Getting help:** This repo includes a **teacher** agent. Switch to it in the agent picker whenever you need guidance on concepts, design decisions, or debugging. Open separate chat threads for different topics to keep conversations focused -- don't pile everything into one thread.

---

# Workshop 1: Building Blocks

---

## Exercise 0: Setup Verification

Before starting, confirm your environment works.

```bash
npm install
npm test
```

All tests should pass. You do not need an OpenWeatherMap API key for the exercises -- tests mock external calls.

Verify that VS Code agent mode is functional: open the Chat view, check that the agent picker shows both built-in agents (Agent, Plan, Ask) and that you can switch between them.

Confirm the **teacher** agent is available: open the agent picker and look for it in the list. Switch to it and ask a question to verify it responds. This agent is your workshop coach -- use it throughout the exercises when you need guidance on concepts, design decisions, or debugging.

Create the directories you will use:

```bash
mkdir -p .github/agents .github/skills .github/hooks
```

Finally, familiarize yourself with the **Chat Debug View**. Click the **`...`** menu in the Chat panel and select **"Open Chat Debug View"**. This reveals the agent's hidden reasoning blocks, tool invocations, and skill/hook execution logs. You will use this view throughout the exercises to understand *why* an agent made a particular decision. Try it now: send a prompt in Agent mode and watch the debug panel update in real time.

---

## Exercise 1: Custom Agent -- Project Manager

**Goal:** Create a custom agent that acts as a project manager for this codebase. It should be able to assess the project, create structured backlog items, and plan features.

**What to build:** An `.agent.md` file in `.github/agents/`.

A custom agent is a Markdown file with YAML frontmatter that defines the agent's name, description, available [tools](https://code.visualstudio.com/docs/copilot/agents/agent-tools), and behavioral instructions. Key frontmatter properties: `description`, `tools`, `model`, `agents`, `handoffs`. See the [file structure reference](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_custom-agent-file-structure).

> **Scaffold, don't handwrite.** Paste the file structure reference link into Copilot and describe the PM agent you want. Let it generate the `.agent.md` frontmatter and skeleton instructions, then iterate on the output. Focus your effort on the *design decisions* below, not on YAML syntax.

**Key decisions to make:**
- What tools does the PM need? It mostly analyzes, but it may also need to write files (plans, backlog documents). Think about where the boundaries are -- what should it be allowed to touch and what should it not?
- What instructions make the PM produce consistent, structured output?
- What should a backlog item look like? (Think: title, description, acceptance criteria, TDD requirements, definition of done.) Consider creating a **backlog item template** as a resource file that the PM references every time it creates an item. This template becomes the basis for a reusable skill in Exercise 2.
- **Context-window sizing.** The PM should break work into backlog items that are small enough for an agent to implement within a single context window. A backlog item that requires touching 15 files across 4 layers is too large -- the implementing agent will lose context. Instruct the PM to split work accordingly and include sizing guidance in its output.

**Things to try once the agent exists:**
- Switch to the PM agent and ask it to assess the project and identify improvement areas.
- Ask it to plan a feature it identifies as a good candidate.
- Ask it to review one of its own backlog items for completeness and proper sizing -- are they small enough for an agent to implement in one session?
- If you're unsure about any design decision, switch to the **teacher** agent in a separate thread and ask.

**Discussion points:**
- How specific should the instructions be vs. how much should you rely on the model's judgment?
- What model would you choose for this agent? The PM needs to reason about architecture but doesn't need to generate code. Consult the [model comparison reference](https://docs.github.com/en/copilot/reference/ai-models/model-comparison) and think about cost, capability, and context window trade-offs.
- How would you test that the agent behaves consistently?

**References:**
- [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Creating custom agents (GitHub)](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Model comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison)

---

## Exercise 2: Agent Skills for the PM

**Goal:** Create skills that give the PM agent (and later, other agents) repeatable, deterministic capabilities. Skills are not just instructions -- they include scripts and resources.

**Key concept:** A skill is a directory under `.github/skills/<skill-name>/` with a `SKILL.md` file and optional scripts/resources. The agent loads the skill when it judges the skill relevant, and follows the instructions, which can reference the included scripts. See [SKILL.md file format](https://code.visualstudio.com/docs/copilot/customization/agent-skills#_skillmd-file-format) and [how Copilot uses skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills#_how-copilot-uses-skills).

The difference between a skill and a custom instruction: skills include scripts, examples, and resources alongside instructions. They are loaded on-demand based on relevance, not always-on. They are portable across VS Code, Copilot CLI, and the coding agent. See [skills vs. custom instructions](https://code.visualstudio.com/docs/copilot/customization/agent-skills#_agent-skills-vs-custom-instructions).

**Getting started:** Type `/skills` in the chat input to open the Configure Skills menu, where you can create a new skill.

> **Scaffold, don't handwrite.** Describe the skill you want to Copilot -- its purpose, what script it should run, and what structured output it should produce -- and ask it to generate the `SKILL.md` and companion shell script. Review and refine the output; don't start from a blank file.

**Task:** Think about what the PM agent does repeatedly, and where deterministic scripts would produce more reliable results than the LLM guessing. Discuss with your group and with Copilot. Build at least two skills.

### Recommended skill: `create-backlog-item`

In Exercise 1 you decided what a backlog item should look like. Now turn that into a skill with a **resource template**.

Create `.github/skills/create-backlog-item/` with:
- A `SKILL.md` that instructs the agent to always use the included template when creating backlog items.
- A `backlog-item-template.md` resource file containing the canonical structure (title, description, acceptance criteria, TDD plan, sizing estimate, definition of done). The `SKILL.md` should reference this file so the agent loads the actual template instead of inventing its own format.

This is a good example of a skill with a **resource** rather than a script -- the value is in the deterministic template, not in running a command. The agent gets the exact structure every time instead of improvising.

### More skill ideas

What other deterministic capabilities would help a PM agent? Consider things like: gathering real dependency information via `npm ls`, collecting project metrics (test count, source file count per layer, lint status), or mapping test files to source files to identify coverage gaps. The key idea is that these are things a shell script can do reliably and the LLM should not be guessing at.

**For each skill:**
- Create the directory structure: `.github/skills/<name>/SKILL.md` plus any scripts.
- The `SKILL.md` must have `name` and `description` in the YAML frontmatter. The `name` must match the directory name.
- Keep skills focused and concise -- a skill that tries to do too much loses effectiveness.
- Write scripts that produce structured, parseable output. The agent interprets the output; the script ensures deterministic data collection.
- Test the skill by invoking it as a slash command (`/<skill-name>`) or by prompting the PM agent in a scenario where the skill should activate.
- Control visibility with `user-invocable` and `disable-model-invocation` frontmatter properties. See [slash command control](https://code.visualstudio.com/docs/copilot/customization/agent-skills#_use-skills-as-slash-commands).
- To nudge the agent toward using a skill, reference it explicitly in the agent's instructions (e.g., "When assessing the project, use the `<skill-name>` skill to gather metrics").

**Discussion points:**
- What makes a good boundary between "instruction for the agent" and "script that runs deterministically"? (Ask the **teacher** agent if you want to think this through.)
- How do you ensure the agent actually uses the skill vs. trying to do it in its own way?
- Which of these skills would be useful beyond the PM agent?

**References:**
- [Agent skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Creating agent skills (GitHub)](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills)

---

## Exercise 3: Hooks -- The Smart Gatekeeper

**Goal:** Build lifecycle hooks that enforce guarantees instructions alone cannot provide. The centrepiece is a **Smart Gatekeeper** -- a `PreToolUse` hook that acts as a firewall over terminal commands.

**Key concept:** Hooks are shell commands that run deterministically at specific points in the agent lifecycle. An instruction that says "always run the linter" is a suggestion the LLM may ignore. A hook that runs the linter is a guarantee. See [hook lifecycle events](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-lifecycle-events).

Hook configuration is JSON in `.github/hooks/`. See [hook configuration format](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-configuration-format) and [hook input/output](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-input-and-output) for details on how hooks communicate with the agent.

> **Scaffold, don't handwrite.** Give Copilot the hook configuration format docs and the gatekeeper requirements below, and ask it to generate the JSON and the companion shell script. Then review and refine.

### Required: Smart Gatekeeper (`PreToolUse`)

Create a `PreToolUse` hook that inspects every terminal command the agent is about to run and makes a risk-based decision:

| Command pattern | Decision | Rationale |
|---|---|---|
| `vitest`, `npm test`, `npm run test`, `ls`, `cat`, `head`, `tail`, `grep`, `find`, `wc` | `"allow"` -- auto-approve | Read-only or test commands; safe to run without supervision. |
| `rm`, `npm install`, `curl`, `wget`, `git push`, `git reset` | `"ask"` -- force human confirmation | Destructive, network-reaching, or irreversible; the human must approve. |
| Everything else | Pass through (no `permissionDecision`) | Let VS Code's default approval flow handle it. |

The hook script receives the tool invocation via the `PreToolUse` [input schema](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-input-and-output). It must:
1. Read the JSON input from the file path passed as the first argument.
2. Extract the command string from the tool parameters.
3. Match against the allow-list and deny-list patterns.
4. Write a JSON output file with `permissionDecision` set to `"allow"` or `"ask"` (or omit it for pass-through).

**Test it:** Switch to Agent mode and ask it to run `ls`, then `rm -rf /tmp/test`. Verify that `ls` executes immediately while `rm` triggers a confirmation prompt. Open the **Chat Debug View** to see the hook's decision in the execution log.

### Required: Agent-Scoped Hook on the PM

Hooks defined in `.github/hooks/` are global -- they run for every agent. But sometimes you want a hook that only fires for a specific agent. [Agent-scoped hooks](https://code.visualstudio.com/docs/copilot/customization/hooks#_agent-scoped-hooks) are defined in the agent's own `.agent.md` frontmatter using the `hooks` field, and only run when that agent is active. Requires the `chat.useCustomAgentHooks` setting to be enabled.

Add an agent-scoped hook to your PM agent that appends a timestamped entry to `.github/pm-audit.log` every time the PM produces output. This gives you an audit trail of PM assessments independent of chat history. Think about which hook event is appropriate -- `PostToolUse` after the PM writes a file? `Stop` when the PM finishes a session?

**Test it:** Ask the PM to assess the project, then check `.github/pm-audit.log` for the entry. Open the **Chat Debug View** to confirm the hook fired.

### Additional hooks to try

- A `PostToolUse` hook that runs `npx eslint --fix` after any file edit, so linting is enforced as a system guarantee.
- A `Stop` hook that runs the full test suite before the agent finishes. Remember: a `Stop` hook that blocks must check `stop_hook_active` to prevent infinite loops.

**Key points:**
- Hooks run deterministically -- they are shell commands, not LLM suggestions.
- [Agent-scoped hooks](https://code.visualstudio.com/docs/copilot/customization/hooks#_agent-scoped-hooks) only run when that agent is active.
- `PreToolUse` hooks can [control tool approval](https://code.visualstudio.com/docs/copilot/customization/hooks#_pretooluse-output): `allow`, `deny`, or `ask`.
- The available [hook events](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-lifecycle-events) are: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`.

**Discussion:**
- Where is the line between "the agent should decide" and "the system must enforce"?
- What are the risks of hooks that block agent operations? What if a legitimate command gets caught by the gatekeeper?
- How do hooks, skills, and instructions each fit into the control spectrum? (Instructions = guidance, skills = on-demand capabilities, hooks = guarantees.)
- Could the gatekeeper be extended with a deny-list loaded from a config file, so teams can customize policies without editing the script?

**References:**
- [Hooks in VS Code](https://code.visualstudio.com/docs/copilot/customization/hooks)
- [Using hooks (GitHub)](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

---

## Exercise 4: The Implementer Agent

**Goal:** Build a second custom agent -- the **Implementer** -- and use it together with the PM to plan and implement a feature end-to-end. This is the Workshop 1 payoff: you'll experience the full cycle manually, which makes the "why orchestrate?" question concrete when you reach Workshop 2.

### 4a: Plan a Feature with the PM

1. Switch to the PM agent. Ask it to assess the project and propose a feature. Observe whether your skills fire (especially `create-backlog-item`) and whether the hooks behave as expected.
2. Pick a feature from the PM's output. Ask the PM to produce a detailed backlog item with acceptance criteria, TDD requirements, and sizing.

### 4b: Build the Implementer Agent

Create a new `.agent.md` file in `.github/agents/` for the Implementer. For now it is **human-invocable** (you switch to it manually). In Workshop 2, it becomes a subagent.

**Core behaviour -- TDD loop:**
The Implementer receives a task (backlog item) and implements it using strict TDD:
1. **Write failing tests first** that cover the acceptance criteria.
2. **Implement the production code** to make the tests pass.
3. **Run the tests.** If they fail, fix the implementation and re-run. Loop until all tests pass.
4. **Report the result** -- which files were created/modified, which tests pass, any issues encountered.

The instructions should make this loop explicit. The agent must not move to step 2 before step 1 produces failing tests, and must not declare success until the tests pass.

**Key design decisions:**
- **Tools:** The Implementer needs file editing and terminal access. What else? Does it need search tools to understand existing code, or should it rely on what the PM provides in the task description?
- **What the Implementer should NOT do:** It should not decide *what* to build. It receives a spec and executes. Scope decisions belong to the PM.

### 4c: Skills for the Implementer

Consider building a **`run-tests`** skill to give the Implementer deterministic knowledge of how to run the test suite. Without it, the agent often guesses wrong -- running `jest` or `node --test` instead of `npm test` (Vitest), forgetting the test file layout, or not knowing about the factory helpers.

The skill should include:
- A script that runs the tests with the correct command and produces structured output (pass/fail counts, failing test names).
- Instructions on how to run subsets: `npm run test:unit` for unit tests, `npm run test:integration` for integration tests, or `npx vitest run tests/unit/specific.test.ts` for a single file.
- Knowledge of the project's test layout (`tests/unit/`, `tests/integration/`, `tests/factories.ts`, `tests/setup.ts`).

This skill will be reusable -- any agent that needs to verify test results can use it.

### 4d: Hooks for the Implementer

Think about what guarantees the Implementer needs:
- **Post-edit linting.** A `PostToolUse` hook that runs `npx eslint --fix` after every file edit ensures the Implementer never leaves behind lint violations. (You may have already built this in Exercise 3 -- reuse it.)
- **Agent-scoped hooks.** Should the Implementer have its own hooks? For example, a hook that runs the test suite after every file edit (not just the linter) -- more aggressive, but catches regressions immediately.
- What other guarantees would prevent the Implementer from going off track?

### 4e: Run the Feature End-to-End

1. Take the backlog item from step 4a.
2. Switch to the Implementer agent. Give it the task and let it work.
3. Observe the TDD loop. Does it write tests first? Does it loop until they pass?
4. Review the result. Run `npm test` to verify.

**Things to observe:**
- Did the Implementer follow the TDD sequence, or did it skip to writing code?
- Did the `run-tests` skill activate, or did the agent invent its own test command?
- Did the post-edit hooks fire? Check the **Chat Debug View**.
- How much manual coordination did you have to do between the PM step and the Implementer step? (Copy-pasting plans, switching chat threads, re-explaining context...)
- **That manual coordination is exactly what orchestration automates in Workshop 2.**

**Iterate:** If skills didn't fire or hooks misbehaved, go back and fix them. Use the **teacher** agent in a separate thread for debugging.

---

## Exercise 4S: MCP Server Integration (Stretch)

**Goal:** Extend your agents with external tools via Model Context Protocol servers.

MCP servers expose external tools to agents via a standardized protocol. Browse the [GitHub MCP registry](https://github.com/mcp) to see what's available.

**Discussion prompts:**
- The PM agent creates backlog items as text. What if it could create GitHub Issues directly? (The GitHub MCP server can do this.)
- What if test results were available as a structured MCP tool with parsed output?
- What would a "project metrics" MCP server look like -- one that exposes code complexity, test coverage, and dependency audit as tools?

**If your organization's policies allow:** Configure an existing MCP server from the [GitHub MCP registry](https://github.com/mcp) in one of your agents using the `mcp-servers` property in the agent frontmatter, and try using it.

---

# Workshop 2: Orchestration

You have the building blocks from Workshop 1: a PM agent, an Implementer agent, skills, and hooks. Now assemble them into a multi-agent workflow with a coordinator.

**Time estimate:** Exercise 5 fits in ~1 hour. Exercises 6-7 are stretch goals.

---

## Exercise 5: Subagent Orchestration -- Feature Implementation Workflow

This is the main exercise. You will wire the PM and Implementer from Workshop 1 into a multi-agent workflow with a new **Coordinator** agent and any **Researcher** agents needed to bridge them.

Remember Exercise 4? The manual coordination you did there -- switching between the PM and the Implementer, copy-pasting plans, re-explaining context -- is what orchestration automates.

### 5a: Design the Orchestration

Before writing any new agent files, design the workflow as a group. The **teacher** agent can help -- open a separate thread. See [how subagent execution works](https://code.visualstudio.com/docs/copilot/agents/subagents#_how-subagent-execution-works).

**What you already have** from Workshop 1: PM agent (with `create-backlog-item` skill), Implementer agent (with `run-tests` skill and post-edit linting), Smart Gatekeeper hook, PM audit hook.

**What's missing:** a **Coordinator** to orchestrate the workflow, and possibly **Researcher** agents to gather codebase context.

### Context economics -- the core "why"

The fundamental reason for separating agents is **context window management**. Each agent runs in its own window. A single agent that researches, reasons, *and* implements fills its context with research material, leaving little room for actual code.

| Role | Context profile | Model needs |
|---|---|---|
| **Researcher** | Reads many files, produces small structured summary. Context is disposable. | Large context window; mid-tier reasoning. |
| **Coordinator** | Sees only summaries, makes decisions. Must stay "blind" to files. | Strong reasoning; small context. |
| **Implementer** | Receives precise instructions, writes code. No re-discovery. | Code-capable; doesn't need the most expensive model. |

Consult the [model comparison reference](https://docs.github.com/en/copilot/reference/ai-models/model-comparison). The right model for the Implementer is probably *not* the same one you'd pick for the Coordinator.

### Design decisions

- Every subagent needs a documented **Input/Output Contract**. Example:
  ```
  Researcher — Input: { feature_name, search_scope[] }  Output: { relevant_files: [{ path, line_range, summary }], notes }
  ```
- The PM produces backlog items for a human reader today. What changes when the Coordinator consumes them?
- **Should the Implementer's role be split?** In Workshop 1 it does tests + code in one TDD loop. In an orchestrated workflow you could split it:
  - **Unified**: simpler, but the agent may *change failing tests* instead of fixing code.
  - **Test Author + Implementer**: the Test Author writes failing tests (can't edit `src/`), the Implementer makes them pass (can't edit `tests/`). Safer, but more coordination. `PreToolUse` hooks can enforce the file boundaries.
  - Discuss with your group -- there's no single right answer.
- Where does the Coordinator **stop for human approval**? At minimum, after research and before implementation.
- Which agents can run **in parallel**?

### The "Blind" Coordinator

**The Coordinator must not have `editFiles` or file-reading tools.** It delegates all file operations:
- Reading → Researcher subagents (return structured summaries, not file contents).
- Writing → worker agents (Implementer, or Implementer + Test Author).

Its `tools` list: `agent` + communication tools only. See the [coordinator and worker pattern](https://code.visualstudio.com/docs/copilot/agents/subagents#_coordinator-and-worker-pattern).

### 5b: Adapt Existing Agents and Build New Ones

You have two tasks: **convert** existing agents into subagents, and **create** the new Coordinator (and Researcher(s)).

**Converting Workshop 1 agents to subagents:**
- Set `user-invocable: false` on the PM and Implementer so they can only be called by the Coordinator. See [controlling subagent invocation](https://code.visualstudio.com/docs/copilot/agents/subagents#_control-subagent-invocation).
- Add an **Input/Output Contract** section to each agent's instructions. The PM receives a feature request and returns a structured backlog item. The Implementer receives a backlog item (or a subset of it) and returns a completion report.
- If you decided to split the Implementer into a Test Author and an Implementer, now is the time to create the second agent. Restrict file-editing tools appropriately: the Test Author can only edit files under `tests/`, the Implementer can only edit files under `src/`. (Hint: `PreToolUse` hooks can enforce these boundaries.)
- Review the tools list. Does the PM still need file-writing tools when the Coordinator is managing the workflow? Does the Implementer need anything new?
- The skills (`create-backlog-item`, `run-tests`) and hooks (Smart Gatekeeper, post-edit linting) continue to work -- they're not agent-specific. Verify they still fire when agents run as subagents.

**Creating new agents:**
- The **Coordinator** -- restricted tools (`agent`, no file editing), defines the full workflow sequence, lists which subagents it can use via the [`agents` property](https://code.visualstudio.com/docs/copilot/agents/subagents#_restrict-which-subagents-can-be-used-experimental).
- Any **Researcher** agents you designed in 5a -- read-only tools, focused task, structured output contract.

The Coordinator's instructions should define the workflow sequence explicitly: what it delegates first, what it does with the results, what triggers the next step, where it stops for human review, and what happens on failure.

### 5c: Debug and Validate

Before running a full feature through the workflow, do a dry run. Give the Coordinator a small, well-defined task and observe.

**Debugging agent behavior:** Open the **Chat Debug View** to understand why agents make the decisions they do. Key things to investigate:
- Why did the Coordinator choose to call (or skip) a particular subagent?
- Did skills get loaded in subagent contexts? The `run-tests` skill should fire when the Implementer runs tests. The `create-backlog-item` skill should fire when the PM writes a backlog item.
- Did hooks fire as expected? The Smart Gatekeeper should still protect terminal commands in subagent sessions. The post-edit linting hook should still run after the Implementer edits files.
- What context did the subagent actually receive? Is the I/O contract being followed?

**Practical tip:** Use separate chat threads for different concerns -- one for running the agent, one for tweaking definitions, one for asking the **teacher** agent about debugging strategies. Changes to `.agent.md` files take effect in new threads, not the currently running one.

### 5d: Run a Feature Through It

Switch to the Coordinator agent and give it a feature request. Observe the full workflow.

**Things to watch for:**
- Does the Coordinator actually delegate, or does it try to do everything itself?
- Does the Coordinator stop at the designated human checkpoints?
- Are the research summaries concise enough, or do they bloat the Coordinator's context?
- Does the PM produce a well-structured backlog item using the `create-backlog-item` skill?
- Does the TDD cycle work correctly? If you kept a unified Implementer, does it write tests first? If you split roles, does the Test Author produce tests before the Implementer runs?
- Does any agent modify files it shouldn't? (e.g., the Implementer changing test assertions instead of fixing code.) If so, is that a case for a `PreToolUse` hook that restricts file paths per agent?

**Iterate on the agent instructions based on what you observe.** This is the real work -- the first version will not be perfect.

**References:**
- [Subagents in VS Code](https://code.visualstudio.com/docs/copilot/agents/subagents)
- [Orchestration patterns](https://code.visualstudio.com/docs/copilot/agents/subagents#_orchestration-patterns)

---

## Exercise 6: PM Handoff to Coordinator (Stretch)

**Goal:** Add a seamless handoff from the PM agent to the Coordinator, so a user can go from "assess the project" to "implement this feature" without manual copy-pasting.

[Handoffs](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_handoffs) let one agent transfer the conversation to another. The PM finishes planning a feature and offers to hand off to the Coordinator for implementation.

**What to do:**
- Add a `handoffs` property to the PM agent's frontmatter, pointing to the Coordinator.
- Update the PM's instructions: after producing a backlog item, it should offer the user a handoff to the Coordinator with the backlog item as context.
- The Coordinator receives the conversation and kicks off the orchestration workflow.

**Also consider:** Now that the PM operates within an orchestrated workflow, should it delegate its own research to the Researcher subagents from Exercise 5 instead of reading files itself?
- Add your Researcher agents to the PM's `agents` property and `agent` to its tools list.
- Update the PM's instructions to delegate codebase analysis to Researchers and synthesize the structured summaries.

Test by asking the PM to assess the project and propose a feature. It should delegate the research, produce a focused assessment, and then offer to hand off to the Coordinator.

**Discussion:** How does the PM's output quality change when it gets structured research summaries vs. doing its own ad-hoc file reading? Is the handoff smooth, or does context get lost in the transition?

---

## Exercise 7: Skills Across the Workflow -- Eliminating Hallucination (Stretch)

**Goal:** Identify operations in the subagent workflow where the LLM is likely to hallucinate or produce inconsistent results, and replace them with deterministic skills.

Look at the agents you built and observe their behavior in the **Chat Debug View**. Where is the LLM *interpreting* raw output that a script could parse more reliably? These are your **hallucination-prone** operations -- places where the model reads a wall of text and summarizes it, when a structured parser would be more accurate.

**Start from what you already have.** The `run-tests` skill from Exercise 4c already gives the Implementer deterministic test execution. But does the skill produce structured *output* (JSON with pass/fail counts and failing test names), or does the agent still interpret raw terminal output? If the latter, enhance the skill's script to produce a JSON summary.

**More examples to look for:**
- **Lint result parsing.** A skill that runs `npx eslint . --format=json` and returns structured violations instead of the agent parsing human-readable output.
- **Dependency audit.** A skill that runs `npm ls --json` and cross-references with known vulnerability databases, instead of the agent guessing at dependency versions.
- **Source-to-test mapping.** A script that maps `src/services/weather-service.ts` → `tests/unit/weather-service.test.ts` deterministically, instead of the agent inferring test file locations.
- **Researcher output validation.** Does the Researcher actually return structured summaries per its I/O contract, or does it dump prose? A skill could enforce the output format with a schema validator.

**Starting point:** Run a feature through your Exercise 5 workflow and watch the agent's reasoning blocks in the Chat Debug View. Every time you see the agent *interpreting* raw command output, that's a candidate for a deterministic skill.

For each skill you identify, create the directory, `SKILL.md`, and any scripts. Then update the relevant agent instructions to reference the skill explicitly (e.g., "Always use the `run-tests` skill instead of running vitest directly").

**Discussion:**
- Skills are loaded based on relevance, not guaranteed to run. How do you increase the likelihood that agents use them? (Hint: explicit references in agent instructions, and naming the skill in the prompt.)
- What's the difference between a skill and a hook for enforcing behavior? When would you choose one over the other?
- How do you test that a skill's structured output is actually more reliable than the LLM's interpretation?
