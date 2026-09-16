(function () {
  var alvo = document.querySelector("[data-scramble]");
  if (!alvo) return;

  var textoFinal = alvo.getAttribute("data-scramble") || alvo.textContent.trim();
  var destaque = "ADA";
  var caracteres = "01<>{}[]/\\#%&*+=;:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var inicioAda = textoFinal.indexOf(destaque);

  alvo.setAttribute("aria-hidden", "true");
  alvo.innerHTML = "";

  var letras = textoFinal.split("").map(function (char, i) {
    var span = document.createElement("span");
    span.className = "hero-letter";
    span.textContent = char;
    if (inicioAda !== -1 && i >= inicioAda && i < inicioAda + destaque.length) {
      span.dataset.ada = "true";
    }
    alvo.appendChild(span);
    return span;
  });

  // cursor de terminal piscando ao final do nome
  var cursor = document.createElement("span");
  cursor.className = "hero-cursor";
  cursor.setAttribute("aria-hidden", "true");
  alvo.appendChild(cursor);

  function pintarAda() {
    letras.forEach(function (span) {
      if (span.dataset.ada) span.classList.add("is-ada");
    });
  }

  if (reduzirMovimento) {
    pintarAda();
    alvo.classList.add("terminou");
    return;
  }

  var DURACAO_EMBARALHO = 900; // quanto tempo cada letra fica girando
  var PASSO_ENTRE_LETRAS = 110; // atraso de uma letra para a próxima
  var TROCA_CARACTERE = 55; // velocidade da troca de caracteres

  letras.forEach(function (span, i) {
    var original = textoFinal[i];
    if (original === " ") return;

    var atraso = i * PASSO_ENTRE_LETRAS;
    var inicio = null;
    var ultimaTroca = 0;
    var assentou = false;

    function assentar() {
      if (assentou) return;
      assentou = true;
      span.textContent = original;
      span.classList.remove("embaralhando");
      span.classList.add("assentou");
      if (span.dataset.ada) span.classList.add("is-ada");
      if (i === letras.length - 1) alvo.classList.add("terminou");
    }

    setTimeout(function () {
      // só marca como embaralhando quando a animação realmente começa
      span.classList.add("embaralhando");

      function quadro(agora) {
        if (assentou) return;
        if (inicio === null) inicio = agora;
        var decorrido = agora - inicio;

        if (decorrido < DURACAO_EMBARALHO) {
          // desacelera a troca conforme se aproxima de assentar
          var progresso = decorrido / DURACAO_EMBARALHO;
          var intervalo = TROCA_CARACTERE + progresso * progresso * 260;
          if (agora - ultimaTroca >= intervalo) {
            span.textContent = caracteres[Math.floor(Math.random() * caracteres.length)];
            ultimaTroca = agora;
          }
          requestAnimationFrame(quadro);
        } else {
          assentar();
        }
      }
      requestAnimationFrame(quadro);

      // rede de segurança: em aba de segundo plano o requestAnimationFrame
      // congela e a letra ficaria presa no meio da animação
      setTimeout(assentar, DURACAO_EMBARALHO + 400);
    }, atraso);
  });
})();
