import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { allPlugins, MarkoraNode } from "@refinex/markora/src";
import React from "react";
import { useLocale } from "../i18n/LocaleContext";
import { PlaygroundConfig } from "./page";

type Props = {
  setShowNodes: (show: boolean) => void;
  nodes: MarkoraNode[];
  config: PlaygroundConfig;
  setConfig: React.Dispatch<React.SetStateAction<PlaygroundConfig>>;
  outputTime?: number | null;
};

export default function Devbar({ setShowNodes, nodes, config, setConfig, outputTime }: Props) {
  const { t } = useLocale();
  // Helper to toggle editor config
  const toggleEditorOption = (key: keyof PlaygroundConfig["editor"]) => {
    setConfig((prev) => ({
      ...prev,
      editor: { ...prev.editor, [key]: !prev.editor[key] },
    }));
  };

  // Helper to toggle preview config
  const togglePreviewOption = (key: keyof PlaygroundConfig["preview"]) => {
    setConfig((prev) => ({
      ...prev,
      preview: { ...prev.preview, [key]: !prev.preview[key] },
    }));
  };

  // Helper to toggle Markora feature config
  const toggleFeatureOption = (key: keyof PlaygroundConfig["features"]) => {
    setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  };

  // Helper to toggle plugin
  const togglePlugin = (key: keyof PlaygroundConfig["plugins"]) => {
    setConfig((prev) => ({
      ...prev,
      plugins: { ...prev.plugins, [key]: !prev.plugins[key] },
    }));
  };

  // Track which accordions are open
  const [openValues, setOpenValues] = React.useState<string[]>(["editor", "preview"]);
  const isNodesOpen = openValues.includes("nodes");

  const handleValueChange = (values: string[]) => {
    // If nodes is being opened, collapse everything else
    if (values.includes("nodes") && !openValues.includes("nodes")) {
      setOpenValues(["nodes"]);
      setShowNodes(true);
    } else if (!values.includes("nodes") && openValues.includes("nodes")) {
      // Nodes is being closed, restore other sections
      setOpenValues(values.length > 0 ? values : ["editor", "preview"]);
      setShowNodes(false);
    } else {
      setOpenValues(values.filter((v) => v !== "nodes"));
      setShowNodes(values.includes("nodes"));
    }
  };

  return (
    <div className="h-full w-full flex flex-col border rounded-lg">
      <div className="text-muted-foreground font-mono text-center whitespace-nowrap h-10 p-2 border-b shrink-0">
        {t("devbar.title")}
      </div>

      {outputTime != null && (
        <div className="text-xs text-muted-foreground p-2 border-b">
          {t("devbar.outputTime", { ms: outputTime.toFixed(2) })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <Accordion
          type="multiple"
          value={openValues}
          className={`w-full ${isNodesOpen ? "h-full flex flex-col" : ""}`}
          onValueChange={handleValueChange}
        >
          {/* Editor Options */}
          <AccordionItem value="editor">
            <AccordionTrigger className="p-2 border-b rounded-none hover:no-underline cursor-pointer hover:bg-accent hover:text-accent-foreground">
              {t("devbar.editorOptions")}
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-3">
              <ConfigSwitch
                id="baseStyles"
                label={t("opt.baseStyles.label")}
                description={t("opt.baseStyles.desc")}
                checked={config.editor.baseStyles}
                onCheckedChange={() => toggleEditorOption("baseStyles")}
              />
              <ConfigSwitch
                id="defaultKeybindings"
                label={t("opt.defaultKeybindings.label")}
                description={t("opt.defaultKeybindings.desc")}
                checked={config.editor.defaultKeybindings}
                onCheckedChange={() => toggleEditorOption("defaultKeybindings")}
              />
              <ConfigSwitch
                id="history"
                label={t("opt.history.label")}
                description={t("opt.history.desc")}
                checked={config.editor.history}
                onCheckedChange={() => toggleEditorOption("history")}
              />
              <ConfigSwitch
                id="indentWithTab"
                label={t("opt.indentWithTab.label")}
                description={t("opt.indentWithTab.desc")}
                checked={config.editor.indentWithTab}
                onCheckedChange={() => toggleEditorOption("indentWithTab")}
              />
              <ConfigSwitch
                id="highlightActiveLine"
                label={t("opt.highlightActiveLine.label")}
                description={t("opt.highlightActiveLine.desc")}
                checked={config.editor.highlightActiveLine}
                onCheckedChange={() => toggleEditorOption("highlightActiveLine")}
              />
              <ConfigSwitch
                id="lineWrapping"
                label={t("opt.lineWrapping.label")}
                description={t("opt.lineWrapping.desc")}
                checked={config.editor.lineWrapping}
                onCheckedChange={() => toggleEditorOption("lineWrapping")}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Preview Options */}
          <AccordionItem value="preview">
            <AccordionTrigger className="p-2 border-b rounded-none hover:no-underline cursor-pointer hover:bg-accent hover:text-accent-foreground">
              {t("devbar.previewOptions")}
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-3">
              <ConfigSwitch
                id="includeBase"
                label={t("opt.includeBase.label")}
                description={t("opt.includeBase.desc")}
                checked={config.preview.includeBase}
                onCheckedChange={() => togglePreviewOption("includeBase")}
              />
              <ConfigSwitch
                id="sanitize"
                label={t("opt.sanitize.label")}
                description={t("opt.sanitize.desc")}
                checked={config.preview.sanitize}
                onCheckedChange={() => togglePreviewOption("sanitize")}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Feature Options */}
          <AccordionItem value="features">
            <AccordionTrigger className="p-2 border-b rounded-none hover:no-underline cursor-pointer hover:bg-accent hover:text-accent-foreground">
              {t("devbar.featureOptions")}
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-3">
              <ConfigSwitch
                id="slashCommands"
                label={t("opt.slashCommands.label")}
                description={t("opt.slashCommands.desc")}
                checked={config.features.slashCommands}
                onCheckedChange={() => toggleFeatureOption("slashCommands")}
              />
              <ConfigSwitch
                id="selectionToolbar"
                label={t("opt.selectionToolbar.label")}
                description={t("opt.selectionToolbar.desc")}
                checked={config.features.selectionToolbar}
                onCheckedChange={() => toggleFeatureOption("selectionToolbar")}
              />
              <ConfigSwitch
                id="attachments"
                label={t("opt.attachments.label")}
                description={t("opt.attachments.desc")}
                checked={config.features.attachments}
                onCheckedChange={() => toggleFeatureOption("attachments")}
              />
              <ConfigSwitch
                id="pasteDropUploads"
                label={t("opt.pasteDropUploads.label")}
                description={t("opt.pasteDropUploads.desc")}
                checked={config.features.pasteDropUploads}
                onCheckedChange={() => toggleFeatureOption("pasteDropUploads")}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Plugin Toggles */}
          <AccordionItem value="plugins">
            <AccordionTrigger className="p-2 border-b rounded-none hover:no-underline cursor-pointer hover:bg-accent hover:text-accent-foreground">
              {t("devbar.plugins")}
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-3">
              {allPlugins.map((plugin) => {
                const key = plugin.name.toLowerCase();
                return (
                  <ConfigSwitch
                    key={key}
                    id={key}
                    label={plugin.name}
                    description={t("opt.plugin.desc", { name: plugin.name })}
                    checked={config.plugins[key] ?? true}
                    onCheckedChange={() => togglePlugin(key)}
                  />
                );
              })}
            </AccordionContent>
          </AccordionItem>

          {/* Nodes Viewer */}
          <AccordionItem value="nodes" className={"flex-1 flex flex-col min-h-0"}>
            <AccordionTrigger className="p-2 border-b rounded-none hover:no-underline cursor-pointer hover:bg-accent hover:text-accent-foreground shrink-0">
              <div>
                {t("devbar.nodes")} <span className="text-muted-foreground text-xs">{t("devbar.nodesHint")}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className={"flex-1 h-full overflow-auto p-0"}>
              <NodeViewer nodes={nodes} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

// Reusable switch component with label and description
function ConfigSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function NodeViewer({ nodes, depth = 0 }: { nodes: MarkoraNode[]; depth?: number }) {
  return (
    <div className="font-mono text-xs">
      {nodes.map((node, idx) => (
        <div key={`${node.name}-${node.from}-${idx}`}>
          <div
            className={`flex items-center gap-2 py-0.5 px-1 rounded ${node.isSelected ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <span className="font-semibold">{node.name}</span>
            <span className="text-muted-foreground">
              [{node.from}:{node.to}]
            </span>
          </div>
          {node.children.length > 0 && <NodeViewer nodes={node.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}
