import { Action, Tool } from "@raycast/api";
import { updateSkill, findSkill } from "../storage";

type Input = {
  /**
   * The name of the skill to update
   */
  name: string;

  /**
   * New description (optional)
   */
  description?: string;

  /**
   * New content/instructions (optional)
   */
  content?: string;
};

/**
 * Confirmation before editing a skill
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.name || input.name.trim().length === 0) {
    return undefined;
  }

  const existingSkill = await findSkill(input.name);

  if (!existingSkill) {
    return undefined;
  }

  if (input.description !== undefined) {
    if (input.description.trim().length === 0) {
      return undefined;
    }
    if (input.description.length > 1024) {
      return undefined;
    }
  }

  if (input.content !== undefined && input.content.trim().length === 0) {
    return undefined;
  }

  const changes = Object.entries({
    description: input.description,
    content: input.content ? "(updated)" : undefined,
  })
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value }));

  return {
    style: Action.Style.Regular,
    message: `Update Claude Code Skill "${existingSkill.metadata.name}"?`,
    info: [
      { name: "Skill Name", value: existingSkill.metadata.name },
      { name: "Directory", value: existingSkill.path },
      ...changes,
    ],
  };
};

/**
 * Edit an existing Claude Code Skill
 *
 * This tool updates the SKILL.md file of an existing skill. Only provide the fields you want to change.
 */
export default async function tool(input: Input) {
  // Validate skill name
  if (!input.name || input.name.trim().length === 0) {
    return "❌ Skill name is required.";
  }

  const existingSkill = await findSkill(input.name);

  if (!existingSkill) {
    return `❌ Skill "${input.name}" not found. Use list-skills to see all available skills.`;
  }

  // Validate description if provided
  if (input.description !== undefined) {
    if (input.description.trim().length === 0) {
      return "❌ Description cannot be empty.";
    }
    if (input.description.length > 1024) {
      return `❌ Description too long. Maximum 1024 characters allowed (currently ${input.description.length} characters).`;
    }
  }

  // Validate content if provided
  if (input.content !== undefined && input.content.trim().length === 0) {
    return "❌ Content cannot be empty.";
  }

  try {
    const updatedSkill = await updateSkill(input.name, {
      description: input.description,
      content: input.content,
    });

    if (!updatedSkill) {
      return `❌ Failed to update skill "${input.name}"`;
    }

    const changes = Object.entries({
      description: input.description,
      content: input.content ? "(updated)" : undefined,
    })

      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => `  - ${key}: ${value}`)
      .join("\n");

    return `✅ Successfully updated Claude Code Skill "${updatedSkill.metadata.name}"\n\nChanges:\n${changes}\n\nDescription: ${updatedSkill.metadata.description}\n\nThe skill will use the updated content next time Claude invokes it.`;
  } catch (error) {
    return `❌ Failed to update skill: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
