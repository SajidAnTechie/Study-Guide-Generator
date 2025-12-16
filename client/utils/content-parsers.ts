import { OutlineSection, KeyPoint } from "@/types/study-guide";

export const parseOutline = (text: string): OutlineSection[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Remove instruction text
    const cleanedLines = lines.filter(line =>
        !line.toLowerCase().includes('format using this structure') &&
        !line.toLowerCase().includes('requirements:') &&
        !line.toLowerCase().includes('use roman numerals') &&
        !line.toLowerCase().includes('use capital letters') &&
        !line.toLowerCase().includes('use numbers') &&
        !line.toLowerCase().includes('organize logically') &&
        !line.toLowerCase().includes('include brief') &&
        !line.toLowerCase().includes('capture the flow') &&
        !line.toLowerCase().includes('use proper markdown') &&
        !line.toLowerCase().startsWith('outline:') &&
        !line.toLowerCase().startsWith('- use') &&
        !line.toLowerCase().startsWith('- include') &&
        !line.toLowerCase().startsWith('- capture') &&
        !line.toLowerCase().startsWith('- organize')
    );

    const sections: OutlineSection[] = [];
    let current: OutlineSection | null = null;
    let currentSub: { title: string; points: string[] } | null = null;

    // Pattern for main topics: # I. Title or # I. Title (with Roman numerals)
    const mainTopicRe = /^#\s+([IVX]+)\.\s+(.+)$/;
    // Pattern for subtopics: ## A. Title or ## A. Title (with capital letters)
    const subtopicRe = /^##\s+([A-Z])\.\s+(.+)$/;
    // Pattern for key points: 1. Text or just numbered items
    const keyPointRe = /^(\d+)\.\s+(.+)$/;

    for (const line of cleanedLines) {
        // Check for main topic (e.g., # I. Main Topic)
        const mainMatch = line.match(mainTopicRe);
        if (mainMatch) {
            if (current) sections.push(current);
            current = { title: `${mainMatch[1]}. ${mainMatch[2]}`, subtopics: [] };
            currentSub = null;
            continue;
        }

        // Check for subtopic (e.g., ## A. Subtopic)
        const subMatch = line.match(subtopicRe);
        if (subMatch) {
            if (!current) {
                current = { title: 'Outline', subtopics: [] };
            }
            currentSub = { title: `${subMatch[1]}. ${subMatch[2]}`, points: [] };
            current.subtopics.push(currentSub);
            continue;
        }

        // Check for key point (e.g., 1. Key point text)
        const pointMatch = line.match(keyPointRe);
        if (pointMatch) {
            if (!current) {
                current = { title: 'Outline', subtopics: [] };
            }
            if (!currentSub) {
                currentSub = { title: 'Details', points: [] };
                current.subtopics.push(currentSub);
            }
            currentSub.points.push(pointMatch[2].trim());
            continue;
        }
    }

    if (current) sections.push(current);

    return sections;
};

export const extractKeyPoints = (text: string): { bullets: KeyPoint[] } => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Remove instruction text if present
    const cleanedLines = lines.filter(line =>
        !line.toLowerCase().includes('format as a bullet') &&
        !line.toLowerCase().includes('brief explanation') &&
        !line.toLowerCase().includes('example:')
    );

    const bullets: KeyPoint[] = [];

    for (const line of cleanedLines) {
        // Match pattern: - **Title**: Description or **Title**: Description
        const boldMatch = line.match(/^[-*]?\s*\*\*([^*]+)\*\*:\s*(.+)$/);

        if (boldMatch) {
            bullets.push({
                title: boldMatch[1].trim(),
                description: boldMatch[2].trim()
            });
        } else if (line.startsWith('-') || line.startsWith('*')) {
            // Fallback for simple bullet points
            const cleaned = line.replace(/^[-*]\s*/, '').trim();
            // Check if it contains a colon to split title/description
            const colonIndex = cleaned.indexOf(':');
            if (colonIndex > 0 && colonIndex < 100) {
                bullets.push({
                    title: cleaned.substring(0, colonIndex).replace(/\*\*/g, '').trim(),
                    description: cleaned.substring(colonIndex + 1).trim()
                });
            } else {
                bullets.push({
                    title: '',
                    description: cleaned
                });
            }
        }
    }

    // If no structured bullets found, fall back to simple line splitting
    if (bullets.length === 0) {
        cleanedLines.forEach(line => {
            const cleaned = line.replace(/^[-*]\s*/, '').trim();
            if (cleaned) {
                bullets.push({
                    title: '',
                    description: cleaned
                });
            }
        });
    }

    return { bullets };
};

export const parseFlashcards = (content: string) => {
    const flashcards: { question: string; answer: string }[] = [];

    // Remove instruction text
    let cleanedContent = content;
    const instructionPatterns = [
        /Format each flashcard as:[\s\S]*?Flashcards:/i,
        /Requirements:[\s\S]*?(?=\*\*Question:\*\*)/i,
        /^.*?(?:format|create|questions should|answers should|vary difficulty|separate each).*$/gim,
    ];

    instructionPatterns.forEach(pattern => {
        cleanedContent = cleanedContent.replace(pattern, '');
    });

    // Split by horizontal lines (---) which separate flashcards
    const cards = cleanedContent.split(/\n\s*---\s*\n/).filter(Boolean);

    for (const card of cards) {
        // Match pattern: **Question:** **[text]** followed by **Answer:** [text]
        const match = card.match(/\*\*Question:\*\*\s*\*\*(.+?)\*\*\s*\*\*Answer:\*\*\s*([\s\S]+?)$/i);

        if (match) {
            const question = match[1].trim();
            const answer = match[2].trim();

            if (question && answer && question.length > 2 && answer.length > 1) {
                flashcards.push({ question, answer });
            }
        } else {
            // Fallback: try simpler patterns
            const simpleMatch = card.match(/\*\*Question:\*\*\s*(.+?)\s*\*\*Answer:\*\*\s*([\s\S]+?)$/i);
            if (simpleMatch) {
                let question = simpleMatch[1]
                    .replace(/^\*\*/, '')
                    .replace(/\*\*$/, '')
                    .trim();
                const answer = simpleMatch[2].trim();

                if (question && answer && question.length > 2 && answer.length > 1) {
                    flashcards.push({ question, answer });
                }
            } else {
                // Try even simpler pattern without bold markers
                const basicMatch = card.match(/Question:\s*(.+?)\s*Answer:\s*([\s\S]+?)$/i);
                if (basicMatch) {
                    const question = basicMatch[1].replace(/\*\*/g, '').trim();
                    const answer = basicMatch[2].trim();

                    if (question && answer && question.length > 2 && answer.length > 1) {
                        flashcards.push({ question, answer });
                    }
                }
            }
        }
    }

    return flashcards;
};
