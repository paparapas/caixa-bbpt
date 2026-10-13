# Caixa BBPT

App (PWA) para controlar o dinheiro de cada torneio: quem pagou, por que via, quanto foi para a loja, para a liga e para os estádios, quem pôs dinheiro do próprio bolso, quem passou dinheiro a outro organizador e quanto falta entregar ao tesoureiro.

Funciona no iPhone e no Android, instala-se no ecrã principal e funciona offline. Os dados ficam no telemóvel de cada pessoa.

## Como funciona a conta

Para cada pessoa, a app calcula quanto dinheiro da org ainda está com ela:

```
recebido + recebido de outros − enviado − pago − depositado + reembolsado
```

- **Positivo:** tem de entregar esse valor ao tesoureiro (ou, se for o tesoureiro, mover para as contas da org).
- **Negativo:** a org deve-lhe esse valor (pôs dinheiro do próprio bolso).

Quem paga a loja com dinheiro seu não precisa de "descontar" nada à mão: o pagamento sai por inteiro e o desconto acontece sozinho. O campo "do próprio bolso" serve para o registo e para a app avisar quando não bate com o físico (ex.: "pôs 10 € do bolso mas ainda devia ter 3 € em físico").

Para cada fundo interno (Liga, Estádios):

- **Saldo** = saldo inicial + receitas − despesas (é o valor do Excel).
- **Deve estar no banco** = saldo inicial + depósitos − saídas da conta (compara com a app do banco).
- **Com pessoas** = a diferença (dinheiro ainda por depositar).

A verificação no Resumo confirma que o dinheiro com pessoas é igual ao que falta chegar aos fundos mais o que falta pagar à loja.

## Publicar no GitHub Pages (grátis)

1. Cria uma conta em github.com (se ainda não tiveres).
2. Carrega em **New repository**, dá o nome `caixa-bbpt`, deixa **Public** e cria.
3. Na página do repositório, carrega em **uploading an existing file** e arrasta **todos os ficheiros que estão na raiz do zip** (`index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, a pasta `icons`). A pasta `codigo-fonte` é opcional.
4. Carrega em **Commit changes**.
5. Vai a **Settings › Pages**. Em "Branch" escolhe `main` e `/ (root)` e guarda.
6. Passado um minuto, a app fica em `https://<o-teu-utilizador>.github.io/caixa-bbpt/`.

### Instalar no telemóvel

- **iPhone:** abre o link no Safari › Partilhar › Adicionar ao ecrã principal.
- **Android:** abre no Chrome › menu ⋮ › Instalar app.

### Atualizar a app

Substitui os ficheiros no GitHub. Para os telemóveis apanharem a nova versão de imediato, muda `VERSION` no topo do `sw.js` (ex.: `caixa-bbpt-1.0.1`). Os dados de quem já usa a app não se perdem.

## Partilhar entre organizadores

Cada telemóvel tem os seus dados. Para juntar:

1. Quem organizou abre o torneio › **Relatório** › **Enviar torneio a outro organizador** e manda o ficheiro (WhatsApp, Discord, email).
2. O tesoureiro abre **Mais › Dados › Importar**, escolhe o ficheiro e carrega em **Juntar aos meus dados**.

Pessoas e fundos com o mesmo nome são reconhecidos como os mesmos. Importar o mesmo torneio duas vezes atualiza-o em vez de o duplicar.

Faz de vez em quando uma **Cópia de segurança (JSON)** em Mais › Dados.

## Ligação ao Excel / Google Sheets

- **Torneio › Relatório › Para o Excel:** valores a somar a cada linha das receitas (ex.: "Contribuições Mensais +12,00") e linhas prontas a colar na tabela Despesas (Descrição, Data, Categoria, Nota, Valor). O botão "Copiar" copia com tabs, por isso ao colar no Sheets cada valor vai para a sua coluna.
- **Mais › Excel:** o mesmo para todos os torneios desde uma data, e os saldos que o Excel deve mostrar.
- **CSV:** lançamentos completos (com `;` e vírgula decimal por defeito, como o Excel em português espera) e lista de inscrições por torneio.

Em cada parte da inscrição (ex.: "Contribuição estádios") podes definir o nome exato da linha do teu Excel em **Editar torneio › Linha no Excel**.

## Continuar no Claude Code

A pasta `codigo-fonte` tem o código:

- `src/core.js`: toda a lógica de contas, sem interface (dá para testar com Node).
- `src/ui.js`: ecrãs e formulários.
- `src/app.css`: estilo.
- `build.py`: junta tudo em `dist/` (precisa de Python 3 e Pillow para os ícones).

Para gerar outra vez: `cd codigo-fonte && python3 build.py`. O resultado fica em `codigo-fonte/dist/`.

Ideias para próximas versões: sincronização na nuvem (ex.: Supabase) para todos verem o mesmo em tempo real, importar inscrições a partir de CSV, e histórico por jogador.
