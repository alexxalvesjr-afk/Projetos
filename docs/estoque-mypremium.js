/**
 * Estoque Mypremium — carrega os carros do CRM neste site.
 *
 * Este arquivo é para o site da revenda hospedado FORA do CRM (o que está na
 * Netlify). Ele busca o estoque no navegador, então não precisa de build, de
 * repositório nem de reenviar arquivos quando um carro muda: quem publica é o
 * CRM, e a página lê o resultado a cada visita.
 *
 * COMO USAR
 * ---------
 * 1. Coloque este arquivo junto do seu index.html.
 * 2. No HTML, crie o lugar onde os carros vão aparecer:
 *
 *        <div id="estoque-mypremium"></div>
 *
 * 3. Antes de </body>, carregue o script:
 *
 *        <script src="estoque-mypremium.js" defer></script>
 *
 * 4. Reenvie a pasta para a Netlify (arraste de novo, como você já fez).
 *
 * Só precisa fazer isso uma vez. Depois disso, carro cadastrado no CRM aparece
 * aqui sozinho, e carro vendido some — sem mexer no site de novo.
 */

(function () {
  "use strict";

  var CONFIG = {
    // Endereço do CRM. Troque se você apontar um domínio próprio para ele.
    api: "https://projetos-fawn-two.vercel.app/api/publico/veiculos",
    loja: "mypremium-motors",
    // Onde os cards serão inseridos.
    seletor: "#estoque-mypremium",
    // Quantos carros mostrar. A API devolve no máximo 200.
    limite: 60,
  };

  var container = document.querySelector(CONFIG.seletor);
  if (!container) return;

  // Preenchido pela resposta; montarCard() lê o WhatsApp da loja daqui.
  var dadosLoja = null;

  function texto(valor) {
    // Tudo que vem da API é tratado como texto, nunca como HTML. Um nome de
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

  function montarCard(veiculo) {
    var card = document.createElement("article");
    card.className = "mp-card" + (veiculo.destaque ? " mp-card--destaque" : "");

    if (veiculo.fotoCapa) {
      var figura = elemento("div", "mp-card__foto");
      var img = document.createElement("img");
      img.src = veiculo.fotoCapa;
      img.alt = veiculo.titulo;
      img.loading = "lazy";
      figura.appendChild(img);
      if (veiculo.reservado) {
        figura.appendChild(elemento("span", "mp-selo", "Reservado"));
      }
      card.appendChild(figura);
    }

    var corpo = elemento("div", "mp-card__corpo");
    corpo.appendChild(elemento("h3", "mp-card__titulo", veiculo.titulo));

    var ficha = [veiculo.ano, veiculo.kmFormatado, veiculo.cambio, veiculo.cor]
      .filter(Boolean)
      .join(" · ");
    corpo.appendChild(elemento("p", "mp-card__ficha", ficha));
    corpo.appendChild(elemento("p", "mp-card__preco", veiculo.preco));

    // Fala com a loja já sabendo de qual carro se trata.
    if (dadosLoja && dadosLoja.whatsapp) {
      var numero = String(dadosLoja.whatsapp).replace(/\D/g, "");
      if (numero.length <= 11) numero = "55" + numero;
      var zap = document.createElement("a");
      zap.className = "mp-card__zap";
      zap.href =
        "https://wa.me/" +
        numero +
        "?text=" +
        encodeURIComponent(
          "Olá! Tenho interesse no " + veiculo.titulo + " (" + veiculo.preco + ")",
        );
      zap.target = "_blank";
      zap.rel = "noopener noreferrer";
      zap.appendChild(texto("Falar no WhatsApp"));
      corpo.appendChild(zap);
    }

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
      // Falhar em silêncio deixaria um buraco na página sem explicação.
      estado("Não foi possível carregar o estoque agora.");
      console.error("[estoque-mypremium]", erro);
    });
})();
