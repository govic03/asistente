import React from 'react';
import { useTranslation } from 'react-i18next';

interface SystemPromptSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const SystemPromptSelect: React.FC<SystemPromptSelectProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  const systemPrompts = [
    { value: 'default', label: t('Default Assistant'), prompt: 'You are a helpful assistant.' },
    { value: 'math_tutor', label: t('Math Tutor'), prompt: 'You are a knowledgeable math tutor, ready to help with various mathematical concepts and problems.' },
    { value: 'code_assistant', label: t('Code Assistant'), prompt: 'You are a skilled programming assistant, capable of helping with various programming languages and concepts.' },
    { value: 'writing_assistant', label: t('Writing Assistant'), prompt: 'You are a proficient writing assistant, able to help with various writing tasks and improve language usage.' },
  ];

  return (
    <select
      value={value}
      onChange={(e) => {
        const selectedPrompt = systemPrompts.find(prompt => prompt.value === e.target.value);
        onChange(selectedPrompt ? selectedPrompt.prompt : '');
      }}
      className="block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
    >
      {systemPrompts.map((prompt) => (
        <option key={prompt.value} value={prompt.value}>
          {prompt.label}
        </option>
      ))}
    </select>
  );
};

export default SystemPromptSelect;