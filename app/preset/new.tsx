import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { newId } from '@/lib/id';
import { useLibraryStore } from '@/store/library';
import { Button, Eyebrow, Pill } from '@/ui/components';
import type { Intensity, Preset } from '@/types';

export default function NewPresetScreen() {
  const upsertPreset = useLibraryStore((s) => s.upsertPreset);
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState(7);
  const [low, setLow] = useState<Intensity>(1);
  const [high, setHigh] = useState<Intensity>(3);

  const save = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const preset: Preset = {
      id: newId('p'),
      name: name.trim(),
      description: description.trim(),
      themeWeights: {},
      defaultLength: length,
      intensityRange: [low, high],
      source: 'user',
      createdAt: now,
      updatedAt: now,
    };
    await upsertPreset(preset);
    router.replace(`/preset/${preset.id}/edit`);
  };

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-16 gap-5">
      <View>
        <Eyebrow>Name</Eyebrow>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Friday wind-down"
          placeholderTextColor="#7a7870"
          className="mt-2 rounded-xl border border-rule bg-paper px-4 py-3 font-serif text-xl text-ink"
        />
      </View>
      <View>
        <Eyebrow>Description</Eyebrow>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What this conversation is for"
          placeholderTextColor="#7a7870"
          multiline
          className="mt-2 rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          textAlignVertical="top"
        />
      </View>
      <View>
        <Eyebrow>Default length</Eyebrow>
        <View className="mt-2 flex-row gap-2">
          {[3, 5, 7, 9, 12, 15].map((n) => (
            <Pill
              key={n}
              label={String(n)}
              active={n === length}
              onPress={() => setLength(n)}
            />
          ))}
        </View>
      </View>
      <View>
        <Eyebrow>Intensity range</Eyebrow>
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-xs text-muted">min</Text>
          {[1, 2, 3].map((n) => (
            <Pill
              key={`l${n}`}
              label={String(n)}
              active={low === n}
              onPress={() => setLow(n as Intensity)}
            />
          ))}
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-xs text-muted">max</Text>
          {[1, 2, 3].map((n) => (
            <Pill
              key={`h${n}`}
              label={String(n)}
              active={high === n}
              onPress={() => setHigh(n as Intensity)}
            />
          ))}
        </View>
      </View>
      <Button label="Create & edit questions" onPress={save} />
    </ScrollView>
  );
}
