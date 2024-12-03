import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { SparklesIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import MarkdownBlock from './MarkdownBlock';
import CopyButton, { CopyButtonMode } from './CopyButton';
import { ChatMessage, MessageType, Role } from '../models/ChatCompletion';
import UserContentBlock from './UserContentBlock';
import TextToSpeechButton from './TextToSpeechButton';



interface Props {
  block: ChatMessage;
  loading: boolean;
  isLastBlock: boolean;
  className?: string;
  onAudioPlay: (isPlaying: boolean) => void;
  responseComplete?: boolean;
  lastMessageId: number | null;
  isNewMessage?: boolean; // Indica si el mensaje es nuevo
}

const ChatBlock: React.FC<Props> = ({
  block,
  loading,
  isLastBlock,
  className,
  onAudioPlay,
  responseComplete,
  lastMessageId,
  isNewMessage, // Prop para identificar mensajes nuevos
}) => {
  // Estados para edición de mensajes
  const [isEdit, setIsEdit] = useState(false);
  const [editedBlockContent, setEditedBlockContent] = useState('');

  // Referencias a elementos del DOM
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textToSpeechButtonRef = useRef<any>(null);

  // Estados y referencias para control de audio y despliegue de texto
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const hasAudioPlayedRef = useRef<boolean>(false); // Evita llamadas múltiples a audio
  const hasStartedDisplayRef = useRef<boolean>(false); // Evita múltiples efectos de escritura
  const [displayedContent, setDisplayedContent] = useState(''); // Texto desplegado progresivamente

  // Estilos para mensajes de error
  const errorStyles =
    block.messageType === MessageType.Error
      ? {
          backgroundColor: '#F5E6E6',
          borderColor: 'red',
          borderWidth: '1px',
          borderRadius: '8px',
          padding: '10px',
        }
      : {};

  // Enfoque automático en el textarea cuando se edita
  useEffect(() => {
    if (isEdit) {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
    }
  }, [isEdit]);

  /**
   * Efecto principal:
   * - Reproduce el audio y despliega el texto progresivamente solo para mensajes nuevos.
   */
  useEffect(() => {
    if (
      isNewMessage && // Solo si es un mensaje nuevo
      block.role === Role.Assistant && // Solo para mensajes del asistente
      isLastBlock && // Solo si es el último bloque
      responseComplete && // Solo si la respuesta está completa
      block.id === lastMessageId && // Solo si coincide el ID del último mensaje
      !hasAudioPlayedRef.current && // Evita reproducción múltiple de audio
      !hasStartedDisplayRef.current // Evita múltiples efectos de escritura
    ) {
      // Iniciar reproducción de audio
      if (textToSpeechButtonRef.current) {
        textToSpeechButtonRef.current.startAudio();
        hasAudioPlayedRef.current = true;
      }

      // Iniciar efecto de escritura progresiva
      hasStartedDisplayRef.current = true;
      const words = block.content.split(' ');
      let index = 0;
      setDisplayedContent(''); // Reiniciar el contenido mostrado

      const intervalId = setInterval(() => {
        setDisplayedContent((prev) => (prev ? `${prev} ${words[index]}` : words[index]));
        index++;
        if (index >= words.length) {
          clearInterval(intervalId);
          // Aquí podrías notificar al padre que el despliegue ha terminado si es necesario
        }
      }, 100); // Ajusta el intervalo (ms) según prefieras

      // Limpieza del intervalo si el componente se desmonta antes de terminar
      return () => clearInterval(intervalId);
    }
  }, [
    isNewMessage,
    block,
    isLastBlock,
    responseComplete,
    lastMessageId,
  ]);

  /**
   * Efecto secundario:
   * - Muestra el contenido completo inmediatamente para mensajes antiguos o si ya no son nuevos.
   */
  useEffect(() => {
    if (
      !isNewMessage && // No es un mensaje nuevo
      block.role === Role.Assistant && // Solo para mensajes del asistente
      !hasStartedDisplayRef.current // Solo si no ha iniciado el efecto de escritura
    ) {
      setDisplayedContent(block.content); // Mostrar contenido completo
    }
  }, [isNewMessage, block]);

  /**
   * Efecto para reiniciar referencias y estados cuando cambia el mensaje.
   */
  useEffect(() => {
    if (block.id !== lastMessageId || !isNewMessage) {
      hasAudioPlayedRef.current = false;
      hasStartedDisplayRef.current = false;
      setDisplayedContent(block.content);
    }
  }, [block.id, lastMessageId, isNewMessage, block.content]);

  // Manejo de guardar edición
  const handleEditSave = () => {
    setIsEdit(false);
    // Aquí puedes implementar la lógica para guardar el contenido editado
  };

  // Manejo de cancelar edición
  const handleEditCancel = () => {
    setIsEdit(false);
  };

  // Manejo de teclas especiales en el textarea
  const checkForSpecialKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  // Manejo de cambios en el textarea
  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setEditedBlockContent(event.target.value);
  };

  // Manejo del estado de reproducción de audio
  const handleAudioPlay = (isPlaying: boolean) => {
    setIsAudioPlaying(isPlaying);
    onAudioPlay(isPlaying);
  };

  return (
    <div
      key={`chat-block-${block.id}`}
      className={`group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 
            ${
              block.role === Role.Assistant
                ? 'bg-green-800 dark:bg-gray-900'
                : 'bg-white dark:bg-gray-850'
            } 
            ${className || ''}`}
    >
      <div className="text-base md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl 4xl:max-w7xl p-2 flex lg:px-0 m-auto flex-col">
        <div className="w-full flex">
          <div className="w-[30px] flex flex-col relative items-end mr-4">
            <div className="relative flex h-[30px] w-[30px] p-0 rounded-sm items-center justify-center">
              {block.role === Role.User ? (
                <UserCircleIcon width={24} height={24} />
              ) : block.role === Role.Assistant ? (
                <SparklesIcon key={`assistant-icon-${block.id}`} />
              ) : null}
            </div>
          </div>
          <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-full">
            <div
              id={`message-block-${block.id}`}
              className={`flex flex-grow flex-col gap-3 ${className || ''}`}
              style={{
                ...errorStyles,
                fontFamily: ['Opens Sans', 'cursive', 'sans-serif'].join(', '),
                  fontWeight: 'normal',
                color: block.role === Role.User ? 'white' : 'black',
                fontSize: block.role === Role.Assistant ? '180%' : 'inherit',
                backgroundColor: block.role === Role.Assistant ? 'white' : 'inherit',
                padding: block.role === Role.Assistant ? '10px' : 'inherit',
                borderRadius: block.role === Role.Assistant ? '10px' : 'inherit',
                border: block.role === Role.Assistant ? '2px solid black' : 'inherit',
                lineHeight: block.role === Role.Assistant ? '1.5' : 'inherit',
              }}
            >
              <div className="min-h-[20px] flex flex-col items-start gap-4">
                {isEdit ? (
                  <textarea
                    spellCheck={false}
                    tabIndex={0}
                    ref={textareaRef}
                    style={{
                      lineHeight: '1.33',
                      fontSize: '1rem',
                    }}
                    className="border border-black/10 bg-white dark:border-gray-900/50 dark:bg-gray-700 w-full m-0 p-0 pr-7 pl-2 md:pl-0 resize-none bg-transparent dark:bg-transparent focus:ring-0 focus-visible:ring-0 outline-none shadow-none"
                    onChange={handleTextChange}
                    onKeyDown={checkForSpecialKey}
                    value={editedBlockContent}
                  ></textarea>
                ) : (
                  <div
                    ref={contentRef}
                    className="markdown prose w-full break-words dark:prose-invert light"
                  >
                    {block.role === Role.User ? (
                      <UserContentBlock
                        text={block.content}
                        fileDataRef={block.fileDataRef || []}
                      />
                    ) : isLastBlock && loading ? (
                      <div>Generando respuesta...</div>
                    ) : (
                      <MarkdownBlock
                        markdown={displayedContent || block.content}
                        role={block.role}
                        loading={false}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {!(isLastBlock && loading) && (
          <div
            id={`action-block-${block.id}`}
            className="flex justify-start items-center ml-10"
          >
            {block.role === Role.Assistant && (
              <TextToSpeechButton
                ref={textToSpeechButtonRef}
                content={block.content}
                onAudioPlay={handleAudioPlay}
                autoPlay={isLastBlock && responseComplete} // Controlamos el audio desde ChatBlock
              />
            )}
            <div className="copy-button">
              <CopyButton mode={CopyButtonMode.Compact} text={block.content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBlock;
