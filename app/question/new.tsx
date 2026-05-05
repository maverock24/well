import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { newId } from '@/lib/id';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { Button, Eyebrow, Pill } from '@/ui/components';
import type { Intensity, Question, ThemeId } from '@/types';

const ALL_THEMES: ThemeId[] = [
  'identity', 'love', 'sex', 'family', 'friendship', 'work', 'ambition', 'money',
  'power', 'leadership', 'conflict', 'communication', 'trust', 'ethics', 'belief',
  'fear', 'regret', 'memory', 'time', 'death', 'freedom', 'home', 'body', 'humor', 'hope',
];

export default function NewQuestionScreen() {
  const upsertQuestion = useLibraryStore((s) => s.upsertQuestion);
  const router = useRouter();

  const [text, setText] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [intensity, setIntensity] = useState<Intensity>(2);
  const [themes, setThemes] = useState<ThemeId[]>([]);
  const [scaleEnabled, setScaleEnabled] = useState(false);
  const [axis, setAxis] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');

  const toggle = (t: ThemeId) =>
    setThemes((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));

  const save = async () => {
    if (!text.trim() || themes.length === 0) return;
    const q: Question = {
      id: newId('uq'),
      text: text.trim(),
      themes,
      intensity,
      evaluation: evaluation.trim() || 'Listen for what they actually mean.',
      scale: scaleEnabled
        ? { min: 1, max: 5, low: low.trim() || 'low', high: high.trim() || 'high', axis: axis.trim() || 'overall' }
        : undefined,
      source: 'user',
      createdAt: new Date().toISOString(),
    };
    await upsertQuestion(q);
    router.back();
  };

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-16 gap-4">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Question"
        placeholderTextColor="#6b6b66"
        multiline
        className="rounded-xl border border-rule bg-paper px-4 py-3 font-serif text-xl text-ink"
      />
      <TextInput
        value={evaluation}
        onChangeText={setEvaluation}
        placeholder="What to listen for"
        placeholderTextColor="#6b6b66"
        multiline
        className="rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
      />
      <View>
        <Eyebrow>Intensity</Eyebrow>
        <View className="mt-2 flex-row gap-2">
          {[1, 2, 3].map((n) => (
            <Pill
              key={n}
              label={'•'.repeat(n)}
              active={intensity === n}
              onPress={() => setIntensity(n as Intensity)}
            />
          ))}
        </View>
      </View>
      <View>
        <Eyebrow>Themes</Eyebrow>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {ALL_THEMES.map((t) => (
            <Pill
              key={t}
              label={t}
              active={themes.includes(t)}
              accent={colorForTheme(t)}
              onPress={() => toggle(t)}
            />
          ))}
        </View>
      </View>
      <Pressable
        onPress={() => setScaleEnabled((v) => !v)}
        className="flex-row items-center justify-between rounded-xl border border-rule px-4 py-3"
      >
        <Text className="text-ink">Add evaluation scale (1–5)</Text>
        <Text className="text-muted">{scaleEnabled ? 'on' : 'off'}</Text>
      </Pressable>
      {scaleEnabled && (
        <View className="gap-3">
          <TextInput
            value={axis}
            onChangeText={setAxis}
            placeholder="Axis (e.g. self-knowledge)"
            placeholderTextColor="#7a7870"
            className="rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          />
          <TextInput
            value={low}
            onChangeText={setLow}
            placeholder="Low label"
            placeholderTextColor="#7a7870"
            className="rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          />
          <TextInput
            value={high}
            onChangeText={setHigh}
            placeholder="High label"
            placeholderTextColor="#7a7870"
            className="rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          />
        </View>
      )}
      <Button label="Save question" onPress={save} />
    </ScrollView>
  );
}
