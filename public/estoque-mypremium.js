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
  };

  /**
   * Descobre onde inserir a lista.
   *
   * O HTML do site pode não ter sido preparado para isto, então a busca vai
   * do mais explícito ao mais genérico: o container pedido, uma seção que
   * pareça ser a de estoque e, em último caso, uma seção nova no fim da
   * página. O último caso é um palpite — mas um palpite visível é melhor do
   * que nada renderizado e nenhuma pista do motivo.
   */
  function acharContainer() {
    var explicito = document.querySelector(CONFIG.alvo);
    if (explicito) return explicito;

    var candidatos = [
      "estoque",
      "carros",
      "veiculos",
      "veículos",
      "inventario",
      "nossos-carros",
    ];
    for (var i = 0; i < candidatos.length; i++) {
      var secao = document.getElementById(candidatos[i]);
      if (secao) {
        var alvo = document.createElement("div");
        alvo.className = "mp-grade-wrap";
        secao.appendChild(alvo);
        return alvo;
      }
    }

    var novo = document.createElement("section");
    novo.id = "estoque-mypremium";
    novo.style.padding = "48px 16px";
    document.body.appendChild(novo);
    return novo;
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

  var container = acharContainer();
  if (!container) return;
  estilo();

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
