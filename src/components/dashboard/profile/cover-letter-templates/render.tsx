"use client";

import type { CoverLetterTemplateProps, CoverLetterTemplateName } from "./types";
import { CLProfessionalTemplate } from "./professional";
import { CLModernTemplate } from "./modern";
import { CLMinimalTemplate } from "./minimal";
import { CLExecutiveTemplate } from "./executive";
import { CLBoardroomTemplate } from "./boardroom";
import { CLDiplomatTemplate } from "./diplomat";
import { CLCanvasTemplate } from "./canvas";
import { CLVibrantTemplate } from "./vibrant";
import { CLPortfolioTemplate } from "./portfolio";
import { CLTerminalTemplate } from "./terminal";
import { CLBlueprintTemplate } from "./blueprint";
import { CLStackTemplate } from "./stack";
import { CLScholarTemplate } from "./scholar";
import { CLThesisTemplate } from "./thesis";

export function renderCoverLetterTemplate(
  name: CoverLetterTemplateName,
  props: CoverLetterTemplateProps
) {
  switch (name) {
    case "cl-professional":
      return <CLProfessionalTemplate {...props} />;
    case "cl-modern":
      return <CLModernTemplate {...props} />;
    case "cl-minimal":
      return <CLMinimalTemplate {...props} />;
    case "cl-executive":
      return <CLExecutiveTemplate {...props} />;
    case "cl-boardroom":
      return <CLBoardroomTemplate {...props} />;
    case "cl-diplomat":
      return <CLDiplomatTemplate {...props} />;
    case "cl-canvas":
      return <CLCanvasTemplate {...props} />;
    case "cl-vibrant":
      return <CLVibrantTemplate {...props} />;
    case "cl-portfolio":
      return <CLPortfolioTemplate {...props} />;
    case "cl-terminal":
      return <CLTerminalTemplate {...props} />;
    case "cl-blueprint":
      return <CLBlueprintTemplate {...props} />;
    case "cl-stack":
      return <CLStackTemplate {...props} />;
    case "cl-scholar":
      return <CLScholarTemplate {...props} />;
    case "cl-thesis":
      return <CLThesisTemplate {...props} />;
  }
}
