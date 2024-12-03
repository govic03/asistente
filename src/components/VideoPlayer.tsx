import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  isAudioPlaying: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ isAudioPlaying }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    // Detener el video antes de cambiar la fuente
    videoElement.pause();

    // Determinar el video a cargar según el estado de reproducción del audio
    const videoSource = isAudioPlaying ? '/talk2.mp4' : '/idle.mp4';

    // Cambiar la fuente del video
    videoElement.src = videoSource;

    // Configurar el loop para el video de espera
    videoElement.loop = !isAudioPlaying;

    // Forzar la carga del video
    videoElement.load();

    // Reproducir el video cuando esté listo (solo si el usuario ha interactuado)
    videoElement.onloadeddata = () => {
      if (isAudioPlaying) {
        videoElement.play().catch((error) => {
          console.error('Error al reproducir el video:', error);
        });
      }
    };

    // Si el audio está reproduciéndose, repetir el video `02.mp4`
    if (isAudioPlaying) {
      videoElement.onended = () => {
        videoElement.play().catch((error) => {
          console.error('Error al reiniciar la reproducción del video:', error);
        });
      };
    } else {
      videoElement.onended = null;
    }
  }, [isAudioPlaying]);

  // Asegurar que el video de espera esté listo y reproducirlo después de una interacción del usuario
  useEffect(() => {
    const videoElement = videoRef.current;

    const handleUserInteraction = () => {
      if (videoElement && !isAudioPlaying) {
        videoElement.play().catch((error) => {
          console.error('Error al iniciar el video de espera en loop:', error);
        });
      }
    };

    // Escuchar cualquier interacción del usuario para iniciar el video
    document.addEventListener('click', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [isAudioPlaying]);

  return  <video
  ref={videoRef}
  width="180"
  height="250"
 
  style={{
    borderRadius: '30px',
    overflow: 'hidden',
  }}
/>;
};

export default VideoPlayer;
