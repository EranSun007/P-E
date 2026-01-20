import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

const ProjectProgressSlider = ({ value, onCommit }) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes (e.g., after save)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>{localValue}%</span>
      </div>
      <Slider
        value={[localValue]}
        min={0}
        max={100}
        step={5}
        onValueChange={(vals) => setLocalValue(vals[0])}
        onValueCommit={(vals) => onCommit(vals[0])}
        className="cursor-pointer"
      />
    </div>
  );
};

export default ProjectProgressSlider;
