
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OllamaModel } from "@/types";

interface ModelSelectorProps {
  selectedModel: OllamaModel;
  onModelChange: (model: OllamaModel) => void;
}

const models: { value: OllamaModel; label: string; description: string }[] = [
  { value: "llama3", label: "Llama 3", description: "General purpose model by Meta" },
  { value: "llama3:8b", label: "Llama 3 8B", description: "Smaller, faster Llama 3 variant" },
  { value: "llama3:70b", label: "Llama 3 70B", description: "Largest Llama 3 variant with highest capability" },
  { value: "mistral", label: "Mistral", description: "Efficient language model with strong reasoning" },
  { value: "mixtral", label: "Mixtral", description: "Mixture of experts architecture" },
  { value: "codellama", label: "CodeLlama", description: "Specialized for programming tasks" },
  { value: "phi3", label: "Phi-3", description: "Microsoft's compact performant model" },
  { value: "gemma", label: "Gemma", description: "Google's lightweight model" },
];

const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedModel
            ? models.find((model) => model.value === selectedModel)?.label
            : "Select model..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            {models.map((model) => (
              <CommandItem
                key={model.value}
                value={model.value}
                onSelect={() => {
                  onModelChange(model.value as OllamaModel);
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    selectedModel === model.value ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div className="flex flex-col">
                  <span>{model.label}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ModelSelector;
