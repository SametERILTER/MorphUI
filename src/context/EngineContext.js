import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FUNCTION_REGISTRY } from '../utils/FunctionRegistry';

const EngineContext = createContext();

const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];

    const isArrIndex = part.startsWith('[') && part.endsWith(']');
    if (isArrIndex) {
      const idx = parseInt(part.slice(1, -1));

      if (i === parts.length - 1) {
        current[idx] = value;
        return;
      }

      if (!current[idx]) {
        current[idx] = typeof parts[i + 1] === 'string' && parts[i + 1].startsWith('[') ? [] : {};
      }
      current[idx] = Array.isArray(current[idx]) ? [...current[idx]] : { ...current[idx] };
      current = current[idx];
    } else {
      if (i === parts.length - 1) {
        current[part] = value;
        return;
      }

      if (!current[part]) {
        current[part] = typeof parts[i + 1] === 'string' && parts[i + 1].startsWith('[') ? [] : {};
      }
      current[part] = Array.isArray(current[part]) ? [...current[part]] : { ...current[part] };
      current = current[part];
    }
  }
};

export const useEngine = () => useContext(EngineContext);

export const EngineProvider = ({ children }) => {
  const [stateStore, setStateStore] = useState({});
  const stateRef = useRef({});
  const [currentLayout, _setCurrentLayout] = useState(null);

  const setCurrentLayout = useCallback((layout) => {
    if (!layout) {
      _setCurrentLayout(null);
      return;
    }
    let nodeCounter = 0;
    const assignIds = (node) => {
      if (!node) return null;
      const cloned = { ...node };
      nodeCounter++;
      if (!cloned.id) {
        cloned.id = `node_${Date.now()}_${nodeCounter}_${Math.floor(Math.random() * 1000)}`;
      }
      if (cloned.children && Array.isArray(cloned.children)) {
        cloned.children = cloned.children.map(assignIds);
      }
      return cloned;
    };
    _setCurrentLayout(assignIds(layout));
  }, []);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [savedUIs, setSavedUIs] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [apiKey, setApiKey] = useState(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const json = await AsyncStorage.getItem('@morphui_saved_uis');
        if (json) {
          setSavedUIs(JSON.parse(json));
        }
        const savedKey = await AsyncStorage.getItem('@morphui_api_key');
        if (savedKey) {
          setApiKey(savedKey);
        } else if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
          setApiKey(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
        }
      } catch (err) {
        console.error('Failed to load storage data in EngineContext', err);
      }
    };
    loadSaved();
  }, []);

  const updateApiKey = useCallback(async (newKey) => {
    setApiKey(newKey);
    try {
      if (newKey && newKey.trim()) {
        await AsyncStorage.setItem('@morphui_api_key', newKey.trim());
      } else {
        await AsyncStorage.removeItem('@morphui_api_key');
      }
    } catch (err) {
      console.error('Failed to save API key', err);
    }
  }, []);

  const addLog = useCallback((type, text) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: Date.now() + Math.random().toString(), type, text, timestamp },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const updateState = useCallback((key, value) => {
    if (!key) return;

    const isNestedPath = key.includes('.[');
    let updatedRef;

    if (isNestedPath) {
      updatedRef = { ...stateRef.current };
      setNestedValue(updatedRef, key, value);
    } else {
      updatedRef = { ...stateRef.current, [key]: value };
    }

    stateRef.current = updatedRef;

    setStateStore((prev) => {
      let updatedState;
      if (isNestedPath) {
        updatedState = { ...prev };
        setNestedValue(updatedState, key, value);
      } else {
        updatedState = { ...prev, [key]: value };
      }
      return updatedState;
    });

    addLog('state_change', `State [${key}] -> "${JSON.stringify(value)}"`);
  }, [addLog]);

  const clearState = useCallback(() => {
    stateRef.current = {};
    setStateStore({});
    addLog('system', 'State store cleared');
  }, [addLog]);

  const saveUI = useCallback(async (promptText) => {
    if (!currentLayout) return false;
    const newItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('tr-TR'),
      prompt: promptText || 'İsimsiz Tasarım',
      layout: currentLayout,
      state: stateStore,
    };
    const updated = [newItem, ...savedUIs];
    setSavedUIs(updated);

    try {
      await AsyncStorage.setItem('@morphui_saved_uis', JSON.stringify(updated));
      addLog('success', `Arayüz başarıyla kaydedildi: "${promptText}"`);
    } catch (err) {
      console.warn('AsyncStorage save failed, using memory fallback:', err.message);
      addLog('success', `Arayüz hafızaya kaydedildi (Cihaz kaydı başarısız): "${promptText}"`);
    }
    return true;
  }, [currentLayout, stateStore, savedUIs, addLog]);

  const deleteUI = useCallback(async (id) => {
    const updated = savedUIs.filter(item => item.id !== id);
    setSavedUIs(updated);
    addLog('system', 'Kaydedilen arayüz silindi.');

    try {
      await AsyncStorage.setItem('@morphui_saved_uis', JSON.stringify(updated));
    } catch (err) {
      console.warn('AsyncStorage delete failed:', err.message);
    }
  }, [savedUIs, addLog]);

  const loadUI = useCallback((item) => {
    if (!item) return;
    clearState();
    setCurrentLayout(item.layout);
    setPrompt(item.prompt);
    if (item.state && typeof item.state === 'object') {
      Object.entries(item.state).forEach(([key, val]) => {
        updateState(key, val);
      });
    }
    setCurrentScreen('home');
    addLog('system', `"${item.prompt}" tasarımı yüklendi.`);
  }, [clearState, updateState, addLog]);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const executeSingleAction = useCallback(async (action) => {
    if (!action || !action.functionName) return null;

    if (action.functionName === 'NAVIGATE' || action.functionName === 'NAVIGATE_TO_PAGE') {
      const screenId = action.screenId || action.pageId || 'home';
      updateState('currentAppScreen', screenId);
      addLog('system', `Navigasyon: "${screenId}" ekranına geçildi.`);
      return screenId;
    }

    const func = FUNCTION_REGISTRY[action.functionName];
    if (!func) {
      addLog('error', `❌ Fonksiyon bulunamadı: "${action.functionName}"`);
      showToast(`Fonksiyon bulunamadı: "${action.functionName}"`, 'error');
      return null;
    }

    addLog('action', `Çalıştırılıyor: ${action.functionName}...`);

    try {
      let inputData;
      if (action.inputKey) {
        inputData = stateRef.current[action.inputKey];
        if (inputData === undefined || inputData === '') {
          addLog('warn', `⚠ inputKey "${action.inputKey}" state store'da boş veya tanımsız.`);
        }
      } else if (action.inputKeys) {
        inputData = {};
        Object.entries(action.inputKeys).forEach(([paramName, stateKey]) => {
          inputData[paramName] = stateRef.current[stateKey];
        });
      }

      addLog('info', `Input [${action.inputKey || 'none'}]: "${JSON.stringify(inputData)}"`);

      const result = await func(inputData, action, stateRef.current, updateState);

      addLog('success', `✅ Sonuç: "${result}"`);

      if (action.outputKey) {
        updateState(action.outputKey, result);
        addLog('info', `Output [${action.outputKey}] ← "${result}"`);
      }
      return result;
    } catch (error) {
      addLog('error', `❌ Çalıştırma hatası: ${error.message}`);
      showToast(`Hata: ${error.message}`, 'error');
      return null;
    }
  }, [updateState, addLog, showToast]);

  const checkConditions = useCallback((conditions) => {
    if (!conditions || !Array.isArray(conditions)) return { passed: true };
    for (const cond of conditions) {
      const val = stateRef.current[cond.stateKey] !== undefined ? stateRef.current[cond.stateKey] : '';
      let passed = false;
      const condVal = cond.value;

      switch (cond.operator) {
        case 'eq': passed = String(val) === String(condVal); break;
        case 'neq': passed = String(val) !== String(condVal); break;
        case 'gt': passed = parseFloat(val) > parseFloat(condVal); break;
        case 'lt': passed = parseFloat(val) < parseFloat(condVal); break;
        case 'gte': passed = parseFloat(val) >= parseFloat(condVal); break;
        case 'lte': passed = parseFloat(val) <= parseFloat(condVal); break;
        case 'contains': passed = String(val).toLowerCase().includes(String(condVal).toLowerCase()); break;
        default: passed = true;
      }
      if (!passed) {
        return { passed: false, message: cond.failMessage || `Koşul sağlanmadı: ${cond.stateKey}` };
      }
    }
    return { passed: true };
  }, []);

  const dispatchAction = useCallback(async (action) => {
    if (!action) return;

    if (action.conditions) {
      const condResult = checkConditions(action.conditions);
      if (!condResult.passed) {
        addLog('warn', `⚠ Koşul Başarısız: ${condResult.message}`);
        showToast(condResult.message, 'error');
        return;
      }
    }

    let finalResult;
    if (action.actions && Array.isArray(action.actions)) {
      addLog('info', `⛓ Zincir eylem başlatıldı (${action.actions.length} adım)...`);
      for (let i = 0; i < action.actions.length; i++) {
        const subAction = action.actions[i];
        addLog('info', `Adım ${i + 1}/${action.actions.length}: ${subAction.functionName}`);
        finalResult = await executeSingleAction(subAction);
      }
      if (action.successMessage) {
        showToast(action.successMessage, 'success');
      } else {
        showToast('Eylemler başarıyla tamamlandı!', 'success');
      }
    } else {
      finalResult = await executeSingleAction(action);
      if (finalResult !== null && action.successMessage) {
        showToast(action.successMessage, 'success');
      }
    }
  }, [checkConditions, executeSingleAction, addLog, showToast]);

  return (
    <EngineContext.Provider
      value={{
        stateStore,
        updateState,
        clearState,
        currentLayout,
        setCurrentLayout,
        logs,
        setLogs,
        addLog,
        dispatchAction,
        isLoading,
        setIsLoading,
        isConsoleVisible,
        setIsConsoleVisible,
        prompt,
        setPrompt,
        savedUIs,
        setSavedUIs,
        saveUI,
        deleteUI,
        loadUI,
        currentScreen,
        setCurrentScreen,
        toast,
        showToast,
        hideToast,
        apiKey,
        updateApiKey,
      }}
    >
      {children}
    </EngineContext.Provider>
  );
};
