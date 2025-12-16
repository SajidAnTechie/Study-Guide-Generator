import { useState } from "react";
import { StudyGuideType, GeneratedContent } from "@/types/study-guide";

interface UseStudyGuideGeneratorOptions {
    onSuccess: (message: string) => void;
    onError: (title: string, description: string) => void;
}

export function useStudyGuideGenerator({ onSuccess, onError }: UseStudyGuideGeneratorOptions) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const generateStudyGuide = async (
        file: File,
        type: StudyGuideType
    ): Promise<GeneratedContent | null> => {
        setIsGenerating(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

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

            console.log(`content from openAI ${type}........`, JSON.stringify(result.content, null, 2));

            onSuccess("Your study materials are ready.");

            return {
                type,
                content: result.content,
                filename: file.name
            };

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

            onError(title, description);
            return null;
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    return {
        isGenerating,
        progress,
        generateStudyGuide
    };
}
