# Caixa BBPT · v2

App (PWA) para fazer o check-in de cada torneio jogador a jogador e saber, sem contas à mão:

- quem pagou loja, liga/semanal, mensal de estádios e contribuição adicional;
- quem pagou por MBWAY, em numerário, quem ficou em dívida e quem é organizador e pagou "sem movimento";
- quanto há a pagar à loja e se alguém pôs dinheiro do próprio bolso;
- quem pagou por engano a outro organizador;
- o que cada organizador tem de enviar ao tesoureiro e o que o tesoureiro tem de depositar em cada conta;
- exatamente o que escrever no Excel (Budget Geral e Users/Estadios).

Funciona no iPhone e no Android, instala-se no ecrã principal e funciona sem internet. Os dados ficam no telemóvel.

## Como se usa num torneio

1. **Torneios › Novo torneio.** Escolhe o tipo (Liga Fénix Negra, Evento casual Fénix Negra, Liga Critical X, Evento casual Critical X), a data e quem organiza.
2. **Check-in.** Escreve o nome do jogador e toca nele (ou Enter). Entra com a loja e a liga/semanal marcadas. A mensal de estádios só vem marcada se ainda não pagou este mês. Se já pagou, aparece "Mensal ✓ out".
   - Toca nas partes para marcar ou desmarcar (ex.: contribuição adicional).
   - Escolhe MBWAY, Numerário ou Em dívida. Os organizadores têm também **Próprio**: pagam a sua parte sem haver movimento de dinheiro.
   - No botão ⋯ mudas os valores e **com quem ficou o dinheiro** (se pagou por engano a outro organizador).
   - Um jogador novo cria-se ali mesmo ("+ Novo jogador").
3. **Pagamentos › Registar pagamento à loja.** O valor vem preenchido e a app diz quanto numerário tens. Indica quanto saiu do numerário e quanto do próprio bolso. Aqui registas também envios entre organizadores, depósitos, despesas e receitas extra.
4. **Acertos.** Diz a cada pessoa o que tem de fazer ("Enviar 10 € a paparapas", "Depositar 26 € em BBPT Liga"). O botão Registar abre o movimento já preenchido.
5. **Excel.** Mostra linha a linha o valor antes, o que somar e o valor final, as linhas novas para a tabela Despesas, os jogadores a marcar na coluna do mês em Users/Estadios e os saldos que os cartões verdes devem mostrar. Depois de preencheres, toca em **Marcar como lançado no Excel**. Se o torneio for alterado depois, a app avisa e mostra o que corrigir.
6. **Relatório.** Mensagem pronta para o Discord (com ou sem lista de jogadores) e exportações em CSV.

## Regras de contas

Para cada pessoa, a app calcula o dinheiro da org que ainda está com ela:

```
recebido (MBWAY + numerário + inscrição própria) + recebido de outros
− enviado − pago à loja/despesas − depositado + reembolsado
```

- Positivo: tem de entregar (ou, se for o tesoureiro, depositar).
- Negativo: a org deve-lhe esse valor.

Quem paga a loja com dinheiro seu não precisa de descontar nada à mão: o pagamento sai por inteiro e o desconto acontece sozinho. O campo "do próprio bolso" serve para o registo e para a app avisar quando não bate com o numerário.

Em **Resumo › Contas bancárias** a app compara banco + dinheiro com pessoas com o Excel. Se sobrar valor "por explicar", há dinheiro que não foi registado na app ou um erro no Excel.

## Configurar (Mais)

- **Tesoureiro:** quem recebe o dinheiro no fim (paparapas).
- **Tipos de torneio:** preços e para que linha do Excel vai cada parte. Uma parte com "Uma vez por mês" é a mensal.
- **Excel e contas:** valores base das linhas de receita, saldos dos cartões verdes, contas bancárias (saldo real e data), categorias de despesas e lojas.
- **Jogadores:** marca organizadores e meses de mensal pagos antes da app.

## Publicar no GitHub Pages (grátis)

1. Cria uma conta em github.com.
2. **New repository** › nome `caixa-bbpt` › Public › Create.
3. **uploading an existing file** › arrasta tudo o que está na raiz do zip (`index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, pasta `icons`) › **Commit changes**.
4. **Settings › Pages** › Branch `main`, `/ (root)` › Save.
5. Passado um minuto: `https://<o-teu-utilizador>.github.io/caixa-bbpt/`.

Instalar: no iPhone, Safari › Partilhar › Adicionar ao ecrã principal. No Android, Chrome › ⋮ › Instalar app.

Para atualizar, substitui os ficheiros e muda `VERSION` no topo do `sw.js`. Os dados de quem já usa a app mantêm-se.

## Ligar ao Google Sheets (recomendado)

Com a ligação, todos os organizadores veem os mesmos torneios em tempo real. A lista de jogadores, os meses pagos e os saldos vêm do ficheiro de Finanças, e a app escreve o check-in no Sheets por ti.

### 1. Instalar o script no ficheiro (uma vez)
1. Abre o ficheiro no Google Sheets (primeiro a cópia `_sandbox`).
2. **Extensões › Apps Script**. Apaga o que lá estiver e cola o conteúdo de `apps-script/Code.gs`.
3. No topo, muda as duas chaves:
   - `ORG_KEY`: para organizadores (lêem e escrevem);
   - `READ_KEY`: para quem só pode ver (ex.: jogadores).
   Usa frases difíceis de adivinhar, por exemplo `fenix-negra-2026-x7k2`.
4. Guarda (ícone da disquete). Para confirmar, escolhe a função `testarLeitura` e carrega em **Executar**: o registo mostra os jogadores, as linhas do Budget, os saldos e as semanas de cada aba.
5. **Implementar › Nova implementação** › engrenagem › **Aplicação Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. **Implementar**, autoriza com a tua conta Google e copia o **URL da aplicação Web** (termina em `/exec`).

### 2. Ligar a app
Na app: **Mais › Google Sheets** › cola o URL e a chave › **Ligar**. Depois, em **Copiar link de ligação**, tens um link que já abre a app ligada. Envia-o só a organizadores.

### 3. O que o script escreve
- Caixas da semana na aba da competição (Pagamento loja / Pagamento liga) e a data no título da semana.
- Caixas do mês em Users/Estadios e valores em "Contribuição adicional".
- Nomes novos nas linhas vazias da USER LIST.
- Linhas novas na tabela Despesas e somas em linhas de receita que não são fórmulas (ex.: Income Misc).
- Uma aba escondida "App Caixa" com os dados da app.

Nunca escreve por cima de uma fórmula. Depois de escrever, relê os saldos e a app mostra ✓ ou ✗ para cada valor.

Quem está "em dívida" não é marcado. Quando pagar, muda-o na app e volta a escrever: só vai a diferença.

### Mudar da sandbox para o ficheiro real
Repete o passo 1 no ficheiro real (com chaves novas) e, na app, **Desligar** e **Ligar** com o URL novo. Antes disso, apaga na app os torneios de teste.

Se mudares o script, faz **Implementar › Gerir implementações › editar › Versão: nova**, para o URL continuar o mesmo.

## Partilhar entre organizadores (sem ligação)

Cada telemóvel tem os seus dados. Quem organizou abre o torneio › Relatório › **Enviar torneio a outro organizador**. O tesoureiro abre Mais › Dados › Importar › **Juntar aos meus dados**. Os jogadores com o mesmo nome juntam-se. Importar outra vez o mesmo torneio atualiza-o.

## Código (pasta codigo-fonte)

- `src/core.js`: lógica de contas, sem interface (testável com Node).
- `src/ui.js`: ecrãs e formulários.
- `src/app.css`: estilo.
- `build.py`: gera `dist/` (Python 3 + Pillow). `python3 build.py`.
