import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { Button, Eyebrow, Pill } from '@/ui/components';
import type { Preset } from '@/types';

export default function EditPresetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const presets = useLibraryStore((s) => s.presets);
  const questions = useLibraryStore((s) => s.questions);
  const upsertPreset = useLibraryStore((s) => s.upsertPreset);
  const deletePreset = useLibraryStore((s) => s.deletePreset);
  const router = useRouter();

  const original = useMemo(() => presets.find((p) => p.id === id), [presets, id]);
  const [name, setName] = useState(original?.name ?? '');
  const [description, setDescription] = useState(original?.description ?? '');
  const [length, setLength] = useState<number>(original?.defaultLength ?? 7);
  const [ids, setIds] = useState<string[]>(original?.questionIds ?? []);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (original) {
      setName(original.name);
      setDescription(original.description);
      setLength(original.defaultLength);
      setIds(original.questionIds ?? []);
    }
  }, [original]);

  if (!original) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">Preset not found.</Text>
      </View>
    );
  }

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) return;
    next[i] = b;
    next[j] = a;
    setIds(next);
  };
  const remove = (qid: string) => setIds((xs) => xs.filter((x) => x !== qid));
  const add = (qid: string) => {
    setIds((xs) => (xs.includes(qid) ? xs : [...xs, qid]));
    setPicker(false);
  };

  const save = async () => {
    const next: Preset = {
      ...original,
      name: name.trim() || original.name,
      description: description.trim(),
      defaultLength: length,
      questionIds: ids.length > 0 ? ids : undefined,
      updatedAt: new Date().toISOString(),
    };
    await upsertPreset(next);
    router.back();
  };

  const onDelete = () => {
    if (original.source !== 'user') {
      Alert.alert('Built-in preset', 'Seed presets cannot be deleted.');
      return;
    }
    Alert.alert('Delete preset?', original.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePreset(original.id);
          router.back();
        },
      },
    ]);
  };

  if (picker) {
    return (
      <FlatList
        data={questions.filter((q) => !ids.includes(q.id))}
        keyExtractor={(q) => q.id}
        contentContainerClassName="px-5 pt-4 pb-12"
        ListHeaderComponent={
          <Pressable onPress={() => setPicker(false)} className="mb-3 py-2">
            <Text className="text-ink">← Cancel</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => add(item.id)} className="border-b border-rule py-3 active:opacity-70">
            <Text className="text-ink">{item.text}</Text>
            <Text className="mt-1 text-xs text-muted">{item.themes.join(' · ')}</Text>
          </Pressable>
        )}
      />
    );
  }

  return (
    <FlatList
      data={ids}
      keyExtractor={(qid) => qid}
      contentContainerClassName="px-5 pt-4 pb-16"
      ListHeaderComponent={
        <View className="gap-3 pb-4">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#6b6b66"
            className="rounded-xl border border-rule bg-paper px-4 py-3 font-serif text-xl text-ink"
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#6b6b66"
            multiline
            className="rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          />
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
          <Eyebrow className="mt-4">
            Questions {ids.length > 0 ? `(${ids.length})` : '(auto-pick from theme weights)'}
          </Eyebrow>
        </View>
      }
      renderItem={({ item: qid, index }) => {
        const q = questions.find((x) => x.id === qid);
        const accent = colorForTheme(q?.themes[0]);
        return (
          <View className="flex-row items-center gap-2 border-b border-rule py-3">
            <View
              style={{ width: 3, height: 28, borderRadius: 2, backgroundColor: accent }}
            />
            <Text className="w-6 text-right text-xs text-muted">{index + 1}</Text>
            <View className="flex-1">
              <Text className="text-ink" numberOfLines={2}>{q?.text ?? qid}</Text>
            </View>
            <Pressable onPress={() => move(index, -1)} className="p-2">
              <Feather name="arrow-up" size={16} color="#1a1a1a" />
            </Pressable>
            <Pressable onPress={() => move(index, 1)} className="p-2">
              <Feather name="arrow-down" size={16} color="#1a1a1a" />
            </Pressable>
            <Pressable onPress={() => remove(qid)} className="p-2">
              <Feather name="x" size={16} color="#a44a55" />
            </Pressable>
          </View>
        );
      }}
      ListFooterComponent={
        <View className="mt-6 gap-3">
          <Pressable
            onPress={() => setPicker(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-rule p-4 active:opacity-70"
          >
            <Feather name="plus" size={16} color="#1a1a1a" />
            <Text className="text-ink">Add question</Text>
          </Pressable>
          <Button label="Save" onPress={save} />
          <Button label="Delete preset" variant="danger" onPress={onDelete} />
        </View>
      }
    />
  );
}
