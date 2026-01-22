import { useEffect, useRef } from "react";

interface VisualizerProps {
  analyser: AnalyserNode | null;
}

export function Visualizer({ analyser }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    // Buffer for analyser data (Frequency Data now)
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : null;
    let hueOffset = 0;
    let time = 0;

    const draw = () => {
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear with transparency
      ctx.clearRect(0, 0, width, height);
      
      if (analyser && dataArray) {
        // GET FREQUENCY DATA (Spectrum)
        analyser.getByteFrequencyData(dataArray);

        // Bar Visualizer - Mirrored (Atas Bawah)
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        hueOffset += 0.5; // Color cycling

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * (height / 2); // Scale to half height

          // Dynamic Color based on height and time
          // Use Blue/Purple/Cyan theme
          const hue = 210 + (i / bufferLength) * 60 + Math.sin(hueOffset * 0.01) * 20; 
          ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;

          // Draw Bar Mirrored from Center
          const centerY = height / 2;
          
          // Upper bar (going up from center)
          ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
          
          // Lower bar (going down from center)
          // Add transparency to lower reflection
          ctx.fillStyle = `hsla(${hue}, 90%, 60%, 0.5)`;
          ctx.fillRect(x, centerY, barWidth, barHeight);

          x += barWidth + 1;
        }

      } else {
        // IDLE VISUALIZATION (Mirrored Waves)
        const centerY = height / 2;
        const colors = ["#3b82f6", "#8b5cf6", "#06b6d4"];
        
        colors.forEach((color, i) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            
            for (let x = 0; x < width; x++) {
              // Mirrored wave effect
              const waveY = Math.sin(x * 0.02 + time + i) * 20 * Math.sin(time * 0.5);
              
              if (x === 0) ctx.moveTo(x, centerY + waveY);
              else ctx.lineTo(x, centerY + waveY);
            }
            ctx.stroke();
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = 150;
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  return (
    <div className="w-full h-[150px] bg-gradient-to-b from-white/60 to-white/30 backdrop-blur-sm rounded-lg overflow-hidden border border-border/50 relative shadow-sm">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
