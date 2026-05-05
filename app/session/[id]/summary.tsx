import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as db from '@/db';
import { newId } from '@/lib/id';
import { buildReport, formatDuration, longestSit } from '@/lib/report';
import { useLibraryStore } from '@/store/library';
import { colorForTheme } from '@/ui/colors';
import { presetDominantTheme } from '@/ui/preset-theme';
import { AxisBar, Button, Card, Eyebrow, Heading } from '@/ui/components';
import type { Question, Report, Session } from '@/types';

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const presets = useLibraryStore((s) => s.presets);
  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const s = await db.getSession(id);
      setSession(s);
      const r = await db.getReportForSession(id);
      setReport(r);
      const all = await db.listQuestions();
      if (s) setQuestions(all.filter((q) => s.questionIds.includes(q.id)));
    })();
  }, [id]);

  const sat = useMemo(
    () => (session && questions.length > 0 ? longestSit(session, questions) : null),
    [session, questions],
  );

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-muted">Session not found.</Text>
      </View>
    );
  }

  const preset = presets.find((p) => p.id === session.presetId);
  const accent = colorForTheme(preset && presetDominantTheme(preset));

  const regenerate = async () => {
    const allQuestions = await db.listQuestions();
    const used = allQuestions.filter((q) => session.questionIds.includes(q.id));
    const draft = buildReport(session, used);
    const next: Report = { id: newId('r'), ...draft };
    await db.upsertReport(next);
    setReport(next);
    setToast('Report rebuilt');
    setTimeout(() => setToast(null), 1600);
  };

  const copy = async () => {
    if (!report) return;
    await Clipboard.setStringAsync(report.body);
    setToast('Copied to clipboard');
    setTimeout(() => setToast(null), 1600);
  };

  const answered = session.answers.filter((a) => !a.skipped).length;
  const skipped = session.answers.filter((a) => a.skipped).length;

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-16">
      <View
        style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: accent }}
      />
      <Heading size="xl" className="mt-3">
        {session.title ?? preset?.name ?? 'Session'}
      </Heading>
      <Text className="mt-1 text-xs text-muted">
        {new Date(session.createdAt).toLocaleString()}
        {session.participants.length > 0 && ` · with ${session.participants.join(', ')}`}
      </Text>

      <View className="mt-5 flex-row gap-2">
        <Card className="flex-1">
          <View className="p-4">
            <Text className="font-serif text-3xl text-ink">{answered}</Text>
            <Text className="text-[11px] uppercase tracking-widest text-muted">
              Answered
            </Text>
          </View>
        </Card>
        <Card className="flex-1">
          <View className="p-4">
            <Text className="font-serif text-3xl text-ink">{skipped}</Text>
            <Text className="text-[11px] uppercase tracking-widest text-muted">
              Skipped
            </Text>
          </View>
        </Card>
        <Card className="flex-1">
          <View className="p-4">
            <Text className="font-serif text-3xl text-ink">
              {session.questionIds.length}
            </Text>
            <Text className="text-[11px] uppercase tracking-widest text-muted">
              Total
            </Text>
          </View>
        </Card>
      </View>

      {report && report.axisScores.length > 0 && (
        <View className="mt-8">
          <Eyebrow>Scores</Eyebrow>
          <View className="mt-2">
            {report.axisScores.map((a) => (
              <AxisBar
                key={a.axis}
                axis={a.axis}
                average={a.average}
                count={a.count}
                accent={accent}
              />
            ))}
          </View>
        </View>
      )}

      {sat && sat.ms > 1500 && (
        <View className="mt-8">
          <Eyebrow>Longest sit</Eyebrow>
          <Card className="mt-2">
            <View className="p-4">
              <Text className="font-serif text-base leading-snug text-ink">
                “{sat.question.text}”
              </Text>
              <Text className="mt-2 font-sans text-xs text-muted">
                You sat with this for {formatDuration(sat.ms)}.
              </Text>
            </View>
          </Card>
        </View>
      )}

      <View className="mt-6 flex-row gap-3">
        <View className="flex-1">
          <Button
            label={report ? 'Regenerate' : 'Build report'}
            variant="secondary"
            onPress={regenerate}
          />
        </View>
        {report && (
          <View className="flex-1">
            <Button label="Copy" onPress={copy} />
          </View>
        )}
      </View>

      {report && (
        <View className="mt-8">
          <Eyebrow>Report</Eyebrow>
          <View className="mt-3 rounded-2xl border border-rule bg-paper-2 p-4">
            <Text className="leading-relaxed text-ink" selectable>
              {report.body}
            </Text>
          </View>
        </View>
      )}

      {toast && (
        <View className="absolute bottom-8 left-0 right-0 items-center">
          <View className="flex-row items-center gap-2 rounded-full bg-ink px-4 py-2">
            <Feather name="check" size={14} color="#fafaf7" />
            <Text className="text-paper">{toast}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
