import { RequestHandler } from "express";
import multer from "multer";
import OpenAI from "openai";
import { createWorker } from "tesseract.js";
import fs from "fs";

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

// Generate study guide prompts based on type
function getPromptForType(type: string, content: string): string {
  const basePrompt = `Based on the following content, generate a well-structured ${type}:

Content:
${content}

`;

  switch (type) {
    case 'summary':
      return basePrompt + `Please provide a comprehensive but concise summary that captures the main ideas, key concepts, and important details. The summary should be well-organized and easy to understand.`;

    case 'points':
      return basePrompt + `Please create a bullet-point list of the most important key ideas and concepts. Each point should be clear, concise, and capture essential information. Format each point on a new line starting with a bullet or dash.`;

    case 'flashcards':
      return basePrompt + `Please create flashcards in a question and answer format. Each flashcard should test understanding of key concepts. Format each flashcard as:

Question: [Question here]
Answer: [Answer here]

Separate each flashcard with a blank line. Create 10-15 flashcards covering the most important topics.`;

    case 'quiz':
      return basePrompt + `Please create a comprehensive quiz with multiple-choice and short-answer questions. Include:

1. Multiple choice questions (with 4 options each, indicate correct answer)
2. Short answer questions
3. True/False questions

Make sure to cover all major topics and concepts. Format questions clearly and provide variety in question types.`;

    case 'outline':
      return basePrompt + `Please create a detailed hierarchical outline that organizes the content into logical sections and subsections. Use proper formatting with:

I. Major topics
   A. Subtopics
      1. Key points
         a. Supporting details

The outline should capture the structure and flow of the material comprehensively.`;

    default:
      return basePrompt + `Please organize and present this information in a clear, educational format.`;
  }
}

export const handleStudyGuideGeneration: RequestHandler = async (req, res) => {
  console.log('Study guide generation request received');

  try {
    const { type } = req.body;
    const apiKey = req.body.apiKey || process.env.VITE_OPENAI_API_KEY;
    const file = req.file;

    console.log('Request details:', {
      type,
      hasFile: !!file,
      hasApiKey: !!apiKey,
      filename: file?.originalname
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

    // Truncate content if too long (to avoid token limits)
    const maxLength = 12000; // Conservative limit for GPT context
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + "\n\n[Content truncated due to length...]";
    }

    // Initialize OpenAI with provided API key
    console.log('Initializing OpenAI client...');
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Generate study guide using OpenAI
    console.log('Generating prompt for type:', type);
    const prompt = getPromptForType(type, content);
    console.log('Prompt length:', prompt.length);

    console.log('Calling OpenAI API...');

    // Try multiple models in order of preference
    let completion;
    const models = ["gpt-4.1-nano-2025-04-14", "gpt-4o-mini", "gpt-3.5-turbo", "gpt-4o"];
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert educational assistant that creates high-quality study materials. Your responses should be well-formatted, accurate, and pedagogically sound."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        });
        console.log(`Successfully used model: ${model}`);
        break; // If successful, break out of the loop
      } catch (modelError: any) {
        console.log(`Model ${model} failed:`, modelError.message);
        lastError = modelError;
        if (modelError.status !== 403 && modelError.code !== 'model_not_found') {
          // If it's not a model access issue, throw immediately
          throw modelError;
        }
        // Continue to next model if it's a model access issue
      }
    }

    // If all models failed, throw the last error
    if (!completion) {
      throw lastError || new Error('All models failed');
    }

    console.log('OpenAI API call completed successfully');
    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      console.log('Error: No content generated by OpenAI');
      return res.status(500).json({ error: 'Failed to generate study guide content' });
    }

    console.log('Study guide generated successfully, content length:', generatedContent.length);

    // Return successful response
    res.json({
      success: true,
      content: generatedContent,
      type: type,
      filename: file.originalname,
      usage: completion.usage
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
