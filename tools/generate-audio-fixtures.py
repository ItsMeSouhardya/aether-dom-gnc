"""Original deterministic demo synthesis; no recordings or third-party samples."""
import argparse
import io
import math
from pathlib import Path
import random
import struct
import wave

RATE = 22050
SECONDS = 8
ROOT = Path(__file__).resolve().parents[1] / "assets" / "fixtures"
TAU = math.tau


def render(name: str) -> bytes:
    noise = random.Random(20261112)
    samples = bytearray()
    count = RATE * SECONDS
    for index in range(count):
        time = index / RATE
        # Quiet 10ms edges avoid clicks when the finite demo buffers repeat.
        edge = min(1.0, index / (RATE * .01), (count - 1 - index) / (RATE * .01))
        if name == "ambient":
            swell = .75 + .25 * math.sin(TAU * time / SECONDS)
            value = swell * (.20 * math.sin(TAU * 55 * time)
                             + .10 * math.sin(TAU * 82.5 * time)
                             + .07 * math.sin(TAU * 110 * time))
        elif name == "tension":
            beat = time * 4
            phase = beat % 1
            note = [110, 130.81278265, 146.83238396, 164.81377846][int(beat) % 4]
            pluck = math.sin(math.pi * phase) ** 2
            value = (.16 * math.sin(TAU * 55 * time)
                     + pluck * (.19 * math.sin(TAU * note * phase / 4)
                                + .06 * math.sin(TAU * note * 2 * phase / 4))
                     + .025 * noise.uniform(-1, 1) * math.exp(-phase * 22))
        else:
            flicker = .7 + .3 * math.sin(TAU * 2 * time) ** 2
            value = flicker * (.16 * math.sin(TAU * 110 * time)
                               + .10 * math.sin(TAU * 220 * time)
                               + .035 * math.sin(TAU * 440 * time)
                               + .015 * noise.uniform(-1, 1))
        samples.extend(struct.pack("<h", round(value * edge * 32767)))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(samples)
    return output.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check fixtures without writing")
    args = parser.parse_args()
    for name in ["ambient", "tension", "buzz"]:
        path = ROOT / f"{name}.wav"
        content = render(name)
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                raise SystemExit(f"Fixture differs: {path.name}")
        else:
            path.write_bytes(content)
        print(f"{path.name}: {SECONDS}s mono PCM16 {RATE}Hz, {len(content)} bytes")


if __name__ == "__main__":
    main()
