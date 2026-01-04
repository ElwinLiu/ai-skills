import { Tool } from "@raycast/api";
import { removeSkillsFolderPath, getSkillsFolderPaths, getAllSkills } from "../storage";

type Input = {
  /**
   * The path to the skills folder to remove
   */
  folderPath: string;
};

/**
 * Confirmation before removing a skills folder
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const paths = await getSkillsFolderPaths();

  if (!paths.includes(input.folderPath)) {
    return undefined;
  }

  return {
    style: Tool.Action.Style.Destructive,
    message: `Are you sure you want to remove this skills folder from the list?`,
    info: [
      { name: "Folder Path", value: input.folderPath },
      {
        name: "Note",
        value:
          "This won't delete the folder or its files, it just removes it from the list of folders to search for skills.",
      },
    ],
  };
};

/**
 * Remove a skills folder path
 *
 * This tool removes a folder path from the list of configured skills folders.
 * The folder and its files are not deleted, it just won't be searched for skills anymore.
 */
export default async function tool(input: Input) {
  const paths = await getSkillsFolderPaths();

  if (!paths.includes(input.folderPath)) {
    return `❌ Folder path not found in configuration: "${input.folderPath}"\n\nUse list-skills-folders to see all configured folders.`;
  }

  // Check if this is the last folder
  if (paths.length === 1) {
    return `❌ Cannot remove the only skills folder.\n\nYou must have at least one skills folder configured. Add another folder first using set-skills-folder before removing this one.`;
  }

  try {
    await removeSkillsFolderPath(input.folderPath);

    // Get updated configuration
    const updatedPaths = await getSkillsFolderPaths();
    const skills = await getAllSkills();

    return `✅ Removed skills folder from configuration: ${input.folderPath}\n\nYou now have ${updatedPaths.length} skills folder(s) configured:\n${updatedPaths.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}\n\nFound ${skills.length} total Claude Code Skill(s) across remaining folders.\n\nNote: The folder and its files were not deleted, only removed from the search path.`;
  } catch (error) {
    return `❌ Failed to remove folder: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
