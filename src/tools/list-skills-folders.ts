import { getSkillsFolderPaths, getAllSkills } from "../storage";

/**
 * List all configured skills folders
 *
 * This tool displays all folder paths configured for storing AI Skills.
 * Shows the total number of folders and skills found across all locations.
 */
export default async function tool() {
  const paths = await getSkillsFolderPaths();
  const skills = await getAllSkills();

  if (paths.length === 0) {
    return "No skills folders configured.\n\nUse set-skills-folder to add a folder containing your AI Skills.";
  }

  let output = `📁 Configured Skills Folders (${paths.length}):\n\n`;

  paths.forEach((folderPath, index) => {
    output += `${index + 1}. ${folderPath}\n`;
  });

  output += `\n📊 Found ${skills.length} skill(s) across all folders\n\n`;

  if (skills.length > 0) {
    output += `Skills:\n${skills.map((s) => `  • ${s.metadata.name} (${s.path})`).join("\n")}\n`;
  }

  output += `\n💡 Use set-skills-folder to add more folders, or remove-skills-folder to remove a folder.`;

  return output;
}
