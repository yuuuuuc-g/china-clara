import { generateText, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// ==========================================
// 1. 自定义大模型 Provider 初始化
// ==========================================
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const kimi = createOpenAI({
  baseURL: 'https://api.moonshot.cn/v1',
  apiKey: process.env.KIMI_API_KEY,
});

// ==========================================
// 2. 严格的类型定义 (Matt Pocock Style)
// ==========================================
interface AgentPipelineConfig {
  skillFilePath: string;
  contextFilePath: string;
  maxIterations: number;
  model: LanguageModel;
}

// ==========================================
// 工具函数：解析 LLM 返回的 JSON
// ==========================================
function parseJSON<T>(text: string, schema: z.ZodType<T>): T {
  // 清除可能的 markdown 代码块包裹
  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(clean);
  return schema.parse(parsed);
}

// ==========================================
// Zod Schema 定义
// ==========================================
const ChallengerSchema = z.object({
  taskPrompt: z.string().describe("一个针对当前 skill 的刁钻测试任务，需结合项目 Context，考察边缘情况 (Edge Case)。"),
  rubric: z.array(z.string()).describe("一组绝对客观、二值化 (Pass/Fail) 的评判标准细则。必须归纳出规则，而非复述原文。"),
});

const JudgeSchema = z.object({
  passed: z.boolean().describe("是否满足所有 rubric 的要求"),
  failedReasons: z.array(z.string()).describe("如果不通过，列出具体违反了哪几条 rubric"),
});

// ==========================================
// 3. 核心五角色 Agent 定义
// ==========================================

async function runChallenger(skillContent: string, contextContent: string, model: LanguageModel) {
  const { text } = await generateText({
    model,
    prompt: `你是一个苛刻的系统测试专家。请基于以下项目上下文和技能设定，生成一个极具挑战性的测试任务和评分细则。

[项目上下文]
${contextContent}

[当前技能说明]
${skillContent}

请严格只输出如下 JSON 格式，不要有任何其他内容、前缀或 markdown 代码块：
{
  "taskPrompt": "一个针对当前 skill 的刁钻测试任务，需结合项目 Context，考察边缘情况 (Edge Case)",
  "rubric": ["绝对客观、二值化 (Pass/Fail) 的评判标准细则1", "评判标准细则2"]
}`,
  });
  return parseJSON(text, ChallengerSchema);
}

async function runReasoner(skillContent: string, taskPrompt: string, model: LanguageModel) {
  const { text } = await generateText({
    model,
    system: skillContent,
    prompt: taskPrompt,
  });
  return text;
}

async function runJudge(taskPrompt: string, rubric: string[], reasonerOutput: string, model: LanguageModel) {
  const { text } = await generateText({
    model,
    prompt: `你是一个无情的仲裁者。请根据评分细则 (Rubric)，判定做题人的解答是否合格。必须全对才算 Pass。

[任务] ${taskPrompt}
[评分细则] ${rubric.join('\n')}
[解答内容] ${reasonerOutput}

请严格只输出如下 JSON 格式，不要有任何其他内容、前缀或 markdown 代码块：
{
  "passed": true,
  "failedReasons": []
}`,
  });
  return parseJSON(text, JudgeSchema);
}

async function runProposer(skillContent: string, taskPrompt: string, failedReasons: string[], model: LanguageModel) {
  const { text } = await generateText({
    model,
    prompt: `你是一位高级提示词工程师。做题人在执行任务时失败了。
请诊断为什么当前的技能文件 (Skill) 无法处理该任务，并提出高层诊断建议。

[任务] ${taskPrompt}
[失败原因] ${failedReasons.join('\n')}
[当前技能文件] ${skillContent}

请输出具体的修改建议（例如：增加处理某类异常的明确规则），不要直接重写技能。`,
  });
  return text;
}

async function runGenerator(skillContent: string, proposal: string, model: LanguageModel) {
  const { text } = await generateText({
    model,
    prompt: `你是一个严谨的文档维护者。请根据诊断师的建议，更新当前的 Markdown 技能文件。
要求：
1. 落地修改建议。
2. 严格保留与本次修改无关的其他条款，不能破坏已有的核心逻辑。
3. 只输出更新后的 Markdown 内容，不要有任何前置或后置的寒暄。

[当前技能文件] ${skillContent}
[修改建议] ${proposal}`,
  });
  return text;
}

// ==========================================
// 4. 主循环流水线 (Pipeline)
// ==========================================
async function optimizeSkillPipeline(config: AgentPipelineConfig) {
  console.log(`🚀 开始迭代优化 Skill: ${config.skillFilePath}`);

  let currentSkill = await fs.readFile(config.skillFilePath, 'utf-8');
  const projectContext = await fs.readFile(config.contextFilePath, 'utf-8');

  // 由于设备的 RAM 限制，此处的 await 是完全串行的，不会引发并发内存飙升
  for (let i = 1; i <= config.maxIterations; i++) {
    console.log(`\n--- 🔄 迭代轮次: ${i} ---`);

    console.log(`[1/5] Challenger 正在生成对抗任务...`);
    const challenge = await runChallenger(currentSkill, projectContext, config.model);

    console.log(`[2/5] Reasoner 正在尝试解题...`);
    const reasonerOutput = await runReasoner(currentSkill, challenge.taskPrompt, config.model);

    console.log(`[3/5] Judge 正在进行严格裁决...`);
    const judgement = await runJudge(challenge.taskPrompt, challenge.rubric, reasonerOutput, config.model);

    if (judgement.passed) {
      console.log(`✅ 本轮任务 Reasoner 成功通过！题目可能不够刁钻，下轮将提升难度。`);
      continue;
    }

    console.log(`❌ 任务失败！违反规则: ${judgement.failedReasons.join(', ')}`);
    console.log(`[4/5] Proposer 正在分析失败原因并生成建议...`);
    const proposal = await runProposer(currentSkill, challenge.taskPrompt, judgement.failedReasons, config.model);

    console.log(`[5/5] Generator 正在重写技能文件...`);
    currentSkill = await runGenerator(currentSkill, proposal, config.model);

    const snapshotPath = config.skillFilePath.replace('.md', `.v${i}.md`);
    await fs.writeFile(snapshotPath, currentSkill, 'utf-8');
    console.log(`💾 已保存本轮技能快照至: ${snapshotPath}`);
  }

  await fs.writeFile(config.skillFilePath, currentSkill, 'utf-8');
  console.log(`\n🎉 优化完成！最终版本已覆盖原始文件。`);
}

// ==========================================
// 5. 启动入口
// ==========================================
const run = async () => {
  const activeModel = process.env.REFINERY_MODEL === "kimi"
  ? kimi.chat("moonshot-v1-8k")
  : deepseek.chat("deepseek-chat");

  try {
    await optimizeSkillPipeline({
      skillFilePath: path.resolve(process.cwd(), '.agents/skills/diagnose/SKILL.md'),
      contextFilePath: path.resolve(process.cwd(), 'CONTEXT.md'),
      maxIterations: 5,
      model: activeModel,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Pipeline Error:', error.message);
    }
  }
};

run();