import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { parseOutline } from "@/utils/content-parsers";
import { getCategoryIcon } from "@/utils/text-helpers";

interface OutlineViewProps {
    content: string;
}

export function OutlineView({ content }: OutlineViewProps) {
    const sections = parseOutline(content);

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
                                                    <li
                                                        key={j}
                                                        className="flex items-start gap-2 p-2 rounded-md bg-slate-50 border border-slate-200"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1" />
                                                        <div className="prose prose-sm max-w-none">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                                            >
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
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
