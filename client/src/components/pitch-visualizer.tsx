import { useEffect, useRef } from "react";

interface FrequencyVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export function FrequencyVisualizer({ analyser, isPlaying }: FrequencyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : null;
    
    // History buffer for waterfall/frequency graph
    const historyBuffer: number[][] = [];
    const maxHistory = 100;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear
      ctx.clearRect(0, 0, width, height);

      // Draw grid background
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 1;
      
      // Horizontal grid lines (frequency bands)
      for (let i = 0; i < 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical grid lines (time)
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      if (analyser && dataArray && isPlaying) {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Add current frame to history
        const currentFrame: number[] = [];
        for (let i = 0; i < Math.min(bufferLength, height); i++) {
          currentFrame.push(dataArray[i] || 0);
        }
        historyBuffer.push(currentFrame);

        // Keep history limited
        if (historyBuffer.length > maxHistory) {
          historyBuffer.shift();
        }

        // Draw frequency over time - Waterfall style
        const cellWidth = width / historyBuffer.length;
        
        historyBuffer.forEach((frame, historyIdx) => {
          const xPos = (historyIdx / historyBuffer.length) * width;
          
          frame.forEach((freqValue, freqIdx) => {
            // Map frequency index to Y position (bottom = low freq, top = high freq)
            const yPos = height - (freqIdx / frame.length) * height;
            const cellHeight = height / frame.length;
            
            // Color based on frequency magnitude
            const intensity = freqValue / 255;
            const hue = 200 + intensity * 80; // Blue to Purple
            const lightness = 40 + intensity * 30;
            
            ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
            ctx.fillRect(xPos, yPos - cellHeight, cellWidth, cellHeight);
          });
        });
      }

      // Draw axes labels
      ctx.fillStyle = "#666";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText("Frequency (Hz)", 10, 20);
      ctx.fillText("Time →", width - 60, height - 10);

      // Y-axis frequency labels
      ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "#999";
      ctx.fillText("High", 5, 20);
      ctx.fillText("Low", 5, height - 5);

      animationId = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = 200;
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="w-full bg-white rounded-lg border shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-gray-700">Frequency Spectrum Over Time</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded bg-blue-400 mr-1"></span> Low Intensity
          <span className="inline-block w-3 h-3 rounded bg-purple-600 mr-1 ml-2"></span> High Intensity
        </div>
      </div>
      <div className="w-full h-[200px] relative overflow-hidden bg-slate-50 rounded border border-slate-100">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
