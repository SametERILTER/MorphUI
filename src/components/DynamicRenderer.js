import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COMPONENT_MAP } from './ComponentMap';
import { useEngine } from '../context/EngineContext';

const AnimatedWrapper = ({ children, index = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        width: '100%',
      }}
    >
      {children}
    </Animated.View>
  );
};

const DynamicRenderer = ({ node, index = 0 }) => {
  const { stateStore, updateState, dispatchAction } = useEngine();

  if (!node) return null;

  if (node.type === 'MultiScreenApp') {
    const initialScreen = node.props?.initialScreen || 'home';
    const currentAppScreen = stateStore.currentAppScreen || initialScreen;
    const activeScreenNode = node.screens?.[currentAppScreen];

    if (activeScreenNode) {
      return (
        <DynamicRenderer
          key={activeScreenNode.id || `multiscreen-${currentAppScreen}`}
          node={activeScreenNode}
          index={index}
        />
      );
    }
    return null;
  }

  if (Array.isArray(node)) {
    return (
      <>
        {node.map((subNode, idx) => (
          <DynamicRenderer
            key={subNode.id || `array-node-${idx}`}
            node={subNode}
            index={idx}
          />
        ))}
      </>
    );
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <View style={{ paddingVertical: 2 }}>
        <Text style={{ color: '#f4f4f5', fontSize: 15 }}>{node}</Text>
      </View>
    );
  }

  if (typeof node !== 'object') {
    return null;
  }
  if (!node.type) {
    if (node.props?.text !== undefined || node.text !== undefined) {
      node.type = 'Text';
    } else if (node.children && Array.isArray(node.children)) {
      node.type = 'Container';
    } else if (node.props?.placeholder !== undefined || node.props?.bindState !== undefined) {
      node.type = 'TextInput';
    } else if (node.props?.label !== undefined || node.props?.onPressAction !== undefined) {
      node.type = 'Button';
    }
  }

  if (!node.type) {
    console.warn('DynamicRenderer: Node has no type property:', JSON.stringify(node, null, 2));
    return null;
  }

  let Component = COMPONENT_MAP[node.type];

  if (!Component) {
    console.warn(`DynamicRenderer: Component "${node.type}" not found. Falling back to Container.`);
    Component = COMPONENT_MAP.Container;
  }

  let renderedChildren = null;
  if (node.children && Array.isArray(node.children)) {
    renderedChildren = node.children.map((child, idx) => (
      <DynamicRenderer key={child.id || `${node.type}-${idx}`} node={child} index={idx} />
    ));
  }

  const animationIndex = node.globalIndex !== undefined ? node.globalIndex : index;

  return (
    <AnimatedWrapper index={animationIndex}>
      <Component
        props={node.props}
        state={stateStore}
        updateState={updateState}
        dispatchAction={dispatchAction}
      >
        {renderedChildren}
      </Component>
    </AnimatedWrapper>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    padding: 10,
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    marginVertical: 4,
  },
  errorText: {
    color: '#fca5a5',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

const assignGlobalIndices = (node) => {
  let counter = 0;
  const traverse = (n) => {
    if (!n || typeof n !== 'object') return;
    n.globalIndex = counter++;
    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(traverse);
    }
  };
  traverse(node);
};

const DynamicRendererWrapper = ({ node, ...props }) => {
  React.useMemo(() => {
    if (node) {
      assignGlobalIndices(node);
    }
  }, [node]);

  return <DynamicRenderer node={node} {...props} />;
};

export default DynamicRendererWrapper;
