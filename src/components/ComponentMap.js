import React from 'react';
import {
  View,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  Switch as RNSwitch,
  StyleSheet,
  Animated,
  Image as RNImage,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

import { COLORS } from '../constants/colors';

const LocalStateContext = React.createContext(null);

export const resolveStateValue = (state, path) => {
  if (!state || !path) return undefined;
  
  if (state[path] !== undefined) return state[path];
  
  const parts = path.split('.');
  let current = state;
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    
    const isArrIndex = part.startsWith('[') && part.endsWith(']');
    if (isArrIndex) {
      const idx = parseInt(part.slice(1, -1));
      current = current[idx];
    } else {
      current = current[part];
    }
  }
  return current;
};

const cloneAndRewriteProps = (element, index, arrayKey) => {
  if (!element) return null;

  if (Array.isArray(element)) {
    return element.map((child, idx) => cloneAndRewriteProps(child, index, arrayKey));
  }

  if (!React.isValidElement(element)) {
    return element;
  }

  const newProps = { ...element.props };

  if (newProps.props && typeof newProps.props.bindState === 'string') {
    newProps.props = { ...newProps.props };
    if (newProps.props.bindState.startsWith('item.')) {
      newProps.props.bindState = `${arrayKey}.[${index}].${newProps.props.bindState.slice(5)}`;
    } else if (newProps.props.bindState === 'item') {
      newProps.props.bindState = `${arrayKey}.[${index}]`;
    }
  }

  if (newProps.props && typeof newProps.props.text === 'string') {
    newProps.props = { ...newProps.props };
    newProps.props.text = newProps.props.text.replace(/\{item\./g, `{${arrayKey}.[${index}].`);
    newProps.props.text = newProps.props.text.replace(/\{item\}/g, `{${arrayKey}.[${index}]}`);
  }

  if (newProps.props && newProps.props.onPressAction) {
    newProps.props = { ...newProps.props };
    newProps.props.onPressAction = rewriteActionPaths(newProps.props.onPressAction, index, arrayKey);
  }

  if (newProps.children) {
    if (Array.isArray(newProps.children)) {
      newProps.children = newProps.children.map(child => cloneAndRewriteProps(child, index, arrayKey));
    } else {
      newProps.children = cloneAndRewriteProps(newProps.children, index, arrayKey);
    }
  }

  return React.cloneElement(element, newProps);
};

const rewriteActionPaths = (action, index, arrayKey) => {
  if (!action) return null;
  const cloned = { ...action };
  
  if (cloned.inputKey && cloned.inputKey.startsWith('item.')) {
    cloned.inputKey = `${arrayKey}.[${index}].${cloned.inputKey.slice(5)}`;
  } else if (cloned.inputKey === 'item') {
    cloned.inputKey = `${arrayKey}.[${index}]`;
  }
  
  if (cloned.outputKey && cloned.outputKey.startsWith('item.')) {
    cloned.outputKey = `${arrayKey}.[${index}].${cloned.outputKey.slice(5)}`;
  } else if (cloned.outputKey === 'item') {
    cloned.outputKey = `${arrayKey}.[${index}]`;
  }

  if (cloned.script) {
    cloned.itemIndex = index;
    cloned.arrayKey = arrayKey;
  }
  
  if (cloned.actions && Array.isArray(cloned.actions)) {
    cloned.actions = cloned.actions.map(act => rewriteActionPaths(act, index, arrayKey));
  }
  
  return cloned;
};

const TOKENS = {
  colors: COLORS,
  radii: {
    none: 0,
    sm: 6,
    md: 12,
    lg: 12,
    full: 9999,
  },
  fontSizes: {
    sm: 13,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 36,
  },
};

const getColor = (colorName, defaultColor = TOKENS.colors.text) => {
  if (colorName === undefined || colorName === null || colorName === '') {
    return defaultColor;
  }
  return TOKENS.colors[colorName] || colorName;
};

const getRadius = (radiusName) => {
  if (radiusName === undefined) return TOKENS.radii.md;
  return TOKENS.radii[radiusName] !== undefined ? TOKENS.radii[radiusName] : radiusName;
};

const getFontFamily = (fontWeight) => {
  switch (fontWeight) {
    case 'light': return 'Inter_300Light';
    case 'medium': return 'Inter_500Medium';
    case 'semibold': return 'Inter_600SemiBold';
    case 'bold':
    case 'extrabold': return 'Inter_700Bold';
    case 'normal':
    default: return 'Inter_400Regular';
  }
};

export const COMPONENT_MAP = {
  Container: ({ children, props }) => {
    const { padding = 16, gap = 12, backgroundColor, borderRadius, style = {} } = props || {};
    return (
      <View
        style={[
          styles.container,
          {
            padding,
            gap,
            backgroundColor: getColor(backgroundColor, 'transparent'),
            borderRadius: getRadius(borderRadius),
            ...style,
          },
        ]}
      >
        {children}
      </View>
    );
  },

  Card: ({ children, props }) => {
    const { padding = 20, gap = 16, backgroundColor = 'card', borderRadius = 'lg', style = {} } = props || {};
    return (
      <View
        style={[
          styles.card,
          {
            padding,
            gap,
            backgroundColor: getColor(backgroundColor, TOKENS.colors.card),
            borderRadius: getRadius(borderRadius),
            ...style,
          },
        ]}
      >
        {children}
      </View>
    );
  },

  Text: ({ props, state, updateState }) => {
    const {
      text = '',
      bindState,
      color = 'text',
      fontSize = 'md',
      fontWeight = 'normal',
      textAlign = 'left',
      style = {},
    } = props || {};

    let displayValue = bindState !== undefined ? resolveStateValue(state, bindState) ?? text : text;

    if (typeof displayValue === 'string') {
      const matches = displayValue.match(/\{([^}]+)\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.slice(1, -1).trim();
          const varValue = resolveStateValue(state, varName) !== undefined ? resolveStateValue(state, varName) : '';
          displayValue = displayValue.replace(match, varValue);
        });
      }
    }

    return (
      <RNText
        style={[
          {
            color: getColor(color),
            fontSize: TOKENS.fontSizes[fontSize] || fontSize || TOKENS.fontSizes.md,
            fontFamily: getFontFamily(fontWeight),
            textAlign,
            flexShrink: 1,
            ...style,
          },
        ]}
      >
        {displayValue}
      </RNText>
    );
  },

  TextInput: ({ props, state, updateState }) => {
    const {
      placeholder = 'Bir şeyler yazın...',
      bindState,
      keyboardType = 'default',
      secureTextEntry = false,
      borderRadius = 'md',
      style = {},
    } = props || {};

    const value = bindState ? resolveStateValue(state, bindState) ?? '' : '';

    return (
      <RNTextInput
        style={[
          styles.input,
          {
            borderRadius: getRadius(borderRadius),
            fontFamily: 'Inter_400Regular',
            ...style,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={TOKENS.colors.textMuted}
        value={value}
        onChangeText={(text) => {
          if (bindState) updateState(bindState, text);
        }}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    );
  },

  Button: ({ props, state, dispatchAction }) => {
    const {
      label = 'Buton',
      iconName,
      onPressAction,
      color = 'primary',
      variant = 'solid',
      radius = 'md',
      style = {},
    } = props || {};

    const isOutline = variant === 'outline';
    const isGhost = variant === 'ghost';

    let btnBg = getColor(color, TOKENS.colors.primary);
    let borderCol = 'transparent';
    let textCol = '#ffffff';

    if (isOutline) {
      btnBg = 'transparent';
      borderCol = getColor(color, TOKENS.colors.primary);
      textCol = getColor(color, TOKENS.colors.primary);
    } else if (isGhost) {
      btnBg = 'transparent';
      textCol = getColor(color, TOKENS.colors.primary);
    }

    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 60,
        bounciness: 3,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 60,
        bounciness: 6,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], flexGrow: 1, flexShrink: 1 }}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: btnBg,
              borderColor: borderCol,
              borderWidth: isOutline ? 1.5 : 0,
              borderRadius: getRadius(radius),
              width: '100%',
              ...style,
            },
          ]}
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            if (onPressAction) {
              dispatchAction(onPressAction);
            }
          }}
        >
          {iconName && (
            <Ionicons
              name={iconName}
              size={18}
              color={textCol}
              style={{ marginRight: 8 }}
            />
          )}
          <RNText style={[styles.buttonText, { color: textCol }]}>{label}</RNText>
        </TouchableOpacity>
      </Animated.View>
    );
  },

  Switch: ({ props, state, updateState }) => {
    const { bindState, color = 'primary' } = props || {};
    const value = bindState ? !!resolveStateValue(state, bindState) : false;

    return (
      <View style={styles.switchContainer}>
        <RNSwitch
          value={value}
          onValueChange={(val) => {
            if (bindState) updateState(bindState, val);
          }}
          trackColor={{ false: '#374151', true: getColor(color) }}
          thumbColor={value ? '#ffffff' : '#9ca3af'}
        />
      </View>
    );
  },

  Icon: ({ props }) => {
    const { name = 'alert-circle-outline', size = 24, color = 'text', style = {} } = props || {};
    return (
      <Ionicons
        name={name}
        size={size}
        color={getColor(color)}
        style={style}
      />
    );
  },

  Slider: ({ props, state, updateState }) => {
    const {
      min = 0,
      max = 100,
      step = 1,
      bindState,
      color = 'primary',
      style = {},
    } = props || {};

    const value = bindState ? Number(resolveStateValue(state, bindState)) || min : min;

    return (
      <View style={[styles.sliderContainer, style]}>
        <Slider
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={(val) => {
            if (bindState) updateState(bindState, String(val));
          }}
          minimumTrackTintColor={getColor(color, TOKENS.colors.primary)}
          maximumTrackTintColor="#374151"
          thumbTintColor="#ffffff"
          style={{ width: '100%', height: 40 }}
        />
      </View>
    );
  },

  Image: ({ props, state }) => {
    const {
      sourceUrl,
      bindState,
      width = '100%',
      height = 200,
      borderRadius = 'md',
      resizeMode = 'cover',
      style = {},
    } = props || {};

    const finalUrl = bindState ? resolveStateValue(state, bindState) || sourceUrl : sourceUrl;

    if (!finalUrl) {
      return (
        <View style={[styles.imagePlaceholder, { width, height: Number(height) || 200, borderRadius: getRadius(borderRadius) }]}>
          <Ionicons name="image-outline" size={32} color={TOKENS.colors.textMuted} />
        </View>
      );
    }

    return (
      <RNImage
        source={{ uri: finalUrl }}
        style={[
          {
            width,
            height: Number(height) || 200,
            borderRadius: getRadius(borderRadius),
            ...style,
          },
        ]}
        resizeMode={resizeMode}
      />
    );
  },

  Row: ({ children, props }) => {
    const { gap = 12, alignItems = 'center', justifyContent = 'space-between', flexWrap = 'nowrap', padding = 0, style = {} } = props || {};
    return (
      <View
        style={[{
          flexDirection: 'row',
          alignItems,
          justifyContent,
          flexWrap,
          gap,
          padding,
          width: '100%',
          overflow: 'hidden',
          ...style,
        }]}
      >
        {children}
      </View>
    );
  },

  Divider: ({ props }) => {
    const { color = 'border', thickness = 1, marginVertical = 8, style = {} } = props || {};
    return (
      <View
        style={[{
          height: thickness,
          backgroundColor: getColor(color, TOKENS.colors.border),
          width: '100%',
          marginVertical,
          ...style,
        }]}
      />
    );
  },

  Spacer: ({ props }) => {
    const { height = 16, style = {} } = props || {};
    return <View style={[{ height, ...style }]} />;
  },

  Badge: ({ props, state }) => {
    const { text = '', bindState, color = 'primary', variant = 'solid', style = {} } = props || {};
    let displayVal = bindState !== undefined ? resolveStateValue(state, bindState) ?? text : text;

    if (typeof displayVal === 'string' && state) {
      const matches = displayVal.match(/\{([^}]+)\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.slice(1, -1).trim();
          const varValue = resolveStateValue(state, varName) !== undefined ? resolveStateValue(state, varName) : '';
          displayVal = displayVal.replace(match, varValue);
        });
      }
    }

    const isSolid = variant === 'solid';
    const bgColor = isSolid ? getColor(color, TOKENS.colors.primary) : 'transparent';
    const textColor = isSolid ? '#ffffff' : getColor(color, TOKENS.colors.primary);
    const borderColor = isSolid ? 'transparent' : getColor(color, TOKENS.colors.primary);
    return (
      <View style={[styles.badge, { backgroundColor: bgColor, borderColor, borderWidth: isSolid ? 0 : 1, ...style }]}>
        <RNText style={[styles.badgeText, { color: textColor }]}>{displayVal}</RNText>
      </View>
    );
  },

  ProgressBar: ({ props, state }) => {
    const { value = 0, bindState, max = 100, color = 'primary', height = 8, borderRadius = 'full', style = {} } = props || {};
    const currentValue = bindState ? (Number(resolveStateValue(state, bindState)) || 0) : value;
    const percentage = Math.min(Math.max((currentValue / max) * 100, 0), 100);
    return (
      <View style={[styles.progressBarTrack, { height, borderRadius: getRadius(borderRadius), ...style }]}>
        <View
          style={[styles.progressBarFill, {
            width: `${percentage}%`,
            backgroundColor: getColor(color, TOKENS.colors.primary),
            borderRadius: getRadius(borderRadius),
          }]}
        />
      </View>
    );
  },

  ListItem: ({ props, children, state, dispatchAction }) => {
    const {
      iconName,
      iconColor = 'primary',
      title = '',
      subtitle = '',
      rightText = '',
      rightColor = 'textMuted',
      onPressAction,
      style = {},
    } = props || {};

    const resolveInterpolation = (val) => {
      if (typeof val === 'string' && state) {
        const matches = val.match(/\{([^}]+)\}/g);
        if (matches) {
          let resolved = val;
          matches.forEach(match => {
            const varName = match.slice(1, -1).trim();
            const varValue = state[varName] !== undefined ? state[varName] : '';
            resolved = resolved.replace(match, varValue);
          });
          return resolved;
        }
      }
      return val;
    };

    const displayTitle = resolveInterpolation(title);
    const displaySubtitle = resolveInterpolation(subtitle);
    const displayRightText = resolveInterpolation(rightText);

    const content = (
      <View style={[styles.listItem, style]}>
        {iconName && (
          <View style={[styles.listItemIcon, { backgroundColor: getColor(iconColor, TOKENS.colors.primary) + '18' }]}>
            <Ionicons name={iconName} size={20} color={getColor(iconColor, TOKENS.colors.primary)} />
          </View>
        )}
        <View style={styles.listItemContent}>
          <RNText style={styles.listItemTitle}>{displayTitle}</RNText>
          {displaySubtitle ? <RNText style={styles.listItemSubtitle}>{displaySubtitle}</RNText> : null}
        </View>
        {displayRightText ? (
          <RNText style={[styles.listItemRight, { color: getColor(rightColor) }]}>{displayRightText}</RNText>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={TOKENS.colors.textMuted} />
        )}
      </View>
    );

    if (onPressAction) {
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => dispatchAction(onPressAction)}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  },

  Chip: ({ props, state, updateState }) => {
    const { text = '', color = 'primary', bindState, activeValue, style = {} } = props || {};
    const isActive = bindState ? resolveStateValue(state, bindState) === (activeValue || text) : false;
    const bgColor = isActive ? getColor(color, TOKENS.colors.primary) : TOKENS.colors.input;
    const textColor = isActive ? '#ffffff' : TOKENS.colors.text;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (bindState) updateState(bindState, activeValue || text);
        }}
        style={[styles.chip, { backgroundColor: bgColor, ...style }]}
      >
        <RNText style={[styles.chipText, { color: textColor }]}>{text}</RNText>
      </TouchableOpacity>
    );
  },

  ScrollContainer: ({ children, props }) => {
    const { horizontal = false, padding = 0, gap = 12, style = {} } = props || {};
    return (
      <ScrollView
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{
          padding,
          gap,
          flexDirection: horizontal ? 'row' : 'column',
          ...style,
        }]}
      >
        {children}
      </ScrollView>
    );
  },

  List: ({ children, props, state, updateState, dispatchAction }) => {
    const { bindState, style = {} } = props || {};
    const listData = bindState ? resolveStateValue(state, bindState) : null;
    
    if (!Array.isArray(listData) || listData.length === 0) {
      return null;
    }
    
    return (
      <View style={[{ gap: 12, width: '100%' }, style]}>
        {listData.map((item, idx) => {
          return (
            <View key={`list-item-${idx}`} style={{ width: '100%' }}>
              {cloneAndRewriteProps(children, idx, bindState)}
            </View>
          );
        })}
      </View>
    );
  },

  Select: ({ props, state, updateState }) => {
    const {
      label = '',
      options = [],
      bindState,
      placeholder = 'Seçim yapın...',
      style = {},
    } = props || {};

    const [isOpen, setIsOpen] = React.useState(false);
    const currentValue = bindState ? resolveStateValue(state, bindState) ?? '' : '';

    const normalizedOptions = options.map(opt => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return { label: opt?.label || String(opt?.value || ''), value: opt?.value ?? '' };
    });

    const selectedOption = normalizedOptions.find(opt => opt.value === currentValue);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
      <View style={{ width: '100%', marginVertical: 6, zIndex: isOpen ? 50 : 1 }}>
        {label ? (
          <RNText style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginBottom: 6 }}>
            {label}
          </RNText>
        ) : null}
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsOpen(!isOpen)}
          style={[
            styles.selectTrigger,
            isOpen && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: TOKENS.colors.primary },
            style
          ]}
        >
          <RNText style={[styles.selectTriggerText, !selectedOption && { color: TOKENS.colors.textMuted }]}>
            {displayText}
          </RNText>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={TOKENS.colors.textMuted} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.selectDropdownContainer}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
              {normalizedOptions.map((opt, idx) => {
                const isSelected = opt.value === currentValue;
                return (
                  <TouchableOpacity
                    key={`select-opt-${idx}`}
                    activeOpacity={0.7}
                    style={[
                      styles.selectOptionRow,
                      isSelected && { backgroundColor: 'rgba(99, 102, 241, 0.08)' }
                    ]}
                    onPress={() => {
                      if (bindState) {
                        updateState(bindState, opt.value);
                      }
                      setIsOpen(false);
                    }}
                  >
                    <RNText style={[styles.selectOptionText, isSelected && { color: TOKENS.colors.primary, fontWeight: '600' }]}>
                      {opt.label}
                    </RNText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={TOKENS.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  },

  DatePicker: ({ props, state, updateState }) => {
    const { label = '', bindState, placeholder = 'Tarih seçin...', style = {} } = props || {};
    const [isOpen, setIsOpen] = React.useState(false);
    
    const currentValue = bindState ? resolveStateValue(state, bindState) ?? '' : '';
    const initialDate = currentValue ? new Date(currentValue) : new Date();
    
    const [selectedYear, setSelectedYear] = React.useState(initialDate.getFullYear() || 2026);
    const [selectedMonth, setSelectedMonth] = React.useState(initialDate.getMonth() || 0);
    const [selectedDay, setSelectedDay] = React.useState(initialDate.getDate() || 1);

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const dayNames = ['Pt', 'Sa', 'Çr', 'Pr', 'Cu', 'Ct', 'Pz'];

    const daysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
    const firstDayIndex = (m, y) => {
      const d = new Date(y, m, 1).getDay();
      return d === 0 ? 6 : d - 1;
    };

    const totalDays = daysInMonth(selectedMonth, selectedYear);
    const offset = firstDayIndex(selectedMonth, selectedYear);

    const handleSave = () => {
      const formattedMonth = String(selectedMonth + 1).padStart(2, '0');
      const formattedDay = String(selectedDay).padStart(2, '0');
      const formattedDate = `${selectedYear}-${formattedMonth}-${formattedDay}`;
      if (bindState) {
        updateState(bindState, formattedDate);
      }
      setIsOpen(false);
    };

    const nextMonth = () => {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    };

    const prevMonth = () => {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    };

    const renderDays = () => {
      const cells = [];
      for (let i = 0; i < offset; i++) {
        cells.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
      }
      for (let day = 1; day <= totalDays; day++) {
        const isSelected = selectedDay === day;
        cells.push(
          <TouchableOpacity
            key={`day-${day}`}
            style={styles.calendarDayCell}
            activeOpacity={0.7}
            onPress={() => setSelectedDay(day)}
          >
            <View style={isSelected ? styles.calendarDaySelected : null}>
              <RNText style={[styles.calendarDayText, isSelected && { fontWeight: '700' }]}>
                {day}
              </RNText>
            </View>
          </TouchableOpacity>
        );
      }
      return cells;
    };

    return (
      <View style={{ width: '100%', marginVertical: 6 }}>
        {label ? (
          <RNText style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginBottom: 6 }}>
            {label}
          </RNText>
        ) : null}
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsOpen(true)}
          style={[styles.dateTrigger, style]}
        >
          <RNText style={[styles.dateTriggerText, !currentValue && { color: TOKENS.colors.textMuted }]}>
            {currentValue ? currentValue : placeholder}
          </RNText>
          <Ionicons name="calendar-outline" size={18} color={TOKENS.colors.textMuted} />
        </TouchableOpacity>

        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.calendarCard}>
              {}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
                  <Ionicons name="chevron-back" size={20} color="#ffffff" />
                </TouchableOpacity>
                <RNText style={styles.calendarMonthText}>
                  {monthNames[selectedMonth]} {selectedYear}
                </RNText>
                <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.calendarWeekRow}>
                {dayNames.map(dName => (
                  <RNText key={dName} style={styles.calendarWeekText}>{dName}</RNText>
                ))}
              </View>

              {}
              <View style={styles.calendarGrid}>
                {renderDays()}
              </View>

              {}
              <View style={styles.calendarFooter}>
                <TouchableOpacity 
                  onPress={() => setIsOpen(false)} 
                  style={[styles.calendarBtn, { backgroundColor: '#27272a' }]}
                >
                  <RNText style={styles.calendarBtnText}>İptal</RNText>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSave} 
                  style={[styles.calendarBtn, { backgroundColor: TOKENS.colors.primary }]}
                >
                  <RNText style={styles.calendarBtnText}>Seç</RNText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  },

  FeedbackAnimation: ({ props, state }) => {
    const { 
      bindState, 
      successLabel = 'İşlem Başarılı!', 
      errorLabel = 'Hata Oluştu!', 
      loadingLabel = 'Yükleniyor...', 
      style = {} 
    } = props || {};
    
    const status = bindState ? resolveStateValue(state, bindState) : 'idle';
    const scaleValue = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
      if (status === 'loading' || status === 'pending') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 1.12,
              duration: 800,
              useNativeDriver: true
            }),
            Animated.timing(scaleValue, {
              toValue: 1.0,
              duration: 800,
              useNativeDriver: true
            })
          ])
        ).start();
      } else {
        scaleValue.setValue(1);
        Animated.spring(scaleValue, {
          toValue: 1.05,
          friction: 4,
          tension: 40,
          useNativeDriver: true
        }).start(() => {
          Animated.timing(scaleValue, {
            toValue: 1.0,
            duration: 150,
            useNativeDriver: true
          }).start();
        });
      }
    }, [status]);

    if (!status || status === 'idle' || status === '') return null;

    let icon = 'sync-outline';
    let color = TOKENS.colors.primary;
    let text = loadingLabel;

    if (status === 'success' || status === 'true') {
      icon = 'checkmark-circle-outline';
      color = TOKENS.colors.success;
      text = successLabel;
    } else if (status === 'error' || status === 'false' || status.toString().startsWith('Hata') || status.toString().startsWith('Geçersiz')) {
      icon = 'close-circle-outline';
      color = TOKENS.colors.error;
      text = status.toString().startsWith('Hata') || status.toString().startsWith('Geçersiz') ? status : errorLabel;
    }

    return (
      <View style={[styles.feedbackContainer, { borderColor: color + '30' }, style]}>
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <Ionicons name={icon} size={48} color={color} />
        </Animated.View>
        <RNText style={[styles.feedbackText, { color }]}>{text}</RNText>
      </View>
    );
  },

  LinearGradient: ({ children, props }) => {
    const { 
      colors = ['#6366f1', '#a855f7'], 
      start = { x: 0, y: 0 }, 
      end = { x: 1, y: 1 }, 
      borderRadius = 'md', 
      padding = 16, 
      gap = 12, 
      style = {} 
    } = props || {};
    
    const resolvedStart = Array.isArray(start) ? { x: start[0], y: start[1] } : start;
    const resolvedEnd = Array.isArray(end) ? { x: end[0], y: end[1] } : end;

    return (
      <LinearGradient
        colors={colors}
        start={resolvedStart}
        end={resolvedEnd}
        style={[
          styles.container,
          {
            padding,
            gap,
            borderRadius: getRadius(borderRadius),
            ...style,
          },
        ]}
      >
        {children}
      </LinearGradient>
    );
  },

  GameCanvas: ({ children, props, state, updateState, dispatchAction }) => {
    const { 
      height = 300, 
      backgroundColor = '#09090b', 
      borderRadius = 'md', 
      onTickAction, 
      tickInterval = 50, 
      style = {} 
    } = props || {};

    const [gameStateLocal, setGameStateLocal] = React.useState(() => ({ ...state }));
    const localStateRef = React.useRef(gameStateLocal);
    localStateRef.current = gameStateLocal;

    React.useEffect(() => {
      setGameStateLocal(prev => {
        let changed = false;
        const next = { ...prev };
        for (const key in state) {
          if (state[key] !== prev[key]) {
            next[key] = state[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, [state]);

    React.useEffect(() => {
      if (!onTickAction) return;

      const interval = setInterval(() => {
        if (onTickAction.functionName === 'RUN_SCRIPT' && onTickAction.script) {
          const currentState = { ...localStateRef.current };
          
          const setFn = (key, value) => {
            currentState[key] = value;
            if (key === 'score' || key === 'highScore' || key === 'gameState') {
              updateState(key, value);
            }
          };

          const keys = Object.keys(currentState);
          const values = Object.values(currentState);
          const shadows = ['global', 'globalThis', 'fetch', 'XMLHttpRequest', 'require', 'window', 'document'];
          const shadowValues = shadows.map(() => undefined);
          const fnKeys = [...shadows, 'state', 'updateState', 'set', 'itemIndex', 'arrayKey', ...keys];
          const fnValues = [...shadowValues, currentState, setFn, setFn, -1, '', ...values];

          try {
            const run = new Function(...fnKeys, `"use strict"; ${onTickAction.script}`);
            run(...fnValues);
            setGameStateLocal(currentState);
          } catch (e) {
            console.error('Local tick script failed:', e.message);
          }
        } else {
          dispatchAction(onTickAction);
        }
      }, tickInterval);

      return () => clearInterval(interval);
    }, [onTickAction, tickInterval, updateState, dispatchAction]);

    const clonedChildren = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child);
      }
      return child;
    });

    return (
      <LocalStateContext.Provider value={gameStateLocal}>
        <View
          style={[
            {
              height: Number(height) || 300,
              backgroundColor: getColor(backgroundColor, '#09090b'),
              borderRadius: getRadius(borderRadius),
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
            },
            style,
          ]}
        >
          {clonedChildren}
        </View>
      </LocalStateContext.Provider>
    );
  },

  GameObject: ({ props, state }) => {
    const localState = React.useContext(LocalStateContext);
    const activeState = localState || state;

    const { 
      bindX, 
      bindY, 
      x = 0, 
      y = 0, 
      width = 20, 
      height = 20, 
      color = 'primary', 
      borderRadius = 'none',
      style = {} 
    } = props || {};

    const resolveVal = (val, bind) => {
      if (bind && activeState) {
        return Number(resolveStateValue(activeState, bind)) ?? val;
      }
      return val;
    };

    const targetX = resolveVal(x, bindX);
    const targetY = resolveVal(y, bindY);

    return (
      <View
        style={[
          {
            position: 'absolute',
            left: targetX,
            top: targetY,
            width: Number(width) || 20,
            height: Number(height) || 20,
            backgroundColor: getColor(color, TOKENS.colors.primary),
            borderRadius: getRadius(borderRadius),
          },
          style,
        ]}
      />
    );
  },
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  switchContainer: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  sliderContainer: {
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  progressBarTrack: {
    width: '100%',
    backgroundColor: COLORS.input,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    width: '100%',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
    gap: 2,
  },
  listItemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  listItemSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  listItemRight: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  selectTriggerText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  selectDropdownContainer: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
  selectOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectOptionText: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  dateTriggerText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  calendarMonthText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  calendarWeekText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  calendarBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  calendarBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },

  feedbackContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 8,
  },
  feedbackText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
