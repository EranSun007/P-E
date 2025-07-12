
import React, { useState, useRef, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { safeArray } from "@/components/utils/SafeArray";

export default function TagInput({ 
  value = [],
  onChange = () => {},
  placeholder = "Enter tags...",
  maxTags = 100,
  className = "",
  disabled = false
}) {
  // Use safeArray utility to ensure we always have an array
  const tags = safeArray(value);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.endsWith(',')) {
      addTag(newValue.slice(0, -1));
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
    else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags);
    }
  };
  
  const addTag = (tag) => {
    if (!tag.trim() || tags.length >= maxTags) return;
    
    if (!tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()]);
    }
    
    setInputValue('');
  };
  
  const removeTag = useCallback((tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onChange]);
  
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };
  
  return (
    <div 
      className={`flex flex-wrap gap-1.5 p-2 border rounded-md min-h-10 ${className} ${disabled ? 'bg-gray-100 opacity-60' : 'cursor-text'}`}
      onClick={handleContainerClick}
    >
      {tags.map((tag) => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="flex items-center h-6 px-2 text-sm"
        >
          {tag}
          {!disabled && (
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      
      <Input 
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue.trim() && addTag(inputValue)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 border-none p-0 min-w-[80px] shadow-none focus-visible:ring-0 placeholder:text-gray-400"
        disabled={disabled}
      />
    </div>
  );
}
