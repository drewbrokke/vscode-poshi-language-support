const CONFI_COMPLETION_ENABLED = false;
const CONFIG_FORMATTING_ENABLED = true;
const CONFIG_GO_TO_DEFINITION_ENABLED = true;
const CONFIG_SOURCE_FORMATTER_JAR_PATH = process.env.VSCODE_POSHI_EXTENSION_SOURCE_FORMATTER_JAR_PATH || '';

export const isCompletionEnabled = () => CONFI_COMPLETION_ENABLED;
export const isFormattingEnabled = () => CONFIG_FORMATTING_ENABLED;
export const isGoToDefinitionEnabled = () => CONFIG_GO_TO_DEFINITION_ENABLED;
export const sourceFormatterJarPath = () => CONFIG_SOURCE_FORMATTER_JAR_PATH;
