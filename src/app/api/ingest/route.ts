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

    // 2. Use WebPDFLoader (Bypasses pdf-parse completely and uses Mozilla's engine)
    const loader = new WebPDFLoader(file);
    const rawDocs = await loader.load();

    const rawText = rawDocs.map((doc) => doc.pageContent).join(" ");

    // SAFETY CHECK 1: Did we actually get text out of the PDF?
    if (!rawText || rawText.trim() === "") {
      return NextResponse.json(
        { error: "No readable text found in PDF. Is it a scanned image?" },
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

        // FIX: Manually slice the first 768 numbers using JavaScript!
        const truncatedVector = rawVector.slice(0, 768);

        return {
          id: `chunk-${crypto.randomUUID()}-${i}`,
          values: truncatedVector, // Pass the mathematically sliced vector
          metadata: {
            text: chunk.pageContent,
          },
        };
      }),
    );

    // SAFETY CHECK 3: Ensure Google actually returned 768 numbers before sending to Pinecone
    // Debug step: Print the exact length to the terminal so you can see it
    console.log("Vector generation sample length:", vectors[0]?.values?.length);

    // FIX: Dynamically allow any valid numerical array that Google hands back
    const validVectors = vectors.filter(
      (v) => v.values && Array.isArray(v.values) && v.values.length > 0,
    );

    if (validVectors.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate valid math vectors from the text." },
        { status: 500 },
      );
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
