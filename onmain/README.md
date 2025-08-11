# Ollama Chat Game (exemplo)

Projeto exemplo: um app web (single-page) com criação de salas, chat por turnos, avatar/expressões editáveis e backgrounds client-side. O servidor pode proxyar chamadas para um servidor Ollama local ou remoto para permitir *bots IA* que falam durante seus turnos.

**AVISO IMPORTANTE:** Não vou ajudar a obter ou usar modelos projetados para deliberadamente contornar filtros de segurança ou para produzir conteúdo ilegal. O projeto permite configurar qual modelo usar (variável `OLLAMA_MODEL`), **mas use sempre modelos e prompts de forma responsável**.

## O que tem aqui
- `server.js` — backend (Express + Socket.IO) que serve os ficheiros estáticos e gerencia salas/turnos; também faz proxy para Ollama para gerar respostas de bots.
- `public/index.html` + `public/client.js` — frontend simples que permite criar/join salas, editar avatar/expressão/background, criar bots e participar em chat por turnos.
- `.env.example` — configurações.

## Requisitos
- Node.js 18+ (ou compatível)
- Opcional: Ollama rodando localmente (padrão `http://localhost:11434`) — quando estiver ativo, o servidor pode criar bots que chamam a API de geração do Ollama. Documentação do Ollama indica que o serviço padrão escuta em `11434` e que você deve iniciar com `ollama serve`. citeturn0search0turn0search6

## Rodando no GitHub Codespaces
1. Crie um repo com esses arquivos e abra um Codespace.  
2. Abra o terminal do Codespace e rode:
   ```bash
   npm install
   npm start
   ```
3. Quando o app iniciar em `PORT` (padrão `3000`), o Codespaces detecta e encaminha a porta — você pode usar a aba **PORTS** para abrir o link público. Veja docs do Codespaces sobre forwarding de portas. citeturn0search13turn0search1

**Nota:** Ollama tipicamente roda localmente na máquina onde está instalado (porta 11434). Se Ollama não estiver no mesmo Codespace você deve:
- Rodar Ollama na sua máquina local e apontar `OLLAMA_BASE_URL` para o endereço acessível ao servidor (ou fazer um proxy reverso), ou
- Fazer o Codespace alcançar uma instância Ollama acessível na rede (configurar `OLLAMA_BASE_URL` adequadamente). Documentação oficial do Ollama descreve o endpoint `/api/generate` e que o servidor padrão é `http://localhost:11434`. citeturn0search6turn0search0

## Arquivos principais (resumo)
- `server.js` — gerencia salas, turnos, bots e faz POST para `OLLAMA_BASE_URL/api/generate`.
- `public/index.html` — interface com editor de personagem (avatar upload → dataURL), escolha de expressão, upload de background (client-side), criação de salas, botão de "criar bot" (bot chama Ollama quando for seu turno).
- `README.md` — este arquivo.

## Segurança / responsabilidade
- NÃO use modelos ou prompts para produzir material ilegal, que incentive violência, abuso, ou para quebrar regras de conteúdo.
- Se vai rodar Ollama em um Codespace público, tenha cuidado com exposição de portas e modelos sensíveis. Para produção, recomendo colocar um proxy reverso com autenticação.

