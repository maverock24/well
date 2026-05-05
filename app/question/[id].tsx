import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { Button, Eyebrow, Heading } from '@/ui/components';

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const questions = useLibraryStore((s) => s.questions);
  const deleteQuestion = useLibraryStore((s) => s.deleteQuestion);
  const router = useRouter();

  const q = useMemo(() => questions.find((x) => x.id === id), [questions, id]);

  if (!q) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">Not found.</Text>
      </View>
    );
  }

  const accent = colorForTheme(q.themes[0]);

  const onDelete = () => {
    if (q.source !== 'user') {
      Alert.alert('Built-in question', 'Seed questions cannot be deleted.');
      return;
    }
    Alert.alert('Delete?', q.text, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQuestion(q.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-16">
      <View
        style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: accent }}
      />
      <Heading size="lg" className="mt-3 leading-snug">
        {q.text}
      </Heading>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {q.themes.map((t) => (
          <View
            key={t}
            className="flex-row items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5"
          >
            <View
              style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colorForTheme(t) }}
            />
            <Text className="text-[10px] text-muted">{t}</Text>
          </View>
        ))}
        <View className="rounded-full bg-paper-2 px-2 py-0.5">
          <Text className="text-[10px] text-muted">{'•'.repeat(q.intensity)}</Text>
        </View>
        <View className="rounded-full bg-paper-2 px-2 py-0.5">
          <Text className="text-[10px] text-muted">{q.source}</Text>
        </View>
      </View>

      <View className="mt-7">
        <Eyebrow color={accent}>Listen for</Eyebrow>
        <Text className="mt-2 italic leading-relaxed text-ink-2">{q.evaluation}</Text>
      </View>

      {q.scale && (
        <View className="mt-7">
          <Eyebrow color={accent}>Scale</Eyebrow>
          <Text className="mt-2 text-ink">{q.scale.axis}</Text>
          <Text className="mt-1 text-sm text-muted">
            {q.scale.min} {q.scale.low} → {q.scale.max} {q.scale.high}
          </Text>
        </View>
      )}

      {q.followUp && (
        <View className="mt-7">
          <Eyebrow color={accent}>Follow-up</Eyebrow>
          <Text className="mt-2 italic text-ink-2">{q.followUp}</Text>
        </View>
      )}

      {q.source === 'user' && (
        <View className="mt-10">
          <Button label="Delete" variant="danger" onPress={onDelete} />
        </View>
      )}
    </ScrollView>
  );
}
