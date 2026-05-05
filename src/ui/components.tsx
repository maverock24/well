import { type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  Text,
  type TextProps,
  View,
  type ViewProps,
  Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';

/* ====================================================================
   well. design system
   --------------------------------------------------------------------
   Two typefaces:
     • Fraunces — display only (Headings, hero numbers).
     • Inter    — every other surface (buttons, body, labels, meta).
   Spacing: Tailwind 4-pt grid + custom 11/13/15/18 for 44pt targets.
   Colours: see tailwind.config.js + global.css design tokens.
   Touch:   minimum 44pt tap target on all interactive elements.
   Focus:   :focus-visible ring on web; opacity feedback on press for RN.
   ==================================================================== */

/* ─────────────────────────── Stack / Inline ──────────────────────────
   Layout primitives that enforce the spacing scale, eliminating the
   cognitive load of choosing margins per screen. */

export function Stack({
  gap = 3,
  className = '',
  children,
  ...rest
}: ViewProps & { gap?: number; className?: string; children: ReactNode }) {
  return (
    <View {...rest} className={`flex-col gap-${gap} ${className}`}>
      {children}
    </View>
  );
}

export function Inline({
  gap = 2,
  align = 'center',
  className = '',
  children,
  ...rest
}: ViewProps & {
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  className?: string;
  children: ReactNode;
}) {
  const a = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
  }[align];
  return (
    <View {...rest} className={`flex-row gap-${gap} ${a} ${className}`}>
      {children}
    </View>
  );
}

/* ──────────────────────────── Typography ───────────────────────────── */

export function Display({
  children,
  size = 'lg',
  serif = true,
  className = '',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  serif?: boolean;
  className?: string;
}) {
  // Inline sizes — NativeWind v4 doesn't reliably consume the array
  // form `fontSize: [size, { lineHeight, letterSpacing }]` from Tailwind
  // config, so we author the scale here as arbitrary-value classes.
  const cls = {
    sm: 'text-[20px] leading-[1.25] tracking-[-0.006em]',
    md: 'text-[24px] leading-[1.2] tracking-[-0.01em]',
    lg: 'text-[32px] leading-[1.15] tracking-[-0.014em]',
    xl: 'text-[44px] leading-[1.1] tracking-[-0.018em]',
    '2xl': 'text-[56px] leading-[1.05] tracking-[-0.02em]',
  }[size];
  const family = serif ? 'font-serif font-medium' : 'font-sans font-semibold';
  return (
    <Text
      className={`${family} ${cls} text-ink ${className}`}
      style={{
        // @ts-expect-error web-only style
        fontFeatureSettings: '"ss01" 1, "liga" 1, "dlig" 1',
        fontOpticalSizing: 'auto' as 'auto',
      }}
    >
      {children}
    </Text>
  );
}

/** Heading — kept for backwards compatibility with existing screens.
 *  Maps the old `sm | md | lg | xl | hero` to the new display scale. */
export function Heading({
  children,
  size = 'lg',
  className = '',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
}) {
  const map = { sm: 'sm', md: 'md', lg: 'lg', xl: 'xl', hero: '2xl' } as const;
  return (
    <Display size={map[size]} serif className={className}>
      {children}
    </Display>
  );
}

export function Body({
  children,
  size = 'md',
  muted = false,
  className = '',
  ...rest
}: TextProps & {
  children: ReactNode;
  size?: 'sm' | 'md';
  muted?: boolean;
  className?: string;
}) {
  // 16px body / 14px secondary — meets the mobile-readability principle.
  const cls =
    size === 'sm' ? 'text-[14px] leading-[1.5]' : 'text-[16px] leading-[1.55]';
  const tone = muted ? 'text-muted' : 'text-ink-2';
  return (
    <Text {...rest} className={`font-sans ${cls} ${tone} ${className}`}>
      {children}
    </Text>
  );
}

export function Meta({
  children,
  className = '',
  ...rest
}: TextProps & { children: ReactNode; className?: string }) {
  return (
    <Text
      {...rest}
      className={`font-sans text-[12px] leading-[1.4] tracking-[0.01em] text-muted ${className}`}
    >
      {children}
    </Text>
  );
}

/** Eyebrow — section labels. Sentence-case wins on long labels, but
 *  short uppercase labels remain scannable per the principles. */
export function Eyebrow({
  children,
  className = '',
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <Text
      className={`font-sans text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-muted ${className}`}
      style={color ? { color } : undefined}
    >
      {children}
    </Text>
  );
}

/* ─────────────────────────────── Card ──────────────────────────────── */

export function Card({
  children,
  accent,
  elevated = false,
  className = '',
  ...rest
}: ViewProps & {
  children: ReactNode;
  accent?: string;
  elevated?: boolean;
  className?: string;
}) {
  return (
    <View
      {...rest}
      className={`overflow-hidden rounded-lg border border-rule bg-paper ${
        elevated ? 'shadow-e1' : ''
      } ${className}`}
    >
      {accent && <View style={{ height: 2, backgroundColor: accent }} />}
      {children}
    </View>
  );
}

/* ────────────────────────────── Button ─────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-ink', text: 'text-paper', border: 'border-ink' },
  secondary: { bg: 'bg-paper', text: 'text-ink', border: 'border-rule-2' },
  ghost: { bg: 'bg-transparent', text: 'text-ink', border: 'border-transparent' },
  danger: { bg: 'bg-paper', text: 'text-danger', border: 'border-rule-2' },
};

const SIZE: Record<Size, { h: number; px: string; text: string }> = {
  sm: { h: 36, px: 'px-3.5', text: 'text-body-sm' },
  md: { h: 44, px: 'px-5', text: 'text-body' },
  lg: { h: 52, px: 'px-6', text: 'text-body' },
};

type ButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  block = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const txt = size === 'sm' ? 'text-[14px]' : 'text-[16px]';
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={{ minHeight: s.h, opacity: disabled ? 0.5 : 1 }}
      className={`flex-row items-center justify-center gap-2 rounded-md border ${s.px} ${v.bg} ${v.border} active:opacity-80 ${
        block ? 'self-stretch' : 'self-start'
      } ${className}`}
    >
      {leadingIcon}
      <Text className={`font-sans font-semibold ${txt} ${v.text}`}>{label}</Text>
      {trailingIcon}
    </Pressable>
  );
}

/* ───────────────────────────── IconButton ──────────────────────────── */

export function IconButton({
  icon,
  label,
  className = '',
  ...rest
}: PressableProps & { icon: ReactNode; label: string; className?: string }) {
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ minHeight: 44, minWidth: 44 }}
      className={`items-center justify-center rounded-full active:opacity-70 ${className}`}
    >
      {icon}
    </Pressable>
  );
}

/* ────────────────────────────── Pill / Chip ────────────────────────── */

export function Pill({
  label,
  active = false,
  onPress,
  accent,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  accent?: string;
}) {
  const { colorScheme } = useColorScheme();
  const inkFallback = colorScheme === 'dark' ? '#f4f0e8' : '#14110f';
  const bg = active ? (accent ?? inkFallback) : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      style={[
        { minHeight: 44, justifyContent: 'center' },
        active ? { backgroundColor: bg } : null,
      ]}
      className={`flex-row items-center gap-2 rounded-full border px-4 active:opacity-70 ${
        active ? 'border-transparent' : 'border-rule-2 bg-paper'
      }`}
    >
      {accent && !active && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
      )}
      <Text
        className={`font-sans text-[14px] font-medium ${
          active ? 'text-paper' : 'text-ink'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ──────────────────────────── ProgressDots ─────────────────────────── */

export function ProgressDots({
  total,
  current,
  accent = '#14110f',
}: {
  total: number;
  current: number;
  accent?: string;
}) {
  const { colorScheme } = useColorScheme();
  const restBg = colorScheme === 'dark' ? '#322f28' : '#e2ded5';
  return (
    <View className="flex-row items-center gap-1.5" accessibilityRole="progressbar">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        const bg = active || done ? accent : restBg;
        return (
          <View
            key={i}
            style={{
              width: active ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: bg,
              opacity: done ? 0.4 : 1,
            }}
          />
        );
      })}
    </View>
  );
}

/* ────────────────────────────── AxisBar ────────────────────────────── */

export function AxisBar({
  axis,
  average,
  count,
  max = 5,
  accent = '#9c633b',
}: {
  axis: string;
  average: number;
  count: number;
  max?: number;
  accent?: string;
}) {
  const pct = Math.max(0, Math.min(1, average / max));
  return (
    <View className="py-2">
      <View className="flex-row items-baseline justify-between">
        <Body size="sm">{axis}</Body>
        <Text className="font-sans text-meta tabular-nums text-muted">
          {average.toFixed(1)}/{max} · {count}
        </Text>
      </View>
      <View
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2"
        accessibilityRole={Platform.OS === 'web' ? undefined : 'progressbar'}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}

/* ─────────────────────────── EmptyState ────────────────────────────── */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-8 py-15">
      <Heading size="md" className="text-center">
        {title}
      </Heading>
      {body && (
        <View className="mt-2 max-w-sm">
          <Body className="text-center" muted>
            {body}
          </Body>
        </View>
      )}
      {action && <View className="mt-6">{action}</View>}
    </View>
  );
}

/* ─────────────────────────── Section header ────────────────────────── */

export function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow?: string;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between">
      <View>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && (
          <View className="mt-1">
            <Heading size="md">{title}</Heading>
          </View>
        )}
      </View>
      {trailing}
    </View>
  );
}

/* ───────────────────────────── Divider ─────────────────────────────── */

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-rule ${className}`} />;
}
