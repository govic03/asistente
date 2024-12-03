import env from './env.json';

export const OPENAI_API_KEY = (env as any).openapi_key;
export const OPENAI_DEFAULT_MODEL: string = (env as any).default_model;
export const OPENAI_DEFAULT_SYSTEM_PROMPT: string = (env as any).default_system_prompt;
export const PINECONE_API_KEY = '7e6d5432-cd13-475b-92e4-276566c73c07';
export const PINECONE_ENVIRONMENT = 'gcp-starter'; // 
export const PINECONE_INDEX_NAME = 'asistentendex';