import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  PanResponder,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEngine } from '../context/EngineContext';
import { COLORS } from '../constants/colors';


const getAppTitle = (layout) => {
  if (!layout) return 'Adsız Uygulama';

  if (layout.type === 'Text' && layout.props && typeof layout.props.text === 'string') {
    if (!layout.props.text.includes('{')) {
      return layout.props.text;
    }
  }

  if (layout.children && Array.isArray(layout.children)) {
    for (const child of layout.children) {
      const title = getAppTitle(child);
      if (title && title !== 'Adsız Uygulama') {
        return title;
      }
    }
  }

  return 'Adsız Uygulama';
};

const MiniLayoutPreview = ({ layout }) => {
  if (!layout) return null;

  let targetLayout = layout;
  if (layout.type === 'MultiScreenApp') {
    const initialScreen = layout.props?.initialScreen || 'home';
    targetLayout = layout.screens?.[initialScreen] || null;
  }
  if (!targetLayout) return null;

  const renderMiniNode = (node, key) => {
    if (!node) return null;

    if (node.type === 'Container' || node.type === 'Card' || node.type === 'ScrollView') {
      return (
        <View
          key={key}
          style={{
            padding: 3,
            backgroundColor: '#111827',
            borderColor: 'rgba(99, 102, 241, 0.25)',
            borderWidth: 1,
            borderRadius: 4,
            gap: 2,
            marginVertical: 1,
            width: '100%',
          }}
        >
          {node.children && Array.isArray(node.children) &&
            node.children.slice(0, 4).map((child, idx) => renderMiniNode(child, `${key}-${idx}`))
          }
        </View>
      );
    }

    if (node.type === 'Text') {
      return (
        <View
          key={key}
          style={{
            height: 3,
            width: '70%',
            backgroundColor: '#64748b',
            borderRadius: 1.5,
            marginVertical: 1,
          }}
        />
      );
    }

    if (node.type === 'Button') {
      return (
        <View
          key={key}
          style={{
            height: 6,
            width: '90%',
            backgroundColor: COLORS.primary,
            borderRadius: 3,
            marginVertical: 2,
            alignSelf: 'center',
          }}
        />
      );
    }

    if (node.type === 'TextInput') {
      return (
        <View
          key={key}
          style={{
            height: 6,
            width: '90%',
            backgroundColor: '#090d16',
            borderColor: '#334155',
            borderWidth: 0.5,
            borderRadius: 3,
            marginVertical: 2,
            alignSelf: 'center',
          }}
        />
      );
    }

    if (node.type === 'Image') {
      return (
        <View
          key={key}
          style={{
            height: 18,
            width: '100%',
            backgroundColor: '#334155',
            borderRadius: 3,
            marginVertical: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="image-outline" size={8} color="#94a3b8" />
        </View>
      );
    }


    return (
      <View
        key={key}
        style={{
          height: 4,
          width: '80%',
          backgroundColor: '#475569',
          borderRadius: 2,
          marginVertical: 1,
        }}
      />
    );
  };

  return (
    <View
      style={{
        width: 60,
        height: 76,
        backgroundColor: '#05070c',
        borderRadius: 8,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.25)',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }}
    >
      {renderMiniNode(targetLayout, 'root')}
    </View>
  );
};

const SwipeableSavedCard = ({ item, onDelete, onLoad }) => {
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const cardHeightAnim = useRef(new Animated.Value(108)).current;
  const isSwipeOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        let newX = gestureState.dx;
        if (isSwipeOpen.current) {
          newX -= 80;
        }


        if (newX > 0) newX = 0;
        if (newX < -120) {
          newX = -80 + (newX + 80) * 0.35;
        }

        swipeAnim.setValue(newX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = -40;
        const currentX = gestureState.dx + (isSwipeOpen.current ? -80 : 0);

        if (currentX < threshold) {

          Animated.spring(swipeAnim, {
            toValue: -80,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
          isSwipeOpen.current = true;
        } else {
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
          isSwipeOpen.current = false;
        }
      },
    })
  ).current;

  const triggerDelete = () => {
    Animated.parallel([
      Animated.timing(swipeAnim, {
        toValue: -Dimensions.get('window').width,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardHeightAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDelete(item.id);
    });
  };



  const bgOpacity = swipeAnim.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ height: cardHeightAnim, overflow: 'hidden', marginBottom: 12 }}>
      <Animated.View style={[styles.swipeBackground, { opacity: bgOpacity }]}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          onPress={triggerDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#ffffff" />
          <Text style={styles.swipeDeleteText}>Sil</Text>
        </TouchableOpacity>
      </Animated.View>


      <Animated.View
        style={[
          styles.savedCard,
          {
            transform: [{ translateX: swipeAnim }],
            marginBottom: 0,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.cardTouchArea}
          onPress={() => onLoad(item)}
          activeOpacity={0.95}
        >
          <MiniLayoutPreview layout={item.layout} />

          <View style={styles.cardInfoArea}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {getAppTitle(item.layout)}
              </Text>
              <Text style={styles.cardPrompt} numberOfLines={2}>
                {item.prompt}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.clickHintText}>Açmak için dokunun</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748b" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default function SavedScreen() {
  const { savedUIs, loadUI, deleteUI, setCurrentScreen } = useEngine();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSavedUIs = savedUIs.filter((item) => {
    const title = getAppTitle(item.layout).toLowerCase();
    const prompt = (item.prompt || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || prompt.includes(query);
  });

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
        <Text style={styles.headerTitle}>Kaydedilenler</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {savedUIs.length > 0 && (
          <View style={styles.searchBarContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Uygulama veya prompt ara..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {savedUIs.length > 0 && filteredSavedUIs.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color="#475569" style={{ marginBottom: 12 }} />
            <Text style={styles.noResultsTitle}>Arama Sonucu Bulunamadı</Text>
            <Text style={styles.noResultsSubtitle}>
              "{searchQuery}" aramasıyla eşleşen bir uygulama bulunamadı.
            </Text>
          </View>
        ) : savedUIs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#475569" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Henüz Kaydedilen Yok</Text>
            <Text style={styles.emptySubtitle}>
              Yapay zeka ile ürettiğiniz arayüzleri alt bardaki kaydet butonuna basarak buraya ekleyebilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setCurrentScreen('home')}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>Tasarım Yapmaya Başla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSavedUIs.map((item) => (
            <SwipeableSavedCard
              key={item.id}
              item={item}
              onDelete={deleteUI}
              onLoad={(uiItem) => {
                loadUI(uiItem);
                setCurrentScreen('home');
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  savedCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  swipeDeleteBtn: {
    width: 80,
    height: '100%',
    backgroundColor: '#ef4444',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  cardTouchArea: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardInfoArea: {
    flex: 1,
    height: 76,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  compBadge: {
    backgroundColor: 'rgba(94, 92, 230, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  compBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  cardPrompt: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
    marginTop: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  clickHintText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginRight: 2,
  },
  descriptionContainer: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  descriptionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
    width: '100%',
  },
  searchBarInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 8,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  noResultsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  noResultsSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
