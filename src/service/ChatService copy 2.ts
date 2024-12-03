import axios from 'axios';
import { modelDetails, OpenAIModel } from "../models/model";
import { ChatCompletion, ChatCompletionMessage, ChatCompletionRequest, ChatMessage, ChatMessagePart, Role, MessageType } from "../models/ChatCompletion";
import { OPENAI_API_KEY, PINECONE_API_KEY } from "../config";
import { CustomError } from "./CustomError";
import { CHAT_COMPLETIONS_ENDPOINT, MODELS_ENDPOINT } from "../constants/apiEndpoints";
import { ChatSettings } from "../models/ChatSettings";
import { CHAT_STREAM_DEBOUNCE_TIME, DEFAULT_MODEL } from "../constants/appConstants";
import { NotificationService } from '../service/NotificationService';
import { FileDataRef } from "../models/FileData";
import chatSettingsData from './chatSettingsData.json';
interface CompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChunkChoice[];
}

interface CompletionChunkChoice {
  index: number;
  delta: {
    content: string;
  };
  finish_reason: null | string;
}

export class ChatService {
  private static models: Promise<OpenAIModel[]> | null = null;
  static abortController: AbortController | null = null;

  static knowledgeBaseEmbeddings: number[][] = [];
  static knowledgeBaseTexts: string[] = [];

  // Función para cargar la base de conocimientos desde un array embebido
  static async loadKnowledgeBase() {
    console.log("Cargando base de conocimientos desde JSON...");
    // Puedes eliminar esta parte si ya no necesitas cargar la base de conocimientos local
  }

  static async getPineconeIndexCount(): Promise<number> {
    try {
      const response = await axios.get(
        `http://localhost:5000/pinecone-api/index/stats`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': PINECONE_API_KEY,
          },
        }
      );
      console.log('Pinecone index stats:', response.data);
      return response.data.totalVectorCount || 0;
    } catch (error) {
      console.error('Error getting Pinecone index count:', error);
      return 0;
    }
  }

  // Función para buscar en Pinecone
  static async searchPinecone(queryEmbedding: number[]): Promise<any[]> {
    try {
      console.log("embedin consultado", queryEmbedding);
      const totalElements = await this.getPineconeIndexCount();
      console.log(`El índice de Pinecone contiene ${totalElements} elementos.`);
    
      const response = await axios.post(
        `http://localhost:5000/pinecone-api/query`,
        {
          vector: queryEmbedding, // O asegúrate de usar el campo correcto esperado por Pinecone
          topK: 10,  // Número de resultados que quieres obtener
          includeMetadata: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': PINECONE_API_KEY,
          },
        }
      );
  
      console.log('Resultados obtenidos de Pinecone:', response.data);
      return response.data.matches || [];
    } catch (error) {
      console.error('Error buscando en Pinecone:', error);
      return [];
    }
  }

  // Función para generar embeddings utilizando la API de OpenAI
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002', //
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error('Error generating embeddings');
    }

    const data = await response.json();
    console.log('Embeddings generados:', data.data.map((item: any) => item.embedding));
    return data.data.map((item: any) => item.embedding);
  }

  // Función para calcular la similitud coseno
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Función para buscar los documentos más similares
  static findMostSimilar(embeddings: number[][], queryEmbedding: number[], numResults: number = 3): { index: number, similarity: number }[] {
    const similarities = embeddings.map((embedding, index) => {
      const similarity = this.cosineSimilarity(embedding, queryEmbedding);
      return { index, similarity };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, numResults);
  }

  // Función para mapear mensajes de chat a mensajes de completado
  static async mapChatMessagesToCompletionMessages(modelId: string, messages: ChatMessage[]): Promise<ChatCompletionMessage[]> {
    const model = await this.getModelById(modelId);
    if (!model) {
      throw new Error(`Model with ID '${modelId}' not found`);
    }
  
    return messages.map((message) => {
      if (message.role === Role.User && message.fileDataRef && message.fileDataRef.length > 0) {
        const contentParts: ChatMessagePart[] = [{ type: 'text', text: message.content }];
        
        message.fileDataRef.forEach((fileRef) => {
          if (fileRef.fileData && fileRef.fileData.data) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: fileRef.fileData.data,
              }
            });
          }
        });
  
        console.log("Message with image:", { role: message.role, content: contentParts });
        return { role: message.role, content: contentParts };
      }
  
      return { role: message.role, content: message.content };
    });
  }// Función para asegurar delimitadores de LaTeX
  static ensureLatexDelimiters(content: string): string {
    return content
      // Reemplazar [latex]...[/latex] con $...$ para inline LaTeX
      .replace(/\[latex\](.*?)\[\/latex\]/g, '$$$1$$')
      // Reemplazar [latex-block]...[/latex-block] con $$...$$ para block LaTeX
      .replace(/\[latex-block\](.*?)\[\/latex-block\]/gs, '$$$$ $1 $$$$');
  }

  // Función para enviar mensajes y buscar en la base de conocimientos
  static async sendMessage(messages: ChatMessage[], modelId: string): Promise<ChatCompletion> {
    console.log('sendMessage function called');  // Log para verificar que la función se llama correctamente

    const userQuery = messages.map(m => m.content).join(' ');
    console.log('User query:', userQuery);  // Log para verificar la consulta del usuario

     //Generar embeddings para la consulta del usuario
    const queryEmbedding = await this.generateEmbeddings([userQuery]);
   console.log('Generated query embeddings:', queryEmbedding);  // Log para verificar los embeddings generados

    // Buscar en Pinecone
    const pineconeResults = await this.searchPinecone(queryEmbedding[0]);
   console.log('Pinecone search results:', pineconeResults);  // Log para verificar los resultados de Pinecone

    let responseMessage: ChatMessage;

    if (pineconeResults.length > 0 && pineconeResults[0].score > 0.7) { // Umbral de similitud
        const bestMatch = pineconeResults[0].metadata.text;
        console.log('Using knowledge base from Pinecone');  // Log para verificar que se está usando Pinecone
        responseMessage = {
            role: Role.Assistant,
            messageType: MessageType.Normal,
            content: `${bestMatch}\n\n(used knowledge base from Pinecone)`,
        };
    } else {
        console.log('Using general knowledge base');  // Log para verificar que se está usando el modelo de OpenAI
        const mappedMessages = await this.mapChatMessagesToCompletionMessages(modelId, messages);

        const requestBody: ChatCompletionRequest = {
            model: modelId,
            messages: mappedMessages,
            stream: true
        };

        const response = await fetch(CHAT_COMPLETIONS_ENDPOINT, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new CustomError(err.error.message, err);
        }

        const responseData = await response.json();
        responseMessage = {
            role: Role.Assistant,
            messageType: MessageType.Normal,
            content: `${responseData.choices[0].message.content}\n\n(used general knowledge base)`,
        };
    }

    console.log('Final response:', responseMessage.content);  // Log para verificar la respuesta final

    const chatCompletion: ChatCompletion = {
        id: 'unique-id',
        object: 'chat.completion',
        created: Date.now(),
        model: modelId,
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        },
        choices: [
            {
                message: responseMessage,
                finish_reason: 'stop',
                index: 0,
            },
        ],
    };

    return chatCompletion;
  }

  private static lastCallbackTime: number = 0;
  private static callDeferred: number | null = null;
  private static accumulatedContent: string = "";

  static debounceCallback(callback: (content: string, fileDataRef?: FileDataRef[]) => void, delay: number = CHAT_STREAM_DEBOUNCE_TIME) {
    return (content: string) => {
      this.accumulatedContent += content;
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallbackTime;

      if (this.callDeferred !== null) {
        clearTimeout(this.callDeferred);
      }

      this.callDeferred = window.setTimeout(() => {
        callback(this.accumulatedContent, []);
        this.lastCallbackTime = Date.now();
        this.accumulatedContent = "";
      }, delay - timeSinceLastCall < 0 ? 0 : delay - timeSinceLastCall);

      this.lastCallbackTime = timeSinceLastCall < delay ? this.lastCallbackTime : now;
    };
  }


  static async sendMessageStreamed(
    chatSettings: ChatSettings,
    messages: ChatMessage[],
    callback: (content: string, fileDataRef?: FileDataRef[], isEnd?: boolean, isFirst?: boolean) => void,
    nombre: string | null,
    curso: string | null,
    isFirstMessage: boolean
  ): Promise<any> {
    let isEndCalled = false;
    console.log("Nombre recibido en sendMessageStreamed:", nombre);
    console.log("Curso recibido en sendMessageStreamed:", curso);
  
    // Normalizar el nombre del curso
    const normalizeCursoName = (cursoName: string | null): string | null => {
      if (!cursoName) return null;
      return decodeURIComponent(cursoName)
        .trim()
        .replace(/%/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    };
  
    const normalizedCurso = normalizeCursoName(curso);
    console.log("Curso normalizado:", normalizedCurso);
  
    // Buscar la configuración del curso
    const findCourseSettings = (cursoName: string | null) => {
      if (!cursoName) return null;
      return chatSettingsData.find((setting: any) =>
        normalizeCursoName(setting.name) === cursoName
      );
    };
  
    const courseSettings = findCourseSettings(normalizedCurso);
    console.log("Configuración del curso encontrada:", courseSettings);
  
    let systemMessage: string;
  
    if (courseSettings) {
      if (isFirstMessage) {
        systemMessage = `El nombre del usuario es ${nombre}. Este es el asistente de la asignatura "${courseSettings.name}". ${courseSettings.instructions}`;
      } else {
        systemMessage = `${courseSettings.instructions}`;
      }
    } else {
      console.warn(`No se encontró configuración para el curso: ${normalizedCurso}`);
      systemMessage = isFirstMessage
        ? `El nombre del usuario es ${nombre}. No se encontró configuración para el curso ${curso}. Continúa respondiendo la última pregunta del usuario.`
        : `No se encontró configuración para el curso ${curso}. Continúa respondiendo la última pregunta del usuario.`;
    }
  
    // Insertar el mensaje del sistema al inicio de los mensajes
    messages.unshift({
      role: Role.System,
      content: systemMessage,
      messageType: MessageType.Normal,
    });
  
    this.abortController = new AbortController();
    const endpoint = CHAT_COMPLETIONS_ENDPOINT;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
  
    console.log("sendMessageStreamed called");
  
    try {
      const mappedMessages = await this.mapChatMessagesToCompletionMessages(
        chatSettings.model ?? DEFAULT_MODEL,
        messages
      );
  
      const requestBody: ChatCompletionRequest = {
        model: chatSettings.model ?? DEFAULT_MODEL,
        messages: mappedMessages,
        stream: true,
      };
  
      console.log("Request body for model:", JSON.stringify(requestBody, null, 2));
  
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });
  
      if (!response.ok) {
        const err = await response.json();
        throw new CustomError(err.error.message, err);
      }
  
      if (this.abortController.signal.aborted) {
        console.log("Stream aborted");
        return;
      }
  
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let DONE = false;
  
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
  
          buffer += decoder.decode(value, { stream: true });
          let chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
  
          for (let chunk of chunks) {
            if (chunk.startsWith("data: ")) {
              chunk = chunk.slice(6);
            }
  
            if (chunk.trim() === "[DONE]") {
              DONE = true;
              break;
            }
  
            try {
              const parsed = JSON.parse(chunk);
              if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                let content = parsed.choices[0].delta.content;
  
                // Incorporar el nombre del usuario en las respuestas si es el primer mensaje
                if (nombre && isFirstMessage) {
                  content = `Hola ${nombre}, ${content}`;
                  isFirstMessage = false;
                }
  
                callback(content, [], false, isFirstMessage);
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
  
          if (DONE) break;
        }
  
        if (!isEndCalled) {
          callback("", [], true, false);
          isEndCalled = true;
        }
      }
    } catch (error) {
      console.error("Error al procesar OpenAI:", error);
    }
  }
  
  
  
  // Función auxiliar para procesar el stream de OpenAI
  // Función auxiliar para procesar el stream de OpenAI
// Función auxiliar para procesar el stream de OpenAI
// Función auxiliar para procesar el stream de OpenAI
static async processOpenAIStream(
  endpoint: string,
  headers: any,
  requestBody: ChatCompletionRequest,
  callback: (content: string, fileDataRef?: FileDataRef[], isEnd?: boolean, isFirst?: boolean) => void
) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(`Error en el stream: ${errorResponse.error.message}`);
    }

    if (!response.body) {
      throw new Error("No se recibió el cuerpo de la respuesta.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulatedContent = "";
    let isEndCalled = false;
    let isFirstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Retener la última línea incompleta

      for (const line of lines) {
        if (line.trim() === "data: [DONE]") {
          if (!isEndCalled) {
            callback(accumulatedContent, [], true, false);
            isEndCalled = true;
          }
          return;
        }

        if (line.startsWith("data: ")) {
          try {
            const jsonLine = line.slice(6).trim(); // Remover "data: "
            const parsed = JSON.parse(jsonLine);

            if (parsed.choices && parsed.choices[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              accumulatedContent += content;

              // Llamar al callback en cada fragmento recibido
              callback(accumulatedContent, [], false, isFirstChunk);
              isFirstChunk = false;
            }
          } catch (error) {
            console.error("Error procesando fragmento JSON:", error, line);
          }
        }
      }
    }

    // Procesar cualquier contenido acumulado restante
    if (!isEndCalled) {
      callback(accumulatedContent, [], true, false);
    }
  } catch (error) {
    console.error("Error durante el procesamiento del stream:", error);
  }
}




  static cancelStream = (): void => {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  static getModels = async (): Promise<OpenAIModel[]> => {
    await ChatService.loadKnowledgeBase();

    if (this.models !== null) {
      return Promise.resolve(this.models);
    }
    this.models = fetch(MODELS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error.message);
          });
        }
        return response.json();
      })
      .catch(err => {
        throw new Error(err.message || err);
      })
      .then(data => {
        const models: OpenAIModel[] = data.data;
        return models
          .filter(model => model.id.startsWith("gpt-"))
          .map(model => {
            const details = modelDetails[model.id] || {
              contextWindowSize: 0,
              knowledgeCutoffDate: '',
              imageSupport: false,
              preferred: false,
              deprecated: false,
            };
            return {
              ...model,
              context_window: details.contextWindowSize,
              knowledge_cutoff: details.knowledgeCutoffDate,
              image_support: details.imageSupport,
              preferred: details.preferred,
              deprecated: details.deprecated,
            };
          })
          .sort((a, b) => b.id.localeCompare(a.id));
      });
    return this.models;
  };

  static async getModelById(modelId: string): Promise<OpenAIModel | null> {
    try {
      const models = await ChatService.getModels();

      const foundModel = models.find(model => model.id === modelId);
      if (!foundModel) {
        throw new CustomError(`Model with ID '${modelId}' not found.`, {
          code: 'MODEL_NOT_FOUND',
          status: 404
        });
      }

      return foundModel;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to get models:', error.message);
        throw new CustomError('Error retrieving models.', {
          code: 'FETCH_MODELS_FAILED',
          status: (error as any).status || 500
        });
      } else {
        console.error('Unexpected error type:', error);
        throw new CustomError('Unknown error occurred.', {
          code: 'UNKNOWN_ERROR',
          status: 500
        });
      }
    }
  }
}