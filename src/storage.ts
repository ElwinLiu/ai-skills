import { LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";
import { ClaudeSkill, SkillsFolder, SKILLS_FOLDER_KEY } from "./types";
import * as YAML from "yaml";

const ENABLED_SKILLS_KEY = "enabled_skills";
const ROUTING_MODEL_KEY = "routing_model";

/**
 * YAML frontmatter metadata structure
 */
interface SkillFrontmatter {
  name: string;
  description: string;
  allowedTools?: string[];
  model?: string;
  [key: string]: string | string[] | undefined;
}

/**
 * Parse YAML frontmatter from SKILL.md content
 */
function parseSkillMarkdown(content: string): { metadata: SkillFrontmatter; content: string } | null {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith("---")) {
    return null;
  }

  // Find the end of frontmatter
  const frontmatterEnd = content.indexOf("---", 3);
  if (frontmatterEnd === -1) {
    return null;
  }

  // Extract frontmatter and content
  const frontmatterText = content.substring(3, frontmatterEnd).trim();
  const markdownContent = content.substring(frontmatterEnd + 3).trim();

  // Parse YAML frontmatter using proper YAML parser
  try {
    const metadata = YAML.parse(frontmatterText);

    // Convert kebab-case keys to camelCase (e.g., allowed-tools -> allowedTools)
    const camelCaseMetadata: SkillFrontmatter = metadata as SkillFrontmatter;
    for (const key in metadata) {
      const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCaseMetadata[camelKey] = metadata[key];
    }

    return { metadata: camelCaseMetadata, content: markdownContent };
  } catch {
    return null;
  }
}

/**
 * Get all skills folders from preferences
 */
export async function getSkillsFolders(): Promise<SkillsFolder[]> {
  const storedPaths = await LocalStorage.getItem<string>(SKILLS_FOLDER_KEY);

  if (storedPaths) {
    try {
      // Try to parse as JSON array (new format)
      const parsed = JSON.parse(storedPaths);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON, treat as single path (backward compatibility)
      return [{ path: storedPaths }];
    }
  }

  // Default to personal skills location
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return [{ path: path.join(homeDir, ".claude", "skills") }];
}

/**
 * Get all skills folder paths (for backward compatibility)
 */
export async function getSkillsFolderPaths(): Promise<string[]> {
  const folders = await getSkillsFolders();
  return folders.map((f) => f.path);
}

/**
 * Get the first skills folder path (for backward compatibility)
 */
export async function getSkillsFolderPath(): Promise<string> {
  const paths = await getSkillsFolderPaths();
  return paths[0] || "";
}

/**
 * Add a skills folder to the list
 */
export async function addSkillsFolderPath(folderPath: string, label?: string): Promise<void> {
  const folders = await getSkillsFolders();

  // Avoid duplicates
  if (!folders.find((f) => f.path === folderPath)) {
    folders.push({ path: folderPath, label });
    await LocalStorage.setItem(SKILLS_FOLDER_KEY, JSON.stringify(folders));
  }
}

/**
 * Remove a skills folder from the list
 */
export async function removeSkillsFolderPath(folderPath: string): Promise<void> {
  const folders = await getSkillsFolders();
  const filtered = folders.filter((f) => f.path !== folderPath);

  await LocalStorage.setItem(SKILLS_FOLDER_KEY, JSON.stringify(filtered));
}

/**
 * Update a skills folder's configuration
 */
export async function updateSkillsFolderPath(oldPath: string, newPath: string, label?: string): Promise<boolean> {
  const folders = await getSkillsFolders();
  const index = folders.findIndex((f) => f.path === oldPath);

  if (index === -1) {
    return false;
  }

  folders[index] = { path: newPath, label };
  await LocalStorage.setItem(SKILLS_FOLDER_KEY, JSON.stringify(folders));
  return true;
}

/**
 * Set the skills folder path (replaces all paths - for backward compatibility)
 */
export async function setSkillsFolderPath(folderPath: string): Promise<void> {
  await LocalStorage.setItem(SKILLS_FOLDER_KEY, JSON.stringify([{ path: folderPath }]));
}

/**
 * Get all skills from all skills folders
 */
export async function getAllSkills(): Promise<ClaudeSkill[]> {
  try {
    const skillsFolders = await getSkillsFolderPaths();
    const skills: ClaudeSkill[] = [];

    for (const skillsFolder of skillsFolders) {
      // Check if folder exists
      if (!fs.existsSync(skillsFolder)) {
        continue;
      }

      const entries = fs.readdirSync(skillsFolder, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = path.join(skillsFolder, entry.name);
        const skillMdPath = path.join(skillPath, "SKILL.md");

        // Check if SKILL.md exists (case-sensitive)
        if (!fs.existsSync(skillMdPath)) {
          // Try lowercase version
          const lowerCasePath = path.join(skillPath, "skill.md");
          if (fs.existsSync(lowerCasePath)) {
            continue; // Skip invalid skill names
          }
          continue;
        }

        // Read SKILL.md
        const content = fs.readFileSync(skillMdPath, "utf-8");
        const parsed = parseSkillMarkdown(content);

        if (!parsed || !parsed.metadata.name || !parsed.metadata.description) {
          continue;
        }

        // List supporting files (all files except SKILL.md)
        const allFiles = fs.readdirSync(skillPath);
        const supportingFiles = allFiles.filter(
          (f) => f !== "SKILL.md" && fs.statSync(path.join(skillPath, f)).isFile(),
        );

        skills.push({
          name: entry.name,
          path: skillPath,
          metadata: parsed.metadata,
          content: parsed.content,
          supportingFiles,
          skillMdPath,
        });
      }
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * Find a skill by name
 */
export async function findSkill(name: string): Promise<ClaudeSkill | null> {
  const skills = await getAllSkills();
  return skills.find((s) => s.name === name || s.metadata.name === name) || null;
}

/**
 * Read the full content of a supporting file
 */
export async function readSupportingFile(skillName: string, fileName: string): Promise<string> {
  const skill = await findSkill(skillName);

  if (!skill) {
    throw new Error(`Skill "${skillName}" not found`);
  }

  const filePath = path.join(skill.path, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File "${fileName}" not found in skill "${skillName}"`);
  }

  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Create a new skill with SKILL.md
 */
export async function createSkill(
  name: string,
  description: string,
  content: string,
  allowedTools?: string[],
  model?: string,
  folderPath?: string,
): Promise<ClaudeSkill> {
  const skillsFolder = folderPath || (await getSkillsFolderPath());

  // Create skill directory
  const skillPath = path.join(skillsFolder, name);
  fs.mkdirSync(skillPath, { recursive: true });

  // Generate SKILL.md content with optional fields
  let frontmatter = `---\nname: ${name}\ndescription: ${description}`;

  if (allowedTools && allowedTools.length > 0) {
    frontmatter += `\nallowed-tools: ${JSON.stringify(allowedTools)}`;
  }

  if (model) {
    frontmatter += `\nmodel: ${model}`;
  }

  frontmatter += `\n---\n\n`;

  const skillMdPath = path.join(skillPath, "SKILL.md");
  fs.writeFileSync(skillMdPath, frontmatter + content, "utf-8");

  return {
    name,
    path: skillPath,
    metadata: {
      name,
      description,
      allowedTools,
      model,
    },
    content,
    supportingFiles: [],
    skillMdPath,
  };
}

/**
 * Update an existing skill's SKILL.md
 */
export async function updateSkill(
  name: string,
  updates: {
    description?: string;
    content?: string;
    allowedTools?: string[];
    model?: string;
  },
): Promise<ClaudeSkill | null> {
  const skill = await findSkill(name);

  if (!skill) {
    return null;
  }

  // Read current content
  const currentContent = fs.readFileSync(skill.skillMdPath, "utf-8");
  const parsed = parseSkillMarkdown(currentContent);

  if (!parsed) {
    return null;
  }

  // Update metadata, preserving existing values if not provided
  const metadata = {
    ...skill.metadata,
    ...updates,
  };

  // Regenerate SKILL.md with optional fields
  let frontmatter = `---\nname: ${metadata.name}\ndescription: ${metadata.description}`;

  if (metadata.allowedTools && metadata.allowedTools.length > 0) {
    frontmatter += `\nallowed-tools: ${JSON.stringify(metadata.allowedTools)}`;
  }

  if (metadata.model) {
    frontmatter += `\nmodel: ${metadata.model}`;
  }

  frontmatter += `\n---\n\n`;

  const newContent = updates.content ?? parsed.content;
  fs.writeFileSync(skill.skillMdPath, frontmatter + newContent, "utf-8");

  return {
    ...skill,
    metadata,
    content: newContent,
  };
}

/**
 * Delete a skill
 */
export async function deleteSkill(name: string): Promise<boolean> {
  const skill = await findSkill(name);

  if (!skill) {
    return false;
  }

  // Remove the entire skill directory
  fs.rmSync(skill.path, { recursive: true, force: true });

  return true;
}

/**
 * Get all enabled skill names
 */
export async function getEnabledSkills(): Promise<string[]> {
  const enabled = await LocalStorage.getItem<string>(ENABLED_SKILLS_KEY);
  if (enabled) {
    try {
      return JSON.parse(enabled);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Check if a skill is enabled
 */
export async function isSkillEnabled(skillName: string): Promise<boolean> {
  const enabled = await getEnabledSkills();
  return enabled.includes(skillName);
}

/**
 * Enable a skill
 */
export async function enableSkill(skillName: string): Promise<void> {
  const enabled = await getEnabledSkills();
  if (!enabled.includes(skillName)) {
    enabled.push(skillName);
    await LocalStorage.setItem(ENABLED_SKILLS_KEY, JSON.stringify(enabled));
  }
}

/**
 * Disable a skill
 */
export async function disableSkill(skillName: string): Promise<void> {
  const enabled = await getEnabledSkills();
  const filtered = enabled.filter((name) => name !== skillName);
  await LocalStorage.setItem(ENABLED_SKILLS_KEY, JSON.stringify(filtered));
}

/**
 * Get all enabled ClaudeSkill objects
 */
export async function getEnabledSkillObjects(): Promise<ClaudeSkill[]> {
  const enabledNames = await getEnabledSkills();
  const allSkills = await getAllSkills();

  return allSkills.filter((skill) => enabledNames.includes(skill.name));
}

/**
 * Get the user's preferred routing model for semantic skill selection
 * Returns null if no model is configured
 */
export async function getRoutingModel(): Promise<string | null> {
  const saved = await LocalStorage.getItem<string>(ROUTING_MODEL_KEY);
  return saved || null; // Return null if no model is saved (no default)
}

/**
 * Set the user's preferred routing model for semantic skill selection
 */
export async function setRoutingModel(model: string): Promise<void> {
  await LocalStorage.setItem(ROUTING_MODEL_KEY, model);
}

/**
 * Clear the routing model preference (reset to first-time state)
 */
export async function clearRoutingModel(): Promise<void> {
  await LocalStorage.removeItem(ROUTING_MODEL_KEY);
}
