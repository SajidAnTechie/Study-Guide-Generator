import fs from "fs";
import multer from "multer";
import { RequestHandler } from "express";
import { createWorker } from "tesseract.js";
import { RAGService } from "../langchain/ragService";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'text/markdown', 'text/plain'];
    const allowedExtensions = ['.pdf', '.png', '.md', '.txt'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and Markdown files are allowed.'));
    }
  }
});

// Parse content from different file types
async function parseFileContent(file: Express.Multer.File): Promise<string> {
  const filePath = file.path;
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  try {
    switch (fileExtension) {
      case '.pdf':
        // Use pdf2json for pure JavaScript PDF text extraction
        const PDFParser = (await import('pdf2json')).default;

        return new Promise((resolve, reject) => {
          const pdfParser = new (PDFParser as any)();

          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error('PDF parsing error:', errData);
            // Fallback message if PDF can't be parsed
            resolve(`PDF file: ${file.originalname} (${Math.round(fs.statSync(filePath).size / 1024)}KB) - Text extraction failed. Please ensure the PDF contains readable text or try converting to text format first.`);
          });

          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              let text = '';

              // Extract text from all pages
              if (pdfData.Pages) {
                for (const page of pdfData.Pages) {
                  if (page.Texts) {
                    for (const textElement of page.Texts) {
                      if (textElement.R) {
                        for (const textRun of textElement.R) {
                          if (textRun.T) {
                            // Decode URI encoded text
                            const decodedText = decodeURIComponent(textRun.T);
                            text += decodedText + ' ';
                          }
                        }
                      }
                    }
                  }
                  text += '\n'; // Add newline between pages
                }
              }

              if (text.trim().length === 0) {
                resolve(`PDF file: ${file.originalname} - No readable text content found. The PDF might be image-based or protected.`);
              } else {
                resolve(text.trim());
              }
            } catch (error) {
              console.error('Error processing PDF data:', error);
              resolve(`PDF file: ${file.originalname} - Error processing content.`);
            }
          });

          // Load and parse the PDF file
          pdfParser.loadPDF(filePath);
        });

      case '.png':
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(filePath);
        await worker.terminate();
        return text;

      case '.md':
      case '.txt':
        return fs.readFileSync(filePath, 'utf-8');

      default:
        throw new Error('Unsupported file type');
    }
  } finally {
    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

export const handleStudyGuideGeneration: RequestHandler = async (req, res) => {
  console.log('Study guide generation request received');

  try {
    const { type } = req.body;
    const apiKey = req.body.apiKey || process.env.VITE_OPENAI_API_KEY_1;
    const model = process.env.VITE_OPENAI_MODEL || 'gpt-4.1-nano';
    const file = req.file;

    console.log('Request details:', {
      type,
      hasFile: !!file,
      hasApiKey: !!apiKey,
      filename: file?.originalname,
    });

    if (!file) {
      console.log('Error: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!type) {
      console.log('Error: Study guide type not specified');
      return res.status(400).json({ error: 'Study guide type not specified' });
    }

    if (!apiKey) {
      console.log('Error: OpenAI API key not provided');
      return res.status(400).json({ error: 'OpenAI API key not provided' });
    }

    // Parse file content
    console.log('Starting file parsing...');
    let content: string;
    try {
      content = await parseFileContent(file);
      console.log('File parsed successfully, content length:', content.length);
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return res.status(400).json({
        error: 'Failed to parse file content. Please ensure the file is valid and readable.'
      });
    }

    if (!content || content.trim().length === 0) {
      console.log('Error: No readable content found in file');
      return res.status(400).json({
        error: 'No readable content found in the file. Please check if the file contains text.'
      });
    }

    let generatedContent: string;
    let ragService: RAGService | null = null;

    console.log(`Initializing RAG with model: ${model}`);
    ragService = new RAGService(apiKey, model);

    if (!ragService) {
      throw new Error('Failed to initialize RAG service');
    }

    // Generate using RAG
    generatedContent = await ragService.generateWithRAG(content, type, {
      filename: file.originalname,
      uploadedAt: Date.now(),
    });

    console.log('Study guide generated successfully, content length:', generatedContent.length);

    // Return successful response
    res.json({
      success: true,
      content: generatedContent,
      type: type,
      filename: file.originalname,
    });

  } catch (error: any) {
    console.error('Study guide generation error:', error);

    // Handle OpenAI API errors specifically
    if (error.status === 401) {
      return res.status(401).json({
        error: 'Invalid OpenAI API key. Please check your API key and try again.'
      });
    }

    if (error.status === 403 || error.code === 'model_not_found') {
      return res.status(403).json({
        error: 'Your OpenAI API key does not have access to the required models. Please ensure your API key has access to GPT models or upgrade your OpenAI plan.'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'OpenAI API rate limit exceeded. Please try again later.'
      });
    }

    if (error.status === 413) {
      return res.status(413).json({
        error: 'Content too large. Please try with a smaller file.'
      });
    }

    // Handle specific error types
    if (error.message && error.message.includes('API key')) {
      return res.status(401).json({
        error: 'OpenAI API key issue: ' + error.message
      });
    }

    if (error.message && error.message.includes('parsing')) {
      return res.status(400).json({
        error: 'File parsing failed: ' + error.message
      });
    }

    // Generic error response with more details for debugging
    res.status(500).json({
      error: error.message || 'An error occurred while generating the study guide. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export the upload middleware to be used in the main router
export const uploadMiddleware = upload.single('file');
