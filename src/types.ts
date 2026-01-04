/**
 * Represents an AI Skill following the official spec
 */
export interface ClaudeSkill {
  /**
   * Skill directory name
   */
  name: string;

  /**
   * Path to the skill directory
   */
  path: string;

  /**
   * YAML frontmatter fields
   */
  metadata: {
    /**
     * Skill name (lowercase, numbers, hyphens only, max 64 chars)
     */
    name: string;

    /**
     * What the Skill does and when to use it (max 1024 chars)
     */
    description: string;
  };

  /**
   * Markdown content (the body of SKILL.md after frontmatter)
   */
  content: string;

  /**
   * Supporting files in the skill directory (optional)
   */
  supportingFiles: string[];

  /**
   * Full path to SKILL.md
   */
  skillMdPath: string;
}

/**
 * Represents a skills folder configuration
 */
export interface SkillsFolder {
  /**
   * Path to the folder containing skills
   */
  path: string;

  /**
   * Custom label for the folder (optional)
   */
  label?: string;
}

/**
 * Storage key for skills folder paths
 */
export const SKILLS_FOLDER_KEY = "skills-folder-paths";
