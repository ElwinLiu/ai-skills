import { AI } from "@raycast/api";
import { getEnabledSkillObjects, getRoutingModel } from "../storage";
import { ClaudeSkill } from "../types";

/**
 * Input parameters for the use-skills tool
 */
type Input = {
  /**
   * The user's request or question. This helps the semantic router select the most appropriate skill.
   */
  request: string;
};

/**
 * Use enabled AI Skills to assist with the user's request
 *
 * This tool uses AI-powered semantic routing to intelligently select the most relevant skill
 * based on the user's request. A fast LLM analyzes the request against all enabled skills
 * and returns the best matching skill's instructions.
 *
 * @param input - The user's request for skill selection
 * @returns The selected skill's instructions, or guidance if no skills are enabled
 */
export default async function tool(input: Input) {
  // Check if routing model is configured
  const routingModel = await getRoutingModel();
  if (!routingModel) {
    return `# Setup Required

Before using AI Skills, you need to configure your routing model preference.

## What is a Routing Model?

The routing model is a fast AI model that intelligently selects which skill to use based on your request.

## How to Setup

1. Open "Manage Skills" command in Raycast
2. Click "Setup Preferences" (gear icon)
3. Select your preferred routing model (we recommend **Gemini 2.5 Flash Lite**)
4. The selection is saved automatically

Once configured, you can use AI Skills to help with various tasks!`;
  }

  const enabledSkills = await getEnabledSkillObjects();

  if (enabledSkills.length === 0) {
    return `No AI Skills are currently enabled.

To enable skills:
1. Open "Manage Skills" command
2. Use Cmd+T to toggle skills on/off
3. Once enabled, skills will be available here

Skills must be enabled before they can be used by the AI.`;
  }
  // Use AI for semantic routing when multiple skills are enabled
  try {
    const selectedSkillName = await selectSkillWithAI(enabledSkills, input.request, routingModel);

    if (!selectedSkillName) {
      // No skill matched - inform the user
      return formatNoMatchMessage(enabledSkills);
    }

    const selectedSkill = enabledSkills.find(
      (s) => s.name === selectedSkillName || s.metadata.name === selectedSkillName,
    );

    if (selectedSkill) {
      return formatSkillResponse(selectedSkill);
    }

    // Skill name not found - inform the user
    return formatNoMatchMessage(enabledSkills);
  } catch {
    // If AI routing fails, inform the user
    return formatNoMatchMessage(enabledSkills);
  }
}

/**
 * Use AI to select the most appropriate skill based on the user's request
 */
async function selectSkillWithAI(skills: ClaudeSkill[], request: string, routingModel: string): Promise<string | null> {
  // Create a concise list of skills for the AI to analyze
  const skillsList = skills
    .map((skill, index) => {
      return `${index + 1}. Name: ${skill.metadata.name}\n   Description: ${skill.metadata.description}`;
    })
    .join("\n");

  const prompt = `You are an intelligent skill router. Your task is to match the user's request to the MOST appropriate skill from the available list.

User Request: "${request}"

Available Skills:
${skillsList}

SELECTION CRITERIA:
1. Choose the skill whose PURPOSE best aligns with what the user wants to accomplish
2. Look for KEYWORDS in the request that match the skill's description
3. If multiple skills seem relevant, pick the one that is MOST SPECIFIC to the user's intent
4. Only return "NONE" if the request doesn't meaningfully relate to ANY skill

OUTPUT FORMAT:
- Respond with ONLY the skill name (e.g., "code-reviewer", "summarizer")
- If no skill matches, respond with exactly "NONE"
- No explanations, no quotes, no extra text

Selected skill name:`;

  try {
    const response = await AI.ask(prompt, {
      creativity: "none", // Low creativity for deterministic selection
      model: AI.Model[routingModel as keyof typeof AI.Model],
    });

    const trimmedResponse = response.trim().replace(/^["']|["']$/g, "");

    if (trimmedResponse.toUpperCase() === "NONE") {
      return null;
    }

    return trimmedResponse;
  } catch {
    // AI routing failed - return null to trigger no-match message
    return null;
  }
}

/**
 * Format a skill object into a readable response
 */
function formatSkillResponse(skill: ClaudeSkill): string {
  return `# Using Skill: ${skill.metadata.name}

**Purpose:** ${skill.metadata.description}

---

## YOUR TASK

You have been selected to help with this request because this skill matches what the user needs. Follow these steps:

1. **READ and UNDERSTAND** the skill instructions below
2. **APPLY** the instructions directly to address the user's request
3. **RESPOND** helpfully, following any specific guidance in the skill
4. **STAY WITHIN SCOPE** - Focus on what this skill is designed to do

---

## Skill Instructions

${skill.content}

---

**Remember:** These instructions are your guide. Use them to provide the best possible response to the user's request.`;
}

/**
 * Format a "no match found" message with helpful guidance
 */
function formatNoMatchMessage(skills: ClaudeSkill[]): string {
  const skillsList = skills
    .map((skill, index) => {
      return `${index + 1}. **${skill.metadata.name}** - ${skill.metadata.description}`;
    })
    .join("\n");

  return `# No Suitable Skill Found

The user's request doesn't clearly match any of your available AI Skills.

## WHAT YOU SHOULD DO

**Respond to the user directly using your general capabilities.** Don't try to force a skill match.

Help the user with their request to the best of your ability. If you need clarification about what they want, ask them.

---

## Available Skills (${skills.length})

For your reference, here are the skills that are currently enabled:\n\n${skillsList}

---

## TIPS

- If the user mentions a specific skill name by name, let them know it's not available
- If you think a skill MIGHT be relevant but you're not sure, you can ask: "Would you like me to use the [skill-name] skill for this?"
- The user can enable more skills or create new ones through the "Manage Skills" command`;
}
