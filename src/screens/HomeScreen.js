import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Keyboard,
  BackHandler,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEngine } from '../context/EngineContext';
import DynamicRenderer from '../components/DynamicRenderer';
import DebugConsole from '../components/DebugConsole';
import PremiumLoader from '../components/PremiumLoader';
import { MOCK_TEMPLATES } from '../templates/mockTemplates';
import { generateUI, generateUIStream } from '../utils/gemini';
import { COLORS } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, withSequence, withRepeat, Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown, BounceIn } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const parsePartialJSON = (jsonStr) => {
  let cleaned = jsonStr.trim();
  if (!cleaned) return null;

  const startIdx = cleaned.indexOf('{');
  if (startIdx === -1) return null;
  cleaned = cleaned.slice(startIdx);

  const getClosingSuffix = (str) => {
    let inString = false;
    let escape = false;
    const stack = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          stack.pop();
        } else if (char === ']') {
          stack.pop();
        }
      }
    }
    let suffix = '';
    if (inString) suffix += '"';
    for (let i = stack.length - 1; i >= 0; i--) {
      suffix += stack[i] === '{' ? '}' : ']';
    }
    return suffix;
  };


  for (let len = cleaned.length; len > 0; len--) {
    let candidate = cleaned.slice(0, len).trim();
    if (candidate.endsWith(',') || candidate.endsWith(':')) {
      candidate = candidate.slice(0, -1).trim();
    }

    const suffix = getClosingSuffix(candidate);
    const testJson = candidate + suffix;
    try {
      const obj = JSON.parse(testJson);

      if (obj && (obj.type || obj.layout)) {
        return obj;
      }
    } catch (e) {
    }

    if (cleaned.length - len > 200) break;
  }
  return null;
};

const LOADING_MESSAGES = [
  'Yapay zeka arayüz kodlarını yazıyor...',
  'Tasarım sistemi bileşenleri bağlanıyor...',
  'Dinamik veri akış yolları kuruluyor...',
  'REST API entegrasyonu ayarlanıyor...',
  'JavaScript güvenli çalışma motoru hazırlanıyor...',
  'Arayüz elementleri milimetrik olarak hizalanıyor...',
];

const SUGGESTIONS = [
  { id: '1', icon: 'wallet-outline', text: 'Bahşiş Bölüştürücü', prompt: 'Gelişmiş Bahşiş Bölüştürücü: Toplam hesap tutarı için bir TextInput, bahşiş oranı (%0-%30) için Slider ve kişi sayısı için başka bir TextInput al. RUN_SCRIPT eylemi ile kişi başına düşen bahşişi ve ödenecek toplam miktarı hesapla. Sonuçları şık bir Card içinde göster, yeşil accent kullan ve butonları dikey diz.' },
  { id: '2', icon: 'water-outline', text: 'Su Takipçisi', prompt: 'Günlük Su Takipçisi: Hedef su miktarını (ml) belirlemek için bir Slider barındır. Ekranda o ana kadar içilen suyu gösteren bir state değişkeni (örn: currentWater) olsun. \'250ml Ekle\' ve \'500ml Ekle\' butonlarıyla RUN_SCRIPT kullanarak suyu artır. İlerlemeyi ProgressBar ile göster ve hedefe ulaşınca \'Hedefe Ulaşıldı!\' şeklinde bir yeşil Badge göster.' },
  { id: '3', icon: 'fitness-outline', text: 'VKİ Sağlık Rehberi', prompt: 'Sağlık & VKİ Analizörü: Boy (cm) ve kilo (kg) değerlerini alarak RUN_SCRIPT ile Vücut Kitle Endeksini hesapla. Hesaplanan VKİ değerine göre durum kategorisini (Zayıf, Normal, Kilolu, Obez) belirleyip renkli bir Badge ile göster. Ekranda ProgressBar ile ilerlemeyi göster ve altında sağlıklı yaşam tavsiyelerini ListItem ile listele.' },
  { id: '4', icon: 'shield-checkmark-outline', text: 'Şifre Üretici & Güvenlik', prompt: 'Gelişmiş Şifre Üretici: Şifre uzunluğunu 6-25 arası belirleyen bir Slider, sayılar ve semboller eklemek için iki farklı Switch kullan. RUN_SCRIPT ile şifreyi dinamik olarak üret ve kalitesini (zayıf, orta, güçlü) harflerin, sayıların ve sembollerin varlığına göre hesaplayıp renkli Badge ve ProgressBar ile ekranda göster.' },
  { id: '5', icon: 'trending-up-outline', text: 'Kripto Portföyü', prompt: 'Kripto Portföy Takipçisi: Kullanıcının cüzdanındaki BTC, ETH ve SOL miktarlarını girmesi için alanlar sun. Bir buton yardımıyla FETCH_CRYPTO_PRICE API\'sini kullanarak bu kripto paraların canlı fiyatını çekip toplam portföy değerini anlık olarak USDT cinsinden hesaplayan ve her kripto için ayrı bir ListItem içinde fiyat gösteren şık bir portföy uygulaması tasarla.' },
  { id: '6', icon: 'cloudy-night-outline', text: 'Hava Durumu & Öneri', prompt: 'Akıllı Seyahat & Hava Durumu: Kullanıcıdan şehir ismi alıp FETCH_WEATHER API\'si yardımıyla güncel sıcaklık ve nem oranını çek. Sıcaklık 15 derecenin altındaysa \'Kalın giyinin\', 25 derecenin üstündeyse \'Güneş gözlüğü alın\' gibi dinamik seyahat tavsiyelerini şık kartlar ve seyahat ikonları eşliğinde ekranda listele.' },
  { id: '7', icon: 'cart-outline', text: 'Alışveriş Sepeti & KDV', prompt: 'Akıllı Alışveriş Sepeti: Ürün adı ve fiyatını alıp listeye ekleyen (sepet), KDV oranını (%1, %10, %20) seçmek için bir Select bileşeni sunan ve eklendikçe toplam tutar ile toplam KDV\'yi RUN_SCRIPT ile hesaplayan şık bir sepet uygulaması yap. Sepeti temizleme butonunu en alta ekle.' },
  { id: '8', icon: 'shuffle-outline', text: 'Karar Verici', prompt: 'Eğlenceli Karar Verici: Kararsız kalınan durumlar için özelleştirilebilir 3 seçenek girme alanı sun. RUN_SCRIPT kullanarak bu seçenekler arasından rastgele birini seçip ekranda büyükçe göster. Ayrıca yazı-tura atma ve zar sallama modlarını barındıran ek sekmeleri olsun.' },
  { id: '9', icon: 'qr-code-outline', text: 'QR Kartvizit Oluşturucu', prompt: 'Dinamik QR Kartvizit: İsim, telefon numarası ve web sitesi gibi kişisel bilgileri alan form tasarla. Butona basıldığında GENERATE_QR_URL API\'sini çağırarak dinamik olarak bir vCard QR kodu görseli üreten ve bunu şık bir dijital kartvizit içinde gösteren premium bir kimlik kartı yap.' },
  { id: '10', icon: 'timer-outline', text: 'Pomodoro Sayacı', prompt: 'Pomodoro Odak Sayacı: Çalışma (25 dk) ve mola (5 dk) sürelerini belirlemek için Chip\'ler sun. Kalan süreyi geriye doğru saydıracak RUN_SCRIPT kodlarını ve başlat/durdur/sıfırla butonlarını içeren, ilerlemeyi ProgressBar ile gösteren, odaklanma durumunu Badge ile vurgulayan modern bir pomodoro zamanlayıcısı tasarla.' },
  { id: '11', icon: 'hourglass-outline', text: 'Yaşam Sayacı & Yaş', prompt: 'Yaşam & Yaş Analizörü: Kullanıcının doğum tarihini alan bir DatePicker bileşeni ekle. CALCULATE_AGE fonksiyonunu çağırarak kullanıcının hayatta kaldığı gün, saat ve dakika sayılarını göster. Bir sonraki doğum gününe kalan gün sayısını ProgressBar ve Badge ile görselleştiren şık bir yaşam sayacı tasarla.' },
  { id: '12', icon: 'analytics-outline', text: 'Kredi Taksit Planlama', prompt: 'Akıllı Kredi Planlayıcı: Kredi tutarı, yıllık faiz oranı ve vade süresini (yıl olarak) alan TextInput alanları sun. CALCULATE_LOAN_EMI fonksiyonunu tetikleyen bir buton ekleyerek aylık taksit tutarını, toplam faiz yükünü ve toplam geri ödemeyi hesaplayıp ListItem bileşenleri ile detaylı döküm halinde göster.' },
];


const resolveLayoutNode = (result) => {
  if (!result) return null;

  if (result.type) return result;

  const keys = ['layout', 'Layout', 'ui', 'UI', 'app', 'App', 'components', 'component'];
  for (const key of keys) {
    if (result[key] && typeof result[key] === 'object') {
      if (Array.isArray(result[key]) || result[key].type) {
        return result[key];
      }
    }
  }

  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.type) {
        return value;
      }
    }
  }

  return result;
};

export default function HomeScreen() {
  const {
    stateStore,
    currentLayout,
    setCurrentLayout,
    addLog,
    clearState,
    updateState,
    isLoading,
    setIsLoading,
    isConsoleVisible,
    setIsConsoleVisible,
    prompt,
    setPrompt,
    savedUIs,
    saveUI,
    deleteUI,
    loadUI,
    setCurrentScreen,
    apiKey,
  } = useEngine();

  const hasTabs = currentLayout?.type === 'MultiScreenApp' && Array.isArray(currentLayout?.props?.tabs);
  const currentAppScreen = stateStore.currentAppScreen || currentLayout?.props?.initialScreen || 'home';
  const tabBarHeight = Platform.OS === 'ios' ? 76 : 60;

  const appStateRef = useRef(AppState.currentState);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const textOpacity = useSharedValue(0);

  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const collapseTimerRef = useRef(null);

  const startCollapseTimer = React.useCallback((delay = 2000) => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsDockCollapsed(true);
    }, delay);
  }, []);

  const resetCollapseTimer = React.useCallback(() => {
    if (!isDockCollapsed) {
      startCollapseTimer(4000);
    }
  }, [isDockCollapsed, startCollapseTimer]);

  React.useEffect(() => {
    if (currentLayout) {
      setIsDockCollapsed(false);
      startCollapseTimer(2000);
      return () => {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      };
    } else {
      setIsDockCollapsed(false);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    }
  }, [currentLayout, startCollapseTimer]);

  React.useEffect(() => {
    const handleBackPress = () => {
      if (currentLayout) {
        setCurrentLayout(null);
        clearState();
        setPrompt('');
        addLog('system', 'Arayüze geri dönüldü.');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      subscription.remove();
    };
  }, [currentLayout]);

  const animatedSparklesStyle = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed;
    const duration = 350;
    const easing = Easing.bezier(0.25, 1, 0.4, 1);
    return {
      backgroundColor: withTiming(isCollapsed ? 'rgba(255, 255, 255, 0.12)' : COLORS.primary, { duration, easing }),
      borderColor: withTiming(isCollapsed ? 'rgba(255, 255, 255, 0.08)' : 'transparent', { duration, easing }),
      borderWidth: withTiming(isCollapsed ? 1 : 0, { duration, easing }),
      transform: [{ scale: 1 }],
    };
  });

  const animConfig = {
    duration: 350,
    easing: Easing.bezier(0.25, 1, 0.4, 1),
  };

  const btnStyleClose = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed;
    return {
      width: withTiming(isCollapsed ? 0 : 52, animConfig),
      height: withTiming(isCollapsed ? 0 : 52, animConfig),
      opacity: withTiming(isCollapsed ? 0 : 1, { duration: 180 }),
      transform: [
        { scale: withTiming(isCollapsed ? 0.3 : 1, animConfig) },
        { translateX: withTiming(isCollapsed ? 124 : 0, animConfig) }
      ],
      marginHorizontal: withTiming(isCollapsed ? -6 : 0, animConfig),
    };
  });

  const btnStyleTerminal = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed;
    return {
      width: withTiming(isCollapsed ? 0 : 52, animConfig),
      height: withTiming(isCollapsed ? 0 : 52, animConfig),
      opacity: withTiming(isCollapsed ? 0 : 1, { duration: 180 }),
      transform: [
        { scale: withTiming(isCollapsed ? 0.3 : 1, animConfig) },
        { translateX: withTiming(isCollapsed ? 62 : 0, animConfig) }
      ],
      marginHorizontal: withTiming(isCollapsed ? -6 : 0, animConfig),
    };
  });

  const btnStyleSave = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed;
    return {
      width: withTiming(isCollapsed ? 0 : 52, animConfig),
      height: withTiming(isCollapsed ? 0 : 52, animConfig),
      opacity: withTiming(isCollapsed ? 0 : 1, { duration: 180 }),
      transform: [
        { scale: withTiming(isCollapsed ? 0.3 : 1, animConfig) },
        { translateX: withTiming(isCollapsed ? -62 : 0, animConfig) }
      ],
      marginHorizontal: withTiming(isCollapsed ? -6 : 0, animConfig),
    };
  });

  const btnStyleFolder = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed;
    return {
      width: withTiming(isCollapsed ? 0 : 52, animConfig),
      height: withTiming(isCollapsed ? 0 : 52, animConfig),
      opacity: withTiming(isCollapsed ? 0 : 1, { duration: 180 }),
      transform: [
        { scale: withTiming(isCollapsed ? 0.3 : 1, animConfig) },
        { translateX: withTiming(isCollapsed ? -124 : 0, animConfig) }
      ],
      marginHorizontal: withTiming(isCollapsed ? -6 : 0, animConfig),
    };
  });

  const [showWizard, setShowWizard] = useState(false);
  const [showLargeInputModal, setShowLargeInputModal] = useState(false);
  const [wizMode, setWizMode] = useState('app');
  const [wizardStep, setWizardStep] = useState(1);
  const [wizType, setWizType] = useState('Hesaplama / Analiz');
  const [wizTypeCustom, setWizTypeCustom] = useState('');

  const [wizData, setWizData] = useState('');
  const [wizTheme, setWizTheme] = useState('Modern Dark (Siyah ve Indigo)');
  const [wizThemeCustom, setWizThemeCustom] = useState('');
  const [wizFeatures, setWizFeatures] = useState([]);
  const [wizFeaturesCustom, setWizFeaturesCustom] = useState('');

  const [wizRadius, setWizRadius] = useState(12);
  const [wizUseBadges, setWizUseBadges] = useState(true);
  const [wizStackButtons, setWizStackButtons] = useState(true);
  const [wizUseDefaults, setWizUseDefaults] = useState(true);

  const toggleUseDefaults = () => {
    const next = !wizUseDefaults;
    setWizUseDefaults(next);
    if (next) {
      setWizRadius(12);
      setWizUseBadges(true);
      setWizStackButtons(true);
    }
  };

  const handleCompleteWizard = () => {
    const finalType = wizMode === 'game'
      ? (wizType === 'Diğer Özel Oyun' && wizTypeCustom.trim() ? wizTypeCustom.trim() : wizType)
      : (wizType === 'Diğer (Kendi Yaz)' && wizTypeCustom.trim() ? wizTypeCustom.trim() : wizType);
    const finalTheme = wizTheme === 'Diğer (Kendi Yaz)' && wizThemeCustom.trim() ? wizThemeCustom.trim() : wizTheme;

    let finalPrompt = '';
    if (wizMode === 'game') {
      finalPrompt = `Sen son derece yetenekli, profesyonel bir mobil oyun geliştiricisisin. `;
      finalPrompt += `Aşağıda konusu ve oynanış tarzı belirtilen mobil mini oyunu MorphUI içerisinde çalışacak şekilde tasarla ve geliştir.\n\n`;
      finalPrompt += `ÖNEMLİ KURAL: Bu oyun, tamamen self-contained (kendi kendine yeten) bir "Mini Oyun" (Game Micro-App) olarak çalışacaktır. Oyun döngüsünü, fizik hesaplamalarını ve çarpışma kontrollerini GameCanvas bileşeninin "onTickAction" props'u içinde yer alan "RUN_SCRIPT" JavaScript koduyla akıcı bir şekilde yönetmelisin. Ekranda hareket edecek nesneler (örneğin oyuncu, engeller, mermiler vb.) için mutlaka GameObject bileşenleri kullan ve bu GameObject bileşenlerinin x ve y konumlarını state değişkenlerine "bindX" ve "bindY" kullanarak bağla. GameObject props olarak x ve y yerine dynamic konumlandırma için bindX ve bindY kullanılması mecburidir.\n\n`;
      finalPrompt += `Tasarım Amacı: ${finalType} oyunu.\n`;
      finalPrompt += `Oyun Kuralları ve Detayları: ${wizData || 'Belirtilmedi'}.\n`;
      finalPrompt += `Tasarım Stili ve Renkler: ${finalTheme} teması. Oyun ekranı arka planı ve renklerinde degredeler (gradient) veya LinearGradient bileşenlerini kesinlikle kullanma, düz (solid) renkler kullan.\n\n`;
      finalPrompt += `Oyun Tasarımı Kuralları:\n`;
      finalPrompt += `- GameCanvas yüksekliğini 400-500 civarında ayarla. İçerisine oyuncu (GameObject) ve engelleri (GameObject) yerleştir.\n`;
      finalPrompt += `- Başlama (START), Oynanma (PLAYING) ve Kaybetme (GAMEOVER) durumlarını yöneten bir "gameState" state değişkeni tanımla.\n`;
      finalPrompt += `- Skor ve En Yüksek Skor (highScore) takibini yap.\n`;
      finalPrompt += `- Eylemleri tetiklemek için ekranın altına zıplama/başlatma butonu (Button) yerleştir.\n`;
    } else {
      finalPrompt = `Sen son derece yetenekli, profesyonel bir mobil arayüz tasarımcısı ve uzman bir yazılım geliştiricisisin. `;
      finalPrompt += `Aşağıda konusu belirtilen mobil uygulama için olabilecek tüm adımları, ekran durumlarını, gerekli verileri ve hesaplama/gösterim mantıklarını derinlemesine düşünerek, kullanıcıya en profesyonel deneyimi sunacak zengin ve eksiksiz bir mobil arayüz tasarla. Uygulamanın tam işlevsel olması için gerekli olan her türlü bileşeni (ProgressBar, Badge, ListItem, Select vb.) kendin seç ve özgürce yerleştir.\n\n`;
      finalPrompt += `ÖNEMLİ KURAL: Bu uygulama, yerel veritabanı, yerel depolama (SQLite/key-value), kullanıcı kayıt/oturum yönetimi (Auth), kamera, GPS/harita veya anlık bildirim gibi yerel cihaz özelliklerine sahip olmayan, tamamen self-contained (kendi kendine yeten) bir "Mini Uygulama" (Micro-App) olarak çalışacaktır. Dolayısıyla, veritabanı veya karmaşık cihaz özellikleri gerektiren sahte/çalışmayan ekranlar veya eylemler tasarlama. Tüm hesaplama, form ve listeleme işlemlerini sadece sana sağlanan bileşenler ve state değişkenlerini değiştiren "RUN_SCRIPT" JavaScript kodlarıyla tamamen lokalde çalışır şekilde tasarla.\n\n`;
      finalPrompt += `Tasarım Amacı: ${finalType} uygulaması.\n`;
      finalPrompt += `Uygulama Konusu ve İşlenecek Veri: ${wizData || 'Belirtilmedi'}.\n`;
      finalPrompt += `Tasarım Stili ve Renkler: ${finalTheme} teması. ÖNEMLİ KURAL: Genel uygulama arka plan rengi (background) ve kart arka planları (card) kesinlikle renkli olmamalıdır; her zaman orijinal koyu, minimalist siyah/gri tonlarında kalmalıdır. Seçilen bu renk teması yalnızca butonlar, durum rozetleri (badge), ilerleme çubuğu (ProgressBar) dolguları, aktif switchler ve vurgulanan metinler gibi etkileşimli elemanlar için bir "Vurgu/Accent Rengi" olarak kullanılmalıdır.\n\n`;
      finalPrompt += `Tasarım Kuralları:\n`;
      finalPrompt += `- Uygulama başlığı en üstte sola hizalı (textAlign: "left") ve "xl" boyutunda olsun.\n`;
      finalPrompt += `- Verileri ve değerleri yan yana göstermek için mutlaka Row bileşeni kullan.\n`;
      finalPrompt += `- Kartlar arasında boşluk bırakmak için Spacer kullan.\n`;
      finalPrompt += `- Kenar Yuvarlaklığı (Border Radius): `;
      if (wizUseDefaults) {
        finalPrompt += `Tüm Container, Card, Button, TextInput elemanları için standart Yuvarlak (16px) olsun.\n`;
      } else {
        finalPrompt += `Tüm Container, Card, Button, TextInput elemanları için ${wizRadius === 0 ? 'Keskin (0px) olsun, hiçbir köşede yuvarlaklık olmasın' : wizRadius === 24 ? 'Yumuşak (24px) olsun, geniş ve yumuşak köşeli olsun' : 'Yuvarlak (16px) olsun'}.\n`;
      }
      finalPrompt += `- Tasarım Kuralları: Degrade (gradient) veya LinearGradient bileşenlerini kesinlikle kullanma. Arka planlarda sadece düz (solid) renkler tercih et.\n\n`;
      if (wizUseDefaults || wizUseBadges) {
        finalPrompt += `- Durum Göstergeleri: Durumlar ve ilerlemeler için Badge ve ProgressBar bileşenlerini zengin biçimde yerleştir.\n`;
      }
      if (wizUseDefaults || wizStackButtons) {
        finalPrompt += `- Buton Yerleşimi: Eylem butonlarını dikey olarak alt alta listele.\n`;
      } else {
        finalPrompt += `- Buton Yerleşimi: Butonları dikey alt alta stack et.\n`;
      }
    }

    setPrompt(finalPrompt);
    setShowWizard(false);
    setIsExpanded(false);

    handleGenerate(finalPrompt);
  };

  const getWizDataPlaceholder = () => {
    if (wizMode === 'game') {
      return 'Örn: Kuş sarı renkli olsun, zıplama gücü -8 olsun. Engeller yeşil boru olsun, her geçişte 1 puan kazansın. Çarpışmada oyun bitsin...';
    }
    switch (wizType) {
      case 'Hesaplama / Analiz':
        return 'Örn: Aylık kredi taksit tutarı ve vade süresi hesaplama...';
      case 'Canlı Veri / API Entegrasyonu':
        return 'Örn: Güncel Bitcoin ve Ethereum fiyatlarını listeleyen canlı kripto takip uygulaması...';
      case 'Liste / Bilgi Yönetimi':
        return 'Örn: Yapılacak işleri öncelik sırasına göre ekleyip silebildiğim görev listesi...';
      case 'Form / Giriş Kontrolü':
        return 'Örn: İsim, e-posta, şifre ve onay kutusu içeren modern bir kullanıcı kayıt formu...';
      case 'Eğlence ve Oyun':
        return 'Örn: 1 ile 100 arasında rastgele tutulan sayıyı tahmin etmeye çalıştığım sayı tahmin oyunu...';
      case 'Kişisel Gelişim / Takip':
        return 'Örn: Günlük içtiğim su miktarını kaydeden ve hedefe olan ilerlemeyi gösteren takip asistanı...';
      default:
        return 'Örn: Aklınızdaki herhangi bir özel uygulama fikri ve detayları...';
    }
  };

  const getWizDataHint = () => {
    if (wizMode === 'game') {
      return 'Seçtiğiniz kategori: Oyun Tasarımı. Oyunun kurallarını, hızını, kontrol tuşlarını ve puanlama/kaybetme mantığını kısaca yazın.';
    }
    switch (wizType) {
      case 'Hesaplama / Analiz':
        return 'Seçtiğiniz kategori: Hesaplama ve Analiz. Bu uygulama neyi hesaplayacak? Girdileri ve formülleri birkaç kelime ile tarif edin.';
      case 'Canlı Veri / API Entegrasyonu':
        return 'Seçtiğiniz kategori: Canlı Veri ve API Takibi. Hangi internet servisinden (API) canlı veri çekeceğini veya neyi takip edeceğini belirtin.';
      case 'Liste / Bilgi Yönetimi':
        return 'Seçtiğiniz kategori: Liste ve Bilgi Yönetimi. Listenin ne listesi olacağını ve hangi eylemleri barındıracağını açıklayın.';
      case 'Form / Giriş Kontrolü':
        return 'Seçtiğiniz kategori: Form ve Giriş Kontrolü. Formda hangi girdi alanlarının (isim, e-posta, şifre vb.) bulunacağını belirtin.';
      case 'Eğlence ve Oyun':
        return 'Seçtiğiniz kategori: Eğlence ve Oyun. Oyunun kurallarını ve oynanış amacını kısaca özetleyin.';
      case 'Kişisel Gelişim / Takip':
        return 'Seçtiğiniz kategori: Kişisel Gelişim ve Takip. Neyi takip edeceğinizi ve günlük hedeflerinizi yazın.';
      default:
        return 'Bu uygulamanın tam olarak ne işe yarayacağını ve konusunu birkaç kelime ile tarif edin.';
    }
  };

  React.useEffect(() => {
    if (!currentLayout) {
      setShowInitialLoader(true);
      textOpacity.value = 0;

      const loaderTimer = setTimeout(() => {
        setShowInitialLoader(false);
      }, 4000);

      const textTimer = setTimeout(() => {
        textOpacity.value = withTiming(1, {
          duration: 1000,
          easing: Easing.out(Easing.quad)
        });
      }, 500);

      return () => {
        clearTimeout(loaderTimer);
        clearTimeout(textTimer);
      };
    }
  }, [currentLayout]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const isSaved = React.useMemo(() => {
    if (!currentLayout) return false;
    return savedUIs.some(item => JSON.stringify(item.layout) === JSON.stringify(currentLayout));
  }, [currentLayout, savedUIs]);

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  };

  const animatedToastStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withTiming(toastVisible ? 0 : -160, { duration: 350, easing: Easing.bezier(0.25, 1, 0.4, 1) }) }
      ],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  React.useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const inputWidth = useSharedValue(screenWidth - 32);

  React.useEffect(() => {
    let targetWidth = screenWidth - 32;
    if (isLoading) {
      targetWidth = 60;
    } else if (currentLayout && isDockCollapsed && !isExpanded) {
      targetWidth = 60;
    }
    inputWidth.value = withTiming(targetWidth, {
      duration: 350,
      easing: Easing.bezier(0.25, 1, 0.4, 1),
    });
  }, [isLoading, currentLayout, isDockCollapsed, isExpanded, screenWidth]);

  const animatedInputStyle = useAnimatedStyle(() => {
    const isCollapsed = isDockCollapsed && currentLayout && !isExpanded && !isLoading;
    const duration = 350;
    const easing = Easing.bezier(0.25, 1, 0.4, 1);
    return {
      width: inputWidth.value,
      transform: [
        { translateY: withTiming(isCollapsed ? 18 : 0, { duration, easing }) },
        { scale: withTiming(isCollapsed ? 0.85 : 1, { duration, easing }) }
      ],
    };
  });

  const sendSweepRotate = useSharedValue(0);
  const sendSweepOpacity = useSharedValue(0);

  const animatedSendSweepStyle = useAnimatedStyle(() => {
    return {
      opacity: sendSweepOpacity.value,
      transform: [
        { rotate: `${sendSweepRotate.value}deg` },
        { scale: 1.5 }
      ],
    };
  });

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isEmptyPromptModalVisible, setIsEmptyPromptModalVisible] = useState(false);
  const [isApiKeyMissingModalVisible, setIsApiKeyMissingModalVisible] = useState(false);
  const [isEditPanelVisible, setIsEditPanelVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#5e5ce6');
  const [selectedRadius, setSelectedRadius] = useState(12);

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setIsExpanded(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const detectAPIs = (node) => {
    if (!node) return [];
    const apis = [];
    const traverse = (item) => {
      if (!item) return;
      if (item.props?.onPressAction?.functionName === 'EXECUTE_API') {
        const url = item.props.onPressAction.apiUrl;
        if (url) {
          try {
            const match = url.match(/https?:\/\/([^/]+)/);
            if (match && match[1]) {
              apis.push(match[1]);
            } else {
              apis.push(url);
            }
          } catch (e) {
            apis.push(url);
          }
        }
      }
      if (item.children && Array.isArray(item.children)) {
        item.children.forEach(traverse);
      }
    };
    traverse(node);
    return [...new Set(apis)];
  };

  const usedAPIs = React.useMemo(() => detectAPIs(currentLayout), [currentLayout]);

  const animatedSuggestionsStyle = useAnimatedStyle(() => {
    const isVisible = !isKeyboardVisible && !isExpanded && !isLoading && !currentLayout;
    return {
      opacity: withTiming(isVisible ? 1 : 0, { duration: 250 }),
      transform: [
        { translateY: withTiming(isVisible ? 0 : 15, { duration: 250 }) },
      ],
      height: withTiming(isVisible ? 48 : 0, { duration: 250 }),
      marginBottom: withTiming(isVisible ? 12 : 0, { duration: 250 }),
    };
  });

  const handleSuggestionPress = (item) => {
    setPrompt(item.prompt);
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const scanAndHealState = (node) => {
    if (!node) return;
    let nodeCounter = 0;
    const traverse = (item) => {
      if (!item) return;
      nodeCounter++;
      if (!item.id) {
        item.id = `node_${Date.now()}_${nodeCounter}_${Math.floor(Math.random() * 1000)}`;
      }
      if (item.props?.bindState) {
        const key = item.props.bindState;
        if (stateStore[key] === undefined) {
          updateState(key, '');
        }
      }
      if (typeof item.props?.text === 'string') {
        const matches = item.props.text.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach(match => {
            const varName = match.slice(1, -1).trim();
            if (stateStore[varName] === undefined) {
              updateState(varName, '');
            }
          });
        }
      }
      if (item.children && Array.isArray(item.children)) {
        item.children.forEach(traverse);
      }
      if (item.screens && typeof item.screens === 'object') {
        Object.values(item.screens).forEach(traverse);
      }
    };
    traverse(node);
  };

  const collectTextNodes = (node, acc = []) => {
    if (!node) return acc;
    if (
      (node.type === 'Text' && typeof node.props?.text === 'string' && !node.props.text.includes('{')) ||
      (node.type === 'Button' && typeof node.props?.label === 'string')
    ) {
      acc.push(node);
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => collectTextNodes(child, acc));
    }
    if (node.screens && typeof node.screens === 'object') {
      Object.values(node.screens).forEach(screenNode => collectTextNodes(screenNode, acc));
    }
    return acc;
  };

  const updateNodeText = (nodeId, newText) => {
    if (!currentLayout) return;
    const updated = modifyLayoutStyles(currentLayout, (n) => {
      if (n.id === nodeId) {
        if (n.type === 'Text') {
          n.props = { ...n.props, text: newText };
        } else if (n.type === 'Button') {
          n.props = { ...n.props, label: newText };
        }
      }
    });
    setCurrentLayout(updated);
  };

  const updateAccentColor = (newColor) => {
    if (!currentLayout) return;
    const updated = modifyLayoutStyles(currentLayout, (n) => {
      if (n.type === 'Button') {
        if (!n.props) n.props = {};
        n.props.style = { ...n.props.style, backgroundColor: newColor };
      }

      if (n.props?.style) {
        if (n.props.style.borderColor && (n.props.style.borderColor === COLORS.primary || n.props.style.borderColor === '#5e5ce6')) {
          n.props.style = { ...n.props.style, borderColor: newColor };
        }

        if (n.props.style.color && (n.props.style.color === COLORS.primary || n.props.style.color === '#5e5ce6')) {
          n.props.style = { ...n.props.style, color: newColor };
        }
      }
    });
    setCurrentLayout(updated);
    addLog('system', `Uygulama renk teması güncellendi.`);
  };

  const updateBorderRadius = (radiusVal) => {
    if (!currentLayout) return;
    const updated = modifyLayoutStyles(currentLayout, (n) => {
      if (n.type === 'Button' || n.type === 'Container' || n.type === 'Card' || n.type === 'TextInput' || n.type === 'Image') {
        if (!n.props) n.props = {};
        n.props.style = { ...n.props.style, borderRadius: radiusVal };
      }
    });
    setCurrentLayout(updated);
    addLog('system', `Kenar yuvarlaklığı ${radiusVal}px olarak güncellendi.`);
  };

  const modifyLayoutStyles = (node, modifierFn) => {
    if (!node) return null;
    const cloned = { ...node, props: { ...node.props } };
    modifierFn(cloned);
    if (cloned.children && Array.isArray(cloned.children)) {
      cloned.children = cloned.children.map(child => modifyLayoutStyles(child, modifierFn));
    }
    if (cloned.screens && typeof cloned.screens === 'object') {
      const updatedScreens = {};
      for (const [key, screenNode] of Object.entries(cloned.screens)) {
        updatedScreens[key] = modifyLayoutStyles(screenNode, modifierFn);
      }
      cloned.screens = updatedScreens;
    }
    return cloned;
  };

  const loadTemplate = (key) => {
    const template = MOCK_TEMPLATES[key];
    if (template) {
      clearState();
      setCurrentLayout(template.layout);
      setPrompt(template.prompt);
      addLog('system', `"${template.title}" şablonu yüklendi.`);
      setShowApiKeyModal(false);

      scanAndHealState(template.layout);
    }
  };

  const abortControllerRef = useRef(null);

  const cancelGenerate = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      addLog('system', 'Arayüz oluşturma isteği iptal edildi.');
    }
  }, [addLog, setIsLoading]);

  const handleGenerate = async (customPrompt) => {
    Keyboard.dismiss();
    const promptToSend = typeof customPrompt === 'string' ? customPrompt : prompt;
    if (!promptToSend.trim()) {
      setIsEmptyPromptModalVisible(true);
      return;
    }

    if (!apiKey) {
      setIsApiKeyMissingModalVisible(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let isAborted = false;
    controller.signal.addEventListener('abort', () => {
      isAborted = true;
    });

    setIsLoading(true);
    clearState();
    setCurrentLayout(null);

    sendSweepRotate.value = 0;

    sendSweepOpacity.value = withSequence(
      withTiming(0.85, { duration: 600, easing: Easing.out(Easing.ease) }),
      withDelay(1200,
        withTiming(0, { duration: 1100, easing: Easing.in(Easing.ease) })
      )
    );

    sendSweepRotate.value = withTiming(120, {
      duration: 2400,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });

    addLog('system', `AI motoruna istek gönderiliyor: "${promptToSend}"...`);

    try {
      const result = await generateUI(promptToSend, apiKey, controller.signal);
      if (isAborted) return;

      const layoutNode = resolveLayoutNode(result);

      scanAndHealState(layoutNode);

      if (result.state && typeof result.state === 'object') {
        Object.entries(result.state).forEach(([key, val]) => {
          updateState(key, val);
        });
      }

      setIsLoading(false);
      setCurrentLayout(layoutNode);
      addLog('success', 'Yeni arayüz başarıyla oluşturuldu ve yüklendi!');
    } catch (error) {
      if (isAborted || error.name === 'AbortError' || error.message?.includes('aborted') || controller.signal.aborted) {
        addLog('system', 'İstek iptal edildi.');
        return;
      }

      addLog('error', `Arayüz oluşturma hatası: ${error.message}`);
      setApiError(error.message || 'Bilinmeyen bir hata oluştu');
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.topToastBanner, animatedToastStyle]}>
        <LinearGradient
          colors={['#059669', '#047857']}
          style={styles.toastGradient}
        >
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 10 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <KeyboardAvoidingView
        behavior={isKeyboardVisible ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0)']}
          style={styles.headerGradient}
          pointerEvents="none"
        />

        {!currentLayout && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => setCurrentScreen('settings')}
            >
              <Ionicons
                name="menu-outline"
                size={22}
                color="#cbd5e1"
              />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => setCurrentScreen('saved')}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={20}
                  color="#cbd5e1"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showWizard && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[StyleSheet.absoluteFill, styles.wizModalOverlay, { zIndex: 1000 }]}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFill}
              onPress={() => setShowWizard(false)}
            />

            <Animated.View
              entering={SlideInDown.duration(400).easing(Easing.out(Easing.quad))}
              exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.quad))}
              style={[styles.wizModalContent, { height: '90%' }]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Tasarım Sihirbazı</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Adım {wizardStep} / {wizMode === 'game' ? 3 : 4}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowWizard(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.wizProgressTrack}>
                <View style={[styles.wizProgressBar, { width: `${(wizardStep / (wizMode === 'game' ? 3 : 4)) * 100}%` }]} />
              </View>
              {wizardStep === 1 && (
                <View style={styles.wizModeTabs}>
                  <TouchableOpacity
                    style={[styles.wizModeTab, wizMode === 'app' && styles.wizModeTabActive]}
                    onPress={() => {
                      setWizMode('app');
                      setWizType('Hesaplama / Analiz');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="apps-outline" size={16} color={wizMode === 'app' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.wizModeTabText, wizMode === 'app' && styles.wizModeTabTextActive]}>Uygulama Üret</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.wizModeTab, wizMode === 'game' && styles.wizModeTabActive]}
                    onPress={() => {
                      setWizMode('game');
                      setWizType('Flappy Bird Clone');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="game-controller-outline" size={16} color={wizMode === 'game' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.wizModeTabText, wizMode === 'game' && styles.wizModeTabTextActive]}>Oyun Üret (Beta)</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {wizardStep === 1 && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.wizStepContainer}>
                    {wizMode === 'game' ? (
                      <>
                        <View style={styles.experimentalWarningCard}>
                          <Ionicons name="warning-outline" size={16} color="#f59e0b" style={{ marginRight: 8 }} />
                          <Text style={styles.experimentalWarningText}>Oyun üretimi deneyseldir ve düzgün çalışmayabilir.</Text>
                        </View>
                        <Text style={styles.wizStepQuestion}>Hangi tür oyun oynamak istersiniz?</Text>
                        {[
                          { key: 'Flappy Bird Clone', label: 'Flappy Bird Klonu', desc: 'Kuşu zıplatarak engeller arasından geçirdiğiniz Flappy Bird fizik oyunu.', icon: 'game-controller-outline' },
                          { key: 'Sayı Tahmin Oyunu', label: 'Sayı Tahmin Oyunu', desc: 'Bilgisayarın tuttuğu sayıyı tahmin etmeye çalıştığınız tahmin oyunu.', icon: 'help-circle-outline' },
                          { key: 'Hafıza Kartı Oyunu', label: 'Hafıza Eşleştirme', desc: 'Kartları eşleştirerek hafızanızı test ettiğiniz klasik kart eşleştirme oyunu.', icon: 'grid-outline' },
                          { key: 'XOX Oyunu (Tic Tac Toe)', label: 'XOX Oyunu', desc: 'İki oyunculu veya yapay zekaya karşı oynanan klasik XOX oyunu.', icon: 'close-outline' },
                          { key: 'Diğer Özel Oyun', label: 'Diğer Özel Oyun', desc: 'Kendi kurallarınızı ve tasarımınızı yazmak istediğiniz özel oyun fikri.', icon: 'sparkles-outline' }
                        ].map(item => {
                          const isActive = wizType === item.key;
                          return (
                            <TouchableOpacity
                              key={item.key}
                              style={[styles.wizOptionRow, isActive && styles.wizOptionRowActive]}
                              onPress={() => setWizType(item.key)}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.wizOptionIconContainer, isActive && styles.wizOptionIconContainerActive]}>
                                <Ionicons name={item.icon} size={20} color={isActive ? COLORS.primary : '#94a3b8'} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.wizOptionText, isActive && { color: COLORS.primary, fontWeight: 'bold' }]}>
                                  {item.label}
                                </Text>
                                <Text style={styles.wizOptionDesc}>{item.desc}</Text>
                              </View>
                              {isActive && (
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}

                        {wizType === 'Diğer Özel Oyun' && (
                          <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8 }}>
                            <Text style={styles.modalLabel}>Özel Oyun Türünü Yazın</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Örn: Pong Oyunu, Tuğla Kırma..."
                              placeholderTextColor="#64748b"
                              value={wizTypeCustom}
                              onChangeText={setWizTypeCustom}
                              autoFocus={true}
                            />
                          </Animated.View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.wizStepQuestion}>Uygulamanızın temel işlevi ne olacak?</Text>
                        {[
                          { key: 'Hesaplama / Analiz', label: 'Hesaplama ve Matematik', desc: 'Faiz, indirim, VKİ, formül hesaplayıcıları.', icon: 'calculator-outline' },
                          { key: 'Canlı Veri / API Entegrasyonu', label: 'Canlı Veri ve API Takibi', desc: 'Hava durumu, döviz, kripto fiyat takipleri.', icon: 'globe-outline' },
                          { key: 'Liste / Bilgi Yönetimi', label: 'Liste ve Görev Yönetimi', desc: 'Yapılacaklar listesi, harcama ajandası.', icon: 'list-outline' },
                          { key: 'Form / Giriş Kontrolü', label: 'Form ve Veri Kaydı', desc: 'Profil yönetimi, bilgi giriş formları.', icon: 'create-outline' },
                          { key: 'Eğlence ve Oyun', label: 'Eğlence ve Oyun', desc: 'Sayı tahmin, hafıza kartı veya XOX oyunu.', icon: 'game-controller-outline' },
                          { key: 'Kişisel Gelişim / Takip', label: 'Alışkanlık & Gelişim Takibi', desc: 'Su içme, kitap okuma, spor takip asistanı.', icon: 'trending-up-outline' },
                          { key: 'Diğer (Kendi Yaz)', label: 'Diğer (Kendin Tanımla)', desc: 'Özel veya listelenmemiş bir uygulama fikri.', icon: 'sparkles-outline' }
                        ].map(item => {
                          const isActive = wizType === item.key;
                          return (
                            <TouchableOpacity
                              key={item.key}
                              style={[styles.wizOptionRow, isActive && styles.wizOptionRowActive]}
                              onPress={() => setWizType(item.key)}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.wizOptionIconContainer, isActive && styles.wizOptionIconContainerActive]}>
                                <Ionicons name={item.icon} size={20} color={isActive ? COLORS.primary : '#94a3b8'} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.wizOptionText, isActive && { color: COLORS.primary, fontWeight: 'bold' }]}>
                                  {item.label}
                                </Text>
                                <Text style={styles.wizOptionDesc}>{item.desc}</Text>
                              </View>
                              {isActive && (
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}

                        {wizType === 'Diğer (Kendi Yaz)' && (
                          <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8 }}>
                            <Text style={styles.modalLabel}>Özel Uygulama Türünü Yazın</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Örn: Akıllı Ev Aydınlatma Kontrol Paneli..."
                              placeholderTextColor="#64748b"
                              value={wizTypeCustom}
                              onChangeText={setWizTypeCustom}
                              autoFocus={true}
                            />
                          </Animated.View>
                        )}
                      </>
                    )}
                  </Animated.View>
                )}

                {wizardStep === 2 && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.wizStepContainer}>
                    <Text style={styles.wizStepQuestion}>Bu uygulama ne uygulaması olacak?</Text>
                    <Text style={styles.wizStepHint}>
                      {getWizDataHint()}
                    </Text>
                    <TextInput
                      style={[styles.modalInput, { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }]}
                      placeholder={getWizDataPlaceholder()}
                      placeholderTextColor="#64748b"
                      multiline={true}
                      value={wizData}
                      onChangeText={setWizData}
                      autoFocus={true}
                    />
                  </Animated.View>
                )}

                {wizardStep === 3 && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.wizStepContainer}>
                    <Text style={styles.wizStepQuestion}>Hangi tasarım temasını istersiniz?</Text>
                    {[
                      { key: 'Modern Dark (Siyah ve Indigo)', label: 'Modern Koyu (Siyah & Indigo)', color: '#5e5ce6' },
                      { key: 'Emerald Green (Yeşil ve Siyah)', label: 'Zümrüt Yeşili (Yeşil & Koyu Gri)', color: '#10b981' },
                      { key: 'Cyberpunk (Koyu Gri ve Neon Turuncu)', label: 'Siberpunk (Neon Turuncu & Gri)', color: '#f97316' },
                      { key: 'Minimalist Gray (Sade Koyu Tonlar)', label: 'Minimalist Koyu Gri (Sade)', color: '#71717a' },
                      { key: 'Deep Purple (Asil Mor)', label: 'Asil Mor Teması', color: '#7c3aed' },
                      { key: 'Midnight Blue (Gece Mavisi)', label: 'Gece Mavisi Teması', color: '#0284c7' },
                      { key: 'Diğer (Kendi Yaz)', label: 'Diğer (Kendin Tanımla)', color: '#cbd5e1' }
                    ].map(item => {
                      const isActive = wizTheme === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.wizOptionRow, isActive && styles.wizOptionRowActive]}
                          onPress={() => setWizTheme(item.key)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={[styles.themePreviewDot, { backgroundColor: item.color }]} />
                            <Text style={[styles.wizOptionText, isActive && { color: COLORS.primary, fontWeight: 'bold' }]}>
                              {item.label}
                            </Text>
                          </View>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {wizTheme === 'Diğer (Kendi Yaz)' && (
                      <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8 }}>
                        <Text style={styles.modalLabel}>Özel Renk Temasını Yazın</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Örn: Koyu Kırmızı ve Gri (Vampire Theme)..."
                          placeholderTextColor="#64748b"
                          value={wizThemeCustom}
                          onChangeText={setWizThemeCustom}
                          autoFocus={true}
                        />
                      </Animated.View>
                    )}
                  </Animated.View>
                )}

                {wizardStep === 4 && (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.wizStepContainer}>
                    <Text style={styles.wizStepQuestion}>Görsel Özelleştirmeler (İsteğe Bağlı)</Text>
                    <Text style={[styles.wizStepHint, { marginBottom: 14 }]}>
                      Uygulamanızın tasarım şablonunu ve görsel detaylarını buradan özelleştirebilirsiniz.
                    </Text>

                    <TouchableOpacity
                      style={[styles.wizOptionRow, wizUseDefaults && styles.wizOptionRowActive, { marginBottom: 16 }]}
                      onPress={toggleUseDefaults}
                      activeOpacity={0.8}
                    >
                      <View style={{ marginRight: 12 }}>
                        <Ionicons
                          name={wizUseDefaults ? "checkbox" : "square-outline"}
                          size={22}
                          color={wizUseDefaults ? COLORS.primary : '#94a3b8'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.wizOptionText, wizUseDefaults && { color: COLORS.primary, fontWeight: 'bold' }]}>
                          Tümünü Varsayılan Tasarım Ayarlarıyla Yap
                        </Text>
                        <Text style={styles.wizOptionDesc}>Önerilen en uyumlu, şık ve premium standart ayarları uygular.</Text>
                      </View>
                    </TouchableOpacity>

                    <Text style={[styles.editorSectionTitle, { marginTop: 0, marginBottom: 8 }]}>Buton ve Kutu Kenar Yuvarlaklığı</Text>
                    <View style={[styles.radiusRow, wizUseDefaults && { opacity: 0.5 }]} pointerEvents={wizUseDefaults ? 'none' : 'auto'}>
                      {[
                        { label: 'Keskin', value: 0 },
                        { label: 'Yuvarlak (Varsayılan)', value: 16 },
                        { label: 'Yumuşak', value: 24 },
                      ].map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.radiusCard,
                            item.value === wizRadius && styles.radiusCardActive
                          ]}
                          onPress={() => {
                            setWizRadius(item.value);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.radiusCardText,
                            item.value === wizRadius && { color: COLORS.primary }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.editorSectionTitle, { marginTop: 16, marginBottom: 8 }]}>Ekstra Stil Tercihleri</Text>
                    <View style={wizUseDefaults && { opacity: 0.5 }} pointerEvents={wizUseDefaults ? 'none' : 'auto'}>
                      {[

                        {
                          key: 'badges',
                          label: 'Durum Rozetleri ve İlerleme Çubukları',
                          desc: 'Arayüzde ProgressBar ve Badge kullanımı yoğunlaştırılsın.',
                          checked: wizUseBadges,
                          onPress: () => setWizUseBadges(!wizUseBadges)
                        },
                        {
                          key: 'stackButtons',
                          label: 'Butonlar Alt Alta Dizilsin (Dikey Butonlar)',
                          desc: 'Taşmaları önlemek için eylem butonları dikey hizalansın.',
                          checked: wizStackButtons,
                          onPress: () => setWizStackButtons(!wizStackButtons)
                        }
                      ].map(item => (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.wizOptionRow, item.checked && styles.wizOptionRowActive]}
                          onPress={item.onPress}
                          activeOpacity={0.8}
                        >
                          <View style={{ marginRight: 12 }}>
                            <Ionicons
                              name={item.checked ? "checkbox" : "square-outline"}
                              size={20}
                              color={item.checked ? COLORS.primary : '#94a3b8'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.wizOptionText, item.checked && { fontWeight: '600' }]}>
                              {item.label}
                            </Text>
                            <Text style={styles.wizOptionDesc}>{item.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Animated.View>
                )}
              </ScrollView>

              <View style={styles.wizFooter}>
                {wizardStep > 1 ? (
                  <TouchableOpacity
                    style={styles.wizBackBtn}
                    onPress={() => setWizardStep(wizardStep - 1)}
                  >
                    <Text style={styles.wizBackBtnText}>Geri</Text>
                  </TouchableOpacity>
                ) : <View />}

                {wizardStep < (wizMode === 'game' ? 3 : 4) ? (
                  <TouchableOpacity
                    style={styles.wizNextBtn}
                    onPress={() => {
                      if (wizardStep === 1) {
                        if (wizMode === 'game') {
                          if (wizType === 'Diğer Özel Oyun' && !wizTypeCustom.trim()) {
                            Alert.alert('Eksik Bilgi', 'Lütfen özel oyun türünü yazın.');
                            return;
                          }
                        } else {
                          if (wizType === 'Diğer (Kendi Yaz)' && !wizTypeCustom.trim()) {
                            Alert.alert('Eksik Bilgi', 'Lütfen özel uygulama işlevinizi yazın.');
                            return;
                          }
                        }
                      }
                      if (wizardStep === 2 && !wizData.trim()) {
                        Alert.alert('Eksik Bilgi', wizMode === 'game' ? 'Lütfen oyun kurallarını kısaca yazın.' : 'Lütfen verilerin ne olduğunu kısaca yazın.');
                        return;
                      }
                      if (wizardStep === 3 && wizMode === 'app') {
                        if (wizTheme === 'Diğer (Kendi Yaz)' && !wizThemeCustom.trim()) {
                          Alert.alert('Eksik Bilgi', 'Lütfen özel tema renginizi yazın.');
                          return;
                        }
                      }
                      setWizardStep(wizardStep + 1);
                    }}
                  >
                    <Text style={styles.wizNextBtnText}>Devam Et</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.wizNextBtn, { backgroundColor: COLORS.primary }]}
                    onPress={() => {
                      handleCompleteWizard();
                    }}
                  >
                    <Text style={styles.wizNextBtnText}>Tasarımı Üret 🪄</Text>
                  </TouchableOpacity>
                )}
              </View>

            </Animated.View>
          </Animated.View>
        )}

        <SafeAreaView style={styles.mainArea}>
          {currentLayout ? (
            <ScrollView
              style={styles.canvasScrollView}
              contentContainerStyle={[
                styles.canvasScrollContent,
                hasTabs && { paddingBottom: isDockCollapsed ? (Platform.OS === 'ios' ? 200 : 200) : (Platform.OS === 'ios' ? 360 : 360) }
              ]}
            >
              <DynamicRenderer node={currentLayout} />

              {usedAPIs.length > 0 && (
                <View style={styles.apiIndicatorContainer}>
                  <Ionicons name="cloud-outline" size={14} color="#71717a" style={{ marginRight: 6 }} />
                  <Text style={styles.apiIndicatorText}>
                    Kullanılan Servisler: {usedAPIs.join(', ')}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.heroContainer}>
              {!isLoading ? (
                <Animated.View
                  key="idle-hero"
                  entering={FadeIn.duration(350)}
                  exiting={FadeOut.duration(300)}
                  style={{ alignItems: 'center' }}
                >
                  {showInitialLoader ? (
                    <Animated.View
                      key="initial-loader"
                      entering={FadeIn.duration(300)}
                      exiting={FadeOut.duration(300)}
                      style={{ height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}
                    >
                      <PremiumLoader />
                    </Animated.View>
                  ) : (
                    <Animated.View
                      key="sparkles-icon"
                      entering={FadeIn.duration(400)}
                      style={{ height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}
                    >
                      <Ionicons name="sparkles" size={80} color={COLORS.primary} style={[styles.heroIcon, { marginBottom: 0 }]} />
                    </Animated.View>
                  )}
                  <Animated.View style={[animatedTextStyle, { alignItems: 'center' }]}>
                    <Text style={styles.heroTitle}>Morph</Text>
                    <Text style={styles.heroSubtitle}>
                      Uygulamanızı tasarlamaya başlayın
                    </Text>
                  </Animated.View>
                </Animated.View>
              ) : (
                <Animated.View
                  key="loading-hero"
                  entering={FadeIn.duration(350)}
                  exiting={FadeOut.duration(300)}
                  style={{ alignItems: 'center' }}
                >
                  <PremiumLoader />
                  <Text style={styles.loaderTitle}>Uygulamanız hazırlanıyor</Text>
                  <Animated.Text
                    key={`loading-msg-${loadingMessageIndex}`}
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                    style={styles.loaderSubtitle}
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </Animated.Text>



                  <TouchableOpacity
                    style={styles.cancelGenerateBtn}
                    onPress={cancelGenerate}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.cancelGenerateBtnText}>Üretimi İptal Et</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}
        </SafeAreaView>

        {(hasTabs && !isLoading && !isKeyboardVisible) && (
          <View style={[
            styles.appTabBar,
            {
              position: 'absolute',
              bottom: isDockCollapsed ? (Platform.OS === 'ios' ? 100 : 100) : (Platform.OS === 'ios' ? 140 : 120),
              left: 20,
              right: 20,
              height: 56,
              borderRadius: 28,
              paddingBottom: 0,
              borderWidth: 0,
              backgroundColor: '#18181b',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 10,
              borderTopWidth: 0,
            }
          ]}>
            {currentLayout.props.tabs.map((tab) => {
              const isActive = currentAppScreen === tab.screenId;
              const normalizedIcon = tab.icon.endsWith('-outline') ? tab.icon : `${tab.icon}-outline`;
              const iconName = isActive ? tab.icon : normalizedIcon;
              return (
                <TouchableOpacity
                  key={tab.screenId}
                  activeOpacity={0.8}
                  style={styles.appTabItem}
                  onPress={() => updateState('currentAppScreen', tab.screenId)}
                >
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={isActive ? COLORS.primary : '#94a3b8'}
                  />
                  <Text style={[styles.appTabLabel, isActive && { color: COLORS.primary, fontWeight: '700' }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <LinearGradient
          colors={hasTabs ? ['transparent', 'transparent'] : ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.44)', 'rgba(0, 0, 0, 1)']}
          style={[
            styles.bottomContainer,
            {
              paddingBottom: isKeyboardVisible
                ? 12
                : (isDockCollapsed
                  ? (Platform.OS === 'ios' ? 72 : 56)
                  : (hasTabs
                    ? (Platform.OS === 'ios' ? 64 : 48)
                    : (Platform.OS === 'ios' ? 58 : 70)
                  )
                )
            }
          ]}
        >
          {(!currentLayout && !isExpanded && !isLoading) && (
            <TouchableOpacity
              style={styles.wizardBtn}
              onPress={() => {
                setWizardStep(1);
                setShowWizard(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wizardGradient}
              >
                <Ionicons name="sparkles-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.wizardBtnText}>Tasarım Sihirbazı ile Başla</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}


          <Animated.View style={[styles.suggestionsContainer, animatedSuggestionsStyle]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.suggestionText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>


          {((!currentLayout || isExpanded) && !isLoading) && (
            <View
              style={[
                styles.bottomInputBar,
                {
                  width: screenWidth - 32,
                  height: 60 + Math.min((prompt.match(/\n/g) || []).length, 3) * 20
                },
              ]}
            >
              {currentLayout ? (
                <TouchableOpacity onPress={() => setIsExpanded(false)} style={{ padding: 4, marginRight: 4 }}>
                  <Ionicons name="arrow-back" size={22} color="#cbd5e1" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="sparkles-outline" size={20} color="#64748b" style={{ marginLeft: 4, marginRight: 4 }} />
              )}
              <TextInput
                ref={inputRef}
                style={[
                  styles.bottomPromptInput,
                  { textAlignVertical: 'center' }
                ]}
                placeholder="Ne tasarlamak istersiniz?"
                placeholderTextColor="#64748b"
                value={prompt}
                onChangeText={setPrompt}
                editable={!isLoading}
                onFocus={() => setIsExpanded(true)}
                multiline={true}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.inputExpandBtn}
                onPress={() => setShowLargeInputModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="expand-outline" size={18} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomSendBtn, isLoading && styles.bottomSendBtnDisabled]}
                onPress={handleGenerate}
                disabled={isLoading}
              >
                <Ionicons name="arrow-up" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}


          {(((currentLayout && !isExpanded && !isConsoleVisible) || isLoading)) && (
            <Animated.View
              style={[
                styles.bottomInputBar,
                animatedInputStyle,
                isLoading && { paddingHorizontal: 0 },
                (!isExpanded && currentLayout && !isLoading) && { paddingHorizontal: 0, backgroundColor: 'transparent', borderWidth: 0, shadowColor: 'transparent', elevation: 0 },
              ]}
            >
              {isLoading ? (
                <View style={styles.collapsedTrigger}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : (
                <View style={styles.toolbarRow}>
                  {}
                  <Animated.View style={btnStyleClose}>
                    <TouchableOpacity
                      style={styles.dockBtn}
                      disabled={isDockCollapsed}
                      onPress={() => {
                        resetCollapseTimer();
                        setCurrentLayout(null);
                        clearState();
                        setPrompt('');
                        addLog('system', 'Arayüze geri dönüldü.');
                      }}
                    >
                      <Ionicons name="arrow-back-outline" size={22} color="#cbd5e1" />
                    </TouchableOpacity>
                  </Animated.View>

                  {}
                  <Animated.View style={btnStyleTerminal}>
                    <TouchableOpacity
                      style={styles.dockBtn}
                      disabled={isDockCollapsed}
                      onPress={() => {
                        resetCollapseTimer();
                        setIsConsoleVisible(!isConsoleVisible);
                      }}
                    >
                      <Ionicons
                        name="terminal-outline"
                        size={20}
                        color={isConsoleVisible ? COLORS.primary : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  </Animated.View>


                  <Animated.View style={[styles.dockBtn, animatedSparklesStyle]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => {
                        if (isDockCollapsed) {
                          setIsDockCollapsed(false);
                          startCollapseTimer(4000);
                        } else {
                          setIsExpanded(true);
                          setTimeout(() => {
                            inputRef.current?.focus();
                          }, 100);
                        }
                      }}
                    >
                      <Ionicons name="sparkles" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </Animated.View>


                  <Animated.View style={btnStyleSave}>
                    <TouchableOpacity
                      style={styles.dockBtn}
                      disabled={isDockCollapsed}
                      onPress={async () => {
                        resetCollapseTimer();
                        if (isSaved) {
                          showToast('Uygulama zaten kaydedilmiş.');
                        } else {
                          const success = await saveUI(prompt);
                          if (success) {
                            showToast('Uygulama başarıyla kaydedildi!');
                          }
                        }
                      }}
                    >
                      <Ionicons
                        name={isSaved ? "bookmark" : "bookmark-outline"}
                        size={20}
                        color={isSaved ? '#ffffff' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  </Animated.View>


                  <Animated.View style={btnStyleFolder}>
                    <TouchableOpacity
                      style={styles.dockBtn}
                      disabled={isDockCollapsed}
                      onPress={() => {
                        resetCollapseTimer();
                        setIsEditPanelVisible(true);
                      }}
                    >
                      <Ionicons name="pencil-outline" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              )}
            </Animated.View>
          )}
        </LinearGradient>

        {isConsoleVisible && <DebugConsole />}
      </KeyboardAvoidingView>


      <Animated.View
        pointerEvents="none"
        style={[
          styles.sendSweepContainer,
          animatedSendSweepStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(99, 102, 241, 0.30)',
            'rgba(236, 72, 153, 0.40)',
            'rgba(59, 130, 246, 0.20)',
            'rgba(16, 185, 129, 0.20)',
            'rgba(99, 102, 241, 0.20)'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Modal
        visible={showLargeInputModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLargeInputModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.largeInputModalOverlay}
        >
          <View style={styles.largeInputModalContainer}>

            <View style={styles.largeInputHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.largeInputTitle}>Gelişmiş Prompt Editörü</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLargeInputModal(false)}
                style={styles.largeInputCloseBtn}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>


            <View style={styles.largeInputBody}>
              <TextInput
                style={styles.largeInputTextarea}
                placeholder="Nasıl bir uygulama veya oyun üretmek istersiniz? Tüm detayları, kuralları, renkleri ve işlevleri buraya uzun uzun yazabilirsiniz..."
                placeholderTextColor="#64748b"
                value={prompt}
                onChangeText={setPrompt}
                multiline={true}
                autoFocus={true}
                textAlignVertical="top"
              />
            </View>


            <View style={styles.largeInputFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.charCountText}>
                  {prompt.length} karakter yazıldı
                </Text>
              </View>
              <TouchableOpacity
                style={styles.largeInputCancelBtn}
                onPress={() => {
                  setPrompt('');
                }}
              >
                <Text style={styles.largeInputCancelBtnText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.largeInputSubmitBtn}
                onPress={() => {
                  setShowLargeInputModal(false);
                  handleGenerate();
                }}
              >
                <Ionicons name="sparkles" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.largeInputSubmitBtnText}>Üretimi Başlat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      <Modal
        visible={apiError !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setApiError(null)}
      >
        <View style={styles.errorModalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.errorModalContent}
          >

            <View style={styles.errorModalIconContainer}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="alert-circle-outline" size={32} color="#ffffff" />
            </View>

            <Text style={styles.errorModalTitle}>İşlem Hatası</Text>

            <ScrollView style={styles.errorModalScroll} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={styles.errorModalMsg}>
                {(() => {
                  if (!apiError) return '';
                  const lower = apiError.toLowerCase();
                  if (
                    lower.includes('quota') ||
                    lower.includes('limit') ||
                    lower.includes('billing') ||
                    lower.includes('check your plan') ||
                    lower.includes('429')
                  ) {
                    return 'Gemini API kullanım limiti (kota) doldu. Lütfen AI Studio panelinden limitsiz plana geçin veya günlük kotanızın sıfırlanmasını bekleyin.';
                  }
                  if (lower.includes('api key') || lower.includes('key not') || lower.includes('invalid api key')) {
                    return 'Geçersiz API Anahtarı. Lütfen sağ üstteki anahtar simgesinden API anahtarınızı güncelleyin.';
                  }
                  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to connect')) {
                    return 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.';
                  }
                  return 'Arayüz oluşturulurken beklenmedik bir hata oluştu. Lütfen tekrar deneyin.';
                })()}
              </Text>
            </ScrollView>


            <View style={styles.errorModalActions}>
              <TouchableOpacity
                style={styles.errorModalCloseBtn}
                onPress={() => setApiError(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.errorModalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>


      <Modal
        visible={isEmptyPromptModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEmptyPromptModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.promptModalContent}
          >

            <View style={styles.promptModalIconContainer}>
              <LinearGradient
                colors={['#6366f1', '#a855f7']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="chatbubble-ellipses-outline" size={30} color="#ffffff" />
            </View>

            <Text style={styles.errorModalTitle}>Ne Tasarlayalım?</Text>
            <Text style={styles.promptModalDesc}>
              Yapay zekanın sizin için bir mobil uygulama oluşturabilmesi için öncelikle ne tasarlamasını istediğinizi yazmalısınız.
            </Text>

            <Text style={styles.suggestionsHeader}>Örnek Fikirlerle Başlayın:</Text>

            <View style={styles.modalSuggestionsList}>
              {[
                {
                  title: 'Seyahat & Hava Durumu Önerileri',
                  desc: 'Canlı sıcaklığa göre akıllı tavsiyeler.',
                  text: 'Akıllı Seyahat & Hava Durumu: Kullanıcıdan şehir ismi alıp FETCH_WEATHER API\'si yardımıyla güncel sıcaklık ve nem oranını çek. Sıcaklık 15 derecenin altındaysa \'Kalın giyinin\', 25 derecenin üstündeyse \'Güneş gözlüğü alın\' gibi dinamik seyahat tavsiyelerini şık kartlar ve seyahat ikonları eşliğinde ekranda listele.'
                },
                {
                  title: '⏱Pomodoro Odak Zamanlayıcı',
                  desc: 'İlerleme çubuklu odak sayaç kontrolü.',
                  text: 'Pomodoro Odak Sayacı: Çalışma (25 dk) ve mola (5 dk) sürelerini belirlemek için Chip\'ler sun. Kalan süreyi geriye doğru saydıracak RUN_SCRIPT kodlarını ve başlat/durdur/sıfırla butonlarını içeren, ilerlemeyi ProgressBar ile gösteren, odaklanma durumunu Badge ile vurgulayan modern bir pomodoro zamanlayıcısı tasarla.'
                },
                {
                  title: 'Akıllı KDV\'li Alışveriş Sepeti',
                  desc: 'Otomatik KDV hesaplayan alışveriş listesi.',
                  text: 'Akıllı Alışveriş Sepeti: Ürün adı ve fiyatını alıp listeye ekleyen (sepet), KDV oranını (%1, %10, %20) seçmek için bir Select bileşeni sunan ve eklendikçe toplam tutar ile toplam KDV\'yi RUN_SCRIPT ile hesaplayan şık bir sepet uygulaması yap. Sepeti temizleme butonunu en alta ekle.'
                }
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.modalSuggestionCard}
                  onPress={() => {
                    setIsEmptyPromptModalVisible(false);
                    setPrompt(item.text);
                    handleGenerate(item.text);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSuggestionTitle}>{item.title}</Text>
                    <Text style={styles.modalSuggestionDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>


            <View style={{ width: '100%', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={styles.wizardModalBtn}
                onPress={() => {
                  setIsEmptyPromptModalVisible(false);
                  setWizardStep(1);
                  setShowWizard(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="color-wand-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.wizardModalBtnText}>Tasarım Sihirbazını Başlat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.promptModalCloseBtn}
                onPress={() => setIsEmptyPromptModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.promptModalCloseBtnText}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>


      <Modal
        visible={isApiKeyMissingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsApiKeyMissingModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.promptModalContent}
          >

            <View style={[styles.promptModalIconContainer, { shadowColor: '#eab308' }]}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="key-outline" size={30} color="#ffffff" />
            </View>

            <Text style={styles.errorModalTitle}>API Anahtarı Eksik</Text>
            <Text style={styles.promptModalDesc}>
              Yapay zeka motorunun kod üretmesini sağlamak için bir Gemini API anahtarı eklemelisiniz.
            </Text>

            <View style={styles.missingKeyTipBox}>
              <Ionicons name="information-circle-outline" size={18} color="#eab308" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.missingKeyTipText}>
                API anahtarınız yoksa, Ayarlar ekranına giderek hazır şablonları çevrimdışı (internetsiz) derleyebilir ve motoru test edebilirsiniz.
              </Text>
            </View>


            <View style={{ width: '100%', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.wizardModalBtn}
                onPress={() => {
                  setIsApiKeyMissingModalVisible(false);
                  setCurrentScreen('settings');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="settings-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.wizardModalBtnText}>Ayarlar'a Git</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.promptModalCloseBtn}
                onPress={() => setIsApiKeyMissingModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.promptModalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>


      {isEditPanelVisible && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFill, styles.wizModalOverlay, { zIndex: 9999 }]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setIsEditPanelVisible(false)}
          />

          <Animated.View
            entering={SlideInDown.duration(400).easing(Easing.out(Easing.quad))}
            exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.quad))}
            style={[styles.wizModalContent, { height: '94%' }]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Tasarım Editörü</Text>
                <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  Uygulamanızın stil ve içerik ayarlarını canlı olarak düzenleyin
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditPanelVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>


                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    backgroundColor: isSaved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isSaved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    marginBottom: 6,
                  }}
                  onPress={async () => {
                    if (isSaved) {
                      showToast('Uygulama zaten kaydedilmiş.');
                    } else {
                      const success = await saveUI(prompt);
                      if (success) {
                        showToast('Uygulama başarıyla kaydedildi!');
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                    size={16}
                    color={isSaved ? '#10b981' : '#cbd5e1'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{
                    color: isSaved ? '#10b981' : '#cbd5e1',
                    fontSize: 13,
                    fontFamily: 'Inter_600SemiBold',
                  }}>
                    {isSaved ? 'Kaydedildi' : 'Kaydet'}
                  </Text>
                </TouchableOpacity>


                <Text style={styles.editorSectionTitle}>Renk Teması</Text>
                <View style={styles.colorPickerRow}>
                  {[
                    { name: 'İndigo', color: '#5e5ce6' },
                    { name: 'Zümrüt', color: '#10b981' },
                    { name: 'Pembe', color: '#ec4899' },
                    { name: 'Turuncu', color: '#f97316' },
                    { name: 'Kırmızı', color: '#ef4444' },
                    { name: 'Mavi', color: '#0284c7' },
                  ].map((item, idx) => {
                    const isActive = item.color === selectedColor;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={{ alignItems: 'center', gap: 6 }}
                        onPress={() => {
                          setSelectedColor(item.color);
                          updateAccentColor(item.color);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.colorPickerCircle,
                          { backgroundColor: item.color },
                          isActive && {
                            borderColor: '#ffffff',
                            borderWidth: 3,
                            shadowColor: item.color,
                            shadowOpacity: 0.6,
                            shadowRadius: 10,
                            elevation: 8,
                          }
                        ]}>
                          {isActive && (
                            <Animated.View entering={BounceIn.duration(400)}>
                              <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                            </Animated.View>
                          )}
                        </View>
                        <Text style={{
                          color: isActive ? '#ffffff' : '#64748b',
                          fontSize: 10,
                          fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        }}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>


                <Text style={styles.editorSectionTitle}>Kenar Yuvarlaklığı</Text>
                <View style={styles.radiusRow}>
                  {[
                    { label: 'Keskin', value: 0 },
                    { label: 'Yuvarlak', value: 16 },
                    { label: 'Yumuşak', value: 24 },
                  ].map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.radiusCard,
                        item.value === selectedRadius && styles.radiusCardActive
                      ]}
                      onPress={() => {
                        setSelectedRadius(item.value);
                        updateBorderRadius(item.value);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.radiusCardText,
                        item.value === selectedRadius && { color: COLORS.primary }
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>


                <Text style={styles.editorSectionTitle}>İçerik Düzenleyici</Text>
                {(() => {
                  const allNodes = collectTextNodes(currentLayout);
                  const textNodes = allNodes.filter(n => n.type === 'Text');
                  const buttonNodes = allNodes.filter(n => n.type === 'Button');

                  if (allNodes.length === 0) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                        <Ionicons name="document-text-outline" size={32} color="#3f3f46" />
                        <Text style={{ color: '#52525b', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                          Düzenlenebilir içerik bulunamadı.
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <View style={styles.textEditContainer}>

                      {textNodes.length > 0 && (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                            <Ionicons name="text-outline" size={14} color="#94a3b8" />
                            <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Yazı Alanları ({textNodes.length})
                            </Text>
                          </View>
                          {textNodes.map((node, idx) => (
                            <View key={node.id || `t${idx}`} style={{
                              backgroundColor: COLORS.input,
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.04)',
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: 'rgba(99, 102, 241, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                  <Text style={{ color: '#818cf8', fontSize: 10, fontFamily: 'Inter_700Bold' }}>T</Text>
                                </View>
                                <Text style={{ color: '#71717a', fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                                  Metin {idx + 1}
                                </Text>
                              </View>
                              <TextInput
                                style={styles.textEditInput}
                                value={node.props?.text}
                                onChangeText={(txt) => updateNodeText(node.id, txt)}
                                placeholder="Metin giriniz..."
                                placeholderTextColor="#3f3f46"
                              />
                            </View>
                          ))}
                        </View>
                      )}


                      {buttonNodes.length > 0 && (
                        <View style={{ marginTop: textNodes.length > 0 ? 8 : 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                            <Ionicons name="radio-button-on-outline" size={14} color="#94a3b8" />
                            <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Buton Etiketleri ({buttonNodes.length})
                            </Text>
                          </View>
                          {buttonNodes.map((node, idx) => (
                            <View key={node.id || `b${idx}`} style={{
                              backgroundColor: COLORS.input,
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.04)',
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="finger-print-outline" size={11} color="#10b981" />
                                </View>
                                <Text style={{ color: '#71717a', fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                                  Buton {idx + 1}
                                </Text>
                              </View>
                              <TextInput
                                style={styles.textEditInput}
                                value={node.props?.label}
                                onChangeText={(txt) => updateNodeText(node.id, txt)}
                                placeholder="Buton etiketi giriniz..."
                                placeholderTextColor="#3f3f46"
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}

              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 0,
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
    paddingHorizontal: 20,
    zIndex: 100,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: COLORS.primary,
    fontFamily: 'JosefinSans_300Light',
    fontSize: 32,
    letterSpacing: 0.5,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: COLORS.input,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  modalLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  apiHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    marginBottom: 12,
  },
  templatesColumn: {
    gap: 10,
    marginBottom: 20,
  },
  templatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templatePillText: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: COLORS.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  mainArea: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  canvasScrollView: {
    flex: 1,
  },
  canvasScrollContent: {
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'android' ? 50 : 50,
    paddingBottom: Platform.OS === 'android' ? 180 : 160,
  },
  canvasContainer: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  canvasHeader: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  canvasIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  canvasIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  canvasTitle: {
    color: COLORS.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  canvas: {
    padding: 16,
    minHeight: 300,
  },
  heroContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  heroIcon: {
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 44,
    fontFamily: 'JosefinSans_400Regular',
    letterSpacing: 1,
  },
  heroSubtitle: {
    color: COLORS.secondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 10
  },
  loaderRingContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  customSpinner: {
    position: 'absolute',
    transform: [{ scale: 1.6 }],
  },
  pulsatingIcon: {
    position: 'absolute',
  },
  loaderTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 12,
  },
  loaderSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },

  inputExpandBtn: {
    padding: 6,
    marginRight: 2,
  },
  inputExpandBtnText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  largeInputModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  largeInputModalContainer: {
    backgroundColor: '#09090b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '95%',
  },
  largeInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  largeInputTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  largeInputCloseBtn: {
    padding: 4,
  },
  largeInputBody: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  largeInputTextarea: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    height: 240,
    lineHeight: 22,
  },
  largeInputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  charCountText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  largeInputCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  largeInputCancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  largeInputSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  largeInputSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },

  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 36,
    borderColor: COLORS.border,
    height: 60,
    paddingHorizontal: 12,
    gap: 8,
    overflow: 'hidden',
  },
  collapsedTrigger: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 36,
    paddingBottom: Platform.OS === 'ios' ? 58 : 70,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 90,
  },
  bottomPromptInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  bottomSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSendBtnDisabled: {
    opacity: 0.6,
  },
  apiIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  apiIndicatorText: {
    color: '#71717a',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  suggestionsContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  suggestionsScroll: {
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  suggestionText: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  savedList: {
    width: '100%',
  },
  emptySavedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySavedText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  savedItemCard: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'column',
    gap: 12,
  },
  savedItemInfo: {
    flex: 1,
  },
  savedItemPrompt: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  savedItemTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  savedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  loadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  topToastBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 9999,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  toastGradient: {
    paddingTop: Platform.OS === 'ios' ? 68 : 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 60,
  },
  dockBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.input,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 90 : 90,
    zIndex: 95,
  },
  wizardBtn: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  wizardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  wizardBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  wizProgressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  wizProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  wizModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  wizModalContent: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 44 : 80,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  wizStepContainer: {
    gap: 8,
  },
  wizModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  wizModeTabActive: {
    backgroundColor: COLORS.primary,
  },
  wizModeTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  wizModeTabTextActive: {
    color: '#ffffff',
  },
  experimentalWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  experimentalWarningText: {
    color: '#f59e0b',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    lineHeight: 18,
  },
  wizStepQuestion: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  wizStepHint: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  wizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 0,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  wizOptionRowActive: {
    backgroundColor: 'rgba(94, 92, 230, 0.12)',
    borderColor: COLORS.primary,
  },
  wizOptionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizOptionIconContainerActive: {
    backgroundColor: 'rgba(94, 92, 230, 0.16)',
  },
  themePreviewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  wizOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  wizOptionDesc: {
    color: '#71717a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  wizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  wizBackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  wizBackBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  wizNextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  wizNextBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  cancelGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cancelGenerateBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.1,
  },
  sendSweepContainer: {
    position: 'absolute',
    width: Math.max(screenWidth, screenHeight) * 1.4,
    height: Math.max(screenWidth, screenHeight) * 1.4,
    top: -(Math.max(screenWidth, screenHeight) * 1.4 - screenHeight) / 2,
    left: -(Math.max(screenWidth, screenHeight) * 1.4 - screenWidth) / 2,
    zIndex: 99999,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  errorModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  errorModalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalScroll: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  errorModalMsg: {
    color: '#e4e4e7',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorModalTipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  errorModalTipText: {
    color: '#fde047',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    flex: 1,
  },
  errorModalActions: {
    width: '100%',
    alignItems: 'center',
  },
  errorModalCloseBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  errorModalCloseBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  promptModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  promptModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  promptModalDesc: {
    color: '#a1a1aa',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  suggestionsHeader: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSuggestionsList: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  modalSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalSuggestionTitle: {
    color: '#f4f4f5',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  modalSuggestionDesc: {
    color: '#71717a',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  wizardModalBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  wizardModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  promptModalCloseBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptModalCloseBtnText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  missingKeyTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  missingKeyTipText: {
    color: '#fde047',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    flex: 1,
  },
  editorSectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginTop: 18,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  colorPickerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorPickerCircleActive: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  radiusCard: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(94, 92, 230, 0.08)',
  },
  radiusCardText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  textEditContainer: {
    width: '100%',
    gap: 12,
  },
  textEditRow: {
    width: '100%',
  },
  textEditLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
  },
  textEditInput: {
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
    height: 40,
  },
  appTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 76 : 60,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
    backgroundColor: '#111113',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 95,
  },
  appTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    gap: 4,
  },
  appTabLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#71717a',
  },
});
