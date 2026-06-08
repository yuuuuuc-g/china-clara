function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "untitled";
}

function escapeYamlValue(value: string): string {
  if (/[\n:"'#\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadAsMarkdown(title: string, content: string): void {
  const exportedAt = new Date().toISOString();
  const text = `---
title: ${escapeYamlValue(title)}
exported_at: ${exportedAt}
source: Exocortex Archive
---

# ${title}

${content}
`;

  const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
  triggerBrowserDownload(blob, `[Exocortex] ${sanitizeFilename(title)}.md`);
}

export function downloadAsJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  triggerBrowserDownload(blob, filename);
}

export function downloadAllDocumentsAsJson<T>(documents: T[]): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadAsJson(`[Exocortex] archive-export-${dateStamp}.json`, {
    exported_at: new Date().toISOString(),
    count: documents.length,
    documents,
  });
}
