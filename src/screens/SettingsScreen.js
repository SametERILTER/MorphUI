import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEngine } from '../context/EngineContext';
import { COLORS } from '../constants/colors';
import { MOCK_TEMPLATES } from '../templates/mockTemplates';

export default function SettingsScreen() {
  const {
    apiKey,
    updateApiKey,
    setCurrentScreen,
    setSavedUIs,
    setLogs,
    addLog,
    setCurrentLayout,
    clearState,
    setPrompt,
    updateState
  } = useEngine();

  const [localKey, setLocalKey] = useState(apiKey || '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setLocalKey(apiKey);
    }
  }, [apiKey]);

  const handleSaveApiKey = () => {
    updateApiKey(localKey);
    Alert.alert('Başarılı', 'Gemini API anahtarınız kaydedildi.');
    addLog('system', localKey ? 'API Key ayarlar ekranında güncellendi.' : 'API Key kaldırıldı.');
  };

  const loadTemplate = (key) => {
    const template = MOCK_TEMPLATES[key];
    if (template) {
      clearState();
      setCurrentLayout(template.layout);
      setPrompt(template.prompt);
      addLog('system', `"${template.title}" şablonu yüklendi.`);

      const scanAndHealState = (node) => {
        if (!node) return;
        if (node.stateKey && node.stateKey.trim()) {
          updateState(node.stateKey, node.value !== undefined ? node.value : '');
        }
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(scanAndHealState);
        }
      };
      scanAndHealState(template.layout);

      setCurrentScreen('home');
    }
  };

  const handleSystemReset = () => {
    Alert.alert(
      'Sistemi Sıfırla',
      'Kaydedilen tüm uygulamalar ve işlem günlükleri silinecektir. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sıfırla',
          style: 'destructive',
          onPress: async () => {
            setSavedUIs([]);
            setLogs([]);
            setCurrentLayout(null);
            clearState();
            Alert.alert('Sıfırlandı', 'Tüm yerel veriler temizlendi.');
            addLog('system', 'Sistem yerel verileri sıfırlandı.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0)']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentScreen('home')}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.devBanner}>
          <View style={styles.devBannerHeader}>
            <Ionicons name="warning-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text style={styles.devBannerTitle}>Bu Uygulama Geliştirme Aşamasındadır</Text>
          </View>
          <Text style={styles.devBannerDesc}>
            Bu uygulama aktif geliştirme ve deneysel aşamadadır. Yapay zeka tarafından dinamik olarak üretilen arayüzler, formlar ve eylemler test amaçlı sunulmaktadır.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Gemini API Ayarı</Text>
          </View>
          <Text style={styles.cardDesc}>
            Uygulama üretme işlemlerinin çalışabilmesi için geçerli bir Gemini API anahtarı girin.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="AIzaSy..."
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              value={localKey}
              onChangeText={setLocalKey}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#cbd5e1"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveApiKey}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
          </TouchableOpacity>
        </View>


        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="color-wand-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Hazır Şablonlar</Text>
          </View>
          <Text style={styles.cardDesc}>
            API anahtarınız yoksa uygulamanın yerel render motorunu test etmek için şablonları kullanabilirsiniz.
          </Text>

          <View style={styles.templatesColumn}>
            <TouchableOpacity
              style={[styles.templatePill, { borderColor: '#6366f1' }]}
              onPress={() => loadTemplate('tempConverter')}
            >
              <Ionicons name="calculator-outline" size={16} color="#6366f1" style={{ marginRight: 8 }} />
              <Text style={styles.templatePillText}>Derece Çevirici</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.templatePill, { borderColor: '#10b981' }]}
              onPress={() => loadTemplate('cryptoTracker')}
            >
              <Ionicons name="trending-up-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.templatePillText}>Kripto Canlı Takip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.templatePill, { borderColor: '#eab308' }]}
              onPress={() => loadTemplate('bmiCalculator')}
            >
              <Ionicons name="heart-half-outline" size={16} color="#eab308" style={{ marginRight: 8 }} />
              <Text style={styles.templatePillText}>Sağlık & VKİ Takibi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.templatePill, { borderColor: '#ef4444' }]}
              onPress={() => loadTemplate('passwordGenerator')}
            >
              <Ionicons name="key-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.templatePillText}>Şifre Üretici</Text>
            </TouchableOpacity>
          </View>
        </View>


        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="options-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Motor Yapılandırması</Text>
          </View>
          <Text style={styles.cardDesc}>
            MorphUI şu anda çevrimdışı ve çevrimiçi hibrit derleme motoruyla çalışmaktadır.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Arayüz Sürümü</Text>
            <Text style={styles.infoVal}>v1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kullanılan Yapay Zeka Modeli</Text>
            <Text style={styles.infoVal}>Gemma 4</Text>
          </View>
        </View>


        <View style={[styles.card, { borderColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Tehlikeli Bölge</Text>
          </View>
          <Text style={styles.cardDesc}>
            Uygulamanın kaydettiği tüm şablonları sıfırlayarak ilk haline döndürür.
          </Text>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleSystemReset}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.resetBtnText}>Tüm Verileri Sıfırla</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 80
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 140 : 90,
    paddingTop: Platform.OS === 'android' ? 48 : 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.input,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 120 : 100,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  cardDesc: {
    color: '#71717a',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 6,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  templatesColumn: {
    gap: 10,
  },
  templatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  templatePillText: {
    color: '#f4f4f5',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  infoVal: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  resetBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  devBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  devBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  devBannerTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  devBannerDesc: {
    color: '#d4d4d8',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
