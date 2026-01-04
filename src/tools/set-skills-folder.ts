import {
  addSkillsFolderPath,
  getSkillsFolderPaths,
  getAllSkills,
  getEnabledSkills,
  setEnabledSkillNames,
} from "../storage";
import fs from "fs";
import path from "path";

/**
 * Validates that a path doesn't contain traversal sequences
 */
function validatePathNoTraversal(userPath: string): boolean {
  const parts = path.normalize(userPath).split(path.sep);
  return !parts.some((part) => part === "..");
}

type Input = {
  /**
   * The path to the folder containing AI Skills (directories with SKILL.md files)
   */
  folderPath: string;
};

/**
 * Add a skills folder path
 *
 * This tool adds a new folder to search for AI Skills. The folder should contain
 * subdirectories, each with a SKILL.md file.
 * Common locations:
 * - Personal: ~/.claude/skills/
 * - Project: ./.claude/skills/
 * - Custom: Any folder path you prefer
 *
 * Multiple skills folders are supported. Skills from all folders will be available.
 */
export default async function tool(input: Input) {
  // Validate path doesn't contain traversal sequences
  if (!validatePathNoTraversal(input.folderPath)) {
    return `❌ Invalid path: ${input.folderPath}\n\nPath contains traversal sequences (..) that are not allowed.`;
  }

  // Validate path exists
  if (!fs.existsSync(input.folderPath)) {
    return `❌ Path does not exist: ${input.folderPath}\n\nPlease provide a valid path to a folder containing your skills.`;
  }

  // Validate it's a directory
  const stats = fs.statSync(input.folderPath);
  if (!stats.isDirectory()) {
    return `❌ Path is not a directory: ${input.folderPath}\n\nPlease provide a path to a folder, not a file.`;
  }

  // Add new path
  await addSkillsFolderPath(input.folderPath);

  // Get all folder paths
  const allPaths = await getSkillsFolderPaths();

  // Try to load skills from all locations
  const skills = await getAllSkills();

  // Get currently enabled skills
  const enabledSkillNames = await getEnabledSkills();

  // Enable all newly found skills
  const allSkillNames = skills.map((s) => s.name);
  await setEnabledSkillNames(allSkillNames);

  const newlyEnabledCount = allSkillNames.length - enabledSkillNames.length;

  return `✅ Added skills folder: ${input.folderPath}\n\nYou now have ${allPaths.length} skills folder(s) configured:\n${allPaths.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}\n\nFound ${skills.length} total Claude Code Skill(s) across all folders.\n\n${skills.length > 0 ? `Skills: ${skills.map((s) => s.metadata.name).join(", ")}` : "No skills found yet. Each skill should be a subdirectory with a SKILL.md file."}\n${newlyEnabledCount > 0 ? `\n✅ ${newlyEnabledCount} skill(s) auto-enabled from the new folder.` : ""}\n\nClaude will now use skills from all these locations.`;
}
