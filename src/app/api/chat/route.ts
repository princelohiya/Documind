import { NextResponse } from "next/server";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { pinecone } from "@/lib/pinecone"; // Use relative path if needed: '../../../lib/pinecone'

export async function POST(req: Request) {
  try {
    // 1. Get the user's message from the request body
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // 2. Convert the user's question into a vector
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-2-preview",
    });
    const rawQueryEmbedding = await embeddings.embedQuery(message);

    // FIX: Manually slice the question's vector to 768 dimensions
    const queryEmbedding = rawQueryEmbedding.slice(0, 768);

    // 3. Search Pinecone for the closest matching chunks
    const indexName = process.env.PINECONE_INDEX_NAME || "documind";
    const index = pinecone.Index(indexName);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5, // Retrieve the top 5 most relevant chunks
      includeMetadata: true, // We need this to get the actual text back!
    });

    // 4. Extract the raw text from the matched chunks
    const retrievedChunks = queryResponse.matches
      .map((match) => match.metadata?.text)
      .filter((text) => text !== undefined)
      .join("\n\n---\n\n"); // Separate chunks with lines for the LLM

    // 5. Initialize the LLM (gemini-1.5-flash is extremely fast and entirely free for this)
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0, // Set to 0 so it doesn't hallucinate; we want factual answers based on the text
    });

    // 6. Construct the strict RAG prompt
    const prompt = `You are an intelligent document assistant. Answer the user's question using ONLY the provided context below. 
    If the context does not contain the answer, say "I cannot answer this based on the provided document." Do not make up information.

    Context from document:
    ${retrievedChunks}

    User Question: ${message}
    `;

    // 7. Get the final answer from Gemini
    const response = await llm.invoke(prompt);

    return NextResponse.json({ answer: response.content });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat query" },
      { status: 500 },
    );
  }
}
