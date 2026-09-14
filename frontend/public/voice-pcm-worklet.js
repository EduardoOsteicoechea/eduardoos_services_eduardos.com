// AudioWorklet processor for the agent dock's voice input.
//
// The AudioContext is created at 16 kHz, so the browser resamples the mic
// stream for us. This processor only converts Float32 samples to little-endian
// Int16 PCM and posts ~256 ms batches to the main thread, which streams them to
// the Go speech-to-text endpoint.
class VoicePcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(4096);
    this._length = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (!channel) {
      return true;
    }
    for (let i = 0; i < channel.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      this._buffer[this._length++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this._length === this._buffer.length) {
        const out = this._buffer.slice(0);
        this.port.postMessage(out.buffer, [out.buffer]);
        this._length = 0;
      }
    }
    return true;
  }
}

registerProcessor("voice-pcm", VoicePcmProcessor);
