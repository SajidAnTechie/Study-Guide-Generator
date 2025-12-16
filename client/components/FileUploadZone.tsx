import { Upload, FileText, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FileUploadZoneProps {
    selectedFile: File | null;
    onFileSelect: (file: File) => void;
    onFileRemove: () => void;
    onDrop: (e: React.DragEvent) => void;
}

export function FileUploadZone({ selectedFile, onFileSelect, onFileRemove, onDrop }: FileUploadZoneProps) {
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Upload Your File</span>
                </CardTitle>
                <CardDescription>
                    Drag and drop your PDF, PNG, or Markdown file, or click to browse.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${selectedFile
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {selectedFile ? (
                        <div className="space-y-2">
                            <FileText className="w-12 h-12 text-green-600 mx-auto" />
                            <p className="font-medium text-green-800">{selectedFile.name}</p>
                            <p className="text-sm text-green-600">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onFileRemove}
                                className="mt-2"
                            >
                                <FileX className="w-4 h-4 mr-2" />
                                Remove
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                            <div>
                                <p className="text-lg font-medium text-gray-700">
                                    Drop your file here, or click to browse
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    PDF, PNG, or Markdown files up to 50MB
                                </p>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.png,.md,.txt"
                                onChange={handleFileInput}
                                className="hidden"
                                id="file-upload"
                            />
                            <Button asChild>
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    Choose File
                                </label>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
