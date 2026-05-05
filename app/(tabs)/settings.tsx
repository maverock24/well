import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as db from '@/db';
import { useLibraryStore } from '@/store/library';
import { useUiStore, type ThemeMode } from '@/store/ui';
import { Button, Eyebrow, Heading, Pill } from '@/ui/components';

export default function SettingsScreen() {
  const questions = useLibraryStore((s) => s.questions);
  const presets = useLibraryStore((s) => s.presets);
  const refresh = useLibraryStore((s) => s.refresh);
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'reset'>(null);
  const [toast, setToast] = useState<string | null>(null);

  const userQuestions = questions.filter((q) => q.source === 'user').length;
  const userPresets = presets.filter((p) => p.source === 'user').length;

  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const onExport = async () => {
    setBusy('export');
    try {
      const payload = await db.exportAll();
      const json = JSON.stringify(payload, null, 2);
      const stamp = payload.exportedAt.replace(/[:.]/g, '-');
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(json);
        flash('Backup copied to clipboard.');
      } else {
        const uri = `${FileSystem.cacheDirectory}well-backup-${stamp}.json`;
        await FileSystem.writeAsStringAsync(uri, json);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/json',
            dialogTitle: 'Well backup',
            UTI: 'public.json',
          });
        } else {
          await Clipboard.setStringAsync(json);
          flash('Backup copied to clipboard.');
        }
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    Alert.alert(
      'Import from clipboard',
      'Paste a Well backup into your clipboard first. Existing rows with the same id will be overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setBusy('import');
            try {
              const text = await Clipboard.getStringAsync();
              if (!text) {
                Alert.alert('Nothing to import', 'Your clipboard is empty.');
                return;
              }
              const payload = JSON.parse(text) as db.BackupPayload;
              const { counts } = await db.importAll(payload, { mode: 'merge' });
              await refresh();
              flash(
                `Imported ${counts.questions}q · ${counts.presets}p · ${counts.sessions}s · ${counts.reports}r`,
              );
            } catch (e) {
              Alert.alert('Import failed', String(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onReset = async () => {
    Alert.alert(
      'Reset library?',
      'Deletes all your sessions, reports, custom questions, and custom presets, then re-seeds the bundled library. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Really reset?', 'Last chance to back up first.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, wipe',
                style: 'destructive',
                onPress: async () => {
                  setBusy('reset');
                  try {
                    await db.resetSeed();
                    await refresh();
                    flash('Library reset to defaults.');
                  } catch (e) {
                    Alert.alert('Reset failed', String(e));
                  } finally {
                    setBusy(null);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-12">
      <Heading size="xl">Settings</Heading>
      <Text className="mt-2 leading-relaxed text-muted">
        Everything lives on your device. No accounts. No analytics. No sync.
      </Text>

      <View className="mt-8">
        <Eyebrow>Library</Eyebrow>
        <View className="mt-3 gap-2">
          <Row icon="message-circle" label="Questions" value={`${questions.length}`} hint={`${userQuestions} yours`} />
          <Row icon="layers" label="Presets" value={`${presets.length}`} hint={`${userPresets} yours`} />
        </View>
      </View>

      <View className="mt-10">
        <Eyebrow>Appearance</Eyebrow>
        <View className="mt-3 flex-row gap-2">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <Pill
              key={m}
              label={m[0]!.toUpperCase() + m.slice(1)}
              active={themeMode === m}
              onPress={() => setThemeMode(m)}
            />
          ))}
        </View>
      </View>

      <View className="mt-10">
        <Eyebrow>Backup</Eyebrow>
        <Text className="mt-2 font-sans text-xs leading-relaxed text-muted">
          Export everything as JSON. Save it anywhere. Import on another device or after a reset.
        </Text>
        <View className="mt-3 gap-2">
          <Button
            label={busy === 'export' ? 'Exporting…' : 'Export library'}
            onPress={onExport}
            disabled={busy !== null}
          />
          <Pressable
            onPress={onImport}
            disabled={busy !== null}
            className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-rule bg-paper px-4 active:opacity-60"
          >
            <Feather name="clipboard" size={16} color="#1a1a1a" />
            <Text className="font-serif text-base text-ink">
              {busy === 'import' ? 'Importing…' : 'Import from clipboard'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-10">
        <Eyebrow>Danger zone</Eyebrow>
        <Pressable
          onPress={onReset}
          disabled={busy !== null}
          className="mt-3 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-rose/40 bg-paper px-4 active:opacity-60"
        >
          <Feather name="alert-triangle" size={16} color="#a8434b" />
          <Text className="font-serif text-base text-rose">
            {busy === 'reset' ? 'Resetting…' : 'Reset to defaults'}
          </Text>
        </Pressable>
      </View>

      <View className="mt-10">
        <Eyebrow>About</Eyebrow>
        <View className="mt-3 gap-2">
          <Row icon="tag" label="Version" value="0.1.0" />
          <Row icon="heart" label="Built with" value="Expo · React Native · SQLite" />
        </View>
      </View>

      <Text className="mt-12 text-center text-[11px] text-muted">
        a small thing for big questions
      </Text>

      {toast && (
        <View className="mt-6 self-center rounded-full bg-ink px-4 py-2">
          <Text className="font-sans text-xs text-paper">{toast}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-rule bg-paper p-4">
      <Feather name={icon} size={16} color="rgb(107 107 102)" />
      <Text className="flex-1 text-ink">{label}</Text>
      <Text className="text-ink">{value}</Text>
      {hint && <Text className="text-xs text-muted">· {hint}</Text>}
    </View>
  );
}
