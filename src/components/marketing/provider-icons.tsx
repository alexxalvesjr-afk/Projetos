/**
 * Marcas do Meta e do Google.
 *
 * Um ícone genérico de "megafone" nos dois botões obrigaria a ler o rótulo
 * para saber qual é qual; a marca resolve isso antes da leitura. Desenhadas
 * em SVG inline porque a política de segurança da página não carrega imagem
 * de outro domínio.
 */
export function MetaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4.6 15.7c0-3.9 1.9-7.4 4.1-7.4 1.2 0 2.2 1 3.6 3.3l1 1.7c1.6 2.7 2.6 4 4.4 4 1.7 0 2.9-1.6 2.9-4.4 0-4.6-2.6-9-6-9-2 0-3.7 1.4-5 3.4"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M9.1 8.3C7.5 6 6.3 5.2 4.9 5.2 2.6 5.2 1 8.2 1 12.4c0 3 1.2 5 3.2 5 1.6 0 2.7-1 4.5-3.9"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
