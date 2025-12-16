import { ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from "@/constants/study-guide-options";

export interface FileValidationResult {
    isValid: boolean;
    error?: {
        title: string;
        description: string;
    };
}

export const validateFile = (file: File): FileValidationResult => {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
        return {
            isValid: false,
            error: {
                title: "Invalid file type",
                description: "Please upload a PDF, PNG, or Markdown file."
            }
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            isValid: false,
            error: {
                title: "File too large",
                description: "Please upload a file smaller than 50MB."
            }
        };
    }

    return { isValid: true };
};
