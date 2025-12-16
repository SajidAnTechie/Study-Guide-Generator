import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Simple in-memory vector store implementation
 */
export class SimpleMemoryVectorStore {
    private documents: Document[] = [];
    private embeddings: number[][] = [];

    constructor(private embeddingModel: OpenAIEmbeddings) { }

    async addDocuments(docs: Document[]): Promise<void> {
        console.log(`Embedding ${docs.length} documents...`);

        // Batch process embeddings for better performance
        const batchSize = 10;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, Math.min(i + batchSize, docs.length));
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(docs.length / batchSize)}`);

            // Process batch in parallel
            const embeddings = await Promise.all(
                batch.map(doc => this.embeddingModel.embedQuery(doc.pageContent))
            );

            // Add to store
            batch.forEach((doc, idx) => {
                this.documents.push(doc);
                this.embeddings.push(embeddings[idx]);
            });
        }

        console.log(`Completed embedding ${docs.length} documents`);
    }

    static async fromDocuments(
        docs: Document[],
        embeddingModel: OpenAIEmbeddings
    ): Promise<SimpleMemoryVectorStore> {
        const store = new SimpleMemoryVectorStore(embeddingModel);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Embedding creation timed out after 3 minutes')), 180000);
        });

        await Promise.race([
            store.addDocuments(docs),
            timeoutPromise
        ]);

        return store;
    }

    async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
        const queryEmbedding = await this.embeddingModel.embedQuery(query);
        const similarities = this.embeddings.map((emb, idx) => ({
            index: idx,
            score: this.cosineSimilarity(queryEmbedding, emb),
        }));

        similarities.sort((a, b) => b.score - a.score);
        return similarities.slice(0, k).map((s) => this.documents[s.index]);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Clear all stored documents and embeddings from memory
     */
    clear(): void {
        this.documents = [];
        this.embeddings = [];
        console.log('Vector store cleared');
    }
}

/**
 * Vector Store Manager for document storage and retrieval
 * Uses MemoryVectorStore for in-memory vector storage with OpenAI embeddings
 */
export class VectorStoreManager {
    private embeddings: OpenAIEmbeddings;
    private textSplitter: RecursiveCharacterTextSplitter;

    constructor(apiKey: string, model: string) {
        // Initialize OpenAI embeddings
        this.embeddings = new OpenAIEmbeddings({
            apiKey: apiKey,
            model: model, // Cost-effective embedding model
        });

        // Configure text splitter for optimal chunk sizes
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000, // Larger chunks = fewer embeddings = faster processing
            chunkOverlap: 300, // Overlap to maintain context between chunks
            separators: ["\n\n", "\n", ". ", " ", ""], // Smart splitting on natural boundaries
        });
    }

    /**
     * Process and store document content in vector database
     * 
     * @param content - Raw text content from uploaded file
     * @param metadata - Additional metadata (filename, type, etc.)
     * @returns Vector store instance for retrieval
     */
    async createVectorStore(
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<SimpleMemoryVectorStore> {
        try {
            // Split document into chunks
            const docs = await this.textSplitter.createDocuments(
                [content],
                [{ ...metadata, timestamp: Date.now() }]
            );

            console.log(`Created ${docs.length} document chunks for vector store`);

            // Create vector store from documents
            const vectorStore = await SimpleMemoryVectorStore.fromDocuments(docs, this.embeddings);

            return vectorStore;
        } catch (error) {
            console.error("Error creating vector store:", error);
            throw new Error("Failed to create vector store: " + (error as Error).message);
        }
    }

    /**
     * Perform similarity search to retrieve relevant document chunks
     * 
     * @param vectorStore - The vector store to search
     * @param query - User query or generation prompt
     * @param k - Number of top results to return
     * @returns Array of relevant document chunks with scores
     */
    async similaritySearch(
        vectorStore: SimpleMemoryVectorStore,
        query: string,
        k: number = 4
    ): Promise<Document[]> {
        try {
            // Retrieve top-k most similar documents
            const results = await vectorStore.similaritySearch(query, k);

            console.log(`Retrieved ${results.length} relevant chunks for query`);

            return results;
        } catch (error) {
            console.error("Error performing similarity search:", error);
            throw new Error("Failed to retrieve relevant content: " + (error as Error).message);
        }
    }
}
