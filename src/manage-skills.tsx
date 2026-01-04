import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
  List,
  Alert,
  confirmAlert,
  Icon,
  Color,
  open,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import {
  ClaudeSkill,
  getAllSkills,
  deleteSkill,
  getSkillsFolderPaths,
  getSkillsFolders,
  addSkillsFolderPath,
  removeSkillsFolderPath,
  updateSkillsFolderPath,
  updateSkill,
  createSkill,
  enableSkill,
  disableSkill,
  getEnabledSkills,
  getRoutingModel,
  setRoutingModel,
  clearRoutingModel,
} from "./storage";
import { FAST_MODELS } from "./models";
import { SkillsFolder } from "./types";
import path from "path";

export default function Command() {
  const [skills, setSkills] = useState<ClaudeSkill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [skillsFolders, setSkillsFoldersState] = useState<string[]>([]);
  const [routingModel, setRoutingModelState] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadSkills();
  }, [refreshKey]);

  async function loadSkills() {
    setIsLoading(true);
    try {
      const [loadedSkills, folders, model] = await Promise.all([
        getAllSkills(),
        getSkillsFolderPaths(),
        getRoutingModel(),
      ]);
      setSkills(loadedSkills);
      setSkillsFoldersState(folders);
      setRoutingModelState(model);

      // Load enabled skills
      const enabled = await getEnabledSkills();
      setEnabledSkills(new Set(enabled));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load skills",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleSkillEnabled(skillName: string) {
    try {
      if (enabledSkills.has(skillName)) {
        await disableSkill(skillName);
        setEnabledSkills((prev) => {
          const next = new Set(prev);
          next.delete(skillName);
          return next;
        });
      } else {
        await enableSkill(skillName);
        setEnabledSkills((prev) => new Set(prev).add(skillName));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle skill",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (skills.length === 0 && !isLoading) {
    const foldersList = skillsFolders.map((f, i) => `  ${i + 1}. ${f}`).join("\n") || "  No folders configured";

    const emptyStateMarkdown = `## No AI Skills Found

No skills found in your configured folders:
${foldersList}

### What are AI Skills?

AI Skills are markdown files (\`SKILL.md\`) that teach AI how to do specific tasks. Each skill is a directory containing a \`SKILL.md\` file with YAML frontmatter.

### Quick Start

1. **Configure your skills folders** (if needed)
   - Default: \`~/.claude/skills/\`
   - Project: \`.claude/skills/\`
   - Or any custom folder
   - You can configure multiple folders!

2. **Create your first skill**
   - Open AI Chat in Raycast
   - Type: \`@claude-code-skills Create a skill that summarizes text\`
   - Or create a directory with a \`SKILL.md\` file manually

### Example Skill Structure

\`\`\`
my-skill/
└── SKILL.md
\`\`\`

**SKILL.md content:**

\`\`\`yaml
---
name: my-skill
description: Summarizes long text into key points
---

# My Skill

## Instructions
Provide clear instructions for Claude...
\`\`\`

### Need Help?

- [AI Skills Documentation](https://code.claude.com/docs/en/skills)
- Use \`@claude-code-skills\` in AI Chat to manage skills`;

    return (
      <Detail
        markdown={emptyStateMarkdown}
        actions={
          <ActionPanel>
            <Action.Push
              title="Manage Skills Folders"
              target={<ManageSkillsFoldersList onRefresh={loadSkills} />}
              icon={Icon.List}
            />
            <Action.Push title="Create Skill" target={<CreateSkillForm onLoad={loadSkills} />} icon={Icon.Plus} />
          </ActionPanel>
        }
      />
    );
  }

  // Show setup message if no routing model is configured
  if (!routingModel && !isLoading) {
    const setupMarkdown = `# Setup Required

Before using AI Skills, you need to configure your routing model preference.

### What is a Routing Model?

The routing model is a fast AI model that intelligently selects which skill to use based on your request. When you ask for something, this model analyzes your request and chooses the most appropriate skill.

### Choose Your Routing Model

We recommend using one of the ultra-fast models (⚡⚡) for the best experience:

- **Gemini 2.5 Flash Lite** (Recommended) - Ultra-fast, free, high quality
- **Claude 3.5/4.5 Haiku** - Very fast, large context
- **GPT-4o/5 Mini** - Fast and intelligent

### Next Steps

Click **Setup Preferences** below to choose your routing model. You can change this anytime later.`;

    return (
      <Detail
        markdown={setupMarkdown}
        actions={
          <ActionPanel>
            <Action.Push
              title="Setup Preferences"
              target={<PreferencesForm onRefresh={() => setRefreshKey((prev) => prev + 1)} />}
              icon={Icon.Gear}
            />
            <Action.Push
              title="Manage Skills Folders"
              target={<ManageSkillsFoldersList onRefresh={loadSkills} />}
              icon={Icon.List}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Separate skills into enabled and disabled groups
  const enabledSkillsList = skills.filter((skill) => enabledSkills.has(skill.name));
  const disabledSkillsList = skills.filter((skill) => !enabledSkills.has(skill.name));

  // Get model name for placeholder
  const modelInfo = FAST_MODELS.find((m) => m.id === routingModel);
  const modelName = modelInfo?.name || routingModel || "";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action.Push
            title="Manage Skills Folders"
            target={<ManageSkillsFoldersList onRefresh={loadSkills} />}
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Push
            title="Model"
            target={<PreferencesForm onRefresh={() => setRefreshKey((prev) => prev + 1)} />}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action.Push
            title="Create Skill"
            target={<CreateSkillForm onLoad={loadSkills} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
      searchBarPlaceholder={`${enabledSkillsList.length} Skills · Routed by${modelName}`}
    >
      {/* Enabled Skills Section */}
      {enabledSkillsList.length > 0 && (
        <List.Section title="Enabled Skills" subtitle={enabledSkillsList.length.toString()}>
          {enabledSkillsList.map((skill) => (
            <List.Item
              key={skill.name}
              title={skill.metadata.name}
              accessories={[
                {
                  icon: {
                    source: Icon.CheckCircle,
                    tintColor: { light: Color.Green, dark: Color.Green },
                  },
                  tooltip: "Enabled - Click to toggle",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${skill.metadata.name}

${skill.metadata.description}

## SKILL.md Content

\`\`\`markdown
${skill.content}
\`\`\`
`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text="Enabled"
                        icon={{ source: Icon.CheckCircle, tintColor: { light: Color.Green, dark: Color.Green } }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Directory" text={skill.path} />
                      <List.Item.Detail.Metadata.Label
                        title="Files"
                        text={skill.supportingFiles.length > 0 ? skill.supportingFiles.join(", ") : "SKILL.md only"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Disable"
                    onAction={() => toggleSkillEnabled(skill.name)}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action.Push
                    title="View Skill"
                    target={<SkillDetail skill={skill} onDelete={loadSkills} onRefresh={loadSkills} />}
                    icon={Icon.Eye}
                  />
                  <Action
                    title="Open in Finder"
                    onAction={() => open(skill.path)}
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.Push
                    title="Edit Skill"
                    target={<EditSkillForm skill={skill} onRefresh={loadSkills} />}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Push
                    title="Manage Skills Folders"
                    target={<ManageSkillsFoldersList onRefresh={loadSkills} />}
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action.Push
                    title="Model"
                    target={<PreferencesForm onRefresh={() => setRefreshKey((prev) => prev + 1)} />}
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                  <Action.Push
                    title="Create Skill"
                    target={<CreateSkillForm onLoad={loadSkills} />}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Delete Skill"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete Skill",
                        message: `Are you sure you want to delete "${skill.metadata.name}"? This will remove the entire directory.`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        try {
                          await deleteSkill(skill.name);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Skill deleted",
                            message: `"${skill.metadata.name}" has been removed.`,
                          });
                          loadSkills();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to delete skill",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }
                    }}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Disabled Skills Section */}
      {disabledSkillsList.length > 0 && (
        <List.Section title="Disabled Skills" subtitle={disabledSkillsList.length.toString()}>
          {disabledSkillsList.map((skill) => (
            <List.Item
              key={skill.name}
              title={skill.metadata.name}
              accessories={[
                {
                  icon: {
                    source: Icon.XMarkCircle,
                    tintColor: { light: Color.Red, dark: Color.Red },
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${skill.metadata.name}

${skill.metadata.description}

## SKILL.md Content

\`\`\`markdown
${skill.content}
\`\`\`
`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text="Disabled"
                        icon={{ source: Icon.XMarkCircle, tintColor: { light: Color.Red, dark: Color.Red } }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Directory" text={skill.path} />
                      <List.Item.Detail.Metadata.Label
                        title="Files"
                        text={skill.supportingFiles.length > 0 ? skill.supportingFiles.join(", ") : "SKILL.md only"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Enable"
                    onAction={() => toggleSkillEnabled(skill.name)}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action.Push
                    title="View Skill"
                    target={<SkillDetail skill={skill} onDelete={loadSkills} onRefresh={loadSkills} />}
                    icon={Icon.Eye}
                  />
                  <Action
                    title="Open in Finder"
                    onAction={() => open(skill.path)}
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.Push
                    title="Edit Skill"
                    target={<EditSkillForm skill={skill} onRefresh={loadSkills} />}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Push
                    title="Manage Skills Folders"
                    target={<ManageSkillsFoldersList onRefresh={loadSkills} />}
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action.Push
                    title="Model"
                    target={<PreferencesForm onRefresh={() => setRefreshKey((prev) => prev + 1)} />}
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                  <Action.Push
                    title="Create Skill"
                    target={<CreateSkillForm onLoad={loadSkills} />}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Delete Skill"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete Skill",
                        message: `Are you sure you want to delete "${skill.metadata.name}"? This will remove the entire directory.`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        try {
                          await deleteSkill(skill.name);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Skill deleted",
                            message: `"${skill.metadata.name}" has been removed.`,
                          });
                          loadSkills();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to delete skill",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }
                    }}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SkillDetail({
  skill,
  onDelete,
  onRefresh,
}: {
  skill: ClaudeSkill;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { pop } = useNavigation();

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Skill",
      message: `Are you sure you want to delete "${skill.metadata.name}"? This will remove the entire directory.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteSkill(skill.name);
        await showToast({
          style: Toast.Style.Success,
          title: "Skill deleted",
          message: `"${skill.metadata.name}" has been removed.`,
        });
        pop();
        onDelete();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete skill",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const metadata = `**Name:** ${skill.metadata.name}
**Description:** ${skill.metadata.description}

**Directory:** \`${skill.path}\`
**Files:** ${skill.supportingFiles.length > 0 ? skill.supportingFiles.join(", ") : "SKILL.md only"}
`;

  const markdown = `# ${skill.metadata.name}

${metadata}

## SKILL.md Content

\`\`\`markdown
${skill.content}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Skill"
            target={<EditSkillForm skill={skill} onRefresh={onRefresh} />}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Open in Finder"
            onAction={() => open(skill.path)}
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="Delete Skill"
            style={Action.Style.Destructive}
            onAction={handleDelete}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}

function CreateSkillForm({ onLoad }: { onLoad: () => void }) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<SkillsFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  useEffect(() => {
    async function loadFolders() {
      try {
        const skillsFolders = await getSkillsFolders();
        setFolders(skillsFolders);
      } catch {
        // Silently handle folder loading errors
      } finally {
        setIsLoadingFolders(false);
      }
    }
    loadFolders();
  }, []);

  async function handleSubmit(values: { name: string; description: string; content: string; folderPath: string }) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating skill...",
        message: values.name,
      });

      await createSkill(
        values.name,
        values.description,
        values.content,
        undefined,
        undefined,
        values.folderPath || undefined,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Skill created",
        message: `"${values.name}" has been added to your skills.`,
      });

      pop();
      onLoad();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create skill",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Skill" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
      isLoading={isLoadingFolders}
    >
      <Form.TextField
        id="name"
        title="Skill Name"
        placeholder="my-awesome-skill"
        info="Lowercase letters, numbers, and hyphens only (max 64 chars)"
      />
      <Form.Dropdown
        id="folderPath"
        title="Skills Folder"
        defaultValue={folders.length > 0 ? folders[0].path : ""}
        info="Choose which folder to create this skill in"
      >
        {folders.map((folder, index) => {
          const folderLabel = folder.label || path.basename(folder.path);
          const title = `[${folderLabel}] ${folder.path}`;
          return (
            <Form.Dropdown.Item
              key={folder.path}
              value={folder.path}
              title={title}
              accessories={index === 0 ? [{ icon: Icon.Star, text: "Default" }] : []}
            />
          );
        })}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe what this skill does and when AI should use it"
        info="Max 1024 characters. This helps AI decide when to apply the skill."
      />
      <Form.TextArea
        id="content"
        title="Instructions"
        placeholder="# Your Skill Name&#10;&#10;## Instructions&#10;Provide clear guidance for AI..."
        info="Markdown content that goes after the YAML frontmatter"
      />
    </Form>
  );
}

function EditSkillForm({ skill, onRefresh }: { skill: ClaudeSkill; onRefresh: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { description: string; content: string }) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating skill...",
        message: skill.metadata.name,
      });

      await updateSkill(skill.name, {
        description: values.description,
        content: values.content,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Skill updated",
        message: `"${skill.metadata.name}" has been updated.`,
      });

      pop();
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update skill",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Skill" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing skill: ${skill.metadata.name}`} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={skill.metadata.description}
        placeholder="Describe what this skill does and when AI should use it"
      />
      <Form.TextArea
        id="content"
        title="Instructions"
        defaultValue={skill.content}
        placeholder="# Your Skill Name&#10;&#10;## Instructions&#10;Provide clear guidance for AI..."
      />
    </Form>
  );
}

function AddSkillsFolderForm({ onRefresh }: { onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [selectedPath, setSelectedPath] = useState<string>("");

  async function handleSubmit(values: { folderPathPicker: string[]; manualPath: string; label?: string }) {
    // Use file picker selection if available, otherwise use manual input
    const folderPath =
      values.folderPathPicker && values.folderPathPicker.length > 0 ? values.folderPathPicker[0] : values.manualPath;

    if (!folderPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder specified",
        message: "Please select a folder or type a path.",
      });
      return;
    }

    // Check if folder exists
    try {
      const fs = await import("fs");
      if (!fs.existsSync(folderPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Folder does not exist",
          message: `The folder "${folderPath}" does not exist. Please create it first or choose a different folder.`,
        });
        return;
      }
    } catch {
      // If we can't check existence, let the user proceed
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding skills folder...",
        message: folderPath,
      });

      await addSkillsFolderPath(folderPath, values.label || undefined);

      await showToast({
        style: Toast.Style.Success,
        title: "Skills folder added",
        message: `Added: ${folderPath}`,
      });

      pop();
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folder" onSubmit={handleSubmit} icon={Icon.Folder} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a folder to search for AI Skills. Multiple folders are supported." />
      <Form.TextField
        id="manualPath"
        title="Folder Path"
        value={selectedPath}
        onChange={setSelectedPath}
        placeholder="~/.claude/skills"
        info="Type or paste the folder path directly, or use the file picker below to browse."
      />
      <Form.FilePicker
        id="folderPathPicker"
        title="Or Browse for Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        onChange={(values) => {
          if (values && values.length > 0) {
            setSelectedPath(values[0]);
          }
        }}
        info="Click to browse and select a folder using the file picker (updates the field above)"
      />
      <Form.TextField
        id="label"
        title="Custom Label (optional)"
        placeholder="My Personal Skills"
        info="A custom name to help you identify this folder. If not provided, the folder name will be used."
      />
    </Form>
  );
}

function EditSkillsFolderForm({ folder, onRefresh }: { folder: SkillsFolder; onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [selectedPath, setSelectedPath] = useState<string>(folder.path);

  async function handleSubmit(values: { folderPathPicker: string[]; manualPath: string; label?: string }) {
    // Use file picker selection if available, otherwise use manual input
    const newPath =
      values.folderPathPicker && values.folderPathPicker.length > 0 ? values.folderPathPicker[0] : values.manualPath;

    if (!newPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder specified",
        message: "Please select a folder or type a path.",
      });
      return;
    }

    // Check if folder exists
    try {
      const fs = await import("fs");
      if (!fs.existsSync(newPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Folder does not exist",
          message: `The folder "${newPath}" does not exist. Please create it first or choose a different folder.`,
        });
        return;
      }
    } catch {
      // If we can't check existence, let the user proceed
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating skills folder...",
        message: folder.path,
      });

      const updated = await updateSkillsFolderPath(folder.path, newPath, values.label || undefined);

      if (!updated) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update folder",
          message: "Folder not found in configuration.",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Skills folder updated",
        message: `Updated: ${newPath}`,
      });

      pop();
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Folder" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing folder: ${folder.label || path.basename(folder.path)}`} />
      <Form.TextField
        id="manualPath"
        title="Folder Path"
        value={selectedPath}
        onChange={setSelectedPath}
        placeholder="~/.claude/skills"
        info="Type or paste the folder path directly, or use the file picker below to browse."
      />
      <Form.FilePicker
        id="folderPathPicker"
        title="Or Browse for Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        onChange={(values) => {
          if (values && values.length > 0) {
            setSelectedPath(values[0]);
          }
        }}
        info="Click to browse and select a folder using the file picker (updates the field above)"
      />
      <Form.TextField
        id="label"
        title="Custom Label (optional)"
        defaultValue={folder.label}
        placeholder="My Personal Skills"
        info="A custom name to help you identify this folder. If not provided, the folder name will be used."
      />
    </Form>
  );
}

function ManageSkillsFoldersList({ onRefresh }: { onRefresh: () => void }) {
  const [folders, setFolders] = useState<SkillsFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    setIsLoading(true);
    try {
      const skillsFolders = await getSkillsFolders();
      setFolders(skillsFolders);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load folders",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveFolder(folderPath: string) {
    const confirmed = await confirmAlert({
      title: "Remove Skills Folder",
      message: `Are you sure you want to remove "${folderPath}" from the list?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      // Check if this is the last folder
      if (folders.length === 1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot remove last folder",
          message: "You must have at least one skills folder configured.",
        });
        return;
      }

      try {
        await removeSkillsFolderPath(folderPath);
        await showToast({
          style: Toast.Style.Success,
          title: "Folder removed",
          message: `Removed: ${folderPath}`,
        });
        await loadFolders();
        onRefresh();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove folder",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Skills Folder"
            target={
              <AddSkillsFolderForm
                onRefresh={() => {
                  loadFolders();
                  onRefresh();
                }}
              />
            }
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
      searchBarPlaceholder={`Configured folders: ${folders.length}`}
    >
      {folders.map((folder, index) => {
        const folderName = folder.label || (index === 0 ? "Default" : path.basename(folder.path));
        return (
          <List.Item
            key={folder.path}
            title={folderName}
            subtitle={folder.path}
            accessories={[{ text: index === 0 ? "Primary" : undefined, icon: index === 0 ? Icon.Star : undefined }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Finder"
                  onAction={() => open(folder.path)}
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.Push
                  title="Edit Folder"
                  target={
                    <EditSkillsFolderForm
                      folder={folder}
                      onRefresh={() => {
                        loadFolders();
                        onRefresh();
                      }}
                    />
                  }
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Remove Folder"
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveFolder(folder.path)}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
                <Action.Push
                  title="Add Skills Folder"
                  target={
                    <AddSkillsFolderForm
                      onRefresh={() => {
                        loadFolders();
                        onRefresh();
                      }}
                    />
                  }
                  icon={Icon.Plus}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function PreferencesForm({ onRefresh }: { onRefresh: () => void }) {
  const { push } = useNavigation();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    async function loadModel() {
      const model = await getRoutingModel();

      // If no model is saved, default to newest Gemini Flash Lite
      const defaultModel = await import("./models").then((m) => m.getDefaultModel());
      const modelToUse = model || defaultModel;

      setSelectedModel(modelToUse);
      setIsLoading(false);

      // Mark as initialized after a short delay to prevent onChange from firing during render
      setTimeout(() => {
        isInitialized.current = true;
      }, 200);
    }
    loadModel();
  }, []);

  // Update model selection without saving (save happens on Confirm Selection)
  function handleModelChange(newValue: string) {
    setSelectedModel(newValue);
  }

  function getModelName(modelId: string): string {
    const model = FAST_MODELS.find((m) => m.id === modelId);
    return model?.name || modelId;
  }

  // Don't render the dropdown until we've loaded the model
  if (isLoading) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action
              title="Reset to Default"
              style={Action.Style.Regular}
              onAction={async () => {
                const defaultModel = await import("./models").then((m) => m.getDefaultModel());
                setSelectedModel(defaultModel);
                setIsSaving(true);
                try {
                  await setRoutingModel(defaultModel);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Routing model updated",
                    message: `${getModelName(defaultModel)}`,
                  });
                  onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to update model",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Clear and Reset to First-Time"
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Clear Routing Model",
                  message: "This will remove your saved routing model preference. You'll need to select a model again.",
                  primaryAction: {
                    title: "Clear",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed) {
                  await clearRoutingModel();
                  // Reload the form
                  const defaultModel = await import("./models").then((m) => m.getDefaultModel());
                  setSelectedModel(defaultModel);
                  isInitialized.current = false;
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Routing model cleared",
                    message: "Select a model to continue",
                  });
                  onRefresh();
                }
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Global Semantic Routing Preferences" />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action
            title="Confirm Selection"
            onAction={async () => {
              // Always save the current selection when user confirms
              if (selectedModel) {
                await setRoutingModel(selectedModel);
              }
              // Show success message
              await showToast({
                style: Toast.Style.Success,
                title: "Routing model updated",
                message: `${getModelName(selectedModel)}`,
              });
              // Push a fresh instance of the main view
              // This forces a complete remount instead of popping to a potentially stale parent
              push(<Command />);
            }}
            icon={Icon.Check}
          />
          <Action
            title="Reset to Default"
            style={Action.Style.Regular}
            onAction={async () => {
              const defaultModel = await import("./models").then((m) => m.getDefaultModel());
              setSelectedModel(defaultModel);
              setIsSaving(true);
              try {
                await setRoutingModel(defaultModel);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Routing model updated",
                  message: `${getModelName(defaultModel)}`,
                });
                onRefresh();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to update model",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              } finally {
                setIsSaving(false);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Global Semantic Routing Preferences" />

      <Form.Dropdown
        id="model"
        title="Routing Model"
        value={selectedModel}
        onChange={(newValue) => {
          // Only handle change if component is initialized
          if (isInitialized.current) {
            handleModelChange(newValue);
          }
        }}
        info="This model analyzes your request in AI Chat and selects which skill to use. It applies to ALL skills globally. Click Confirm Selection to save your choice."
      >
        {FAST_MODELS.sort((a, b) => {
          // Sort by tier (fastest first), then by provider, then by name
          if (a.tier !== b.tier) {
            return a.tier === "fastest" ? -1 : 1;
          }
          if (a.provider !== b.provider) {
            return a.provider.localeCompare(b.provider);
          }
          return a.name.localeCompare(b.name);
        }).map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={`${model.name} ${model.tier === "fastest" ? "⚡⚡" : "⚡"}`}
            accessories={[
              {
                text: model.provider,
              },
              {
                icon: model.tier === "fastest" ? Icon.Lightning : Icon.Zap,
              },
            ]}
          />
        ))}
      </Form.Dropdown>

      <Form.Description
        text={`IMPORTANT: Make sure this model is enabled in your Raycast AI settings. If not enabled, Raycast will automatically fall back to a similar available model. This setting only affects skill selection (routing), not skill execution.

Model Speed Tiers:
• Models with ⚡⚡ are ultra-fast (recommended)
• Models with ⚡ are fast with good quality

When you use skills in AI Chat, this model intelligently selects which skill to use based on your request. This same routing model applies to ALL your skills globally.`}
      />
    </Form>
  );
}
