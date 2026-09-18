import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const PremiumLoader = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  const topLeft = useSharedValue(35);
  const topRight = useSharedValue(65);
  const bottomLeft = useSharedValue(60);
  const bottomRight = useSharedValue(35);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 6000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    scale.value = withRepeat(
      withTiming(1.15, {
        duration: 2200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      true
    );

    topLeft.value = withRepeat(
      withTiming(80, {
        duration: 1800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      true
    );

    topRight.value = withRepeat(
      withTiming(25, {
        duration: 2400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      true
    );

    bottomLeft.value = withRepeat(
      withTiming(25, {
        duration: 2000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      true
    );

    bottomRight.value = withRepeat(
      withTiming(80, {
        duration: 2600,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      true
    );
  }, []);

  const animatedBlobStyle = useAnimatedStyle(() => {
    return {
      borderTopLeftRadius: topLeft.value,
      borderTopRightRadius: topRight.value,
      borderBottomLeftRadius: bottomLeft.value,
      borderBottomRightRadius: bottomRight.value,
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${-rotation.value * 0.6}deg` },
        { scale: scale.value * 1.35 },
      ],
      opacity: 0.18 + (scale.value - 1) * 0.4,
    };
  });

  return (
    <View style={styles.container}>
      {}
      <Animated.View style={[styles.ambientGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={['#3b0764', '#6d28d9', '#a78bfa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {}
      <Animated.View style={[styles.blob, animatedBlobStyle]}>
        <LinearGradient
          colors={['#581c87', '#8b5cf6', '#d8b4fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  blob: {
    width: 90,
    height: 90,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  ambientGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.35,
    overflow: 'hidden',
  },
});

export default PremiumLoader;
