import { useMemo, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import type { editor } from 'monaco-editor';
import type { Artifact } from '~/common';
import { useGetSharedStartupConfig, useGetStartupConfig } from '~/data-provider';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useArtifactCode } from '~/Providers/EditorContext';
import { TOOL_ARTIFACT_TYPES } from '~/utils/artifacts';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { ArtifactPreview } from './ArtifactPreview';
import { useShareContext } from '~/Providers';

const OFFICE_PREVIEW_TYPES = new Set<string>([
  TOOL_ARTIFACT_TYPES.DOCX,
  TOOL_ARTIFACT_TYPES.SPREADSHEET,
  TOOL_ARTIFACT_TYPES.PRESENTATION,
]);

/** Sandpack's static preview loads through a third-party frame. Office HTML is
 * already a complete document, so render it here and skip that frame. */
function officePreviewDocument(files: Record<string, unknown>): string {
  const entry = files['index.html'];
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry != null && typeof entry === 'object' && 'code' in entry) {
    const code = (entry as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

export default function SandboxArtifactTabs({
  artifact,
  previewRef,
  isSharedConvo,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
  isSharedConvo?: boolean;
}) {
  const { shareId } = useShareContext();
  const shouldUseSharedConfig =
    isSharedConvo === true && typeof shareId === 'string' && shareId.length > 0;
  const { data: startupConfig } = useGetStartupConfig({ enabled: !shouldUseSharedConfig });
  const { data: sharedStartupConfig } = useGetSharedStartupConfig(shareId, {
    enabled: shouldUseSharedConfig,
  });
  const resolvedStartupConfig = shouldUseSharedConfig ? sharedStartupConfig : startupConfig;
  const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  /* The buffer belongs to whichever artifact last wrote it, so a pane that
   * remounted for another host keeps this artifact's unsaved text; a copy
   * another artifact displaced is just as much this artifact's text. */
  const editedCode = useArtifactCode(artifact.id);

  const { files, fileKey, template, sharedProps, deriveFiles } = useArtifactProps({ artifact });

  /* An artifact whose preview entry is derived from its source needs the whole
   * set rebuilt from the editor text; `ArtifactPreview` can only swap the file
   * the editor owns. Empty text counts as no edit there, so it does here too. */
  const previewFiles = useMemo(
    () => (deriveFiles != null && editedCode ? deriveFiles(editedCode) : files),
    [deriveFiles, editedCode, files],
  );
  const officeSrcDoc = OFFICE_PREVIEW_TYPES.has(artifact.type ?? '')
    ? officePreviewDocument(previewFiles as Record<string, unknown>)
    : '';

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs.Content
        value="code"
        id="artifacts-code"
        className="h-full w-full grow overflow-auto"
        tabIndex={-1}
      >
        <ArtifactCodeEditor
          artifact={artifact}
          monacoRef={monacoRef}
          readOnly={isSharedConvo === true}
        />
      </Tabs.Content>

      <Tabs.Content value="preview" className="h-full w-full grow overflow-hidden" tabIndex={-1}>
        {officeSrcDoc ? (
          <iframe
            title={artifact.title ?? 'Document preview'}
            sandbox="allow-scripts allow-popups allow-downloads"
            srcDoc={officeSrcDoc}
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <ArtifactPreview
            files={previewFiles}
            fileKey={fileKey}
            template={template}
            previewRef={previewRef}
            sharedProps={sharedProps}
            currentCode={editedCode}
            startupConfig={resolvedStartupConfig}
          />
        )}
      </Tabs.Content>
    </div>
  );
}
