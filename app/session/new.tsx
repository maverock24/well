import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLibraryStore } from '@/store/library';
import { useSessionStore } from '@/store/session';
import { colorForTheme } from '@/ui/colors';
import { presetDominantTheme } from '@/ui/preset-theme';
import { Button, Eyebrow, Heading, Pill } from '@/ui/components';

export default function NewSessionScreen() {
  const params = useLocalSearchParams<{ presetId?: string }>();
  const presets = useLibraryStore((s) => s.presets);
  const start = useSessionStore((s) => s.start);
  const router = useRouter();

  const [presetId, setPresetId] = useState<string>(params.presetId ?? presets[0]?.id ?? '');
  const preset = useMemo(() => presets.find((p) => p.id === presetId), [presets, presetId]);
  const [length, setLength] = useState<number>(preset?.defaultLength ?? 7);
  const [participants, setParticipants] = useState('');
  const [mode, setMode] = useState<'journal' | 'deck'>('journal');

  if (!preset) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">No preset.</Text>
      </View>
    );
  }

  const accent = colorForTheme(presetDominantTheme(preset));

  const onStart = async () => {
    const parts = participants
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await start(preset, length, parts);
    const session = useSessionStore.getState().session;
    if (session) {
      router.replace(
        mode === 'deck' ? `/session/${session.id}/deck` : `/session/${session.id}`,
      );
    }
  };

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-16 gap-7">
      <View>
        <View
          style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: accent }}
        />
        <Heading size="lg" className="mt-3">
          {preset.name}
        </Heading>
        <Text className="mt-2 text-muted leading-relaxed">{preset.description}</Text>
      </View>

      <View>
        <Eyebrow>Preset</Eyebrow>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {presets.map((p) => (
            <Pill
              key={p.id}
              label={p.name}
              active={p.id === presetId}
              accent={colorForTheme(presetDominantTheme(p))}
              onPress={() => {
                setPresetId(p.id);
                setLength(p.defaultLength);
              }}
            />
          ))}
        </View>
      </View>

      <View>
        <Eyebrow>Questions</Eyebrow>
        <View className="mt-2 flex-row gap-2">
          {[3, 5, 7, 9, 12, 15].map((n) => (
            <Pill
              key={n}
              label={String(n)}
              active={n === length}
              accent={accent}
              onPress={() => setLength(n)}
            />
          ))}
        </View>
      </View>

      <View>
        <Eyebrow>Mode</Eyebrow>
        <View className="mt-2 flex-row gap-2">
          <Pill
            label="Journal"
            active={mode === 'journal'}
            accent={accent}
            onPress={() => setMode('journal')}
          />
          <Pill
            label="Deck"
            active={mode === 'deck'}
            accent={accent}
            onPress={() => setMode('deck')}
          />
        </View>
        <Text className="mt-2 font-sans text-xs leading-relaxed text-muted">
          {mode === 'journal'
            ? 'Write down what you hear. Score, take notes, build a report.'
            : 'Full-screen, one question at a time. For having the conversation.'}
        </Text>
      </View>

      <View>
        <Eyebrow>With</Eyebrow>
        <TextInput
          value={participants}
          onChangeText={setParticipants}
          placeholder="Optional · comma separated names"
          placeholderTextColor="#7a7870"
          className="mt-2 rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
        />
      </View>

      <Button label="Begin" onPress={onStart} />
    </ScrollView>
  );
}
