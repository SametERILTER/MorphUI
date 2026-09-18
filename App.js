import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, BackHandler, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_700Bold
} from '@expo-google-fonts/josefin-sans';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { EngineProvider, useEngine } from './src/context/EngineContext';
import HomeScreen from './src/screens/HomeScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeInUp,
  FadeOutUp,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function ToastNotification() {
  const { toast, hideToast } = useEngine();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  if (!toast) return null;

  const getBgColor = () => {
    switch (toast.type) {
      case 'success': return '#065f46';
      case 'error': return '#7f1d1d';
      case 'info':
      default: return '#1e3a8a';
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'info':
      default: return '#3b82f6';
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(250)}
      style={[
        styles.toastContainer,
        { backgroundColor: getBgColor(), borderColor: getBorderColor() }
      ]}
    >
      <Pressable onPress={hideToast} style={styles.toastPressable}>
        <Ionicons
          name={
            toast.type === 'success'
              ? 'checkmark-circle-outline'
              : toast.type === 'error'
                ? 'alert-circle-outline'
                : 'information-circle-outline'
          }
          size={22}
          color="#ffffff"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.toastText}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

function AppContent() {
  const { currentScreen, setCurrentScreen } = useEngine();
  const transition = useSharedValue(0);

  const waveTranslateY = useSharedValue(-200);
  const waveOpacity = useSharedValue(0.95);

  const [fontsLoaded] = useFonts({
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      waveTranslateY.value = withSequence(
        withTiming(0, {
          duration: 2200,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
        }),
        withDelay(500,
          withTiming(-200, {
            duration: 2500,
            easing: Easing.bezier(0.25, 1, 0.5, 1),
          })
        )
      );

      waveOpacity.value = withSequence(
        withTiming(0.9, { duration: 1200 }),
        withDelay(800,
          withTiming(0, { duration: 2200 })
        )
      );
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'saved' || currentScreen === 'settings') {
        setCurrentScreen('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentScreen, setCurrentScreen]);

  useEffect(() => {
    let target = 0;
    if (currentScreen === 'saved') target = 1;
    if (currentScreen === 'settings') target = -1;

    transition.value = withTiming(target, {
      duration: 350,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [currentScreen]);

  const homeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -transition.value * screenWidth * 0.25 },
        { scale: 1 - Math.abs(transition.value) * 0.03 }
      ],
      opacity: 1 - Math.abs(transition.value) * 0.4,
    };
  });

  const savedAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: (1 - transition.value) * screenWidth }],
    };
  });

  const settingsAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: (-1 - transition.value) * screenWidth }],
    };
  });

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: waveTranslateY.value }],
      opacity: waveOpacity.value,
    };
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ToastNotification />

      <Animated.View
        style={[StyleSheet.absoluteFill, homeAnimatedStyle]}
        pointerEvents={currentScreen === 'home' ? 'auto' : 'none'}
      >
        <HomeScreen />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, savedAnimatedStyle, styles.savedContainer]}
        pointerEvents={currentScreen === 'saved' ? 'auto' : 'none'}
      >
        <SavedScreen />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, settingsAnimatedStyle, styles.settingsContainer]}
        pointerEvents={currentScreen === 'settings' ? 'auto' : 'none'}
      >
        <SettingsScreen />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.entranceWave,
          animatedWaveStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(139, 92, 246, 0.45)',
            'rgba(99, 102, 241, 0.22)',
            'rgba(0, 0, 0, 0)'
          ]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export default function App() {
  return (
    <EngineProvider>
      <AppContent />
    </EngineProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  savedContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#000000',
  },
  settingsContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#000000',
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 99999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  toastPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  entranceWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 99999,
  },
});
