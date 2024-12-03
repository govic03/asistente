declare module 'faiss' {
    export class FAISS {
        constructor(embeddings: any[], texts: string[]);
        similaritySearch(query: string, k: number): Promise<any[]>;
    }
}
