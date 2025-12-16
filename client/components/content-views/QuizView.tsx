import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

interface QuizViewProps {
    content: string;
}

export function QuizView({ content }: QuizViewProps) {
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
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </CardContent>
        </Card>
    );
}
