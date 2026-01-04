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
  } catch (error) {
    console.error("Error in skill routing:", error);
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

  const prompt = `You are a skill router. Select the best skill for the user's request.

User Request: "${request}"

Available Skills:
${skillsList}

Selection rules:
1. Pick the skill whose purpose best matches what the user wants to accomplish
2. Consider the entire description, not just keywords
3. If multiple skills match, choose the most specific one
4. Only return "NONE" if the request is completely unrelated to all skills (e.g., "hello", "how are you")

Output: ONLY the skill name from the list above, or "NONE" if no match.

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
  } catch (error) {
    console.error("Error in AI skill selection:", error);
    // AI routing failed - return null to trigger no-match message
    return null;
  }
}

/**
 * Format a skill object into a readable response
 */
function formatSkillResponse(skill: ClaudeSkill): string {
  return `# Skill: ${skill.metadata.name}

${skill.metadata.description}

## Instructions

${skill.content}`;
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

  return `# General Response Required

No enabled skill matches this request. Use your general capabilities to help the user.

Do NOT use any of the following skills:
${skillsList}

If the user explicitly mentions a skill name, inform them it's not available.`;
}
