import { NextResponse } from "next/server";
// 1. Change the import to the WebPDFLoader
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { pinecone } from "@/lib/pinecone"; // Use relative path if needed: '../../../lib/pinecone'

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let rawText = "";

    // ✨ QUICK WIN UPGRADE: Multi-File Support
    if (file.type === "application/pdf") {
      const loader = new WebPDFLoader(file);
      const rawDocs = await loader.load();
      rawText = rawDocs.map((doc) => doc.pageContent).join(" ");
    } else if (
      file.type === "text/plain" ||
      file.type === "text/csv" ||
      file.name.endsWith(".md")
    ) {
      // Native JavaScript can extract text from TXT, CSV, and MD files instantly!
      rawText = await file.text();
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a PDF, TXT, CSV, or MD file.",
        },
        { status: 400 },
      );
    }

    // SAFETY CHECK 1: Did we actually get text?
    if (!rawText || rawText.trim() === "") {
      return NextResponse.json(
        {
          error:
            "No readable text found in file. Is it an empty or scanned document?",
        },
        { status: 400 },
      );
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.createDocuments([rawText]);

    // SAFETY CHECK 2: Filter out any completely empty chunks
    const validChunks = chunks.filter((c) => c.pageContent.trim().length > 0);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-2-preview",
    });

    const indexName = process.env.PINECONE_INDEX_NAME || "documind";
    const index = pinecone.Index(indexName);

    const vectors = await Promise.all(
      validChunks.map(async (chunk, i) => {
        const rawVector = await embeddings.embedQuery(chunk.pageContent);

        // FIX: Manually slice the first 768 numbers
        const truncatedVector = rawVector.slice(0, 768);

        return {
          id: `chunk-${crypto.randomUUID()}-${i}`,
          values: truncatedVector,
          metadata: {
            text: chunk.pageContent,
          },
        };
      }),
    );

    // FIX: Dynamically allow valid numerical arrays
    const validVectors = vectors.filter(
      (v) => v.values && Array.isArray(v.values) && v.values.length > 0,
    );

    if (validVectors.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate valid math vectors from the text." },
        { status: 500 },
      );
    }

    // 🐛 BUG FIX: The "Mind Wipe"
    // This explicitly deletes old document vectors so they don't contaminate the new ones
    try {
      await index.deleteAll();
      console.log("Old document erased from Pinecone.");
    } catch (error) {
      console.log("Database is already empty or clear failed.");
    }

    await index.upsert({ records: validVectors });

    return NextResponse.json({
      success: true,
      message: `Successfully processed and stored ${validVectors.length} chunks.`,
    });
  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 },
    );
  }
}
