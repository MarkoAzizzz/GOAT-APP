import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { fonts } from '../../theme/fonts';
import { SessionPackage } from './packagesService';

const RED = '#E11919';
const GAIN = '#34d399';
const WARN = '#fbbf24';
const MUTED = '#9BA3A7';

const SIZE = 46;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Same urgency colours as the admin check-in roster. */
function ringColor(remaining: number): string {
  if (remaining === 0) return RED;
  if (remaining <= 1) return WARN;
  return GAIN;
}

/**
 * Remaining sessions as a ring that empties with each check-in.
 *
 * Hidden entirely when the student has never been given a package: an empty
 * ring would read as "all used up", which is a different situation from
 * "none assigned yet".
 */
export function SessionsRing({ sessionPackage }: { sessionPackage: SessionPackage | null }) {
  const { width: windowWidth } = useWindowDimensions();
  if (!sessionPackage) return null;

  const { remaining_sessions: remaining, total_sessions: total } = sessionPackage;
  const color = ringColor(remaining);
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  // Explicit width, not flex: flex sizing collapses row children to zero
  // width on some Android builds. 48 page padding, 22 card padding,
  // 46 ring, 11 gap.
  const textWidth = windowWidth - 48 - 22 - SIZE - 11;

  return (
    <View style={styles.card}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={STROKE}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          // Dash offset grows as sessions are used, so the arc shrinks.
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <SvgText
          x={SIZE / 2}
          y={SIZE / 2 + 5}
          fill="#F5F5F5"
          fontSize={15}
          fontFamily={fonts.monoMedium}
          textAnchor="middle"
        >
          {String(remaining)}
        </SvgText>
      </Svg>

      <View style={{ width: textWidth, marginLeft: 11 }}>
        <Text style={styles.title} numberOfLines={1}>
          {remaining === 0
            ? 'No sessions left'
            : `${remaining} session${remaining === 1 ? '' : 's'} left`}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {remaining === 0
            ? 'Renew with your coach to keep training'
            : `of your ${total}-session package`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(225,25,25,0.3)',
    borderRadius: 12,
    padding: 11,
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: '#F5F5F5' },
  sub: { fontFamily: fonts.body, fontSize: 11.5, color: MUTED, marginTop: 2 },
});
