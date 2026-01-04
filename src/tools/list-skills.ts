import { getAllSkills, getSkillsFolderPath } from "../storage";

/**
 * List all available AI Skills
 *
 * This tool scans the skills folder and displays all skills with their names,
 * descriptions, and supporting files. Returns the skills folder path and a list of all skills.
 */
export default async function tool() {
  const skillsFolder = await getSkillsFolderPath();
  const skills = await getAllSkills();

  if (skills.length === 0) {
    return `No AI Skills found in: ${skillsFolder}\n\nSkills are stored as directories containing a SKILL.md file. Make sure your skills folder path is configured correctly.`;
  }

  const formattedSkills = skills
    .map((skill) =>
      `
**${skill.metadata.name}** (Directory: ${skill.name})
- Description: ${skill.metadata.description}
- Path: ${skill.path}
${skill.supportingFiles.length > 0 ? `- Supporting Files: ${skill.supportingFiles.length} file(s)` : ""}
  `.trim(),
    )
    .join("\n\n");

  return `Skills Folder: ${skillsFolder}\n\nAvailable AI Skills (${skills.length}):\n\n${formattedSkills}`;
}
