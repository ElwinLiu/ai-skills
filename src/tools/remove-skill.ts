import { Tool } from "@raycast/api";
import { deleteSkill, findSkill } from "../storage";

type Input = {
  /**
   * The name of the skill to remove
   */
  name: string;
};

/**
 * Confirmation before removing a skill
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const skill = await findSkill(input.name);

  if (!skill) {
    return undefined;
  }

  return {
    style: Tool.Action.Style.Destructive,
    message: `Are you sure you want to delete the Claude Code Skill "${skill.metadata.name}"?`,
    info: [
      { name: "Skill Name", value: skill.metadata.name },
      { name: "Directory", value: skill.path },
      { name: "Description", value: skill.metadata.description.substring(0, 100) + "..." },
    ],
  };
};

/**
 * Remove a Claude Code Skill
 *
 * This tool deletes the entire skill directory and all its files.
 */
export default async function tool(input: Input) {
  const skill = await findSkill(input.name);

  if (!skill) {
    return `❌ Skill "${input.name}" not found. Use list-skills to see all available skills.`;
  }

  try {
    const removed = await deleteSkill(input.name);

    if (!removed) {
      return `❌ Failed to remove skill "${input.name}"`;
    }

    return `✅ Successfully removed Claude Code Skill "${skill.metadata.name}"\n\nDeleted directory: ${skill.path}\n\nThe skill will no longer be available to Claude.`;
  } catch (error) {
    return `❌ Failed to remove skill: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
