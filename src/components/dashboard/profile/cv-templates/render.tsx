"use client";

import type { CvTemplateProps, CvTemplateName } from "./types";
import { ProfessionalTemplate } from "./professional";
import { ModernTemplate } from "./modern";
import { MinimalTemplate } from "./minimal";
import { ExecutiveTemplate } from "./executive";
import { BoardroomTemplate } from "./boardroom";
import { DiplomatTemplate } from "./diplomat";
import { CanvasTemplate } from "./canvas";
import { VibrantTemplate } from "./vibrant";
import { PortfolioTemplate } from "./portfolio";
import { TerminalTemplate } from "./terminal";
import { BlueprintTemplate } from "./blueprint";
import { StackTemplate } from "./stack";
import { ScholarTemplate } from "./scholar";
import { ThesisTemplate } from "./thesis";

export function renderTemplate(name: CvTemplateName, props: CvTemplateProps) {
  switch (name) {
    case "professional":
      return <ProfessionalTemplate {...props} />;
    case "modern":
      return <ModernTemplate {...props} />;
    case "minimal":
      return <MinimalTemplate {...props} />;
    case "executive":
      return <ExecutiveTemplate {...props} />;
    case "boardroom":
      return <BoardroomTemplate {...props} />;
    case "diplomat":
      return <DiplomatTemplate {...props} />;
    case "canvas":
      return <CanvasTemplate {...props} />;
    case "vibrant":
      return <VibrantTemplate {...props} />;
    case "portfolio":
      return <PortfolioTemplate {...props} />;
    case "terminal":
      return <TerminalTemplate {...props} />;
    case "blueprint":
      return <BlueprintTemplate {...props} />;
    case "stack":
      return <StackTemplate {...props} />;
    case "scholar":
      return <ScholarTemplate {...props} />;
    case "thesis":
      return <ThesisTemplate {...props} />;
  }
}
