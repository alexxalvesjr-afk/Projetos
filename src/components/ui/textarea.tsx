import * as React from "react";

import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/components/ui/input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputBaseClasses, "min-h-20 resize-y py-2.5", className)}
      {...props}
    />
  );
}

export { Textarea };
