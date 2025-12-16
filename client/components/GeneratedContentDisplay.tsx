import { forwardRef } from "react";
import { Copy, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedContent, StudyGuideType } from "@/types/study-guide";
import { FlashcardsView } from "./content-views/FlashcardsView";
import { QuizView } from "./content-views/QuizView";
import { KeyPointsView } from "./content-views/KeyPointsView";
import { SummaryView } from "./content-views/SummaryView";
import { OutlineView } from "./content-views/OutlineView";

interface GeneratedContentDisplayProps {
    content: GeneratedContent;
    onCopy: () => void;
    onDownloadMarkdown: () => void;
    onExportDocx: () => void;
    onExportPDF: () => void;
}

export const GeneratedContentDisplay = forwardRef<HTMLDivElement, GeneratedContentDisplayProps>(
    ({ content, onCopy, onDownloadMarkdown, onExportDocx, onExportPDF }, ref) => {
        const formatContent = (type: StudyGuideType) => {
            const cleanedContent = content.content;

            switch (type) {
                case 'flashcards':
                    return <FlashcardsView content={cleanedContent} />;
                case 'quiz':
                    return <QuizView content={cleanedContent} />;
                case 'points':
                    return <KeyPointsView content={cleanedContent} />;
                case 'summary':
                    return <SummaryView content={cleanedContent} />;
                case 'outline':
                    return <OutlineView content={cleanedContent} />;
                default:
                    return <SummaryView content={cleanedContent} />;
            }
        };

        return (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden max-h-screen">
                <div className="flex-shrink-0 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="capitalize">
                        {content.type}
                    </Badge>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onCopy} title="Copy">
                            <Copy className="w-4 h-4" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={onDownloadMarkdown} title="Download Markdown">
                            <FileText className="w-4 h-4" /> .md
                        </Button>
                        <Button variant="outline" size="sm" onClick={onExportDocx} title="Export DOCX">
                            <FileText className="w-4 h-4" /> .docx
                        </Button>
                        <Button variant="outline" size="sm" onClick={onExportPDF} title="Export PDF">
                            <FileDown className="w-4 h-4" /> .pdf
                        </Button>
                    </div>
                </div>
                <div
                    ref={ref}
                    className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0"
                >
                    {formatContent(content.type)}
                </div>
            </div>
        );
    }
);

GeneratedContentDisplay.displayName = "GeneratedContentDisplay";
