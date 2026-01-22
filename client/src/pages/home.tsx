import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Scissors, 
  Upload, 
  Play, 
  Pause, 
  Info, 
  Download,
  Share2,
  StopCircle,
  Moon,
  Sun
} from "lucide-react";
import { AudioController, AudioControlsState } from "@/components/audio-controller";
import { Visualizer } from "@/components/visualizer";
import { FrequencyVisualizer } from "@/components/pitch-visualizer";
import { useToast } from "@/hooks/use-toast";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import heroImage from "@assets/generated_images/abstract_blue_sound_waves_on_white_background.png";
import developerPhoto from "@/assets/developer-photo.jpg";

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cutRange, setCutRange] = useState([0, 100]);
  
  // Theme management
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const [cutInput, setCutInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  // Audio Processor Hook
  const processor = useAudioProcessor();

  // Control State
  const [controls, setControls] = useState<AudioControlsState>({
    pitch: 50,
    booster: false,
    roomSize: 30,
    fullRoom: false,
    bass: 50,
    treble: 50,
    beautify: true,
    mastered: false,
    eqBands: Array(23).fill(50)
  });

  // Combine controls with cut range for the processor
  const currentControls = {
      ...controls,
      cutStart: cutRange[0],
      cutEnd: cutRange[1]
  };

  // Sync controls to processor whenever they change
  useEffect(() => {
     processor.updateParams(currentControls);
  }, [controls, cutRange, processor]);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files[0]) {
        const uploadedFile = files[0];
        setFile(uploadedFile);
        
        try {
            await processor.loadFile(uploadedFile);
            toast({
                title: "Audio Uploaded",
                description: `Loaded ${uploadedFile.name} successfully. Ready to play!`,
            });
        } catch (error) {
            toast({
                title: "Error Loading Audio",
                description: "Could not decode audio file.",
                variant: "destructive"
            });
        }
      }
    };
    input.click();
  };

  const togglePlayback = () => {
    if (processor.state.isPlaying) {
        processor.pause();
    } else {
        processor.play(currentControls);
    }
  };

  const stopPlayback = () => {
      processor.stop();
  };

  // Parse time input (mm:ss-mm:ss)
  const handleCutInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCutInput(val);

      // Try regex parse
      // Format: 0:23-4:32
      const match = val.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
      if (match && processor.state.duration > 0) {
          const startMin = parseInt(match[1]);
          const startSec = parseInt(match[2]);
          const endMin = parseInt(match[3]);
          const endSec = parseInt(match[4]);

          const startTime = startMin * 60 + startSec;
          const endTime = endMin * 60 + endSec;
          const duration = processor.state.duration;

          if (startTime < endTime && endTime <= duration) {
              const startPct = (startTime / duration) * 100;
              const endPct = (endTime / duration) * 100;
              setCutRange([startPct, endPct]);
          }
      }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
      if (!file) {
          toast({ title: "No File", description: "Please upload an audio file first.", variant: "destructive" });
          return;
      }
      
      toast({ title: "Exporting...", description: "Processing audio, please wait." });
      
      const buffer = await processor.exportAudio(currentControls);
      if (buffer) {
          // Convert AudioBuffer to WAV
          const wavBlob = await audioBufferToWav(buffer);
          const url = URL.createObjectURL(wavBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Processed_${file.name.replace(/\.[^/.]+$/, "")}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({ title: "Export Complete", description: "File downloaded successfully." });
      } else {
          toast({ title: "Export Failed", description: "Could not process audio.", variant: "destructive" });
      }
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Petrus Studio - Vocal Enhancer',
                  text: 'Check out this AI-powered vocal enhancement tool!',
                  url: window.location.href,
              });
          } catch (err) {
              console.error(err);
          }
      } else {
          navigator.clipboard.writeText(window.location.href);
          toast({ title: "Link Copied", description: "App link copied to clipboard." });
      }
  };

  // Simple WAV encoder helper
  const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2 + 44;
      const bufferArr = new ArrayBuffer(length);
      const view = new DataView(bufferArr);
      const channels = [];
      let i;
      let sample;
      let offset = 0;
      let pos = 0;

      // write WAVE header
      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8); // file length - 8
      setUint32(0x45564157); // "WAVE"

      setUint32(0x20746d66); // "fmt " chunk
      setUint32(16); // length = 16
      setUint16(1); // PCM (uncompressed)
      setUint16(numOfChan);
      setUint32(buffer.sampleRate);
      setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
      setUint16(numOfChan * 2); // block-align
      setUint16(16); // 16-bit (hardcoded in this prototype)

      setUint32(0x61746164); // "data" - chunk
      setUint32(length - pos - 4); // chunk length

      // write interleaved data
      for(i = 0; i < buffer.numberOfChannels; i++)
          channels.push(buffer.getChannelData(i));

      while(pos < buffer.length) {
          for(i = 0; i < numOfChan; i++) {
              sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
              sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit
              view.setInt16(44 + offset, sample, true); 
              offset += 2;
          }
          pos++;
      }

      return new Blob([bufferArr], { type: "audio/wav" });

      function setUint16(data: any) {
          view.setUint16(pos, data, true);
          pos += 2;
      }
      function setUint32(data: any) {
          view.setUint32(pos, data, true);
          pos += 4;
      }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold font-display shadow-lg shadow-primary/20 relative overflow-hidden group">
              <span className="text-xl relative z-10">ES</span>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-primary">Earthus Studio</h1>
          </div>
          
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="rounded-full w-9 h-9"
              >
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-500" />}
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full px-4">
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">About Developer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>About Earthus Studio</DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-6 py-4">
                    {/* Developer Photo */}
                    <div className="flex-shrink-0">
                      <img 
                        src={developerPhoto} 
                        alt="Petrus Paranggai" 
                        className="w-40 h-40 rounded-lg object-cover shadow-lg border-2 border-primary/20"
                      />
                    </div>
                    
                    {/* Developer Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-lg font-bold text-foreground">Petrus Paranggai</p>
                        <p className="text-sm text-muted-foreground">Developer & Audio Engineer</p>
                      </div>
                      
                      <div className="p-4 bg-secondary rounded-lg border">
                        <p className="text-sm font-medium mb-2">Contact Information</p>
                        <p className="text-sm text-muted-foreground">Email: peterpetrusparanggai112@gmail.com</p>
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Dedicated to providing high-quality vocal enhancement tools powered by AI. Creating professional-grade audio processing solutions accessible to everyone.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 shadow-lg">
          <div className="absolute inset-0 z-0 opacity-20">
             <img src={heroImage} alt="Sound waves" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 p-8 md:p-12 text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Perfect Your Vocal Quality
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade AI pitch correction, room effects, and vocal boosting directly in your browser.
            </p>
            
            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                onClick={handleUpload} 
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105"
                data-testid="button-upload"
              >
                <Upload className="mr-2 h-5 w-5" />
                Select Audio File
              </Button>
            </div>
            {file && (
                <p className="text-sm font-medium text-primary animate-in fade-in slide-in-from-bottom-2">
                    Active File: {file.name}
                </p>
            )}
          </div>
        </section>

        {/* Frequency Spectrum Visualizer */}
        <section className="space-y-4">
           <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full inline-block"></span>
              Frequency Spectrum Over Time
           </h3>
           <FrequencyVisualizer 
              analyser={processor.state.analyser}
              isPlaying={processor.state.isPlaying}
           />
        </section>

        {/* Visualizer & Playback */}
        <section className="grid gap-6 md:grid-cols-[1fr_300px]">
           <div className="space-y-4">
              {/* Main Spectrum Visualizer */}
              <Visualizer analyser={processor.state.analyser} />
              
              {/* Playback Controls */}
              <div className="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                <Button 
                    variant="default" 
                    size="icon" 
                    className="h-12 w-12 rounded-full shadow-md hover:scale-105 transition-transform"
                    onClick={togglePlayback}
                    disabled={!file}
                >
                    {processor.state.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                
                {processor.state.isPlaying && (
                    <Button variant="ghost" size="icon" onClick={stopPlayback} className="text-destructive hover:text-destructive/90">
                        <StopCircle className="h-6 w-6" />
                    </Button>
                )}

                <div className="flex-1 space-y-1">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden relative">
                         {/* Play Progress */}
                        <div 
                            className="absolute top-0 left-0 h-full bg-primary/30 w-full origin-left transform scale-x-0 transition-transform duration-100 ease-linear"
                             style={{ 
                                 transform: `scaleX(${processor.state.duration > 0 ? processor.state.currentTime / processor.state.duration : 0})` 
                             }}
                        />
                         {/* Cut Range Indicators */}
                        <div 
                            className="absolute top-0 h-full bg-primary/20" 
                            style={{ 
                                left: `${cutRange[0]}%`, 
                                width: `${cutRange[1] - cutRange[0]}%` 
                            }} 
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(processor.state.currentTime)}</span>
                        <span>{formatTime(processor.state.duration)}</span>
                    </div>
                </div>
              </div>
           </div>

           {/* Cut Audio Tool */}
           <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 h-fit">
              <div className="flex items-center gap-2 text-primary">
                  <Scissors className="w-5 h-5" />
                  <h3 className="font-bold">Cut Audio</h3>
              </div>
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Range (mm:ss-mm:ss)</label>
                    <Input 
                      placeholder="0:23-4:32" 
                      className="font-mono text-center tracking-widest placeholder:text-muted-foreground/50"
                      value={cutInput}
                      onChange={handleCutInputChange}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-mono bg-secondary/50 p-2 rounded">
                      <span>Start: {cutRange[0].toFixed(0)}%</span>
                      <span>End: {cutRange[1].toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Enter time range to trim audio.
                  </p>
              </div>
           </div>
        </section>

        {/* Main Controls */}
        <section>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-display font-bold">Studio Effects</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" /> Share
                    </Button>
                    <Button size="sm" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>
            <AudioController values={controls} onChange={setControls} />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12 bg-secondary/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© 2024 Earthus Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}