import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import { useSessionStore } from '@/store/session';
import { colorForTheme, dominantTheme } from '@/ui/colors';
import { Button, Eyebrow, ProgressDots } from '@/ui/components';

export default function ActiveSessionScreen() {
  const session = useSessionStore((s) => s.session);
  const questions = useSessionStore((s) => s.questions);
  const index = useSessionStore((s) => s.index);
  const recordAnswer = useSessionStore((s) => s.recordAnswer);
  const next = useSessionStore((s) => s.next);
  const finish = useSessionStore((s) => s.finish);
  const router = useRouter();

  const [text, setText] = useState('');
  const [score, setScore] = useState<number | undefined>(undefined);
  const [note, setNote] = useState('');

  const q = questions[index];
  const accent = colorForTheme(q ? dominantTheme(q.themes) : undefined);

  useEffect(() => {
    if (q) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [q]);

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">No active session.</Text>
      </View>
    );
  }

  const isLast = index >= questions.length - 1;

  const reset = () => {
    setText('');
    setScore(undefined);
    setNote('');
  };

  const onSubmit = async (skipped: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await recordAnswer({
      text: skipped ? undefined : text,
      score,
      note: note || undefined,
      skipped,
    });
    if (isLast) {
      const report = await finish();
      if (report) router.replace(`/session/${report.sessionId}/summary`);
    } else {
      next();
      reset();
    }
  };

  if (!q) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="text-muted">Done.</Text>
        <Pressable
          className="mt-4 rounded-xl bg-ink px-6 py-3"
          onPress={async () => {
            const report = await finish();
            if (report) router.replace(`/session/${report.sessionId}/summary`);
          }}
        >
          <Text className="text-paper">Build report</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerClassName="px-6 pt-2 pb-16"
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-6 flex-row items-center justify-between">
        <ProgressDots total={questions.length} current={index} accent={accent} />
        <Text className="text-xs text-muted">
          {index + 1} / {questions.length}
        </Text>
      </View>

      <Animated.View
        key={q.id}
        entering={FadeInDown.duration(280).springify().damping(18)}
        exiting={FadeOut.duration(120)}
      >
        <View
          style={{
            width: 40,
            height: 3,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
        <Text className="mt-4 font-serif text-3xl leading-snug text-ink">{q.text}</Text>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {q.themes.map((t) => (
            <View
              key={t}
              className="flex-row items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5"
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colorForTheme(t),
                }}
              />
              <Text className="text-[10px] text-muted">{t}</Text>
            </View>
          ))}
        </View>

        <View className="mt-7">
          <Eyebrow>Listen for</Eyebrow>
          <Text className="mt-2 italic leading-relaxed text-ink-2">{q.evaluation}</Text>
        </View>

        <View className="mt-7">
          <Eyebrow>Answer</Eyebrow>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write what you hear, or paraphrase"
            placeholderTextColor="#7a7870"
            multiline
            className="mt-2 min-h-[120px] rounded-xl border border-rule bg-paper p-4 text-ink"
            textAlignVertical="top"
          />
        </View>

        {q.scale && (
          <Animated.View entering={FadeIn.duration(200)} className="mt-6">
            <View className="flex-row items-baseline justify-between">
              <Eyebrow color={accent}>{q.scale.axis}</Eyebrow>
              {score !== undefined && (
                <Text className="text-xs text-muted">
                  {score === q.scale.min ? q.scale.low : ''}
                  {score === q.scale.max ? q.scale.high : ''}
                </Text>
              )}
            </View>
            <View className="mt-2 flex-row items-center justify-between gap-2">
              {Array.from(
                { length: q.scale.max - q.scale.min + 1 },
                (_, i) => q.scale!.min + i,
              ).map((n) => {
                const active = score === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setScore(n);
                    }}
                    className="h-12 flex-1 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: active ? accent : '#e5e3dc',
                      backgroundColor: active ? accent : 'transparent',
                    }}
                  >
                    <Text
                      className="font-serif text-lg"
                      style={{ color: active ? '#fafaf7' : '#1a1a1a' }}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-[11px] text-muted">{q.scale.low}</Text>
              <Text className="text-[11px] text-muted">{q.scale.high}</Text>
            </View>
          </Animated.View>
        )}

        <View className="mt-6">
          <Eyebrow>Private note</Eyebrow>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Asker-only, kept out of shared report"
            placeholderTextColor="#7a7870"
            className="mt-2 rounded-xl border border-rule bg-paper px-4 py-3 text-ink"
          />
        </View>
      </Animated.View>

      <View className="mt-8 flex-row gap-3">
        <Pressable
          onPress={() => onSubmit(true)}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-rule py-4 active:opacity-70"
        >
          <Feather name="skip-forward" size={16} color="#1a1a1a" />
          <Text className="text-ink">Skip</Text>
        </Pressable>
        <View className="flex-[2]">
          <Button
            label={isLast ? 'Finish' : 'Next'}
            onPress={() => onSubmit(false)}
          />
        </View>
      </View>
    </ScrollView>
  );
}
