import React, {useContext, useEffect, useState} from 'react';
import Select, {
  ActionMeta,
  components,
  MultiValue,
  OptionProps,
  SingleValue,
  SingleValueProps,
  StylesConfig
} from 'react-select';
import {OpenAIModel} from '../models/model';
import {ChatService} from '../service/ChatService';
import {useTranslation} from 'react-i18next';
import Tooltip from "./Tooltip";
import {DEFAULT_MODEL} from "../constants/appConstants";
import './ModelSelect.css'
import {UserContext} from "../UserContext";
import {EyeIcon} from '@heroicons/react/24/outline';
import AnchoredHint from './AnchoredHint';

interface ModelSelectProps {
  onModelSelect?: (value: string | null) => void;
  models: OpenAIModel[];
  className?: string;
  allowNone?: boolean;
  allowNoneLabel?: string;
  value: string | null;
}

type SelectOption = { label: string; value: string; info: string; image_support: boolean};

const NONE_MODEL = {
  value: null,
  label: '(None)',
  info: '?k',
  image_support: false
};

const ModelSelect: React.FC<ModelSelectProps> = ({
                                                   onModelSelect,
                                                   models: externalModels,
                                                   className,
                                                   value = null,
                                                   allowNone = false,
                                                   allowNoneLabel = '(None)',
                                                 }) => {
  const {userSettings, setUserSettings} = useContext(UserContext);
  const {t} = useTranslation();
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SelectOption>();
  const [loading, setLoading] = useState<boolean>(false);
  const SHOW_MORE_MODELS = t('show-more-models');
  const SHOW_FEWER_MODELS = t('show-fewer-models');
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const MORE_MODELS = 'more';
  const LESS_MODELS = 'less';

  const showHint = () => {
    setHintVisible(true);
  };
  const hideHint = () => {
    setHintVisible(false);
  };

  const isDarkMode = () => userSettings.userTheme === 'dark';

  const getColor = (state: OptionProps<SelectOption, false>) => {
    if (state.data.value === MORE_MODELS || state.data.value === LESS_MODELS) {
      return 'var(--primary)';
    } else {
      return isDarkMode() ? 'white' : 'black';
    }
  };

  const getInfoColor = () => {
    return isDarkMode() ? 'gray' : 'gray';
  };

  const customStyles: StylesConfig<SelectOption, false> = {
    option: (provided, state) => ({
      ...provided,
      color: getColor(state),
      backgroundColor: isDarkMode() ? (state.isSelected ? '#4A5568' : state.isFocused ? '#2D3748' : '#1A202C') : state.isSelected ? '#edf2f7' : state.isFocused ? '#F2F2F2' : provided.backgroundColor,
      ':active': {
        backgroundColor: isDarkMode() ? (state.isSelected ? '#4A5568' : '#2D3748') : (state.isSelected ? 'var(--gray-200)' : '#F2F2F2'),
      },
    }),
    control: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode() ? '#2D3748' : 'white',
      color: isDarkMode() ? 'white' : 'black',
      borderColor: isDarkMode() ? '#4A5568' : '#E2E8F0',
      boxShadow: isDarkMode() ? '0 0 0 1px #4A5568' : 'none',
      '&:hover': {
        borderColor: isDarkMode() ? '#4A5568' : '#CBD5E0',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isDarkMode() ? 'white' : 'black',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode() ? '#1A202C' : provided.backgroundColor,
    }),
  };


  useEffect(() => {
  }, []);

  useEffect(() => {
    if (externalModels.length > 0) {
      setModels(externalModels);
    } else {
      setLoading(true);
      ChatService.getModels()
        .then(data => {
          setModels(data);
        })
        .catch(err => {
          console.error('Error fetching model list', err);
        })
        .finally(() => setLoading(false));
    }
  }, [externalModels]);

  function getModelOption(model: OpenAIModel) {
    return {
      value: model.id,
      label: model.id,
      info: formatContextWindow(model.context_window),
      image_support: model.image_support,
      preferred: model.preferred,
      deprecated: model.deprecated
    };
  }



  const formatContextWindow = (context_window: number) => {
    return Math.round(context_window / 1000) + 'k';
  }

  const handleModelChange = (option: SingleValue<SelectOption> | MultiValue<SelectOption>,
                             actionMeta: ActionMeta<SelectOption>) => {
   
    option = option as SingleValue<SelectOption>;

    if (option) {
      if (option.value === MORE_MODELS) {
        const defaultOptions = models.filter(model => !model.deprecated);
        setOptions([
          ...defaultOptions.map((model) => ({
            value: model.id,
            label: model.id,
            info: formatContextWindow(model.context_window),
            image_support: model.image_support
          })),
          {value: LESS_MODELS, label: SHOW_FEWER_MODELS, info: '',  image_support: false}
        ]);
        setMenuIsOpen(true);
      } else if (option.value === LESS_MODELS) {
        const defaultOptions = models.filter(model => model.preferred);
        setOptions([
          ...defaultOptions.map((model) => ({
            value: model.id,
            label: model.id,
            info: formatContextWindow(model.context_window),
            image_support: model.image_support
          })),
          {value: MORE_MODELS, label: SHOW_MORE_MODELS, info: '',  image_support: false}
        ]);
        setMenuIsOpen(true);
      } else {
        setSelectedOption({
          value: option.value,
          label: option.label,
          info: option.info,
          image_support: option.image_support
        });
        if (onModelSelect) {
          onModelSelect(option.value);
        }
        setMenuIsOpen(false);
      }
    } else {
      setMenuIsOpen(false);
    }
  };

 



  return (
   ""
  );
};

export default ModelSelect;
