export type StudyGuideType = "summary" | "points" | "flashcards" | "quiz" | "outline";

export interface StudyGuideOption {
    id: StudyGuideType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

export interface GeneratedContent {
    type: StudyGuideType;
    content: string;
    filename: string;
}

export interface FileFormat {
    ext: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

export interface Flashcard {
    question: string;
    answer: string;
}

export interface KeyPoint {
    title: string;
    description: string;
}

export interface OutlinePoint {
    title: string;
    points: string[];
}

export interface OutlineSection {
    title: string;
    subtopics: OutlinePoint[];
}
