/**
 * Tests unitaires pour motionPresets (ST-18.6).
 *
 * Verifie que les valeurs des presets respectent les contraintes
 * definies dans la spec :
 *  - bounce < 300ms avec keyframes scale
 *  - stagger plafonne a 200ms (max 10 items)
 *  - fadeIn : initial.opacity === 0, enter.opacity === 1
 */
import { describe, expect, it } from 'vitest';
import { motionPresets } from '~/utils/motionPresets';

describe('motionPresets.fadeIn', () => {
  it('has initial opacity 0', () => {
    expect(motionPresets.fadeIn.initial.opacity).toBe(0);
  });

  it('has enter opacity 1', () => {
    expect(motionPresets.fadeIn.enter.opacity).toBe(1);
  });

  it('has transition duration 200ms (--duration-fast)', () => {
    expect(motionPresets.fadeIn.enter.transition?.duration).toBe(200);
  });
});

describe('motionPresets.bounce', () => {
  it('has scale keyframes array in enter state', () => {
    const scale = motionPresets.bounce.enter.scale;
    expect(Array.isArray(scale)).toBe(true);
  });

  it('has transition duration <= 300ms', () => {
    expect(motionPresets.bounce.enter.transition?.duration).toBeLessThanOrEqual(300);
  });

  it('starts and ends at scale 1 (no visual pop)', () => {
    const scale = motionPresets.bounce.enter.scale as readonly number[];
    expect(scale[0]).toBe(1);
    expect(scale[scale.length - 1]).toBe(1);
  });

  it('reaches a peak scale > 1 (visible bounce)', () => {
    const scale = motionPresets.bounce.enter.scale as readonly number[];
    expect(Math.max(...scale)).toBeGreaterThan(1);
  });
});

describe('motionPresets.staggerItem', () => {
  it('staggerItem(0) has delay 0ms', () => {
    const preset = motionPresets.staggerItem(0);
    expect(preset.enter.transition?.delay).toBe(0);
  });

  it('staggerItem(1) has delay 20ms', () => {
    const preset = motionPresets.staggerItem(1);
    expect(preset.enter.transition?.delay).toBe(20);
  });

  it('staggerItem(5) has delay 100ms', () => {
    const preset = motionPresets.staggerItem(5);
    expect(preset.enter.transition?.delay).toBe(100);
  });

  it('staggerItem(10) has delay 200ms (at cap)', () => {
    const preset = motionPresets.staggerItem(10);
    expect(preset.enter.transition?.delay).toBe(200);
  });

  it('staggerItem(11) caps delay at 200ms (limit stagger a 10 visibles)', () => {
    const preset = motionPresets.staggerItem(11);
    expect(preset.enter.transition?.delay).toBe(200);
  });

  it('staggerItem(50) caps delay at 200ms', () => {
    const preset = motionPresets.staggerItem(50);
    expect(preset.enter.transition?.delay).toBe(200);
  });

  it('initial state is opacity 0 and y 8', () => {
    const preset = motionPresets.staggerItem(0);
    expect(preset.initial.opacity).toBe(0);
    expect(preset.initial.y).toBe(8);
  });

  it('enter state is opacity 1 and y 0', () => {
    const preset = motionPresets.staggerItem(0);
    expect(preset.enter.opacity).toBe(1);
    expect(preset.enter.y).toBe(0);
  });

  it('has duration 200ms (--duration-fast)', () => {
    const preset = motionPresets.staggerItem(3);
    expect(preset.enter.transition?.duration).toBe(200);
  });
});

describe('motionPresets.modalMobile', () => {
  it('starts with y 100% (off-screen bottom)', () => {
    expect(motionPresets.modalMobile.initial.y).toBe('100%');
  });

  it('has transition duration 300ms', () => {
    expect(motionPresets.modalMobile.enter.transition?.duration).toBe(300);
  });
});

describe('motionPresets.popover', () => {
  it('has transition duration 150ms (under reduced-motion threshold)', () => {
    expect(motionPresets.popover.enter.transition?.duration).toBe(150);
  });

  it('starts at scale 0.95', () => {
    expect(motionPresets.popover.initial.scale).toBe(0.95);
  });
});

describe('motionPresets.slideDown', () => {
  it('starts at y -8 (above target)', () => {
    expect(motionPresets.slideDown.initial.y).toBe(-8);
  });

  it('enters at y 0', () => {
    expect(motionPresets.slideDown.enter.y).toBe(0);
  });

  it('has duration 200ms', () => {
    expect(motionPresets.slideDown.enter.transition?.duration).toBe(200);
  });
});
