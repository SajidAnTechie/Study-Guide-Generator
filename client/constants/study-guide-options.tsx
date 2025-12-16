import {
    FileText,
    Image,
    Lightbulb,
    ListChecks,
    GraduationCap,
    HelpCircle,
} from "lucide-react";
import { StudyGuideOption, FileFormat } from "@/types/study-guide";

export const STUDY_GUIDE_OPTIONS: StudyGuideOption[] = [
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

export const ACCEPTED_FILE_FORMATS: FileFormat[] = [
    { ext: "PDF", icon: FileText, description: "Portable Document Format" },
    { ext: "PNG", icon: Image, description: "Portable Network Graphics" },
    { ext: "MD", icon: FileText, description: "Markdown files" }
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'text/markdown', 'text/plain'];
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.md', '.txt'];
