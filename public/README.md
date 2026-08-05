# Assets públicos

Arquivos aqui são servidos na raiz do site: `public/logo-mypremium.png`
fica disponível em `https://seu-site/logo-mypremium.png`.

## Logo

O componente `Logo` (`src/components/shared/logo.tsx`) procura por:

    public/logo-mypremium.png

Enquanto esse arquivo não existir, ele mostra o "M" desenhado em código com o
texto "Mypremium" ao lado — não quebra a tela.

Prefira PNG com fundo transparente. A logo aparece sobre fundo branco no tema
claro e sobre preto no escuro, então evite fundo sólido: um retângulo branco
salta no modo escuro.
