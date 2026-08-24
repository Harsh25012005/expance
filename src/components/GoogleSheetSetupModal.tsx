import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, GoogleSheetsService } from '../services/googleSheets';

interface GoogleSheetSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GoogleSheetSetupModal: React.FC<GoogleSheetSetupModalProps> = ({
  visible,
  onClose,
}) => {
  const { sheetConfig, updateSheetConfig, syncWithGoogleSheet } = useExpense();

  const [url, setUrl] = useState<string>(sheetConfig.webAppUrl || '');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);

  const handleTest = async () => {
    if (!url.trim()) {
      Alert.alert('Missing URL', 'Please enter your Google Apps Script Web App URL first.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await GoogleSheetsService.testConnection(url.trim());
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      await updateSheetConfig({
        webAppUrl: url.trim(),
        isConnected: true,
      });
    }
  };

  const handleSave = async () => {
    await updateSheetConfig({
      webAppUrl: url.trim(),
      isConnected: testResult?.success ?? sheetConfig.isConnected,
    });

    if (url.trim()) {
      await syncWithGoogleSheet(true);
    }
    onClose();
  };

  const handleCopyCode = () => {
    // In React Native / Expo we can mock or copy
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    Alert.alert(
      'Code Ready to Deploy',
      'The Google Apps Script code is shown below. You can copy it into your Google Spreadsheet Apps Script editor (Extensions -> Apps Script).'
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconContainer}>
                <FileSpreadsheet size={22} color="#10b981" />
              </View>
              <View>
                <Text style={styles.title}>Google Sheets Sync</Text>
                <Text style={styles.subtitle}>Save & sync all expenses automatically</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Connection Status Card */}
            <View
              style={[
                styles.statusBanner,
                sheetConfig.isConnected ? styles.statusConnected : styles.statusDisconnected,
              ]}
            >
              {sheetConfig.isConnected ? (
                <>
                  <CheckCircle2 size={20} color="#10b981" />
                  <View style={styles.statusBannerText}>
                    <Text style={styles.statusTitleConnected}>Google Sheet Connected</Text>
                    <Text style={styles.statusDesc}>
                      Expenses sync both ways with sheet "{sheetConfig.sheetName}"
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <AlertCircle size={20} color="#f59e0b" />
                  <View style={styles.statusBannerText}>
                    <Text style={styles.statusTitlePending}>Google Sheet Not Connected</Text>
                    <Text style={styles.statusDesc}>
                      Enter your Web App URL below to sync your expenses directly to your spreadsheet.
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Input URL Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GOOGLE APPS SCRIPT WEB APP URL</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="https://script.google.com/macros/s/.../exec"
                placeholderTextColor="#475569"
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  setTestResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#10b981"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing && styles.btnDisabled]}
                  onPress={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <>
                      <RefreshCw size={15} color="#38bdf8" />
                      <Text style={styles.testBtnText}>Test Connection</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewCodeBtn}
                  onPress={() => setShowCode(!showCode)}
                >
                  <HelpCircle size={15} color="#a78bfa" />
                  <Text style={styles.viewCodeBtnText}>
                    {showCode ? 'Hide Setup Script' : 'View Setup Script'}
                  </Text>
                </TouchableOpacity>
              </View>

              {testResult && (
                <View
                  style={[
                    styles.testResultBox,
                    testResult.success ? styles.testResultSuccess : styles.testResultError,
                  ]}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <AlertCircle size={16} color="#ef4444" />
                  )}
                  <Text
                    style={[
                      styles.testResultText,
                      testResult.success ? styles.textSuccess : styles.textError,
                    ]}
                  >
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Steps & Guide */}
            <View style={styles.guideCard}>
              <Text style={styles.guideHeading}>How to get your Web App URL (in 1 min):</Text>
              
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>Open <Text style={styles.highlight}>sheets.new</Text> in your browser to create a new Google Sheet.</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>Click <Text style={styles.highlight}>Extensions</Text> → <Text style={styles.highlight}>Apps Script</Text>.</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>Paste the Shake Expense Tracker Script (shown below).</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                <Text style={styles.stepText}>Click <Text style={styles.highlight}>Deploy → New deployment</Text>, select <Text style={styles.highlight}>Web app</Text>, set Access to <Text style={styles.highlight}>Anyone</Text>.</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
                <Text style={styles.stepText}>Copy the generated Web App URL and paste it in the box above!</Text>
              </View>
            </View>

            {/* Google Apps Script Code snippet */}
            {showCode && (
              <View style={styles.codeContainer}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeHeaderTitle}>Google Apps Script Code</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                    <Copy size={14} color="#10b981" />
                    <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal nestedScrollEnabled style={styles.codeScroll}>
                  <Text style={styles.codeText}>{GOOGLE_APPS_SCRIPT_TEMPLATE}</Text>
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Sparkles size={18} color="#090d16" />
              <Text style={styles.saveBtnText}>Save & Apply Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  statusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
  },
  statusBannerText: {
    flex: 1,
  },
  statusTitleConnected: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
  },
  statusTitlePending: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  statusDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  urlInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f8fafc',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  viewCodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  viewCodeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a78bfa',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 8,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  textSuccess: {
    color: '#34d399',
  },
  textError: {
    color: '#f87171',
  },
  guideCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    gap: 12,
  },
  guideHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#090d16',
  },
  stepText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    flex: 1,
  },
  highlight: {
    fontWeight: '700',
    color: '#34d399',
  },
  codeContainer: {
    backgroundColor: '#090d16',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    gap: 10,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  codeHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  codeScroll: {
    maxHeight: 180,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    height: 52,
    borderRadius: 16,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#090d16',
  },
});
