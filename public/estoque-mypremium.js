/**
 * Estoque Mypremium — publica os carros do CRM em qualquer site.
 *
 * Instalação: uma linha, antes do fechamento do body do site da revenda.
 *
 *   script src="https://SEU-CRM/estoque-mypremium.js" defer
 *
 * (a tag não aparece escrita por extenso porque este arquivo também pode ser
 *  colado dentro de uma tag script, e um "</" seguido de "script" em qualquer
 *  ponto do texto encerraria a tag ali e quebraria o resto.)
 *
 * O arquivo é servido pelo próprio CRM, então correções chegam ao site sem
 * que ninguém precise reeditar ou reenviar nada. O endereço da API sai do
 * endereço deste próprio arquivo — quem acerta a linha acima acerta tudo.
 *
 * Configuração opcional, como atributos data- na mesma tag:
 *   data-loja="mypremium-motors"   qual loja mostrar
 *   data-alvo="#meus-carros"       onde inserir os cards
 *   data-limite="60"               quantos carros
 *   data-substituir="sim"          troca a lista fixa do site pela do CRM
 */
(function () {
  "use strict";

  // `currentScript` só vale durante a execução síncrona do arquivo; guardar
  // agora é o que permite ler os atributos depois, dentro do fetch.
  var tag = document.currentScript;

  function attr(name, fallback) {
    var value = tag && tag.getAttribute("data-" + name);
    return value && value.trim() ? value.trim() : fallback;
  }

  var origem = (function () {
    try {
      return new URL(tag.src).origin;
    } catch (e) {
      return "";
    }
  })();

  var CONFIG = {
    api: origem + "/api/publico/veiculos",
    loja: attr("loja", "mypremium-motors"),
    alvo: attr("alvo", "#estoque-mypremium"),
    limite: attr("limite", "60"),
    // Com data-substituir, a lista fixa do site sai e fica só o estoque do
    // CRM. Fora isso os carros do CRM entram ao lado dos que já existem.
    //
    // Não é o padrão de propósito: apagar conteúdo de um lugar que o script
    // deduziu sozinho é a única coisa aqui capaz de estragar uma página, e
    // essa decisão tem de ser de quem instala, não do script.
    substituir: /^(sim|true|1)$/i.test(attr("substituir", "")),
  };

  /**
   * Descobre onde inserir a lista — e desiste em silêncio se não descobrir.
   *
   * A primeira versão, não achando lugar, criava uma seção própria no fim da
   * página. Num site real isso apareceu como um bloco solto depois do rodapé e
   * desarrumou o layout: o script deve publicar o estoque, nunca inventar uma
   * seção. Hoje, sem lugar certo, ele não desenha nada e explica o motivo no
   * console — invisível é ruim, mas estragar a página é pior.
   *
   * A busca vai do explícito ao provável:
   *   1. o seletor pedido em data-alvo;
   *   2. um elemento com id="estoque-mypremium";
   *   3. um id conhecido de seção de estoque;
   *   4. um título escrito "estoque", "nossos carros" ou "veículos".
   *
   * O passo 4 existe porque quase nenhum site tem o id certo, mas todos têm o
   * título escrito na tela — é o que o visitante lê para achar os carros.
   */
  var IDS = [
    "estoque-mypremium",
    "estoque",
    "carros",
    "veiculos",
    "veículos",
    "inventario",
    "nossos-carros",
  ];

  // Casa com "Estoque", "Nossos carros", "Destaques do estoque", "Veículos
  // disponíveis" — a frase que o visitante lê para achar os carros, que varia
  // de site para site mas gira sempre em torno das mesmas palavras.
  var TITULO = /(estoque|nosso[s]?\s+(carros|ve[íi]culos)|ve[íi]culos|carros)/i;

  function porTitulo() {
    var titulos = document.querySelectorAll("h1,h2,h3");
    for (var i = 0; i < titulos.length; i++) {
      var texto = (titulos[i].textContent || "").trim();
      // Um título curto: "Estoque" casa, um parágrafo que menciona estoque não.
      if (texto.length > 40 || !TITULO.test(texto)) continue;

      var secao = titulos[i].closest("section") || titulos[i].parentElement;
      var grade = secao && acharGrade(secao);
      if (grade) return { alvo: grade, limpar: false, junto: true };

      // Sem grade existente, entra logo depois do título — é onde a lista de
      // carros estaria se o site já a tivesse.
      var alvo = document.createElement("div");
      alvo.className = "mp-grade-wrap";
      titulos[i].insertAdjacentElement("afterend", alvo);
      return { alvo: alvo, limpar: false, junto: false };
    }
    return null;
  }

  /**
   * A grade de cards que o site já tem dentro desta seção.
   *
   * Achando-a, os carros do CRM entram nela como mais alguns cards, ao lado
   * dos que já estavam — que é o que se espera de um estoque. Sem isso o
   * script pendurava a lista no fim da seção, depois de botões e rodapés da
   * própria seção, e o resultado parecia um segundo bloco de carros.
   *
   * O reconhecimento é conservador: três ou mais filhos diretos iguais entre
   * si (mesma tag, mesma classe) dentro de um elemento que o navegador está
   * desenhando como grid ou flex. Uma lista de links de menu não passa por
   * estar fora da seção; um par de botões não passa por serem só dois.
   */
  function acharGrade(secao) {
    var melhor = null;
    var candidatos = secao.querySelectorAll("div,ul,ol");

    for (var i = 0; i < candidatos.length; i++) {
      var filhos = candidatos[i].children;
      if (filhos.length < 3) continue;

      var assinatura = filhos[0].tagName + "|" + (filhos[0].className || "");
      var iguais = true;
      for (var j = 1; j < filhos.length; j++) {
        if (filhos[j].tagName + "|" + (filhos[j].className || "") !== assinatura) {
          iguais = false;
          break;
        }
      }
      if (!iguais) continue;

      var display = getComputedStyle(candidatos[i]).display;
      if (display !== "grid" && display !== "flex") continue;

      if (!melhor || filhos.length > melhor.n) {
        melhor = { el: candidatos[i], n: filhos.length };
      }
    }

    return melhor && melhor.el;
  }

  /**
   * Achou o lugar? Devolve { alvo, limpar } — `limpar` diz se o conteúdo que
   * já está ali pode ser apagado.
   *
   * Apagar só acontece onde alguém apontou de propósito (data-alvo ou uma div
   * com id="estoque-mypremium"). Num lugar adivinhado, o script acrescenta sem
   * remover: os carros de exemplo do site continuam lá, o que é visível e
   * reversível — ao contrário de apagar a seção errada de alguém.
   */
  function acharContainer() {
    var pedido = tag && tag.getAttribute("data-alvo");
    if (pedido) {
      var explicito = document.querySelector(pedido);
      if (explicito) return { alvo: explicito, limpar: true, junto: false };
      aviso("não encontrei nada com o seletor " + pedido + " nesta página.");
      return null;
    }

    for (var i = 0; i < IDS.length; i++) {
      var secao = document.getElementById(IDS[i]);
      if (!secao) continue;
      // O container dedicado é para isto; uma seção do site, não.
      if (IDS[i] === "estoque-mypremium") {
        return { alvo: secao, limpar: true, junto: false };
      }

      // Havendo uma grade de carros na seção, os novos entram nela. Pendurar
      // no fim da seção jogaria a lista para depois de botões e chamadas que
      // fecham o bloco — foi assim que virou um segundo bloco de carros.
      var grade = acharGrade(secao);
      if (grade) return { alvo: grade, limpar: false, junto: true };

      var dentro = document.createElement("div");
      dentro.className = "mp-grade-wrap";
      secao.appendChild(dentro);
      return { alvo: dentro, limpar: false, junto: false };
    }

    var porTexto = porTitulo();
    if (porTexto) return porTexto;

    aviso(
      "não achei onde colocar os carros. Crie uma div com " +
        'id="estoque-mypremium" onde eles devem aparecer, ou aponte o lugar ' +
        'com data-alvo="#seu-seletor" na tag do script.',
    );
    return null;
  }

  function aviso(mensagem) {
    console.warn("[estoque-mypremium] " + mensagem);
  }

  function estilo() {
    if (document.getElementById("mp-estilo")) return;
    var css = document.createElement("style");
    css.id = "mp-estilo";
    css.textContent = [
      ".mp-grade{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));max-width:1200px;margin:0 auto}",
      ".mp-card{display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px -16px rgba(0,0,0,.25);color:inherit;text-decoration:none}",
      ".mp-foto{position:relative;aspect-ratio:4/3;background:linear-gradient(135deg,#f4f4f5,#e4e4e7);overflow:hidden}",
      ".mp-foto img{width:100%;height:100%;object-fit:cover;display:block}",
      ".mp-foto__vazio{display:flex;align-items:center;justify-content:center;height:100%;font:500 10px/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#a1a1aa}",
      ".mp-ano{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.95);border-radius:999px;padding:4px 10px;font:600 12px system-ui,sans-serif;color:#18181b}",
      ".mp-selo{position:absolute;top:12px;right:12px;background:#DB2527;color:#fff;border-radius:999px;padding:4px 10px;font:700 10px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}",
      ".mp-corpo{display:flex;flex:1;flex-direction:column;gap:12px;padding:16px}",
      ".mp-titulo{margin:0;font:600 15px/1.35 system-ui,sans-serif;color:#18181b}",
      ".mp-ficha{margin:4px 0 0;font:400 13px system-ui,sans-serif;color:#71717a}",
      ".mp-rodape{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:4px 8px;margin-top:auto}",
      ".mp-preco{font:700 17px system-ui,sans-serif;color:#18181b}",
      ".mp-link{font:500 13px system-ui,sans-serif;color:#DB2527;white-space:nowrap}",
      ".mp-estado{text-align:center;font:400 14px system-ui,sans-serif;color:#71717a;padding:24px}",
    ].join("");
    document.head.appendChild(css);
  }

  var destino = acharContainer();
  if (!destino) return;

  if (destino.limpar) destino.alvo.textContent = "";
  estilo();

  // Entrando numa grade que já existe, os cards viram filhos diretos dela —
  // é o que os faz cair nas mesmas colunas, ao lado dos carros do site. Uma
  // div envolvendo-os viraria um único item da grade, e o bloco inteiro
  // ocuparia a largura de um card só.
  var container = null;
  if (!destino.junto) {
    // Nos demais casos o script escreve dentro de uma div própria, para que
    // "limpar a tela para redesenhar" nunca alcance conteúdo do site.
    container = document.createElement("div");
    container.className = "mp-raiz";
    destino.alvo.appendChild(container);
  }

  var dadosLoja = null;

  function texto(valor) {
    // Tudo que vem da API entra como texto, nunca como HTML: o nome de um
    // carro com "<" não pode virar marcação nesta página.
    return document.createTextNode(valor == null ? "" : String(valor));
  }

  function elemento(tag, classe, conteudo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo !== undefined) el.appendChild(texto(conteudo));
    return el;
  }

  function estado(mensagem) {
    // Numa grade compartilhada não há onde escrever um recado sem empurrar os
    // carros do site; ali o silêncio é a resposta certa, e o motivo vai para
    // o console.
    if (!container) return;
    container.textContent = "";
    container.appendChild(elemento("p", "mp-estado", mensagem));
  }

  function zapHref(veiculo) {
    if (!dadosLoja || !dadosLoja.whatsapp) return null;
    var numero = String(dadosLoja.whatsapp).replace(/\D/g, "");
    if (numero.length <= 11) numero = "55" + numero;
    return (
      "https://wa.me/" +
      numero +
      "?text=" +
      encodeURIComponent(
        "Olá! Tenho interesse no " + veiculo.titulo + " (" + veiculo.preco + ")",
      )
    );
  }

  function montarCard(veiculo) {
    var href = zapHref(veiculo);
    var card = document.createElement(href ? "a" : "article");
    card.className = "mp-card";
    if (href) {
      card.href = href;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }

    var foto = elemento("div", "mp-foto");
    if (veiculo.fotoCapa) {
      var img = document.createElement("img");
      img.src = veiculo.fotoCapa;
      img.alt = veiculo.titulo;
      img.loading = "lazy";
      foto.appendChild(img);
    } else {
      foto.appendChild(elemento("div", "mp-foto__vazio", "Foto do veículo"));
    }
    if (veiculo.ano) foto.appendChild(elemento("span", "mp-ano", veiculo.ano));
    if (veiculo.blindado) {
      foto.appendChild(elemento("span", "mp-selo", "Blindado"));
    } else if (veiculo.reservado) {
      foto.appendChild(elemento("span", "mp-selo", "Reservado"));
    }
    card.appendChild(foto);

    var corpo = elemento("div", "mp-corpo");
    corpo.appendChild(elemento("h3", "mp-titulo", veiculo.titulo));

    var ficha = [veiculo.ano, veiculo.kmFormatado].filter(Boolean).join(" · ");
    corpo.appendChild(elemento("p", "mp-ficha", ficha));

    var rodape = elemento("div", "mp-rodape");
    rodape.appendChild(elemento("span", "mp-preco", veiculo.preco));
    if (href) rodape.appendChild(elemento("span", "mp-link", "Falar no WhatsApp ›"));
    corpo.appendChild(rodape);

    card.appendChild(corpo);
    return card;
  }

  estado("Carregando estoque…");

  var url =
    CONFIG.api +
    "?loja=" +
    encodeURIComponent(CONFIG.loja) +
    "&limite=" +
    encodeURIComponent(CONFIG.limite);

  fetch(url)
    .then(function (resposta) {
      if (!resposta.ok) throw new Error("HTTP " + resposta.status);
      return resposta.json();
    })
    .then(function (dados) {
      dadosLoja = dados.loja;

      if (!dados.veiculos || dados.veiculos.length === 0) {
        estado("Nenhum veículo disponível no momento.");
        return;
      }

      if (destino.junto) {
        // A limpeza acontece aqui, e não antes da busca, de propósito: o
        // estoque do site só sai de cena quando há estoque do CRM para pôr
        // no lugar. Uma queda do CRM ou uma internet ruim não podem esvaziar
        // a vitrine de ninguém.
        if (CONFIG.substituir) destino.alvo.textContent = "";

        dados.veiculos.forEach(function (veiculo) {
          destino.alvo.appendChild(montarCard(veiculo));
        });
        return;
      }

      var grade = elemento("div", "mp-grade");
      dados.veiculos.forEach(function (veiculo) {
        grade.appendChild(montarCard(veiculo));
      });

      container.textContent = "";
      container.appendChild(grade);
    })
    .catch(function (erro) {
      // Falhar calado deixaria um buraco na página sem explicação para quem
      // estivesse olhando — e nenhuma pista para quem fosse consertar.
      estado("Não foi possível carregar o estoque agora.");
      console.error("[estoque-mypremium]", erro, "API:", url);
    });
})();
