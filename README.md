# Site CodificADAs

Site estático do **CodificADAs**, projeto de extensão da USP que leva programação
para meninas do ensino médio. Construído com [Eleventy](https://www.11ty.dev/)
(11ty) a partir do conteúdo migrado do antigo site em WordPress.

## Rodando localmente

Requer [Node.js](https://nodejs.org/) 18 ou superior.

```bash
npm install
npm run serve
```

O site fica disponível em <http://localhost:8080> e recarrega sozinho a cada
alteração.

Para gerar a versão de produção em `_site/`:

```bash
npm run build
```

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.njk`, `o-projeto.njk`, `aprenda-a-programar.njk`, `ex-integrantes.njk` | Páginas principais |
| `blog/` | Índices do blog e das edições anteriores |
| `content/posts/` | Posts em Markdown (22 publicados) |
| `content/arquivadas/` | Conteúdo antigo do WordPress, fora do ar (12 arquivos) |
| `_includes/layouts/` | Layouts base, de página e de post |
| `_includes/partials/` | Navegação, rodapé e card de post |
| `_data/` | Dados do site: navegação, equipe e ex-integrantes |
| `assets/` | CSS, JavaScript e imagens-fonte |
| `Identidade Visual/` | Logos, paleta de cores e molduras do projeto |
| `scripts/migrate.js` | Migração única do WordPress, não faz parte do build |

`_site/` e `node_modules/` são gerados e não entram no repositório.

## Escrevendo um post

Crie um arquivo `.md` em `content/posts/` com este frontmatter:

```yaml
---
title: "Título do post"
date: "2026-03-15"
slug: "titulo-do-post"
secao: "blog"          # "blog" ou "edicoes"
categorias:
  - "Atividades"
imagem: "/assets/img/blog/nome-da-capa.png"
resumo: "Uma ou duas frases que aparecem no card do post."
---
```

O campo `secao` define onde o post aparece: `blog` manda para `/blog/` e
`edicoes` manda para `/blog/edicoes-anteriores/`. A home mostra os 3 mais
recentes de cada seção.

## Imagens

Não é preciso otimizar nada à mão. Toda tag `<img>` do HTML gerado passa pelo
`eleventy-img`, que produz WebP e versões responsivas de 400, 800 e 1200px.
Basta colocar o arquivo original em `assets/img/blog/` ou `assets/img/equipe/` e
referenciá-lo normalmente.

Imagens usadas direto no CSS são a exceção: essas precisam ficar em
`assets/img/logo/` ou ser adicionadas ao `addPassthroughCopy` do
[`.eleventy.js`](.eleventy.js).
