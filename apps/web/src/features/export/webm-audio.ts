import { decodeManifestAudio, type PlayerManifest } from '@aether-dom/schema';
import { evaluateAudio } from '../audio/model';
import type { WebMPlan } from './webm-plan';
import { abortable } from './abortable';

/** Embedded PCM only; this graph has no connection to context.destination. */
export async function prepareWebMAudio(manifest: PlayerManifest, plan: WebMPlan, context: AudioContext, signal: AbortSignal, resumed: Promise<void>) {
  const sources: AudioBufferSourceNode[] = [], nodes: AudioNode[] = [];
  let destination: MediaStreamAudioDestinationNode | undefined;
  const dispose = () => {
    sources.forEach(source => { try { source.stop(); } catch { /* Already stopped. */ } source.disconnect(); }); sources.length = 0;
    nodes.forEach(node => node.disconnect()); nodes.length = 0;
    destination?.stream.getTracks().forEach(track => track.stop()); destination?.disconnect(); destination = undefined;
  };
  try {
    const initial = evaluateAudio(plan.document, plan.shot.id, 0, null, true);
    const decode = Promise.all(initial.tracks.map(async track => {
      const asset = manifest.assets.find(asset => asset.assetId === track.assetId && asset.kind === 'audio');
      if (!asset || asset.kind !== 'audio') throw new Error('The recorded mix needs every embedded PCM audio source. Export the saved JSON again.');
      const buffer = await context.decodeAudioData(decodeManifestAudio(asset.dataBase64));
      signal.throwIfAborted();
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 30 || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) throw new Error('The decoded recording audio is outside the supported PCM limits.');
      return { track, buffer };
    }));
    const [, decoded] = await abortable(Promise.all([resumed, decode]), signal);
    signal.throwIfAborted();
    destination = context.createMediaStreamDestination();
    const output = destination;
    const voices = decoded.map(({ track, buffer }) => {
      const gain = context.createGain(); nodes.push(gain);
      const pan = context.createStereoPanner(); nodes.push(pan);
      gain.connect(pan); pan.connect(output);
      gain.gain.setValueAtTime(.6 * 10 ** (track.gainDb / 20), context.currentTime); pan.pan.setValueAtTime(track.pan, context.currentTime);
      return { id: track.id, buffer, gain, pan };
    });
    return { stream: output.stream, now: () => context.currentTime * 1000,
      start() {
        const start = context.currentTime;
        for (const voice of voices) {
          const source = context.createBufferSource(); sources.push(source);
          source.buffer = voice.buffer; source.loop = true; source.connect(voice.gain);
          source.start(start, 0); source.stop(start + plan.durationMs / 1000);
        }
        return start * 1000;
      },
      update(timeMs: number) {
        const mix = evaluateAudio(plan.document, plan.shot.id, timeMs, null, true);
        for (const voice of voices) {
          const track = mix.tracks.find(track => track.id === voice.id);
          if (track) { voice.gain.gain.setValueAtTime(.6 * 10 ** (track.gainDb / 20), context.currentTime); voice.pan.pan.setValueAtTime(track.pan, context.currentTime); }
        }
      }, dispose,
    };
  } catch (error) { dispose(); throw error; }
}
