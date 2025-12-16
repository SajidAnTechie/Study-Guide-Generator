import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { extractKeyPoints } from "@/utils/content-parsers";
import { emphasizeKeywords, getPointIcon } from "@/utils/text-helpers";

interface KeyPointsViewProps {
    content: string;
}

export function KeyPointsView({ content }: KeyPointsViewProps) {
    const { bullets } = extractKeyPoints(content);

    return (
        <Card className="border-l-4 border-l-green-500">
            <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                    <ListChecks className="w-5 h-5" />
                    Key Points
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <ul className="space-y-3">
                    {bullets.map((bullet, idx) => (
                        <li
                            key={idx}
                            className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                            <span className="text-xl leading-5 mt-0.5 flex-shrink-0">
                                {getPointIcon(bullet.title || bullet.description)}
                            </span>
                            <div className="text-slate-800 flex-1 min-w-0">
                                {bullet.title && (
                                    <div className="font-bold text-slate-900 mb-1.5">
                                        {emphasizeKeywords(bullet.title)}
                                    </div>
                                )}
                                <div className={bullet.title ? "text-slate-700 leading-relaxed" : "font-medium"}>
                                    <div className="prose prose-sm max-w-none prose-slate">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                        >
                                            {bullet.description}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
