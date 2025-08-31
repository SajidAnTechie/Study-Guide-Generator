import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Image, Lightbulb, ListChecks, GraduationCap, HelpCircle, FileX, Cloud, Database, Shield, Globe, CheckCircle2, Pin, Copy, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

type StudyGuideType = "summary" | "points" | "flashcards" | "quiz" | "outline";

interface StudyGuideOption {
  id: StudyGuideType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface GeneratedContent {
  type: StudyGuideType;
  content: string;
  filename: string;
}

export default function Index() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<StudyGuideType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Clean content by removing OpenAI's reasoning and meta-commentary
  const cleanContent = (content: string, type: StudyGuideType): string => {
    if (!content) return '';

    let cleaned = content;

    // Remove common OpenAI reasoning/preamble lines
    const preamblePatterns = [
      /^\s*Here (?:is|are)\b[^\n]*\n?/i,
      /^\s*I'll\b[^\n]*\n?/i,
      /^\s*I can\b[^\n]*\n?/i,
      /^\s*Let me\b[^\n]*\n?/i,
      /^\s*Based on\b[^\n]*\n?/i,
      /^\s*Given\b[^\n]*\n?/i,
      /^\s*It appears\b[^\n]*\n?/i,
      /^\s*Note:\s*This\b[^\n]*\n?/i,
    ];
    preamblePatterns.forEach((rx) => {
      cleaned = cleaned.replace(rx, '');
    });

    // If flashcards: keep from first occurrence of Question/Q/Answer patterns
    if (type === 'flashcards') {
      const idx = cleaned.search(/\b(Question:|Q:|\d+\.|\*\s|\-\s)/i);
      if (idx > 0) cleaned = cleaned.slice(idx);
    } else {
      // For other types: start from first structural marker (heading, list, number)
      const idx = cleaned.search(/^(#|\*\s|\-\s|\d+\.|I\.|II\.)/m);
      if (idx > 0) cleaned = cleaned.slice(idx);
    }

    // Remove common trailing assistant disclaimers
    cleaned = cleaned.replace(/(?:\n|\s)*(?:I hope this helps|Let me know if you need|Would you like me|Feel free to ask)[\s\S]*$/i, '').trim();

    // Normalize excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  };

  const studyGuideOptions: StudyGuideOption[] = [
    {
      id: "summary",
      title: "Summary",
      description: "Concise explanation of the text",
      icon: FileText,
      color: "bg-blue-100 text-blue-700 hover:bg-blue-200"
    },
    {
      id: "points",
      title: "Key Points",
      description: "Bullet-style breakdown of key ideas",
      icon: ListChecks,
      color: "bg-green-100 text-green-700 hover:bg-green-200"
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Question/answer style cards for active recall",
      icon: Lightbulb,
      color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
    },
    {
      id: "quiz",
      title: "Quiz",
      description: "Multiple-choice and short-answer questions",
      icon: HelpCircle,
      color: "bg-purple-100 text-purple-700 hover:bg-purple-200"
    },
    {
      id: "outline",
      title: "Outline",
      description: "Structured chapter/section overview",
      icon: GraduationCap,
      color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
    }
  ];

  const acceptedFormats = [
    { ext: "PDF", icon: FileText, description: "Portable Document Format" },
    { ext: "PNG", icon: Image, description: "Portable Network Graphics" },
    { ext: "MD", icon: FileText, description: "Markdown files" }
  ];

  const handleFileUpload = useCallback((file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'text/markdown', 'text/plain'];
    const allowedExtensions = ['.pdf', '.png', '.md', '.txt'];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, PNG, or Markdown file.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setGeneratedContent(null);
    toast({
      title: "File uploaded successfully",
      description: `${file.name} is ready for processing.`
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const generateStudyGuide = async () => {
    if (!selectedFile || !selectedType) {
      toast({
        title: "Missing requirements",
        description: "Please select a file and study guide type.",
        variant: "destructive"
      });
      return;
    }

    // if (!apiKey.trim()) {
    //   setShowApiKeyInput(true);
    //   toast({
    //     title: "API Key Required",
    //     description: "Please enter your OpenAI API key to continue.",
    //     variant: "destructive"
    //   });
    //   return;
    // }

    setIsGenerating(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);
      formData.append('apiKey', apiKey);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/generate-study-guide', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        let errorMessage = 'Failed to generate study guide';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.content) {
        throw new Error('No content received from server');
      }

      setGeneratedContent({
        type: selectedType,
        content: result.content,
        filename: selectedFile.name
      });

      toast({
        title: "Study guide generated!",
        description: "Your study materials are ready.",
      });

    } catch (error: any) {
      console.error('Error generating study guide:', error);

      let title = "Generation failed";
      let description = error.message || "There was an error generating your study guide. Please try again.";

      if (error.message && error.message.includes("API key does not have access")) {
        title = "API Key Access Issue";
        description = "Your OpenAI API key doesn't have access to the required models. Please check your OpenAI plan and API key permissions.";
      } else if (error.message && error.message.includes("Invalid OpenAI API key")) {
        title = "Invalid API Key";
        description = "Please check your OpenAI API key and try again.";
      } else if (error.message && error.message.includes("rate limit")) {
        title = "Rate Limit Exceeded";
        description = "OpenAI API rate limit exceeded. Please try again in a few minutes.";
      }

      toast({
        title,
        description,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const getCategoryIcon = (title: string) => {
    const t = title.toLowerCase();
    if (/(security|iam|kms|guardduty|shield|waf|encryption)/i.test(t)) return <Shield className="w-4 h-4 text-red-500" />;
    if (/(database|rds|dynamodb|aurora|redshift|opensearch)/i.test(t)) return <Database className="w-4 h-4 text-emerald-600" />;
    if (/(network|vpc|subnet|route|gateway|load balancer|alb|nlb)/i.test(t)) return <Globe className="w-4 h-4 text-indigo-600" />;
    if (/(cloud|aws|ec2|lambda|compute|s3|storage)/i.test(t)) return <Cloud className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  type OutlinePoint = { title: string; points: string[] };
  type OutlineSection = { title: string; subtopics: OutlinePoint[] };

  const parseOutline = (text: string): OutlineSection[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sections: OutlineSection[] = [];
    let current: OutlineSection | null = null;
    let currentSub: OutlinePoint | null = null;

    const romanRe = /^(?:(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))\./i;

    for (const line of lines) {
      const lineNoBullet = line.replace(/^[-*]\s+/, '');
      if (romanRe.test(line) || /^#\s+/.test(line)) {
        if (current) sections.push(current);
        const title = line.replace(romanRe, '').replace(/^#\s+/, '').trim();
        current = { title, subtopics: [] };
        currentSub = null;
        continue;
      }
      const letter = /^([A-Z])\.?\s+(.*)/.exec(line);
      if (letter) {
        if (!current) {
          current = { title: letter[2], subtopics: [] };
        }
        currentSub = { title: letter[2].trim(), points: [] };
        current.subtopics.push(currentSub);
        continue;
      }
      const numbered = /^(\d+)\.?\s+(.*)/.exec(line) || /^[-*]\s+(.*)/.exec(line);
      if (numbered) {
        if (!current) {
          current = { title: 'Outline', subtopics: [] };
        }
        if (!currentSub) {
          currentSub = { title: 'Details', points: [] };
          current.subtopics.push(currentSub);
        }
        currentSub.points.push(numbered[2] ? numbered[2].trim() : numbered[1].trim());
      }
    }
    if (current) sections.push(current);
    return sections;
  };

  const extractKeyPoints = (text: string) => {
    const lines = text.split(/\r?\n/);
    const firstBulletIdx = lines.findIndex((l) => /^(\s*[-*]|\s*\d+\.)\s+/.test(l));
    const intro = firstBulletIdx > 0 ? lines.slice(0, firstBulletIdx).join('\n').trim() : '';
    const bulletLines = firstBulletIdx >= 0 ? lines.slice(firstBulletIdx) : lines;
    const bullets: string[] = [];
    let buf: string[] = [];
    for (const l of bulletLines) {
      if (/^(\s*[-*]|\s*\d+\.)\s+/.test(l)) {
        if (buf.length) bullets.push(buf.join(' ').trim());
        buf = [l.replace(/^(\s*[-*]|\s*\d+\.)\s+/, '').trim()];
      } else if (l.trim()) {
        buf.push(l.trim());
      }
    }
    if (buf.length) bullets.push(buf.join(' ').trim());
    return { intro, bullets };
  };

  const emphasizeKeywords = (text: string) => {
    const patterns = [
      /(aws|ec2|s3|lambda|cloudfront|rds|dynamodb|aurora|vpc|subnet|route|elb|alb|nlb|kms|iam|waf|shield|cost|optimi[sz]ation|security)/gi,
    ];
    let parts: React.ReactNode[] = [text];
    for (const rx of patterns) {
      const next: React.ReactNode[] = [];
      parts.forEach((p) => {
        if (typeof p !== 'string') { next.push(p); return; }
        let last = 0; let m: RegExpExecArray | null;
        while ((m = rx.exec(p))) {
          const [match] = m;
          const start = m.index;
          if (start > last) next.push(p.slice(last, start));
          next.push(<span className="font-semibold text-blue-700" key={`${match}-${start}`}>{match}</span>);
          last = start + match.length;
        }
        if (last < p.length) next.push(p.slice(last));
      });
      parts = next;
    }
    return parts;
  };

  const pointIconFor = (text: string) => {
    const t = text.toLowerCase();
    if (/(security|iam|kms|encryption|policy|permission)/.test(t)) return '🔒';
    if (/(cost|price|optimi|savings|budget)/.test(t)) return '💸';
    if (/(database|rds|dynamo|aurora|sql|nosql)/.test(t)) return '🗄️';
    if (/(network|vpc|subnet|gateway|route|cidr)/.test(t)) return '🌐';
    if (/(aws|cloud|ec2|s3|lambda)/.test(t)) return '☁️';
    return '✅';
  };

  const getCleaned = () => {
    if (!generatedContent) return '';
    return cleanContent(generatedContent.content, generatedContent.type);
  };

  const getRaw = () => {
    if (!generatedContent) return '';
    return generatedContent.content;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    const text = getRaw();

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard', description: 'Content copied. You can paste it anywhere.' });
      return;
    } catch { }

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
      if (ok) {
        toast({ title: 'Copied to clipboard', description: 'Content copied. You can paste it anywhere.' });
        return;
      }
    } catch { }

    try {
      if (contentRef.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(contentRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
        const ok = document.execCommand('copy');
        selection?.removeAllRanges();
        if (ok) {
          toast({ title: 'Copied to clipboard', description: 'Content copied. You can paste it anywhere.' });
          return;
        }
      }
    } catch { }

    toast({ title: 'Copy failed', description: 'Select and copy manually.', variant: 'destructive' });
  };

  const downloadMarkdown = () => {
    if (!generatedContent) return;
    const md = getRaw();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-${generatedContent.type}.md`);
  };

  const downloadText = () => {
    if (!generatedContent) return;
    const txt = getRaw();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-${generatedContent.type}.txt`);
  };

  const exportDocx = async () => {
    if (!generatedContent) return;
    const md = getRaw();
    const lines = md.split(/\r?\n/);

    const paragraphs: Paragraph[] = lines.map((line) => {
      if (/^#\s+/.test(line)) return new Paragraph({ text: line.replace(/^#\s+/, ''), heading: HeadingLevel.TITLE });
      if (/^##\s+/.test(line)) return new Paragraph({ text: line.replace(/^##\s+/, ''), heading: HeadingLevel.HEADING_1 });
      if (/^###\s+/.test(line)) return new Paragraph({ text: line.replace(/^###\s+/, ''), heading: HeadingLevel.HEADING_2 });
      return new Paragraph(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
    });

    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-${generatedContent.type}.docx`);
  };

  const exportPDF = () => {
    if (!generatedContent) return;
    const base = generatedContent.filename.replace(/\.[^.]+$/, '');
    const raw = getRaw();

    const escapeHtml = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      toast({ title: 'Popup blocked', description: 'Allow popups to print/export PDF.', variant: 'destructive' });
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

  const formatContent = (content: string, type: StudyGuideType) => {
    const cleanedContent = cleanContent(content, type);

    switch (type) {
      case 'flashcards': {
        const flashcards: { question: string; answer: string }[] = [];

        // Match multiple formats robustly, allowing inline or multiline
        const patterns = [
          /(Question:)([\s\S]*?)(?:\n|\s)+?(Answer:)([\s\S]*?)(?=\n\s*\n|\n\s*Question:|\n\s*Q:|$)/gi,
          /(Q:)([\s\S]*?)(?:\n|\s)+?(A:)([\s\S]*?)(?=\n\s*\n|\n\s*Q:|\n\s*Question:|$)/gi,
          /(?:^|\n)\s*\d+[\).]?\s+([\s\S]*?)(?:\s+)(Answer:|A:)\s*([\s\S]*?)(?=\n\s*\n|\n\s*\d+[\).]?|$)/gi,
        ];

        let consumed = new Array(cleanedContent.length).fill(false);

        for (const rx of patterns) {
          let m: RegExpExecArray | null;
          while ((m = rx.exec(cleanedContent))) {
            const full = m[0];
            const qRaw = (m[2] || m[1] || '').toString();
            const aRaw = (m[4] || m[3] || '').toString();

            let question = qRaw
              .replace(/^[\s\-*]+/, '')
              .replace(/\b(Answer:|A:)\b[\s\S]*$/i, '')
              .replace(/^\d+[\).]?\s*/, '')
              .trim();

            let answer = aRaw
              .replace(/^\s*-\s*/, '')
              .trim();

            if (question && answer && question.length > 2 && answer.length > 1) {
              flashcards.push({ question, answer });
              for (let i = m.index; i < m.index + full.length; i++) consumed[i] = true;
            }
          }
        }

        // Fallback: try to split by double newlines if nothing matched
        if (flashcards.length === 0) {
          const sections = cleanedContent.split(/\n\s*\n/);
          for (const section of sections) {
            const inlineQA = section.match(/(?:^|\n)\s*(?:\d+[\).]?\s*)?(?:Question:|Q:)\s*([\s\S]*?)\s*(?:Answer:|A:)\s*([\s\S]*)/i);
            if (inlineQA) {
              const q = inlineQA[1].replace(/\b(Answer:|A:)\b[\s\S]*$/i, '').trim();
              const a = inlineQA[2].trim();
              if (q && a) flashcards.push({ question: q, answer: a });
            }
          }
        }

        return flashcards.map((flashcard, index) => (
          <Card key={index} className="mb-4 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                Flashcard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">QUESTION</div>
                <div className="font-medium text-gray-900">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                      {flashcard.question}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <div className="text-xs font-medium text-blue-600 mb-1">ANSWER</div>
                <div className="text-gray-700 leading-relaxed">
                  <div className="prose prose-sm max-w-none prose-gray">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                      {flashcard.answer}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ));
      }
      case 'quiz':
        return (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-purple-600 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Quiz Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none prose-purple">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                  {cleanedContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
      case 'points': {
        const { intro, bullets } = extractKeyPoints(cleanedContent);
        return (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Key Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {intro && (
                <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-900 flex gap-2">
                  <Pin className="w-4 h-4 mt-0.5" />
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                      {intro}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              <ul className="space-y-2">
                {bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-lg leading-5">{pointIconFor(b)}</span>
                    <div className="text-slate-800">
                      <div className="font-medium">{emphasizeKeywords(b)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      }
      case 'summary':
        return (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Key Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                  {cleanedContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
      case 'outline': {
        const sections = parseOutline(cleanedContent);
        return (
          <div className="space-y-4">
            {sections.map((sec, i) => (
              <Card key={i} className="border-l-4 border-l-indigo-500 bg-white/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-indigo-700 flex items-center gap-2">
                    {getCategoryIcon(sec.title)}
                    <span className="font-semibold text-lg">{sec.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sec.subtopics.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {sec.subtopics.map((sub, idx) => (
                        <AccordionItem key={idx} value={`sub-${i}-${idx}`}>
                          <AccordionTrigger className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(sub.title)}
                              <span>{sub.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-2">
                              {sub.points.map((pt, j) => (
                                <li key={j} className="flex items-start gap-2 p-2 rounded-md bg-slate-50 border border-slate-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1" />
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                                      {pt}
                                    </ReactMarkdown>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="prose max-w-none prose-indigo">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                        {cleanedContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
      default:
        return (
          <Card>
            <CardContent className="pt-4">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                  {cleanedContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyGen AI</h1>
                <p className="text-sm text-gray-500">Intelligent Study Guide Creator</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-sm"
            >
              {apiKey ? "API Key Set" : "Set API Key"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showApiKeyInput && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">OpenAI API Key Required</CardTitle>
              <CardDescription className="text-orange-700">
                Enter your OpenAI API key to generate study materials. Your key is stored locally and not saved on our servers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Textarea
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button onClick={() => setShowApiKeyInput(false)} disabled={!apiKey.trim()}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Transform Your Learning Materials</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Upload your textbooks, notes, or documents and instantly generate summaries, flashcards,
            quizzes, and more using advanced AI technology.
          </p>
          <div className="flex justify-center space-x-4 mb-8">
            {acceptedFormats.map((format) => (
              <Badge key={format.ext} variant="secondary" className="flex items-center space-x-1 px-3 py-1">
                <format.icon className="w-4 h-4" />
                <span>{format.ext}</span>
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 min-h-[600px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload Your File</span>
                </CardTitle>
                <CardDescription>Drag and drop your PDF, PNG, or Markdown file, or click to browse.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 text-green-600 mx-auto" />
                      <p className="font-medium text-green-800">{selectedFile.name}</p>
                      <p className="text-sm text-green-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)} className="mt-2">
                        <FileX className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-700">Drop your file here, or click to browse</p>
                        <p className="text-sm text-gray-500 mt-1">PDF, PNG, or Markdown files up to 50MB</p>
                      </div>
                      <input type="file" accept=".pdf,.png,.md,.txt" onChange={handleFileInput} className="hidden" id="file-upload" />
                      <Button asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">Choose File</label>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Choose Study Guide Type</CardTitle>
                <CardDescription>Select the type of study material you'd like to generate.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {studyGuideOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedType(option.id)}
                        className={`p-4 rounded-lg border text-left transition-all ${selectedType === option.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-md ${option.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{option.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button onClick={generateStudyGuide} disabled={!selectedFile || !selectedType || isGenerating} className="w-full h-12 text-lg" size="lg">
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Generate Study Guide
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">Processing your file and generating content...</p>
              </div>
            )}
          </div>

          <div className="flex flex-col h-full min-h-0">
            <Card className="flex-1 flex flex-col h-full min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Generated Study Material</CardTitle>
                <CardDescription>Your AI-generated study content will appear here.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0">
                {isGenerating ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin animation-delay-75"></div>
                        <div className="absolute inset-4 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animation-delay-150"></div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-700">Generating your study guide...</p>
                        <p className="text-sm text-gray-500">AI is analyzing your content and creating personalized study materials</p>
                        <div className="flex items-center justify-center space-x-1 mt-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-0"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-75"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-150"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : generatedContent ? (
                  <div className="flex-1 flex flex-col space-y-4 overflow-hidden max-h-screen">
                    <div className="flex-shrink-0 flex items-center justify-between gap-3">
                      <Badge variant="outline" className="capitalize">{generatedContent.type}</Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopy} title="Copy">
                          <Copy className="w-4 h-4" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadMarkdown} title="Download Markdown">
                          <FileText className="w-4 h-4" /> .md
                        </Button>
                        {/* <Button variant="outline" size="sm" onClick={downloadText} title="Download Text">
                          <FileText className="w-4 h-4" /> .txt
                        </Button> */}
                        <Button variant="outline" size="sm" onClick={exportDocx} title="Export DOCX">
                          <FileText className="w-4 h-4" /> .docx
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportPDF} title="Export PDF">
                          <FileDown className="w-4 h-4" /> .pdf
                        </Button>
                      </div>
                    </div>
                    <div ref={contentRef} className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                      {formatContent(generatedContent.content, generatedContent.type)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-12 text-gray-500">
                      <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-float" />
                      <p className="text-lg font-medium">No content generated yet</p>
                      <p className="text-sm mt-1">Upload a file and select a study guide type to get started.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
