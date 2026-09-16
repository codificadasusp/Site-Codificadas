const Image = require("@11ty/eleventy-img");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");

module.exports = function (eleventyConfig) {
  // Copiamos só o que o site publicado referencia diretamente. As imagens de
  // blog/ e equipe/ NÃO são copiadas: elas são a fonte, e o build gera as
  // versões otimizadas em /img/ (ver plugin abaixo). Isso tira ~27 MB do
  // resultado final. Se criar uma imagem nova usada direto no CSS, coloque-a
  // em assets/img/logo/ ou acrescente o caminho aqui.
  eleventyConfig.addPassthroughCopy("assets/css");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/img/logo");
  eleventyConfig.addPassthroughCopy("assets/img/pattern-binario.svg");

  // Otimiza automaticamente toda tag <img> do HTML gerado (inclusive as que
  // vêm do Markdown dos posts): gera WebP + versões responsivas.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "auto"],
    widths: [400, 800, 1200],
    failOnError: false,
    // O conteúdo veio do WordPress quase todo em PNG, que é péssimo para
    // fotos. Não dá para converter tudo em JPEG porque parte das imagens usa
    // transparência de verdade (logo e ~67 imagens de posts), então o PNG de
    // fallback é comprimido com paleta — mantém a transparência e corta muito
    // o peso.
    sharpPngOptions: { compressionLevel: 9, palette: true, quality: 80 },
    sharpJpegOptions: { quality: 78, mozjpeg: true },
    sharpWebpOptions: { quality: 78 },
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
      // o conteúdo de texto tem no máximo 760px; abaixo disso a imagem
      // ocupa a largura da tela
      sizes: "(min-width: 800px) 760px, 100vw",
    },
  });

  const byDateDesc = (a, b) => b.date - a.date;

  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("content/posts/*.md").sort(byDateDesc)
  );

  // O blog tem duas frentes: o conteúdo editorial e o histórico das turmas.
  // O campo 'secao' no frontmatter de cada post decide onde ele entra.
  const daSecao = (api, secao) =>
    api
      .getFilteredByGlob("content/posts/*.md")
      .filter((p) => p.data.secao === secao)
      .sort(byDateDesc);

  eleventyConfig.addCollection("blogGeral", (api) => daSecao(api, "blog"));
  eleventyConfig.addCollection("edicoes", (api) => daSecao(api, "edicoes"));

  // 3 por seção na home: fecha exatamente uma linha do grid de 3 colunas
  eleventyConfig.addCollection("blogHome", (api) => daSecao(api, "blog").slice(0, 3));
  eleventyConfig.addCollection("edicoesHome", (api) => daSecao(api, "edicoes").slice(0, 3));

  // Os banners de post entram como background-image no CSS, então não passam
  // pelo transform de <img>. Este filtro gera a versão WebP otimizada e
  // devolve a URL dela.
  eleventyConfig.addAsyncFilter("bannerOtimizado", async (src) => {
    if (!src) return "";
    try {
      const metadata = await Image(`.${src}`, {
        widths: [1600],
        formats: ["webp"],
        outputDir: "./_site/img/",
        urlPath: "/img/",
      });
      return metadata.webp[0].url;
    } catch (err) {
      console.warn(`[banner] não consegui otimizar ${src}: ${err.message}`);
      return src;
    }
  });

  eleventyConfig.addFilter("dataBr", (value) => {
    if (!value) return "";
    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(dateObj);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
};
