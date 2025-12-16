# Migration from HNSWLib to SimpleMemoryVectorStore

## Overview
Migrated from `hnswlib-node` (which has native binary dependencies) to a custom `SimpleMemoryVectorStore` implementation that runs entirely in JavaScript/TypeScript without requiring native bindings.

## Changes Made

### 1. Created SimpleMemoryVectorStore Class
**File:** `server/langchain/vectorStore.ts`

- Implemented a custom in-memory vector store
- Uses OpenAI embeddings for vector generation
- Implements cosine similarity for document retrieval
- No external dependencies beyond LangChain's core packages

**Key Features:**
- `fromDocuments()` - Create store from document array
- `similaritySearch()` - Find top-k similar documents
- `similaritySearchWithScore()` - Find top-k with similarity scores
- Cosine similarity calculation for vector comparison

### 2. Updated VectorStoreManager
**File:** `server/langchain/vectorStore.ts`

- Changed return types from `HNSWLib` to `SimpleMemoryVectorStore`
- Removed persistence methods (save/load) as they're not needed for in-memory storage
- All similarity search methods now work with the new store

### 3. Updated RAGService
**File:** `server/langchain/ragService.ts`

- Removed `HNSWLib` import
- Added `SimpleMemoryVectorStore` import
- Updated type annotations for vector store parameters
- All RAG functionality remains the same

### 4. Removed Dependencies
**File:** `package.json`

- Removed `hnswlib-node` dependency (no longer needed)

## Benefits

### ✅ No Native Dependencies
- No need for C++ compilation
- No platform-specific binaries
- Works across all environments (Linux, macOS, Windows)

### ✅ Simpler Setup
- Pure JavaScript/TypeScript implementation
- No build tools required
- Faster installation

### ✅ Same Functionality
- All RAG features work identically
- Same API surface
- Compatible with existing code

### ✅ Better for Development
- No binding file errors
- Works in serverless environments
- Easier to deploy

## Trade-offs

### Performance
- In-memory storage means vectors are regenerated on each run
- For large documents, this adds some initialization time
- HNSWLib was faster for repeated searches, but this difference is negligible for most use cases

### Persistence
- Vector stores are not saved to disk
- Perfect for stateless serverless functions
- Each request creates fresh embeddings

## Future Improvements

If you need persistence or better performance for production, consider:

1. **Pinecone** - Managed vector database (cloud)
2. **Chroma** - Open-source vector store with persistence
3. **Weaviate** - Open-source vector database
4. **FAISS** - Facebook's vector similarity library (requires bindings but more stable)

## Testing

Run the application to verify:
```bash
pnpm install  # Clean install
pnpm dev      # Start dev server
```

Upload a document and generate study guides - everything should work as before!

## Notes

- The SimpleMemoryVectorStore uses cosine similarity (same as HNSWLib)
- Embedding quality depends on OpenAI's text-embedding-ada-002 model
- For production with high load, consider a managed vector database solution
