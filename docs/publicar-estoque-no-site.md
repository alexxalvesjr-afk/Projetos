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

1. O seletor indicado em `data-alvo`.
2. Um elemento com `id="estoque-mypremium"`.
3. Uma seção com `id` `estoque`, `carros`, `veiculos`, `inventario` ou
   `nossos-carros`.
4. Um título (`h1`, `h2` ou `h3`) que fale em estoque, carros ou veículos —
   "Nossos carros", "Destaques do estoque", "Veículos disponíveis".

Nos casos 3 e 4, se a seção já tiver uma grade de cards, os carros do CRM
**entram nessa mesma grade**, ao lado dos que já estão. Só não havendo grade é
que o script cria a sua. Pendurar a lista no fim da seção jogaria os carros
para depois de botões e chamadas que fecham o bloco — e o resultado parecia um
segundo bloco de carros, separado do primeiro.

**Não achando nenhum desses, o script não desenha nada** e escreve o motivo no
console do navegador. Ele nunca cria seção nova: uma versão anterior fazia
isso e o bloco aparecia solto depois do rodapé, desarrumando a página.

Para escolher o lugar exato, coloque onde os carros devem entrar:

```html
<div id="estoque-mypremium"></div>
```

### Deixar só os carros do CRM

Para a lista fixa do site sair de cena e ficar apenas o estoque real,
acrescente `data-substituir="sim"`:

```html
<script
  src="https://projetos-fawn-two.vercel.app/estoque-mypremium.js"
  data-substituir="sim"
  defer
></script>
```

A troca só acontece **depois** que os carros do CRM chegam. Se o CRM estiver
fora do ar, se a internet do visitante falhar ou se o estoque estiver vazio, os
carros que já estão no site continuam onde estão — uma vitrine em branco seria
pior do que uma vitrine desatualizada.

### Substituir por um alvo específico

Nos casos 1 e 2 — onde alguém apontou o lugar de propósito — o script **limpa**
o que estiver ali antes de desenhar. É assim que a lista fixa do site dá lugar
ao estoque real:

```html
<script
  src="https://projetos-fawn-two.vercel.app/estoque-mypremium.js"
  data-alvo=".grid-de-carros"
  defer
></script>
```

Nos casos 3 e 4, adivinhados, ele acrescenta sem apagar nada — um lugar
adivinhado não é lugar para remover conteúdo de ninguém. Se os carros de
exemplo continuarem aparecendo junto, é sinal de que falta apontar o
`data-alvo`.

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
