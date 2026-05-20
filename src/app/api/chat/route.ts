import { NextResponse } from "next/server";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { pinecone } from "@/lib/pinecone";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // 1. Vectorize Question
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-2-preview",
    });
    const rawQueryEmbedding = await embeddings.embedQuery(message);
    const queryEmbedding = rawQueryEmbedding.slice(0, 768);

    // 2. Query Pinecone
    const indexName = process.env.PINECONE_INDEX_NAME || "documind";
    const index = pinecone.Index(indexName);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    const retrievedChunks = queryResponse.matches
      .map((match) => match.metadata?.text)
      .filter((text) => text !== undefined)
      .join("\n\n---\n\n");

    // 3. Initialize LLM
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
    });

    const prompt = `You are an intelligent document assistant. Answer the user's question using ONLY the provided context below. 
    If the context does not contain the answer, say "I cannot answer this based on the provided document." Do not make up information.

    Context from document:
    ${retrievedChunks}

    User Question: ${message}
    `;

    // ✨ THE UPGRADE: Streaming the Response!
    // Instead of waiting for the full answer, we stream it as it generates.
    const stream = await llm.stream(prompt);

    // Create a native readable stream to send back to the browser
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // Send each word/token to the frontend immediately
          if (chunk.content) {
            controller.enqueue(
              new TextEncoder().encode(chunk.content as string),
            );
          }
        }
        controller.close();
      },
    });

    // Return it as a raw text stream, NOT a JSON object
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat query" },
      { status: 500 },
    );
  }
}
