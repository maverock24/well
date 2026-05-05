import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSessionStore } from '@/store/session';
import { colorForTheme, dominantTheme } from '@/ui/colors';
import { ProgressDots } from '@/ui/components';

/**
 * Deck mode — full-bleed, one question at a time, swipe-to-advance.
 *
 * For *using* the app during a real conversation rather than journaling
 * solo. No inputs, no scoring, no notes. The session still records each
 * question with `skipped: false` so per-question dwell-time is preserved.
 *
 * Swipe right or tap "Skip" to skip the current question. Swipe left or
 * tap the screen to keep + advance.
 */

const { width } = Dimensions.get('window');
const SWIPE = 80;

export default function DeckScreen() {
  const session = useSessionStore((s) => s.session);
  const questions = useSessionStore((s) => s.questions);
  const index = useSessionStore((s) => s.index);
  const recordAnswer = useSessionStore((s) => s.recordAnswer);
  const next = useSessionStore((s) => s.next);
  const finish = useSessionStore((s) => s.finish);
  const router = useRouter();

  const tx = useSharedValue(0);
  const opacity = useSharedValue(1);

  const q = questions[index];
  const accent = colorForTheme(q ? dominantTheme(q.themes) : undefined);
  const isLast = index >= questions.length - 1;

  useEffect(() => {
    if (q) Haptics.selectionAsync().catch(() => {});
  }, [q]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotateZ: `${(tx.value / width) * 6}deg` },
    ],
    opacity: opacity.value,
  }));

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">No active session.</Text>
      </View>
    );
  }
  if (!q) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">Done.</Text>
      </View>
    );
  }

  const advance = async (skipped: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await recordAnswer({ skipped });
    if (isLast) {
      const report = await finish();
      if (report) router.replace(`/session/${report.sessionId}/summary`);
    } else {
      next();
      tx.value = 0;
      opacity.value = 1;
    }
  };

  const animateOff = (skipped: boolean, dir: 1 | -1) => {
    tx.value = withTiming(dir * width, { duration: 180, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(advance)(skipped);
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      opacity.value = 1 - Math.min(1, Math.abs(e.translationX) / (width * 0.6));
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE) {
        const dir = e.translationX > 0 ? 1 : -1;
        // swipe right = skip, swipe left = keep
        const skipped = dir === 1;
        tx.value = withTiming(dir * width, { duration: 160 });
        opacity.value = withTiming(0, { duration: 160 }, () => {
          runOnJS(advance)(skipped);
        });
      } else {
        tx.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  return (
    <View className="flex-1 bg-paper">
      <View className="flex-row items-center justify-between px-5 pt-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="p-2 active:opacity-60"
        >
          <Feather name="x" size={20} color="#14110f" />
        </Pressable>
        <ProgressDots total={questions.length} current={index} accent={accent} />
        <Text className="font-sans text-xs text-muted">
          {index + 1} / {questions.length}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          key={q.id}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          style={cardStyle}
          className="flex-1 items-center justify-center px-8"
        >
          <View
            style={{ width: 56, height: 3, borderRadius: 2, backgroundColor: accent }}
          />
          <Text className="mt-8 text-center font-serif text-4xl leading-tight text-ink">
            {q.text}
          </Text>
          <View className="mt-8 flex-row flex-wrap justify-center gap-1.5">
            {q.themes.map((t) => (
              <View
                key={t}
                className="flex-row items-center gap-1 rounded-full bg-paper-2 px-2.5 py-1"
              >
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: colorForTheme(t),
                  }}
                />
                <Text className="font-sans text-[11px] text-muted">{t}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      <View className="flex-row items-center justify-between px-5 pb-10 pt-4">
        <Pressable
          onPress={() => animateOff(true, 1)}
          hitSlop={10}
          className="flex-row items-center gap-2 px-4 py-3 active:opacity-60"
        >
          <Feather name="skip-forward" size={16} color="#8b847b" />
          <Text className="font-sans text-sm text-muted">Skip</Text>
        </Pressable>
        <Text className="font-sans text-[11px] text-muted">
          Swipe ← keep · Skip →
        </Text>
        <Pressable
          onPress={() => animateOff(false, -1)}
          hitSlop={10}
          className="flex-row items-center gap-2 px-4 py-3 active:opacity-60"
        >
          <Text className="font-sans text-sm text-ink">{isLast ? 'Finish' : 'Next'}</Text>
          <Feather name="arrow-right" size={16} color="#14110f" />
        </Pressable>
      </View>
    </View>
  );
}
