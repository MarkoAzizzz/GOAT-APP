import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { fonts } from '../theme/fonts';

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app confirm dialog, not Alert.alert or window.confirm — Alert.alert is
 * a no-op stub on react-native-web (does nothing, no dialog, callbacks never
 * fire), and window.confirm works but is an unstyled native browser popup
 * that blocks the JS thread. This renders in the app's own dark/red theme
 * and behaves identically on native and web.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 22,
    gap: 16,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 19, color: '#F5F5F5' },
  message: { fontFamily: fonts.body, fontSize: 14, color: '#9BA3A7', lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#F5F5F5' },
});
