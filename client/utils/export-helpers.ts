import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { GeneratedContent } from "@/types/study-guide";

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const downloadMarkdown = (generatedContent: GeneratedContent) => {
    const md = generatedContent.content;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-${generatedContent.type}.md`);
};

export const exportDocx = async (generatedContent: GeneratedContent) => {
    const md = generatedContent.content;
    const lines = md.split(/\r?\n/);

    const paragraphs: Paragraph[] = lines.map((line) => {
        if (/^#\s+/.test(line))
            return new Paragraph({ text: line.replace(/^#\s+/, ''), heading: HeadingLevel.TITLE });
        if (/^##\s+/.test(line))
            return new Paragraph({ text: line.replace(/^##\s+/, ''), heading: HeadingLevel.HEADING_1 });
        if (/^###\s+/.test(line))
            return new Paragraph({ text: line.replace(/^###\s+/, ''), heading: HeadingLevel.HEADING_2 });
        return new Paragraph(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
    });

    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-${generatedContent.type}.docx`);
};

export const exportPDF = (generatedContent: GeneratedContent, onError: (message: string) => void) => {
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    const raw = generatedContent.content;

    const escapeHtml = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
        onError('Allow popups to print/export PDF.');
        return;
    }

    const styles = `
    body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    .meta { color: #6b7280; margin-bottom: 16px; }
    pre { white-space: pre-wrap; word-wrap: break-word; font: inherit; line-height: 1.5; }
    @media print { body { margin: 0.5in; } }
  `;

    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${base}-${generatedContent.type}</title><style>${styles}</style></head><body>
    <h1>Study Guide (${generatedContent.type})</h1>
    <div class="meta">Source: ${base}</div>
    <pre>${escapeHtml(raw)}</pre>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
    w.document.close();
};

export const copyToClipboard = async (
    text: string,
    contentRef: React.RefObject<HTMLDivElement>
): Promise<boolean> => {
    // Try modern clipboard API
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch { }

    // Try execCommand with textarea
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) return true;
    } catch { }

    // Try selecting content directly
    try {
        if (contentRef.current) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(contentRef.current);
            selection?.removeAllRanges();
            selection?.addRange(range);
            const ok = document.execCommand('copy');
            selection?.removeAllRanges();
            if (ok) return true;
        }
    } catch { }

    return false;
};
