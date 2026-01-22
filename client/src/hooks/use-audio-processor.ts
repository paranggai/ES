import { useRef, useState, useEffect, useCallback } from "react";

interface AudioProcessorState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
}

interface AudioProcessorControls {
  pitch: number; // 0-100
  booster: boolean;
  roomSize: number; // 0-100
  fullRoom: boolean;
  bass: number; // 0-100
  treble: number; // 0-100
  beautify: boolean;
  mastered: boolean;
  eqBands: number[];
  cutStart: number; // 0-100 %
  cutEnd: number; // 0-100 %
}

export function useAudioProcessor() {
  const [state, setState] = useState<AudioProcessorState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    analyser: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassNodeRef = useRef<BiquadFilterNode | null>(null);
  const trebleNodeRef = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to create reverb buffer
  const createReverbBuffer = (ctx: BaseAudioContext, duration: number) => {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
           const decay = Math.pow(1 - i / length, 4);
           channelData[i] = (Math.random() * 2 - 1) * decay;
        }
      }
      return impulse;
  };

  // Initialize Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      // Create Nodes
      gainNodeRef.current = ctx.createGain();
      bassNodeRef.current = ctx.createBiquadFilter();
      trebleNodeRef.current = ctx.createBiquadFilter();
      reverbNodeRef.current = ctx.createConvolver();
      compressorNodeRef.current = ctx.createDynamicsCompressor();
      analyserNodeRef.current = ctx.createAnalyser();

      // Create EQ Bands (23 bands)
      const freqs = [
        20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 
        315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150
      ];
      eqNodesRef.current = freqs.map(freq => {
        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1.5;
        filter.gain.value = 0;
        return filter;
      });

      // Configure Nodes
      bassNodeRef.current.type = "lowshelf";
      bassNodeRef.current.frequency.value = 200; // Bass frequency
      
      trebleNodeRef.current.type = "highshelf";
      trebleNodeRef.current.frequency.value = 3000; // Treble frequency

      analyserNodeRef.current.fftSize = 2048;
      
      // Initial Reverb
      reverbNodeRef.current.buffer = createReverbBuffer(ctx, 2.0);

      setState(prev => ({ ...prev, analyser: analyserNodeRef.current }));
    }

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const loadFile = async (file: File) => {
    if (!audioContextRef.current) return;
    stop();
    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = decodedBuffer;
    setState(prev => ({ 
      ...prev, 
      duration: decodedBuffer.duration,
      currentTime: 0 
    }));
    pauseTimeRef.current = 0;
  };

  const updateParams = useCallback((controls: AudioProcessorControls) => {
     if (!audioContextRef.current) return;
     const ctx = audioContextRef.current;
     const now = ctx.currentTime;

     // 1. Pitch
     if (sourceNodeRef.current) {
        const detuneValue = (controls.pitch - 50) * 24; 
        sourceNodeRef.current.detune.linearRampToValueAtTime(detuneValue, now + 0.1);
     }

     // 2. Booster
     if (gainNodeRef.current) {
        const baseGain = 1.0;
        const boost = controls.booster ? 1.5 : 0; 
        gainNodeRef.current.gain.linearRampToValueAtTime(baseGain + boost, now + 0.1);
     }

     // 3. EQ
     if (bassNodeRef.current) {
        const gain = (controls.bass - 50) / 2; 
        bassNodeRef.current.gain.linearRampToValueAtTime(gain, now + 0.1);
     }
     if (trebleNodeRef.current) {
        const gain = (controls.treble - 50) / 2;
        trebleNodeRef.current.gain.linearRampToValueAtTime(gain, now + 0.1);
     }

     // EQ Bands
     eqNodesRef.current.forEach((node, i) => {
        if (controls.eqBands && controls.eqBands[i] !== undefined) {
            const gain = (controls.eqBands[i] - 50) / 2; // -25dB to +25dB
            node.gain.linearRampToValueAtTime(gain, now + 0.1);
        }
     });

     // 4. Beautify & Mastered
     if (compressorNodeRef.current) {
        if (controls.beautify || controls.mastered) {
            // Mastered uses stronger compression
            const ratio = controls.mastered ? 20 : 12;
            const threshold = controls.mastered ? -20 : -24;
            compressorNodeRef.current.threshold.value = threshold;
            compressorNodeRef.current.knee.value = 30;
            compressorNodeRef.current.ratio.value = ratio;
        } else {
             compressorNodeRef.current.threshold.value = 0;
             compressorNodeRef.current.ratio.value = 1;
        }
     }
  }, []);

  const play = (controls: AudioProcessorControls) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') ctx.resume();

    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current.disconnect();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    sourceNodeRef.current = source;

    const detuneValue = (controls.pitch - 50) * 24;
    source.detune.value = detuneValue;

    const totalDuration = audioBufferRef.current.duration;
    const cutStartTime = (controls.cutStart / 100) * totalDuration;
    const cutEndTime = (controls.cutEnd / 100) * totalDuration;
    
    let startOffset = pauseTimeRef.current;
    if (startOffset < cutStartTime) startOffset = cutStartTime;
    if (startOffset >= cutEndTime) startOffset = cutStartTime; 

    // Re-connect Graph
    eqNodesRef.current.forEach(node => node.disconnect());
    bassNodeRef.current?.disconnect();
    trebleNodeRef.current?.disconnect();
    compressorNodeRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    reverbNodeRef.current?.disconnect();

    let lastNode: AudioNode = source;
    eqNodesRef.current.forEach(node => {
        lastNode.connect(node);
        lastNode = node;
    });

    lastNode.connect(bassNodeRef.current!);
    bassNodeRef.current!.connect(trebleNodeRef.current!);
    trebleNodeRef.current!.connect(compressorNodeRef.current!);
    
    const roomGain = ctx.createGain();
    const wetLevel = (controls.roomSize / 100) * (controls.fullRoom ? 1.0 : 0.5);
    roomGain.gain.value = wetLevel;
    
    compressorNodeRef.current!.connect(roomGain);
    roomGain.connect(reverbNodeRef.current!);
    reverbNodeRef.current!.connect(gainNodeRef.current!);
    compressorNodeRef.current!.connect(gainNodeRef.current!);
    gainNodeRef.current!.connect(analyserNodeRef.current!);
    analyserNodeRef.current!.connect(ctx.destination);

    updateParams(controls);

    source.start(0, startOffset, Math.max(0, cutEndTime - startOffset));
    startTimeRef.current = ctx.currentTime - startOffset;
    
    setState(prev => ({ ...prev, isPlaying: true }));

    const tick = () => {
        if (!sourceNodeRef.current) return;
        const current = ctx.currentTime - startTimeRef.current;
        if (current >= cutEndTime) {
             stop(); 
             pauseTimeRef.current = cutStartTime; 
             return;
        }
        setState(prev => ({ ...prev, currentTime: current }));
        animationFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    source.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        cancelAnimationFrame(animationFrameRef.current!);
    };
  };

  const pause = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
        sourceNodeRef.current.stop();
        pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        setState(prev => ({ ...prev, isPlaying: false }));
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const stop = () => {
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const exportAudio = async (controls: AudioProcessorControls) => {
      if (!audioBufferRef.current) return null;

      const totalDuration = audioBufferRef.current.duration;
      const cutStartTime = (controls.cutStart / 100) * totalDuration;
      const cutEndTime = (controls.cutEnd / 100) * totalDuration;
      const renderDuration = cutEndTime - cutStartTime;

      // Offline Context
      const offlineCtx = new OfflineAudioContext(
          2, 
          renderDuration * 44100, 
          44100
      );

      // Recreate Graph in Offline Context
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.detune.value = (controls.pitch - 50) * 24;

      const bass = offlineCtx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 200;
      bass.gain.value = (controls.bass - 50) / 2;

      const treble = offlineCtx.createBiquadFilter();
      treble.type = "highshelf";
      treble.frequency.value = 3000;
      treble.gain.value = (controls.treble - 50) / 2;

      const compressor = offlineCtx.createDynamicsCompressor();
      if (controls.beautify) {
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
      } else {
        compressor.threshold.value = 0;
        compressor.ratio.value = 1;
      }

      const reverb = offlineCtx.createConvolver();
      reverb.buffer = createReverbBuffer(offlineCtx, 2.0);

      const roomGain = offlineCtx.createGain();
      roomGain.gain.value = (controls.roomSize / 100) * (controls.fullRoom ? 1.0 : 0.5);

      const mainGain = offlineCtx.createGain();
      mainGain.gain.value = controls.booster ? 1.5 : 1.0;

      // Connect
      source.connect(bass);
      bass.connect(treble);
      treble.connect(compressor);

      // Reverb Path
      compressor.connect(roomGain);
      roomGain.connect(reverb);
      reverb.connect(mainGain);

      // Direct Path
      compressor.connect(mainGain);

      mainGain.connect(offlineCtx.destination);

      // Start
      source.start(0, cutStartTime, renderDuration);

      // Render
      const renderedBuffer = await offlineCtx.startRendering();
      return renderedBuffer;
  };

  return {
    loadFile,
    play,
    pause,
    stop,
    updateParams,
    exportAudio,
    state,
    audioContext: audioContextRef.current
  };
}
