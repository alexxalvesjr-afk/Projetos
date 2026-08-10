# Colocar o estoque do CRM no site da revenda

O site da revenda é hospedado fora do CRM. Para os carros cadastrados
aparecerem lá, o site precisa carregar **uma linha** — só isso, uma vez:

```html
<script src="https://projetos-fawn-two.vercel.app/estoque-mypremium.js" defer></script>
```

Ela vai logo antes do `</body>`, no fim do HTML.

Trocar o endereço acima só é necessário se o CRM passar a rodar em outro
domínio. O arquivo é servido pelo próprio CRM: qualquer correção nele chega ao
site sozinha, sem reeditar nem reenviar nada.

## Onde os cards aparecem

O script procura, nesta ordem:

1. Um elemento com `id="estoque-mypremium"` (ou o que você indicar em
   `data-alvo`).
2. Uma seção com `id` `estoque`, `carros`, `veiculos`, `inventario` ou
   `nossos-carros`.
3. Não achando nenhuma, cria uma seção própria no fim da página.

Para escolher o lugar exato, coloque onde os carros devem entrar:

```html
<div id="estoque-mypremium"></div>
```

## Ajustes opcionais

Na mesma linha do script:

```html
<script
  src="https://projetos-fawn-two.vercel.app/estoque-mypremium.js"
  data-loja="mypremium-motors"
  data-alvo="#meus-carros"
  data-limite="60"
  defer
></script>
```

## Como instalar sem mexer nos arquivos

Se o site está na Netlify e você não tem os arquivos em mãos:

**Site configuration → Build & deploy → Post processing → Snippet injection →
Add snippet**, escolha **Insert before `</body>`** e cole a linha.

## Conferindo se funcionou

1. Abra `https://projetos-fawn-two.vercel.app/api/publico/veiculos?loja=mypremium-motors`
   no navegador. Deve aparecer um texto começando com `{"loja":` e, dentro
   dele, os carros. Se o carro que você cadastrou **não** estiver aí, o
   problema é no CRM: confira se o veículo está **publicado** e com status
   **Disponível** ou **Reservado** (vendido sai do ar de propósito).
2. Se o carro está no feed mas não no site, então a linha não foi carregada.
   No site, aperte **F12 → Console** e recarregue: mensagens começando com
   `[estoque-mypremium]` dizem o que houve.
