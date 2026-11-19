#!/usr/bin/env python3
"""Self-made background music bed: chord progression, not one held pad.

Layers (all synthesised, deterministic):
  pad    - sustained chord triad, two detuned voices per note for width
  bass   - chord root, octave 2, on beats 1 and 3
  arp    - plucked chord tones, eighth notes, alternating pan
  air    - soft noise swell at every chord change (a breath, not a drum kit)

A one-chord pad is what made every film sound the same: no harmonic motion, no
bass, nothing to tell two videos apart. This gives the bed a progression and a
pulse without pretending to be a composition. Tell the user it is synthesised.

Usage:
  python3 make_music.py --duration 52 --out assets/music.wav
  python3 make_music.py --duration 52 --out assets/music.wav --tempo 92 --mood bright

Writes 48 kHz stereo 16-bit WAV, peak -6 dBFS, fade in 1.2 s, and a fade that
lands on a floor (~-50 dB) rather than absolute zero (GUIDE §8).
"""

import argparse
import wave

import numpy as np

SR = 48000

# root_midi + chord tones as semitone offsets from the root
PROGRESSIONS = {
    # Am - F - C - G : warm, editorial, works under speech
    "warm": [
        (57, [0, 3, 7, 10]),
        (53, [0, 4, 7, 11]),
        (48, [0, 4, 7, 11]),
        (55, [0, 4, 7, 10]),
    ],
    # Dm - Bb - F - C : slightly darker, history / analysis
    "dark": [
        (50, [0, 3, 7, 10]),
        (46, [0, 4, 7, 10]),
        (41, [0, 4, 7, 11]),
        (48, [0, 4, 7, 11]),
    ],
    # C - Em - Am - F : brighter, light explainers
    "bright": [
        (48, [0, 4, 7, 11]),
        (52, [0, 3, 7, 10]),
        (57, [0, 3, 7, 10]),
        (53, [0, 4, 7, 11]),
    ],
}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pair(n):
    return np.arange(n) / SR


def env(n, attack, decay, sustain=0.0, release=None):
    """attack -> decay into sustain -> optional release; linear, sample-accurate."""
    e = np.ones(n)
    a = min(max(1, int(attack * SR)), n)
    e[:a] = np.linspace(0, 1, a)
    if decay > 0:
        d = max(1, int(decay * SR))
        stop = min(n, a + d)
        if stop > a:
            e[a:stop] *= np.linspace(1, sustain, stop - a)
        e[stop:] *= sustain
    if release:
        r = min(n, int(release * SR))
        e[n - r :] *= np.linspace(1, 0, r)
    return e


def pad_voice(freq, n, rng):
    t = pair(n)
    ph = rng.uniform(0, 2 * np.pi, 2)
    v = np.zeros((n, 2))
    for i, cents in enumerate((-3.0, 3.0)):
        det = freq * 2 ** (cents / 1200)
        v[:, i] = (
            np.sin(2 * np.pi * det * t + ph[i])
            + 0.18 * np.sin(4 * np.pi * det * t + ph[i])
            + 0.05 * np.sin(6 * np.pi * det * t)
        )
    return v * env(n, attack=0.9, decay=0.0, release=1.4)[:, None]


def pluck(freq, n, rng):
    t = pair(n)
    return (
        (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t))
        * np.exp(-t * 7.0)
        * env(n, attack=0.004, decay=0.0)
    )


def bass(freq, n):
    t = pair(n)
    return (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)) * env(
        n, attack=0.02, decay=0.0, release=0.25
    )


def air(n, rng):
    noise = rng.normal(0, 1, n)
    # cheap one-pole lowpass so it reads as a breath, not hiss
    out = np.empty(n)
    acc = 0.0
    for i, s in enumerate(noise):  # n is short (~0.6 s) — fine at this size
        acc += 0.06 * (s - acc)
        out[i] = acc
    return out * env(n, attack=0.35, decay=1.6) * 0.5


def build(duration, tempo, mood):
    rng = np.random.default_rng(7)
    total = int(round(duration * SR))
    mix = np.zeros((total, 2))
    prog = PROGRESSIONS[mood]

    beat = 60.0 / tempo
    bar = 4 * beat
    chord_len = 2 * bar  # two bars per chord, so the harmony moves four times a cycle

    # ---- pad + bass + air per chord ----
    t0 = 0.0
    i = 0
    while t0 < duration:
        root, tones = prog[i % len(prog)]
        seg = min(chord_len, duration - t0)
        n = int(seg * SR)
        start = int(t0 * SR)
        if n > 0:
            chord = np.zeros((n, 2))
            for k, off in enumerate(tones):
                chord += pad_voice(hz(root + 12 + off), n, rng) * (
                    0.16 if k == 0 else 0.11
                )
            # same harmony an octave down, quieter, for body
            chord += pad_voice(hz(root + off), n, rng).sum(axis=1)[:, None] * 0.03
            mix[start : start + n] += chord

            if n > SR // 2:
                sw = air(int(min(0.9, seg / 3) * SR), rng)
                mix[start : start + len(sw)] += sw[:, None] * 0.10

            # bass: beats 1 and 3 of each bar in this chord
            b = 0.0
            while b < seg - 0.15:
                bn = int(min(beat * 1.8, seg - b) * SR)
                if bn > 0:
                    s = start + int(b * SR)
                    mix[s : s + bn] += bass(hz(root - 12), bn)[:, None] * 0.30
                b += 2 * beat

            # arp: eighth notes across the chord tones, one octave up
            e = 0.0
            k = 0
            while e < seg - 0.05:
                note = root + 24 + tones[k % len(tones)]
                pn = int(min(beat * 0.9, seg - e) * SR)
                if pn > 0:
                    s = start + int(e * SR)
                    sig = pluck(hz(note), pn, rng) * 0.11
                    pan = 0.35 if k % 2 == 0 else 0.65
                    mix[s : s + pn, 0] += sig * (1 - pan) * 2 * 0.5 + sig * 0.5
                    mix[s : s + pn, 1] += sig * pan * 2 * 0.5 + sig * 0.5
                e += beat / 2
                k += 1

        t0 += seg
        i += 1

    # ---- gentle high shelf via pre-emphasis (one-pole), keeps it from sounding dull ----
    alpha = 0.86
    for ch in range(2):
        y = np.empty(total)
        acc = 0.0
        for idx in range(total):
            acc = alpha * acc + (1 - alpha) * mix[idx, ch]
            y[idx] = acc
        mix[:, ch] = mix[:, ch] + 0.35 * (mix[:, ch] - y)

    # ---- fades: 1.2 s in; out lands on a floor, never absolute zero ----
    fin = int(1.2 * SR)
    mix[:fin] *= np.linspace(0, 1, fin)[:, None]
    fout = int(min(3.0, duration * 0.25) * SR)
    floor = 0.02
    mix[-fout:] *= np.linspace(1, floor, fout)[:, None]

    # ---- peak-normalise to -6 dBFS, write 16-bit stereo ----
    peak = np.abs(mix).max()
    if peak > 0:
        mix = mix / peak * 0.5012  # -6 dBFS
    return (np.clip(mix, -1, 1) * 32767).astype(np.int16)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--tempo", type=float, default=84.0)
    ap.add_argument("--mood", choices=sorted(PROGRESSIONS), default="warm")
    a = ap.parse_args()

    data = build(a.duration, a.tempo, a.mood)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(
        f"wrote {a.out}: {a.duration:.1f}s, {a.tempo:.0f} bpm, {a.mood}, 48 kHz stereo"
    )


if __name__ == "__main__":
    main()
