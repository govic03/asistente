import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import ChatSettingsList from './ChatSettingsList';
import chatSettingsDB, { ChatSettingsChangeEvent, chatSettingsEmitter } from '../service/ChatSettingsDB';
import { ChatSettings } from '../models/ChatSettings';
import { useTranslation } from 'react-i18next';
import chatSettingsData from '../service/chatSettingsData.json';

const ExploreCustomChats: React.FC = () => {
  const [exampleChats, setExampleChats] = useState<ChatSettings[]>([]);
  const [myChats, setMyChats] = useState<ChatSettings[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const allChatSettings: ChatSettings[] = chatSettingsData;
    setExampleChats(allChatSettings);
  }, []);

  return (
    <div className="flex justify-center items-center h-screen p-4 lg:px-0 m-auto">
      <div className="w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-4">{t('Asistentes Disponibles')}</h2>
        {/* Contenedor específico para manejar el desplazamiento */}
        <div className="scroll-container">
  <div className="grid grid-cols-1 gap-4">
    <ChatSettingsList chatSettings={exampleChats} />
    <ChatSettingsList chatSettings={myChats} />
  </div>
</div>
      </div>
    </div>
  );
};

export default ExploreCustomChats;
