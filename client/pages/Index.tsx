import { useState, useCallback, useRef } from "react";
import { Lightbulb, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { StudyGuideType, GeneratedContent } from "@/types/study-guide";
import { STUDY_GUIDE_OPTIONS, ACCEPTED_FILE_FORMATS } from "@/constants/study-guide-options";
import { validateFile } from "@/utils/file-validation";
import { downloadMarkdown, exportDocx, exportPDF, copyToClipboard } from "@/utils/export-helpers";
import { FileUploadZone } from "@/components/FileUploadZone";
import { StudyGuideTypeSelector } from "@/components/StudyGuideTypeSelector";
import { GeneratedContentDisplay } from "@/components/GeneratedContentDisplay";
import { useStudyGuideGenerator } from "@/hooks/useStudyGuideGenerator";

export default function Index() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<StudyGuideType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement | null>(null);

  const { isGenerating, progress, generateStudyGuide } = useStudyGuideGenerator({
    onSuccess: (message) => {
      toast({
        title: "Study guide generated!",
        description: message,
      });
    },
    onError: (title, description) => {
      toast({
        title,
        description,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = useCallback((file: File) => {
    const validation = validateFile(file);

    if (!validation.isValid && validation.error) {
      toast({
        title: validation.error.title,
        description: validation.error.description,
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

  const handleGenerate = async () => {
    if (!selectedFile || !selectedType) {
      toast({
        title: "Missing requirements",
        description: "Please select a file and study guide type.",
        variant: "destructive"
      });
      return;
    }

    const result = await generateStudyGuide(selectedFile, selectedType);
    if (result) {
      setGeneratedContent(result);
    }
  };

  const handleCopy = async () => {
    if (!generatedContent) return;

    const success = await copyToClipboard(generatedContent.content, contentRef);

    if (success) {
      toast({
        title: 'Copied to clipboard',
        description: 'Content copied. You can paste it anywhere.'
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Select and copy manually.',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadMarkdown = () => {
    if (generatedContent) {
      downloadMarkdown(generatedContent);
    }
  };

  const handleExportDocx = async () => {
    if (generatedContent) {
      await exportDocx(generatedContent);
    }
  };

  const handleExportPDF = () => {
    if (generatedContent) {
      exportPDF(generatedContent, (message) => {
        toast({
          title: 'Popup blocked',
          description: message,
          variant: 'destructive'
        });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyGen AI</h1>
                <p className="text-sm text-gray-500">Intelligent Study Guide Creator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transform Your Learning Materials
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Upload your textbooks, notes, or documents and instantly generate summaries, flashcards,
            quizzes, and more using advanced AI technology.
          </p>
          <div className="flex justify-center space-x-4 mb-8">
            {ACCEPTED_FILE_FORMATS.map((format) => (
              <Badge key={format.ext} variant="secondary" className="flex items-center space-x-1 px-3 py-1">
                <format.icon className="w-4 h-4" />
                <span>{format.ext}</span>
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 min-h-[600px]">
          <div className="space-y-6">
            <FileUploadZone
              selectedFile={selectedFile}
              onFileSelect={handleFileUpload}
              onFileRemove={() => setSelectedFile(null)}
              onDrop={handleDrop}
            />

            <StudyGuideTypeSelector
              options={STUDY_GUIDE_OPTIONS}
              selectedType={selectedType}
              onTypeSelect={setSelectedType}
            />

            <Button
              onClick={handleGenerate}
              disabled={!selectedFile || !selectedType || isGenerating}
              className="w-full h-12 text-lg"
              size="lg"
            >
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
                <p className="text-sm text-gray-600 text-center">
                  Processing your file and generating content...
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col h-full min-h-0">
            <Card className="flex-1 flex flex-col h-full min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Generated Study Material</CardTitle>
                <CardDescription>
                  Your AI-generated study content will appear here.
                </CardDescription>
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
                        <p className="text-lg font-medium text-gray-700">
                          Generating your study guide...
                        </p>
                        <p className="text-sm text-gray-500">
                          AI is analyzing your content and creating personalized study materials
                        </p>
                        <div className="flex items-center justify-center space-x-1 mt-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-0"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-75"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-150"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : generatedContent ? (
                  <GeneratedContentDisplay
                    ref={contentRef}
                    content={generatedContent}
                    onCopy={handleCopy}
                    onDownloadMarkdown={handleDownloadMarkdown}
                    onExportDocx={handleExportDocx}
                    onExportPDF={handleExportPDF}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-12 text-gray-500">
                      <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-float" />
                      <p className="text-lg font-medium">No content generated yet</p>
                      <p className="text-sm mt-1">
                        Upload a file and select a study guide type to get started.
                      </p>
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
