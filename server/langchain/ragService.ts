import { ChatOpenAI } from "@langchain/openai";
import { VectorStoreManager } from "./vectorStore";
import { Document } from "@langchain/core/documents";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * RAG Service for enhanced study guide generation
 * Uses vector similarity search to retrieve relevant content and generate focused responses
 */
export class RAGService {
    private llm: ChatOpenAI;
    private vectorStoreManager: VectorStoreManager;

    constructor(apiKey: string, modelName: string = "gpt-4o-mini") {
        // Initialize LLM
        this.llm = new ChatOpenAI({
            model: modelName,
            apiKey: apiKey,
            temperature: 0.7,
            maxTokens: 2000,
        });

        // Initialize vector store manager
        this.vectorStoreManager = new VectorStoreManager(apiKey, "text-embedding-ada-002");
    }

    /**
     * Create improved prompts for each study guide type using RAG context
     */
    private getRAGPromptTemplate(type: string): PromptTemplate {
        const baseContext = `You are an expert educational assistant creating high-quality study materials.
Use ONLY the provided context to generate accurate and relevant content.
If the context doesn't contain enough information, acknowledge this limitation.

Context from document:
{context}

---`;

        switch (type) {
            case "summary":
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Create a comprehensive but concise summary of the above content.

Requirements:
- Capture main ideas and key concepts
- Maintain logical flow and organization
- Be clear and easy to understand
- Highlight important details
- Keep it focused and relevant

Summary:`
                );

            case "points":
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Extract the most important key points and concepts from the above content.

Format as a bullet-point list in markdown:
- **Key Point**: Brief explanation or context
- **Key Point**: Brief explanation or context
- etc.

Requirements:
- Use bullet points (-)
- Bold the main point
- Add brief elaboration after each point
- Ensure each point is actionable and captures essential information
- Prioritize the most important concepts

Key Points:`
                );

            case "flashcards":
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Create educational flashcards from the above content.

Format each flashcard as:
**Question:** **[Question text]**
**Answer:** [Detailed answer with explanation]

---

Requirements:
- Create 10-15 flashcards covering major concepts
- Questions should test understanding, not just memorization
- Answers should be clear and educational
- Vary difficulty levels (mix easy, medium, and hard questions)
- Separate each flashcard with a horizontal line (---)

Flashcards:`
                );

            case "quiz":
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Create a comprehensive quiz from the above content.

Format each question as follows:

**Multiple Choice Questions:**
**Q1:** **[Question text]**

a) [Option 1]
b) [Option 2]
c) [Option 3]
d) [Option 4]

**Answer:** [Correct option letter]

**Explanation:** [Why this is correct]

**Short Answer Questions:**
**Q[number]:** **[Question text]**

**Answer:** [Expected answer]

**True/False Questions:**
**Q[number]:** **[Statement]**

**Answer:** [True/False]

**Explanation:** [Why this is the answer]

Requirements:
- Include 10-15 questions total
- Mix question types (60% Multiple Choice, 25% Short Answer, 15% True/False)
- Vary difficulty levels
- Provide clear explanations for all answers
- Cover all major topics
- Separate each question with a new line and horizontal line (---) 

Quiz:`
                );

            case "outline":
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Create a detailed hierarchical outline of the above content.

Format using this structure:

# I. Main Topic
   ## A. Subtopic
      1. Key point
      2. Key point
   ## B. Subtopic
      1. Key point

# II. Main Topic
   ## A. Subtopic
      1. Key point

Requirements:
- Use Roman numerals (I, II, III) for main topics with # heading
- Use capital letters (A, B, C) for subtopics with ## heading
- Use numbers (1, 2, 3) for key points
- Organize logically by topic and subtopic
- Include brief descriptions for each section
- Capture the flow and structure of material
- Use proper markdown heading levels

Outline:`
                );

            default:
                return PromptTemplate.fromTemplate(
                    baseContext +
                    `
Organize and present this information in a clear, educational format.

Content:`
                );
        }
    }

    /**
     * Generate study guide using RAG approach
     * @param content - Full document content
     * @param type - Study guide type
     * @param metadata - Optional metadata about the document
     * @returns Generated study guide content
     */
    async generateWithRAG(
        content: string,
        type: string,
        metadata: Record<string, any> = {}
    ): Promise<string> {
        try {
            console.log(`Starting RAG generation for type: ${type}`);

            // Step 1: Create vector store from document content
            const vectorStore = await this.vectorStoreManager.createVectorStore(content, {
                type,
                ...metadata,
            });

            // Step 2: Determine the query based on study guide type
            const retrievalQuery = this.getRetrievalQuery(type);
            console.log(`Retrieval query: ${retrievalQuery}`);

            // Step 3: Retrieve relevant chunks using similarity search
            const relevantDocs = await this.vectorStoreManager.similaritySearch(
                vectorStore,
                retrievalQuery,
                6 // Retrieve top 6 most relevant chunks
            );

            // Combine retrieved chunks into context
            const context = this.formatRetrievedContext(relevantDocs);
            console.log(`Context length: ${context.length} characters`);

            // Step 5: Generate study guide using RAG prompt
            const prompt = this.getRAGPromptTemplate(type);
            const chain = RunnableSequence.from([
                prompt,
                this.llm,
                new StringOutputParser(),
            ]);

            const result = await chain.invoke({ context });

            console.log(`Successfully generated ${type} using RAG`);

            // Clear the vector store to free up memory
            vectorStore.clear();

            return result;
        } catch (error) {
            console.error("RAG generation error:", error);
            throw new Error(`RAG generation failed: ${(error as Error).message}`);
        }
    }

    /**
     * Get optimal retrieval query based on study guide type
     */
    private getRetrievalQuery(type: string): string {
        switch (type) {
            case "summary":
                return "What are the main topics, key concepts, and important ideas in this document?";
            case "points":
                return "What are the most important facts, concepts, and key takeaways?";
            case "flashcards":
                return "What are the key concepts, definitions, and important facts that should be memorized?";
            case "quiz":
                return "What are the important topics and concepts that can be tested for understanding?";
            case "outline":
                return "What is the overall structure, main topics, and organization of this content?";
            default:
                return "What is the most important information in this document?";
        }
    }

    /**
     * Format retrieved documents into a coherent context string
     */
    private formatRetrievedContext(docs: Document[]): string {
        if (docs.length === 0) {
            return "No relevant content found.";
        }

        return docs
            .map((doc, index) => {
                const metadata = doc.metadata || {};
                const source = metadata.page ? `[Page ${metadata.page}]` : `[Chunk ${index + 1}]`;
                return `${source}\n${doc.pageContent}\n`;
            })
            .join("\n---\n\n");
    }
}
