import { openai, supabase } from './config.js'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

async function splitDocument() {
    const response = await fetch('movies.txt')
    const text = await response.text()

    const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 700,
    chunkOverlap: 40,
    })
    console.log("Chunking complete")
    const output = await splitter.createDocuments([text])
    return output
}

export async function createEmbeddings() {
    const chunkData = await splitDocument()
    console.log("Starting embeddings")
    console.log(chunkData)
    const data = await Promise.all(
        chunkData.map(async (chunk) => {
        const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk.pageContent
    })
        return { 
            content: chunk.pageContent, 
            embedding: embeddingResponse.data[0].embedding 
        }
    })
)
    console.log(data)
    console.log("embeddings complete")
    await supabase.from('movies').insert(data)
    console.log('Data Uploaded')
}

//    useEffect(() => {
//        createEmbeddings()
//            .then(() => console.log("Embeddings created and stored"))
//            .catch(error => console.error("Failed to create and store embeddings:", error));
//    }, []);