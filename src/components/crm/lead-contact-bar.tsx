"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { mailtoLink, telLink, whatsappLink } from "@/lib/utils";
import { whatsappTemplate } from "@/lib/domain/lead";
import { addLeadActivity } from "@/server/actions/lead.actions";
import { Button } from "@/components/ui/button";

/**
 * One-tap contact actions.
 *
 * Opening the channel also logs the touch, so `lastContactAt` stays honest
 * without asking the salesperson to remember a second step. The link is opened
 * synchronously — deferring it behind the server round trip would trip the
 * browser's popup blocker.
 */
export function LeadContactBar({
  leadId,
  name,
  phone,
  email,
  vehicle,
}: {
  leadId: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  function log(type: "CALL" | "WHATSAPP" | "EMAIL", content: string) {
    startTransition(async () => {
      const result = await addLeadActivity({ leadId, type, content });
      if (result.ok) router.refresh();
    });
  }

  function openChannel(
    url: string,
    type: "CALL" | "WHATSAPP" | "EMAIL",
    content: string,
  ) {
    window.open(url, type === "CALL" ? "_self" : "_blank", "noopener,noreferrer");
    log(type, content);
    toast.success("Interação registrada no histórico");
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="outline"
        disabled={!phone}
        onClick={() =>
          phone &&
          openChannel(
            whatsappLink(phone, whatsappTemplate(name, vehicle)),
            "WHATSAPP",
            "Mensagem enviada pelo WhatsApp.",
          )
        }
      >
        <MessageCircle className="text-success" />
        WhatsApp
      </Button>

      <Button
        variant="outline"
        disabled={!phone}
        onClick={() =>
          phone && openChannel(telLink(phone), "CALL", "Ligação realizada.")
        }
      >
        <Phone />
        Ligar
      </Button>

      <Button
        variant="outline"
        disabled={!email}
        onClick={() =>
          email &&
          openChannel(
            mailtoLink(email, vehicle ? `Sobre o ${vehicle}` : "Contato"),
            "EMAIL",
            "E-mail enviado.",
          )
        }
      >
        <Mail />
        E-mail
      </Button>
    </div>
  );
}
