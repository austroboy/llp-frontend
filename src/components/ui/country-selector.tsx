"use client";

import * as React from "react";
import { useState } from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { CircleFlag } from "react-circle-flags";
import { countries } from "country-data-list";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Country {
  alpha2: string;
  name: string;
}

// Build a clean, sorted country list from country-data-list
const COUNTRY_LIST: Country[] = countries.all
  .filter(
    (c: { status: string; alpha2: string; name: string }) =>
      c.status === "assigned" && c.alpha2 && c.name
  )
  .map((c: { alpha2: string; name: string }) => ({
    alpha2: c.alpha2.toLowerCase(),
    name: c.name,
  }))
  .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

interface CountrySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CountrySelector({
  value,
  onChange,
  placeholder = "Select country",
  disabled = false,
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);

  const selected = COUNTRY_LIST.find(
    (c) => c.alpha2 === value?.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal dark:bg-input/30 dark:hover:bg-input/50"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <CircleFlag
                countryCode={selected.alpha2}
                height={16}
                width={16}
              />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_LIST.map((country) => (
                <CommandItem
                  key={country.alpha2}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.alpha2.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <CircleFlag
                    countryCode={country.alpha2}
                    height={16}
                    width={16}
                  />
                  <span className="truncate">{country.name}</span>
                  {value?.toLowerCase() === country.alpha2 && (
                    <CheckIcon className="ml-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
