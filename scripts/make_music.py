#!/usr/bin/env python3
"""Musik latar generatif — beda tiap video, bukan template tiga progresi.

Masalah versi lama: hanya tiga progresi akor (warm/dark/bright), aransemennya
sama, dan `rng` di-seed tetap 7. Hasilnya setiap video terdengar seperti lagu
yang sama dengan tempo berbeda — terbukti: spectrogram enam video produksi
punya kurva energi nyaris identik.

Sekarang: agent memberi `--brief` (deskripsi gaya dari topik), dan skrip:
  1. menurunkan parameter musik dari kata-kata brief (skala, progresi, warna
     timbre, kerapatan arp, jenis bass, tekstur, tempo);
  2. memilih benih dari brief itu sendiri, jadi brief berbeda = benih berbeda;
  3. menyusun progresi dari gerak fungsional (i–VI–III–VII dan kerabatnya),
     bukan dari tiga daftar tetap.

Yang tetap deterministik: brief sama + durasi sama = audio sama. Ulang render
tidak menggeser musik, jadi audio tidak pernah melompat dari video yang sudah
disinkronkan.

Agent tetap bebas: mau musik benar-benar lain, tulis brief yang benar-benar
lain, atau pakai `--seed` untuk memaksa korteks baru dari brief yang sama.
Kalau butuh lagu jadi (bukan sintesis), sediakan `audio/music.wav` sendiri —
skill memakai berkas user lebih dulu.

Contoh:
  python3 make_music.py --duration 48 --out audio/music.wav \
      --brief "pasar subuh, hangat, akustik, tenang, sedikit melankolis"
  python3 make_music.py --duration 48 --out audio/music.wav \
      --brief "grup chat kacau, tegang, ritmis, urban, digital" --tempo 104
"""

import argparse
import hashlib
import wave

import numpy as np

SR = 48000

# ── tangga nada: (nama, offset semiton dari root) ──────────────────────────
SCALES = {
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "major": [0, 2, 4, 5, 7, 9, 11],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "phrygian": [0, 1, 3, 5, 7, 8, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
}

# ── gerak akor fungsional: derajat (0-based) + kualitas ────────────────────
# Tiap kandidat 4 akor; variasinya datang dari derajat, bukan dari daftar tetap.
PROGRESSIONS = {
    "minor": [
        [(0, "m"), (5, "M"), (2, "M"), (6, "M")],   # i - VI - III - VII
        [(0, "m"), (3, "M"), (5, "M"), (4, "m")],   # i - iv - VI - v
        [(0, "m"), (6, "M"), (5, "M"), (6, "M")],   # i - VII - VI - VII
        [(0, "m"), (4, "m"), (5, "M"), (2, "M")],   # i - v - VI - III
        [(0, "m"), (3, "M"), (0, "m"), (5, "M")],   # i - iv - i - VI
    ],
    "major": [
        [(0, "M"), (4, "M"), (5, "m"), (3, "M")],   # I - V - vi - IV
        [(0, "M"), (5, "m"), (3, "M"), (4, "M")],   # I - vi - IV - V
        [(0, "M"), (3, "M"), (0, "M"), (4, "M")],   # I - IV - I - V
        [(0, "M"), (1, "m"), (5, "m"), (3, "M")],   # I - ii - vi - IV
    ],
}

CHORD_Q = {
    "M": [0, 4, 7, 11],
    "m": [0, 3, 7, 10],
    "7": [0, 4, 7, 10],
    "sus": [0, 5, 7, 12],
}


def tensi(kata):
    """Kata -> parameter musik.

    Memakai SKOR, bukan override berurutan: versi pertama memakai `if` berantai
    sehingga "pasar subuh, hangat, akustik, tenang" dan "air sumur, organik,
    alam, tanah, tenang" berakhir dengan parameter identik — aturan terakhir
    menang dan brief kehilangan maknanya. Di sini setiap kata menyumbang suara
    ke tiap pilihan, lalu yang skornya tertinggi dipakai.
    """
    k = kata.lower()
    from collections import Counter

    skala = Counter()
    timbre = Counter()
    bass = Counter()
    arp = []
    tekstur = []
    tempo = []

    def naik(counter, nama, bobot=1):
        counter[nama] += bobot

    # ── suasana -> skala, timbre, kerapatan ──
    if any(w in k for w in ("hangat", "warm", "akrab", "rumah", "keluarga")):
        naik(skala, "major", 2); naik(timbre, "kayu", 2); arp.append(0.45)
    if any(w in k for w in ("sedih", "melankolis", "pilu", "sunyi", "sepi", "renung")):
        naik(skala, "minor", 2); naik(timbre, "kapur", 2); arp.append(0.3)
        tekstur.append(0.55)
    if any(w in k for w in ("tegang", "kacau", "cemas", "panik", "bahaya")):
        naik(skala, "phrygian", 3); naik(timbre, "logam", 3); arp.append(0.85)
        tekstur.append(0.12)
    if any(w in k for w in ("ceria", "ringan", "riang", "gembira", "segar")):
        naik(skala, "lydian", 3); naik(timbre, "kaca", 2); arp.append(0.7)
    if any(w in k for w in ("tenang", "santai", "lembut", "kalem", "damai", "pelan")):
        naik(skala, "dorian", 2); naik(timbre, "kayu", 1); arp.append(0.25)
        tekstur.append(0.4); tempo.append(72.0)
    if any(w in k for w in ("urban", "digital", "teknologi", "modern", "chip")):
        naik(timbre, "logam", 2); naik(bass, "oktaf", 2); arp.append(0.8)
    if any(w in k for w in ("akustik", "organik", "alam", "tanah", "pasar", "kayu")):
        naik(timbre, "kayu", 2); naik(bass, "root", 2); arp.append(0.35)
    if any(w in k for w in ("megah", "luas", "besar", "epik", "sejarah")):
        tekstur.append(0.7); tempo.append(72.0)
    if any(w in k for w in ("cepat", "ritmis", "sibuk", "ramai", "buru")):
        tempo.append(104.0); arp.append(0.85)
    if any(w in k for w in ("lambat", "panjang")):
        tempo.append(66.0)
    if any(w in k for w in ("malam", "gelap", "gulita")):
        naik(skala, "phrygian", 1); tekstur.append(0.5)

    # ── nilai akhir: skor tertinggi, jatuh ke default yang netral ──
    dasar = {"skala": "minor", "timbre": "kapur", "bass": "root"}
    p = {
        "skala": (skala.most_common(1)[0][0] if skala else dasar["skala"]),
        "timbre": (timbre.most_common(1)[0][0] if timbre else dasar["timbre"]),
        "bass": (bass.most_common(1)[0][0] if bass else dasar["bass"]),
        "arp": (sum(arp) / len(arp)) if arp else 0.5,
        "tekstur": (sum(tekstur) / len(tekstur)) if tekstur else 0.3,
        "ketukan": (sum(tempo) / len(tempo)) if tempo else 84.0,
        "root": 45,
        "gerak": 2,
    }
    p["kualitas"] = "M" if p["skala"] in ("major", "lydian", "mixolydian") else "m"
    if any(w in k for w in ("renung", "melayang", "mimpi")):
        p["kualitas"] = "sus"
    return p


def benih_teks(brief):
    return int(hashlib.sha256(brief.strip().lower().encode()).hexdigest()[:8], 16)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_arr(n):
    return np.arange(n) / SR


def env(n, attack, release=0.0, sustain=0.0):
    e = np.ones(n)
    a = min(max(1, int(attack * SR)), n)
    e[:a] = np.linspace(0, 1, a)
    if release > 0:
        r = min(n, int(release * SR))
        e[n - r:] *= np.linspace(1, sustain, r)
    return e


# ── suara: tiap timbre punya harmonik & serangan berbeda ───────────────────
TIMBRE = {
    "kapur":  dict(harm=[1.0, 0.18, 0.05], atk=0.9, rel=1.4, pl_att=7.0),
    "kayu":   dict(harm=[1.0, 0.32, 0.10, 0.04], atk=0.45, rel=0.9, pl_att=5.0),
    "kaca":   dict(harm=[1.0, 0.05, 0.22, 0.02, 0.12], atk=0.7, rel=1.8, pl_att=9.0),
    "logam":  dict(harm=[1.0, 0.45, 0.30, 0.18, 0.10], atk=0.12, rel=0.6, pl_att=11.0),
}


def pad(freq, n, rng, timbre="kapur"):
    t = t_arr(n)
    h = TIMBRE[timbre]
    ph = rng.uniform(0, 2 * np.pi, 2)
    v = np.zeros((n, 2))
    for i, cents in enumerate((-3.5, 3.5)):
        det = freq * 2 ** (cents / 1200)
        s = np.zeros(n)
        for j, amp in enumerate(h["harm"], start=1):
            s += amp * np.sin(2 * np.pi * det * j * t + ph[i] * j)
        v[:, i] = s
    return v * env(n, attack=h["atk"], release=h["rel"])[:, None]


def pluck(freq, n, timbre="kapur"):
    t = t_arr(n)
    h = TIMBRE[timbre]
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return s * np.exp(-t * h["pl_att"]) * env(n, attack=0.004)


def bass(freq, n, timbre="kapur"):
    t = t_arr(n)
    return (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)) * env(
        n, attack=0.02, release=0.25
    )


def tekstur(n, rng, jumlah=0.3):
    """Gesekan/nafas rendah — satu-pole lowpass, bukan hiss."""
    noise = rng.normal(0, 1, n)
    out = np.empty(n)
    acc = 0.0
    a = 0.03 + 0.10 * (1 - jumlah)
    for i, s in enumerate(noise):
        acc += a * (s - acc)
        out[i] = acc
    return out * env(n, attack=0.35, release=1.6) * (0.3 + 0.7 * jumlah)


def build(duration, brief, tempo=None, seed=None):
    p = tensi(brief)
    rng = np.random.default_rng(benih_teks(brief) if seed is None else seed)

    tempo = float(tempo) if tempo else p["ketukan"]
    total = int(round(duration * SR))
    mix = np.zeros((total, 2))

    tangga = SCALES[p["skala"]]
    prog = PROGRESSIONS["major" if p["skala"] in
                        ("major", "lydian", "mixolydian") else "minor"]
    chord_plan = prog[rng.integers(0, len(prog))]
    # root ikut skala + brief; geser sesekali supaya kunci tidak selalu A
    root = p["root"] + int(rng.integers(-3, 4))

    beat = 60.0 / tempo
    bar = 4 * beat
    chord_len = p["gerak"] * bar

    def derajat(deg, oktaf=0):
        """Nada ke-deg dalam tangga, dengan oktaf."""
        d = deg % len(tangga)
        return root + tangga[d] + 12 * oktaf

    t0, i = 0.0, 0
    while t0 < duration:
        deg, kual = chord_plan[i % len(chord_plan)]
        base = derajat(deg)
        tones = [base + o for o in CHORD_Q.get(kual, CHORD_Q["m"])]
        seg = min(chord_len, duration - t0)
        n = int(seg * SR)
        start = int(t0 * SR)

        if n > 0:
            chord = np.zeros((n, 2))
            for k, note in enumerate(tones):
                chord += pad(hz(note + 12), n, rng, p["timbre"]) * (
                    0.16 if k == 0 else 0.11)
            chord += pad(hz(base), n, rng, p["timbre"]).sum(axis=1)[:, None] * 0.03
            mix[start:start + n] += chord

            if n > SR // 2 and p["tekstur"] > 0.05:
                sw = tekstur(int(min(0.9, seg / 3) * SR), rng, p["tekstur"])
                mix[start:start + len(sw)] += sw[:, None] * 0.10 * p["tekstur"]

            # ── bass ──
            b = 0.0
            while b < seg - 0.15:
                bn = int(min(beat * 1.8, seg - b) * SR)
                if bn > 0:
                    s = start + int(b * SR)
                    if p["bass"] == "oktaf":
                        note = base - 12 if int(b / (2 * beat)) % 2 == 0 else base
                    elif p["bass"] == "walk":
                        note = base - 12 + [0, 2, 5, 7][int(b / (2 * beat)) % 4]
                    else:
                        note = base - 12
                    mix[s:s + bn] += bass(hz(note), bn, p["timbre"])[:, None] * 0.30
                b += 2 * beat

            # ── arp: kerapatan dari brief ──
            if p["arp"] > 0.05:
                langkah = beat if p["arp"] < 0.4 else beat / 2
                e, k = 0.0, 0
                while e < seg - 0.05:
                    note = tones[k % len(tones)] + 24
                    pn = int(min(langkah * 0.9, seg - e) * SR)
                    if pn > 0:
                        s = start + int(e * SR)
                        sig = pluck(hz(note), pn, p["timbre"]) * 0.11 * p["arp"]
                        pan = 0.35 if k % 2 == 0 else 0.65
                        mix[s:s + pn, 0] += sig * (1 - pan) * 2 * 0.5 + sig * 0.5
                        mix[s:s + pn, 1] += sig * pan * 2 * 0.5 + sig * 0.5
                    e += langkah
                    k += 1

        t0 += seg
        i += 1

    # ── fades ──
    fin = int(1.2 * SR)
    mix[:fin] *= np.linspace(0, 1, fin)[:, None]
    fout = int(min(3.0, duration * 0.25) * SR)
    mix[-fout:] *= np.linspace(1, 0.02, fout)[:, None]

    peak = np.abs(mix).max()
    if peak > 0:
        mix = mix / peak * 0.5012
    return (np.clip(mix, -1, 1) * 32767).astype(np.int16), p, tempo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--brief", required=True,
                    help="deskripsi gaya musik dari topik video, bahasa bebas")
    ap.add_argument("--tempo", type=float, default=None,
                    help="paksa BPM; kalau kosong diturunkan dari --brief")
    ap.add_argument("--seed", type=int, default=None,
                    help="paksa benih lain untuk brief yang sama")
    a = ap.parse_args()

    data, p, tempo = build(a.duration, a.brief, a.tempo, a.seed)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"wrote {a.out}: {a.duration:.1f}s, {tempo:.0f} bpm, "
          f"skala {p['skala']}, timbre {p['timbre']}, bass {p['bass']}, "
          f"arp {p['arp']:.2f}, 48 kHz stereo")
    print(f"brief: {a.brief}")


if __name__ == "__main__":
    main()