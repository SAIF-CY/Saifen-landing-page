# OBRIGADO — Cortes e frequências

Site estático de **SAIFEN SECURITY** (サイフェン) — presença invisível, lâmina
invisível. Roda em `localhost` sem framework: HTML + Tailwind v4 (compilado
para CSS) + um servidor Node de 60 linhas.

## Rodar

```bash
npm start                 # escuta em 0.0.0.0:4173 (esta máquina + celular na mesma wifi)
npm run start:local       # só nesta máquina (127.0.0.1)
PORT=8080 npm start       # outra porta
```

Ao subir, o servidor imprime os URLs:

```
  neste computador   http://localhost:4173
  na rede (celular)  http://192.168.15.6:4173
```

**Acesso pelo celular** (mesma wifi): abra o URL "na rede" no navegador do
celular, ou escaneie `acesso-lan.png`. Se o IP mudar (DHCP do roteador),
descubra o novo com `ip -4 -o addr show scope global` e regere o QR:

```bash
python3 -m venv /tmp/qrvenv && /tmp/qrvenv/bin/pip install qrcode pillow
/tmp/qrvenv/bin/python -c "import qrcode; qrcode.make('http://<IP>:4173').save('acesso-lan.png')"
```

Se o celular não conectar, o bloqueio é firewall: libere a porta com
`sudo ufw allow 4173/tcp`.

## Desenvolver (recompila o CSS ao salvar `index.html`)

```bash
npm run dev               # tailwind --watch + servidor
npm run build             # build único do CSS
```

## Estrutura

```
index.html                     página (markup preservado do original)
src/input.css                  fonte do Tailwind v4 + tokens de design
assets/styles-B71o8YZb.css     CSS compilado (não editar à mão)
assets/*.jpg                   imagens (nomes preservados do original)
favicon.ico                    favicon gerado
server.mjs                     servidor estático
tools/shot.mjs                 screenshot headless via CDP (dev)
CREDITS.md                     créditos e licenças das imagens
```

## Caminhos

Tudo no `index.html` usa caminho **relativo** (`assets/…`), então a página abre
tanto pelo servidor (`http://localhost:4173`) quanto direto do disco, com duplo
clique no `index.html` (`file://`).

## Portas

| Projeto | Pasta | Dev | Preview/servidor |
| --- | --- | --- | --- |
| Landing SAIFEN SECURITY | `~/Documentos/Projeto Padrão` | — | 4173 (`npm start`) |
| App React/Vite SAIFEN | `~/Documentos/teste-saif` | 5173 (`npm run dev`) | 4174 (`npm run preview`) |

## Segurança do servidor

Como o servidor escuta em `0.0.0.0` (acesso pelo celular na mesma wifi), ele
recusa `node_modules`, `.git`, `.env*`, `package-lock.json` e o próprio
`server.mjs` com 403.

## Detalhes que valem saber

- **Cores/fontes** vivem em `@theme` (`src/input.css`): fundo `#05070b`,
  acento **e** sinal em `#ffcb00` (amarelo — antes eram vermelho `#e0361f` e
  azul `#1c3fae`), foco `#ffcb00`, texto sobre o bloco amarelo em `#0a0a0a`;
  display `Bebas Neue`, mono `Space Mono`, texto `Barlow`. Para trocar a cor,
  mexer em `--color-accent` / `--color-signal` é suficiente: todo o resto usa
  esses tokens.
- **Componentes** (`intro-*`, `nav-link`, `dotted-field`, `image-screen`,
  `act-*`) são classes próprias escritas no `@layer components`; o resto são
  utilitários do Tailwind no markup.
- **Revelação no scroll**: o script inline adiciona `js-reveal` no `<html>` e
  observa `[data-reveal]`. Sem JS, tudo aparece (nada fica invisível).
- `prefers-reduced-motion` desliga as animações.
- O `intro-reveal` e o `ato-consenso` saíram da arte de referência do próprio
  template (o texto embutido na arte foi removido por inpainting).
  As outras quatro vêm do Wikimedia Commons — ver `CREDITS.md`.
- Para trocar uma imagem, sobrescreva o arquivo com o mesmo nome e a mesma
  proporção (exatos px: intro 1254×1254, fig01 1254×1254, hero 1920×1008,
  atos 1024×1024).
- O cartaz do intro é **centralizado e responsivo**: `.intro-media` é uma caixa
  `absolute inset-0` com flex centering, e a imagem usa `object-fit: contain`
  com `max-height: 82svh` — então nunca é cortada nem distorcida, encolhe até
  caber na viewport e acompanha a largura em telas estreitas. Para mudar o
  tamanho máximo, ajuste o `max-height` em `src/input.css`.
