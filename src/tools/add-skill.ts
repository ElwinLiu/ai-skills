import { Action, Tool } from "@raycast/api";
import { createSkill, getSkillsFolderPath } from "../storage";

type Input = {
  /**
   * The name of the skill (lowercase, numbers, and hyphens only, max 64 chars)
   */
  name: string;

  /**
   * Description of what the skill does and when to use it (max 1024 chars)
   */
  description: string;

  /**
   * The markdown instructions for the skill (the body content after frontmatter)
   */
  content: string;
};

/**
 * Confirmation before creating a skill
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.name || input.name.trim().length === 0) {
    return undefined;
  }

  if (!/^[a-z0-9-]+$/.test(input.name)) {
    return undefined;
  }

  if (input.name.length > 64) {
    return undefined;
  }

  if (!input.description || input.description.trim().length === 0) {
    return undefined;
  }

  if (input.description.length > 1024) {
    return undefined;
  }

  if (!input.content || input.content.trim().length === 0) {
    return undefined;
  }

  const folderPath = await getSkillsFolderPath();

  return {
    style: Action.Style.Regular,
    message: `Create new Claude Code Skill "${input.name}"?`,
    info: [
      { name: "Skill Name", value: input.name },
      {
        name: "Description",
        value: input.description.substring(0, 100) + (input.description.length > 100 ? "..." : ""),
      },
      { name: "Folder", value: folderPath || "Default skills folder" },
      { name: "Status", value: "Will be enabled by default" },
    ],
  };
};

/**
 * Create a new Claude Code Skill
 *
 * This tool creates a new skill directory with a SKILL.md file following the AI Skills specification.
 * The skill name must use lowercase letters, numbers, and hyphens only.
 */
export default async function tool(input: Input) {
  // Validate skill name
  if (!input.name || input.name.trim().length === 0) {
    return "❌ Skill name is required.";
  }

  if (!/^[a-z0-9-]+$/.test(input.name)) {
    return `❌ Invalid skill name "${input.name}". Skill names must use lowercase letters, numbers, and hyphens only (max 64 characters).`;
  }

  if (input.name.length > 64) {
    return `❌ Skill name too long. Maximum 64 characters allowed.`;
  }

  // Validate description
  if (!input.description || input.description.trim().length === 0) {
    return "❌ Description is required.";
  }

  if (input.description.length > 1024) {
    return `❌ Description too long. Maximum 1024 characters allowed (currently ${input.description.length} characters).`;
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    return "❌ Content is required.";
  }

  try {
    const skill = await createSkill(input.name, input.description, input.content);

    return `✅ Successfully created Claude Code Skill "${skill.metadata.name}"\n\nDirectory: ${skill.path}\n\nDescription: ${skill.metadata.description}\n\nThe skill is enabled by default and available for Claude to use automatically when relevant.`;
  } catch (error) {
    return `❌ Failed to create skill: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
