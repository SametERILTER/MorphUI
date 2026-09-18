import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useEngine } from '../context/EngineContext';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const DebugConsole = () => {
  const { logs, stateStore, clearState, setIsConsoleVisible } = useEngine();
  const [tab, setTab] = useState('logs');

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return '#f87171';
      case 'success':
        return '#34d399';
      case 'action':
        return '#60a5fa';
      case 'state_change':
        return '#fbbf24';
      default:
        return '#9ca3af';
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="terminal" size={16} color="#818cf8" />
          <Text style={styles.headerTitle}>Sistem Konsolu</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setTab('logs')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'logs' && styles.activeTab,
              ]}
            >
              Loglar ({logs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setTab('state')}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'state' && styles.activeTab,
              ]}
            >
              Hafıza (State)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearState}
          >
            <Ionicons name="trash-outline" size={14} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.minimizeBtn}
            onPress={() => setIsConsoleVisible(false)}
          >
            <Ionicons
              name="close"
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
      </View>


      <View style={styles.content}>
        {tab === 'logs' ? (
          <ScrollView
            style={styles.logList}
            contentContainerStyle={{ paddingBottom: 10 }}
            nestedScrollEnabled
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>Henüz bir işlem tetiklenmedi...</Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logTime}>[{log.timestamp}]</Text>
                  <Text style={[styles.logText, { color: getLogColor(log.type) }]}>
                    {log.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.logList}
            contentContainerStyle={{ paddingBottom: 10 }}
            nestedScrollEnabled
          >
            {Object.keys(stateStore).length === 0 ? (
              <Text style={styles.emptyText}>Hafıza şu an boş.</Text>
            ) : (
              Object.entries(stateStore).map(([key, val]) => (
                <View key={key} style={styles.stateItem}>
                  <Text style={styles.stateKey}>{key}:</Text>
                  <Text style={styles.stateValue}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 320,
    width: '100%',
  },
  header: {
    height: 44,
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: 'JosefinSans_700Bold',
    fontSize: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'JosefinSans_600SemiBold',
  },
  activeTab: {
    color: COLORS.primary,
  },
  clearBtn: {
    padding: 4,
  },
  minimizeBtn: {
    padding: 4,
  },
  content: {
    height: 276,
    padding: 12,
  },
  logList: {
    flex: 1,
  },
  emptyText: {
    color: '#475569',
    fontStyle: 'italic',
    fontSize: 13,
    fontFamily: 'JosefinSans_400Regular',
    textAlign: 'center',
    marginTop: 20,
  },
  logItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  logTime: {
    color: '#475569',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
    flexWrap: 'wrap',
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stateKey: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  stateValue: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'monospace',
  },
});

export default DebugConsole;
