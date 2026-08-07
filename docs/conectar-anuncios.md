# Conectar Meta Ads e Google Ads

A aba **Marketing** tem dois botões: um para o Meta Ads (Facebook e Instagram)
e outro para o Google Ads. Depois de conectados, o CRM baixa sozinho quanto
cada campanha gastou, quantos cliques e quantos leads gerou, e calcula custo
por lead e retorno.

Antes de os botões funcionarem, é preciso criar um aplicativo em cada
plataforma. **Isso é feito uma única vez**, por quem administra o sistema — não
é por loja e não se repete. As duas empresas exigem esse passo; não existe
caminho que dispense.

Enquanto as chaves não estiverem configuradas, o botão aparece como
**Configurar** e mostra o mesmo roteiro que está aqui.

---

## Meta Ads

1. Entre em <https://developers.facebook.com> e clique em **Meus apps → Criar
   app**. Escolha o tipo **Empresa**.
2. No painel do app, adicione o produto **Login do Facebook**.
3. Em **Casos de uso** (ou **Permissões**), ative **`ads_read`**. É a permissão
   de leitura: o CRM lê números, nunca cria nem pausa campanha.
4. Em **Configurações → Básico**, copie:
   - **ID do aplicativo** → `META_ADS_CLIENT_ID`
   - **Chave secreta do aplicativo** → `META_ADS_CLIENT_SECRET`
5. Em **Login do Facebook → Configurações**, no campo **URIs de
   redirecionamento OAuth válidos**, cole:

   ```
   https://SEU-ENDERECO/api/integracoes/meta/callback
   ```

   Troque `SEU-ENDERECO` pelo endereço do CRM (o mesmo de
   `NEXT_PUBLIC_APP_URL`). O endereço precisa bater **letra por letra**.

> Enquanto o app estiver em modo de desenvolvimento, só os administradores e
> testadores cadastrados nele conseguem autorizar. Para liberar a outras
> pessoas, publique o app.

---

## Google Ads

O Google tem um passo a mais: além das chaves de login, exige um **token de
desenvolvedor**, que passa por aprovação e costuma levar alguns dias.

1. Entre em <https://console.cloud.google.com>, crie um projeto e ative a
   **Google Ads API** na biblioteca de APIs.
2. Em **APIs e serviços → Credenciais**, crie um **ID do cliente OAuth** do
   tipo **Aplicativo da Web**. Copie:
   - **ID do cliente** → `GOOGLE_ADS_CLIENT_ID`
   - **Chave secreta do cliente** → `GOOGLE_ADS_CLIENT_SECRET`
3. Ainda nessa tela, em **URIs de redirecionamento autorizados**, cole:

   ```
   https://SEU-ENDERECO/api/integracoes/google/callback
   ```

4. Em **Tela de permissão OAuth**, publique o app (ou adicione como usuários de
   teste as contas que vão conectar).
5. Em <https://ads.google.com>, vá em **Ferramentas → Configuração → Central de
   API** e solicite o **token de desenvolvedor** →
   `GOOGLE_ADS_DEVELOPER_TOKEN`.
6. Se as contas dos clientes ficam sob uma conta de administrador (MCC),
   preencha também `GOOGLE_ADS_LOGIN_CUSTOMER_ID` com o id dessa conta (só os
   números).

---

## Onde colar as chaves

Na Vercel: **Settings → Environment Variables**. Crie uma variável para cada
nome acima, cole o valor e salve. Depois faça um novo deploy — as variáveis só
passam a valer no deploy seguinte.

Rodando localmente, os mesmos nomes vão no arquivo `.env`.

---

## Como usar depois de configurado

1. Abra **Marketing** no CRM.
2. Clique em **Conectar Meta Ads** ou **Conectar Google Ads**.
3. Autorize na tela da própria plataforma. O CRM não vê nem guarda sua senha —
   recebe apenas uma autorização de leitura, que você pode cancelar quando
   quiser nas configurações da conta do Facebook ou do Google.
4. Se o seu login administra mais de uma conta de anúncios, escolha qual.
5. Pronto: o desempenho dos últimos 90 dias aparece na página.

A cada sincronização o CRM recarrega os 90 dias inteiros, e não só o que mudou.
As duas plataformas continuam corrigindo as conversões de um dia por vários
dias depois do clique — reprocessar a janela evita ficar com um número que a
plataforma já ajustou.

**Vendas e receita** continuam sendo do CRM: são as vendas que a sua equipe
registrou. A sincronização nunca as sobrescreve, então o ROAS combina o
investimento que veio da plataforma com o faturamento que veio da loja.
