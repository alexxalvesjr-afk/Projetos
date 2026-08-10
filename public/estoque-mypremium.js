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

  // Casa com "Estoque", "Nossos carros", "Destaques do estoque", "Encontre
  // seu carro", "Seminovos" — a frase que o visitante lê para achar os
  // carros, que varia de site para site mas gira em torno das mesmas
  // palavras. O limite de tamanho lá embaixo é o que separa um título de um
  // parágrafo que por acaso menciona carros.
  var TITULO = /(estoque|carro|ve[íi]culo|seminovo)/i;

  function titulosDeEstoque() {
    var achados = [];
    var titulos = document.querySelectorAll("h1,h2,h3");
    for (var i = 0; i < titulos.length; i++) {
      var texto = (titulos[i].textContent || "").trim();
      // Um título curto: "Estoque" casa, um parágrafo que menciona estoque não.
      if (texto.length > 40 || !TITULO.test(texto)) continue;
      achados.push(titulos[i]);
    }
    return achados;
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
   * O lugar certo, quando ele é inequívoco.
   *
   * "Inequívoco" é um container que alguém apontou de propósito, ou uma grade
   * de cards que já existe. Só isso — nada de deduzir um ponto de inserção a
   * partir de um título solto, que é o trabalho de `destinoAproximado`.
   *
   * A separação existe porque a página de estoque de um site costuma montar a
   * lista por JavaScript, milissegundos depois deste script rodar. Quem
   * aceita o primeiro palpite disponível acaba desenhando um bloco à parte
   * antes de a grade de verdade sequer existir.
   */
  function destinoCerto() {
    var pedido = tag && tag.getAttribute("data-alvo");
    if (pedido) {
      var explicito = document.querySelector(pedido);
      return explicito ? { alvo: explicito, limpar: true, junto: false } : null;
    }

    var dedicado = document.getElementById("estoque-mypremium");
    if (dedicado) return { alvo: dedicado, limpar: true, junto: false };

    for (var i = 0; i < IDS.length; i++) {
      var secao = document.getElementById(IDS[i]);
      var grade = secao && acharGrade(secao);
      if (grade) return { alvo: grade, limpar: false, junto: true };
    }

    var titulos = titulosDeEstoque();
    for (var j = 0; j < titulos.length; j++) {
      var area = titulos[j].closest("section, main") || document.body;
      var gradeDoTitulo = acharGrade(area);
      if (gradeDoTitulo) return { alvo: gradeDoTitulo, limpar: false, junto: true };
    }

    return null;
  }

  /**
   * O plano B, usado só quando a espera pela grade termina sem grade.
   *
   * Aqui o script acrescenta sem remover nada: é um palpite, e palpite não
   * apaga conteúdo de ninguém.
   */
  function destinoAproximado() {
    for (var i = 0; i < IDS.length; i++) {
      var secao = document.getElementById(IDS[i]);
      if (!secao) continue;
      var dentro = document.createElement("div");
      dentro.className = "mp-grade-wrap";
      secao.appendChild(dentro);
      return { alvo: dentro, limpar: false, junto: false };
    }

    var titulos = titulosDeEstoque();
    if (titulos.length > 0) {
      var alvo = document.createElement("div");
      alvo.className = "mp-grade-wrap";
      titulos[0].insertAdjacentElement("afterend", alvo);
      return { alvo: alvo, limpar: false, junto: false };
    }

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

  estilo();

  // O destino não é resolvido agora: numa página com filtros, a lista de
  // carros é montada pelo próprio site depois deste script rodar, e procurar
  // cedo demais não acharia grade nenhuma. Ver `montar()` no fim do arquivo.
  var destino = null;
  var container = null;

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
    if (!container || !container.isConnected) return;
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

  var url =
    CONFIG.api +
    "?loja=" +
    encodeURIComponent(CONFIG.loja) +
    "&limite=" +
    encodeURIComponent(CONFIG.limite);

  /** Veículos já baixados; `null` enquanto a busca não terminou. */
  var veiculos = null;

  /** Desenha os carros no destino, escolhendo o modo pelo tipo de destino. */
  function desenhar() {
    if (destino.junto) {
      // A limpeza acontece aqui, e não antes da busca, de propósito: o
      // estoque do site só sai de cena quando há estoque do CRM para pôr no
      // lugar. Uma queda do CRM ou uma internet ruim não podem esvaziar a
      // vitrine de ninguém.
      if (CONFIG.substituir) destino.alvo.textContent = "";

      veiculos.forEach(function (veiculo) {
        destino.alvo.appendChild(montarCard(veiculo));
      });
      return;
    }

    if (!container || !container.isConnected) {
      container = document.createElement("div");
      container.className = "mp-raiz";
      destino.alvo.appendChild(container);
    }

    var grade = elemento("div", "mp-grade");
    veiculos.forEach(function (veiculo) {
      grade.appendChild(montarCard(veiculo));
    });

    container.textContent = "";
    container.appendChild(grade);
  }

  /**
   * Coloca os carros na página, se houver onde.
   *
   * Reaproveita o destino da vez anterior enquanto ele continuar na página:
   * procurar de novo poderia escolher outro lugar e espalhar os carros em
   * dois pontos.
   */
  function montar(procurar) {
    if (!veiculos) return false;

    if (!destino || !destino.alvo.isConnected) {
      destino = procurar();
      if (!destino) return false;
      if (destino.limpar) destino.alvo.textContent = "";
      container = null;
    }

    desenhar();
    return true;
  }

  /** Há conteúdo do site onde deveria haver só estoque do CRM? */
  function precisaRedesenhar() {
    if (!destino || !destino.alvo.isConnected) return true;
    if (!document.querySelector(".mp-card")) return true;

    if (destino.junto && CONFIG.substituir) {
      var filhos = destino.alvo.children;
      for (var i = 0; i < filhos.length; i++) {
        if (!filhos[i].classList.contains("mp-card")) return true;
      }
    }

    return false;
  }

  /**
   * Espera a página terminar de se montar, e continua de olho depois.
   *
   * Numa página de estoque com filtros, a lista de carros é desenhada pelo
   * JavaScript do próprio site — às vezes bem depois deste script rodar. Quem
   * procura a grade uma vez só, no carregamento, não acha nada e recorre ao
   * plano B, desenhando um bloco à parte acima da lista de verdade; foi o que
   * aconteceu na página /estoque de um site real.
   *
   * Por isso a espera: por alguns segundos só o destino certo serve. Esgotado
   * o prazo sem grade nenhuma, aí sim vale o palpite. E a mesma vigilância
   * cobre o caso inverso — o site redesenhar a lista depois e levar junto os
   * cards do CRM.
   */
  function acompanhar() {
    if (typeof MutationObserver !== "function") {
      if (!montar(destinoCerto)) montar(destinoAproximado);
      return;
    }

    var ESPERA_PELA_GRADE = 4000;
    var JANELA = 20000;
    var LIMITE = 10;
    var aplicacoes = 0;
    var agendado = null;
    var prazoDoPlanoB = null;

    var observador = new MutationObserver(function () {
      if (agendado) return;
      // Espera a rajada de alterações do site terminar antes de reagir; sem
      // isso, cada nó inserido dispararia uma tentativa.
      agendado = setTimeout(revisar, 250);
    });

    function revisar() {
      agendado = null;
      if (aplicacoes >= LIMITE) return encerrar();
      // Esta checagem é o que impede as próprias inserções de realimentarem o
      // observador num laço.
      if (!precisaRedesenhar()) return;
      if (montar(destinoCerto)) aplicacoes++;
    }

    function encerrar() {
      observador.disconnect();
      if (agendado) clearTimeout(agendado);
      if (prazoDoPlanoB) clearTimeout(prazoDoPlanoB);
      if (!document.querySelector(".mp-card")) {
        aviso(
          "não achei onde colocar os carros nesta página. Crie uma div com " +
            'id="estoque-mypremium" onde eles devem aparecer, ou aponte o ' +
            'lugar com data-alvo="#seu-seletor" na tag do script.',
        );
      }
    }

    observador.observe(document.body, { childList: true, subtree: true });

    prazoDoPlanoB = setTimeout(function () {
      if (!document.querySelector(".mp-card")) montar(destinoAproximado);
    }, ESPERA_PELA_GRADE);

    setTimeout(encerrar, JANELA);
  }

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

      veiculos = dados.veiculos;
      montar(destinoCerto);
      acompanhar();
    })
    .catch(function (erro) {
      // Falhar calado deixaria um buraco na página sem explicação para quem
      // estivesse olhando — e nenhuma pista para quem fosse consertar.
      estado("Não foi possível carregar o estoque agora.");
      console.error("[estoque-mypremium]", erro, "API:", url);
    });
})();
