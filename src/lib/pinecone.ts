import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("Missing PINECONE_API_KEY in environment variables.");
}

// Instantiate a single connection to the Pinecone instance
export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
