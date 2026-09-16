import { cssInterop } from 'nativewind';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';

/**
 * Moti's components aren't NativeWind-aware host components out of the box —
 * without this, `className` is silently forwarded as an unused prop and
 * every Moti* element falls back to RN's default column layout with no
 * spacing/color/radius applied. Register once, import this file's side
 * effects before anything renders.
 */
cssInterop(MotiView, { className: 'style' });
cssInterop(MotiPressable, { className: 'style' });
