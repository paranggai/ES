import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, Music2, Volume2, Sparkles, Box, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudioControlsState {
  pitch: number;
  booster: boolean;
  roomSize: number;
  fullRoom: boolean;
  bass: number;
  treble: number;
  beautify: boolean;
  mastered: boolean;
  eqBands: number[]; // 23 bands
}

interface AudioControllerProps {
  className?: string;
  values: AudioControlsState;
  onChange: (newValues: AudioControlsState) => void;
}

export function AudioController({ className, values, onChange }: AudioControllerProps) {
  
  const updateValue = (key: keyof AudioControlsState, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handlePitchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      updateValue("pitch", val);
  };

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {/* Pitch Correction */}
      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auto Pitch AI</CardTitle>
          <Mic2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
              <div className="relative w-full">
                  <Input 
                    type="number" 
                    value={values.pitch}
                    onChange={handlePitchInputChange}
                    className="text-2xl font-bold h-12 pl-4 pr-8"
                    min={0}
                    max={100}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
              </div>
          </div>
          <Slider
            value={[values.pitch]}
            onValueChange={(v) => updateValue("pitch", v[0])}
            max={100}
            step={1}
            className="w-full"
            data-testid="slider-pitch"
          />
          <p className="text-xs text-muted-foreground mt-2">
            AI-powered pitch correction intensity (0-100%)
          </p>
        </CardContent>
      </Card>

      {/* Booster */}
      <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vocal Booster</CardTitle>
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold">
              {values.booster ? "On" : "Off"}
            </span>
            <Switch
              checked={values.booster}
              onCheckedChange={(v) => updateValue("booster", v)}
              data-testid="switch-booster"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Boosts vocal presence and clarity
          </p>
        </CardContent>
      </Card>

      {/* Room Effects */}
      <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Room Effects</CardTitle>
          <Box className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">{values.roomSize}%</div>
          <Slider
            value={[values.roomSize]}
            onValueChange={(v) => updateValue("roomSize", v[0])}
            max={100}
            step={1}
            className="w-full"
            data-testid="slider-room"
          />
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="full-room"
              checked={values.fullRoom}
              onCheckedChange={(v) => updateValue("fullRoom", v)}
              data-testid="switch-fullroom"
            />
            <Label htmlFor="full-room">Full Room Mode</Label>
          </div>
        </CardContent>
      </Card>

      {/* 23-Band Equalizer */}
      <Card className="md:col-span-2 lg:col-span-3 border-l-4 border-l-blue-600 shadow-xl overflow-hidden bg-slate-950 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-bold tracking-tight text-blue-400">Pro 23-Band Graphic Equalizer</CardTitle>
          <Radio className="h-4 w-4 text-blue-500/50" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-6">
            <div className="flex h-56 items-end justify-between gap-1 px-1 bg-slate-900/50 rounded-lg border border-white/5 p-4 relative group">
              {/* Vertical scale lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-4 px-2 opacity-10">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-white" />
                ))}
              </div>

              {values.eqBands.map((gain, i) => {
                const freqs = [
                  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 
                  315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150
                ];
                const gainValue = (gain - 50) / 2;
                const gainDisplay = gainValue.toFixed(1);
                
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1 h-full z-10">
                    {/* Gain Value Display */}
                    <span className="text-[9px] font-mono text-blue-400 font-bold mb-1">
                      {gainValue > 0 ? `+${gainDisplay}` : gainDisplay}
                    </span>

                    {/* Slider with marked track area */}
                    <div className="relative flex-1 w-full flex justify-center bg-white/5 rounded-full py-2 hover:bg-white/10 transition-colors">
                      <Slider
                        orientation="vertical"
                        value={[gain]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => {
                          const newBands = [...values.eqBands];
                          newBands[i] = v[0];
                          updateValue("eqBands", newBands);
                        }}
                        className="h-full"
                      />
                    </div>

                    {/* Frequency Label */}
                    <span className="text-[9px] font-mono text-slate-500 rotate-45 mt-3 origin-left whitespace-nowrap">
                      {freqs[i] < 1000 ? freqs[i] : (freqs[i]/1000).toFixed(1) + 'k'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
               <span className="text-blue-500">Sub-Bass</span>
               <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
               <span>Mid-Range</span>
               <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
               <span className="text-blue-400">High-Mids</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EQ - Bass & Treble */}
      <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow md:col-span-2 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Equalizer (Bass & Treble)</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Bass</Label>
              <span className="text-sm font-bold text-primary">{values.bass}%</span>
            </div>
            <Slider
              value={[values.bass]}
              onValueChange={(v) => updateValue("bass", v[0])}
              max={100}
              step={1}
              data-testid="slider-bass"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Treble</Label>
              <span className="text-sm font-bold text-primary">{values.treble}%</span>
            </div>
            <Slider
              value={[values.treble]}
              onValueChange={(v) => updateValue("treble", v[0])}
              max={100}
              step={1}
              data-testid="slider-treble"
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Beautification */}
      <Card className="border-l-4 border-l-pink-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Voice Beautification</CardTitle>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold">
              {values.beautify ? "Active" : "Inactive"}
            </span>
            <Switch
              checked={values.beautify}
              onCheckedChange={(v) => updateValue("beautify", v)}
              data-testid="switch-beautify"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Softens harsh frequencies and adds warmth
          </p>
        </CardContent>
      </Card>

      {/* Mastered */}
      <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mastered</CardTitle>
          <Music2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold">
              {values.mastered ? "On" : "Off"}
            </span>
            <Switch
              checked={values.mastered}
              onCheckedChange={(v) => updateValue("mastered", v)}
              data-testid="switch-mastered"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            AI enhancement - heavy, powerful and perfected sound
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
