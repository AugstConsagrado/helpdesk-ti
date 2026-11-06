# Como estudar e apresentar este projeto

Este é um ponto de partida construído com apoio de IA. Antes de descrevê-lo como experiência prática no currículo, execute, entenda o fluxo e faça uma modificação que você consiga explicar. O objetivo é ter uma demonstração verificável do aprendizado.

## Primeiro contato

1. Execute `npm start` e abra o endereço indicado.
2. Crie um chamado fictício e procure pelo título.
3. Abra os detalhes, altere a prioridade e marque como resolvido.
4. Filtre por status e observe que os indicadores gerais continuam iguais.
5. Reinicie o servidor: o chamado deve continuar salvo.
6. Execute `npm test` e leia cada cenário.

## Leia o código nesta ordem

1. `public/index.html`: campos do formulário, tabela e janela de edição.
2. `public/app.js`: função `api`, criação dos elementos e envio do formulário.
3. `src/server.js`: diferença entre GET, POST, PUT e DELETE.
4. `src/store.js`: validação, tabela, consultas e persistência.
5. `test/app.test.js`: critérios que confirmam que o sistema funciona.

## Sua primeira contribuição

Adicione a categoria **Impressora**. Identifique todos os pontos necessários: lista de categorias, restrição do banco, formulário e teste. Como o banco já existente usa uma restrição CHECK, pense em migração ou crie uma base local nova para estudar a mudança. Não apague dados que queira manter.

Depois, adicione um campo de responsável ou uma busca por categoria e escreva um teste do comportamento. Registre a mudança com um commit que explique a alteração.

## Demonstração em dois minutos

Explique o problema, mostre o cadastro, altere um status, filtre os chamados, reinicie para mostrar persistência e execute os testes. Use apenas nomes fictícios.

## Perguntas para se preparar

- O que acontece entre clicar em Salvar e o registro aparecer na tela?
- Por que validar no navegador e no servidor?
- Qual a diferença entre SQLite e MySQL?
- O que uma consulta parametrizada evita?
- Por que exibir texto com `textContent`?
- O que falta para várias pessoas usarem o sistema pela internet?

## Descrição para o currículo, após estudo e personalização

**Projeto de estudo: Helpdesk TI** — Sistema de chamados com JavaScript, Node.js e SQLite, incluindo cadastro, edição, filtros, prioridades e indicadores. Estudo e personalização de projeto desenvolvido com apoio de IA, com testes de regras de negócio e API.

Ajuste a descrição para refletir exatamente o que você estudou e modificou. Não afirme que houve clientes, implantação ou usuários reais.
