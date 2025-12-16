import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { parseFlashcards } from "@/utils/content-parsers";

interface FlashcardsViewProps {
    content: string;
}

export function FlashcardsView({ content }: FlashcardsViewProps) {
    const flashcards = parseFlashcards(content);

    return (
        <>
            {flashcards.map((flashcard, index) => (
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
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                    >
                                        {flashcard.question}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                            <div className="text-xs font-medium text-blue-600 mb-1">ANSWER</div>
                            <div className="text-gray-700 leading-relaxed">
                                <div className="prose prose-sm max-w-none prose-gray">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                    >
                                        {flashcard.answer}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </>
    );
}
