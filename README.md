# London Tower — portal de reservas

Portal em português para reservar Oxford, Napoli e Rooftop, com autenticação, contas de moradores/portaria, administração e termo de responsabilidade. Frontend em `dist/`, funções Node em `api/` e persistência MongoDB. O código-fonte da interface está em `dist/portal.js`; não há etapa de compilação.

## Requisitos e validação

- Node.js 22.12 ou superior; Node 24 recomendado para reproduzir esta revisão.
- `npm ci`, `npm run check` e `npm test`.
- Os testes iniciam um MongoDB temporário isolado, sem usar o banco configurado em produção. A primeira execução baixa o binário em `.cache/mongodb` e exige rede e espaço livre. A pasta é ignorada pelo Git.
- `npm audit` verifica as dependências. O arquivo `package-lock.json` fixa as versões instaladas.

## Configuração e atualização

1. Faça um backup do banco e programe uma janela de manutenção para uma instalação existente.
2. Configure `MONGODB_URI` e, opcionalmente, `MONGODB_DB` no ambiente Node da hospedagem. `.env.example` documenta as variáveis; o aplicativo não carrega arquivos `.env` automaticamente. Nunca publique credenciais em `dist/`.
3. No ambiente administrativo, defina `BOOTSTRAP_ADMIN_PASSWORD` com uma senha privada de 12 a 256 caracteres e execute `npm run setup` **antes de publicar**. O comando cria a conta `superlondon` se ausente, verifica duplicidades, cria índices únicos e substitui a antiga senha compartilhada das contas existentes. Senhas diferentes da antiga senha padrão são preservadas.
4. O comando interrompe a configuração se houver reservas duplicadas para o mesmo salão/data. A administração deve decidir como reconciliá-las; o comando não exclui reservas. Também devem ser revisados salões antigos com nomes personalizados: os identificadores suportados são Oxford, Napoli e Rooftop.
5. A saída de `setup` pode conter senhas temporárias de contas migradas. Entregue-as por canal privado; não a publique nem a capture em logs compartilhados. A conta administrativa nova usa a senha definida no ambiente e exige troca no primeiro acesso. Remova `BOOTSTRAP_ADMIN_PASSWORD` do ambiente após a configuração.
6. Publique frontend **e** funções da API em conjunto, usando `vercel.json`. Uma hospedagem apenas estática não executa as APIs nem acessa o MongoDB. Verifique no ambiente de homologação que `/api/login` responde JSON e que as variáveis estão disponíveis. Referência: [configuração oficial da Vercel](https://vercel.com/docs/project-configuration/vercel-json).
7. Valide os perfis administrador, morador e portaria e uma reserva de teste em homologação antes de liberar a atualização.

Novas contas recebem uma senha temporária aleatória, mostrada apenas no momento da criação. A antiga senha padrão foi desativada no login. A troca obrigatória é verificada no servidor. Contas de portaria são criadas pelo administrador, sem uma conta padrão automática.

## Regras e privacidade

- Reservas em datas futuras, no fuso `America/Sao_Paulo`, das 10h às 22h.
- Um salão por data, garantido por índice único mesmo com requisições simultâneas.
- Moradores consultam os detalhes apenas de suas próprias reservas. A disponibilidade de todos contém somente salão/data. Administração e portaria consultam as reservas do condomínio.
- Cookies de sessão são `HttpOnly`, `Secure` e `SameSite=Lax`, com validade de oito horas. Use HTTPS. Logout revoga a sessão e a troca da senha invalida as sessões anteriores.
- Depois de cinco tentativas de login, há bloqueio temporário por identificador normalizado. Esse limite prioriza proteção da conta e pode causar um bloqueio temporário legítimo se terceiros insistirem em tentativas contra ela.
- A edição de salões que antes só salvava no navegador foi retirada; os três espaços estão definidos no código e apresentados como informações. A edição do termo continua persistida no servidor.
- O tema claro/escuro é a única preferência persistida localmente; dados legados de autenticação são removidos do armazenamento local ao abrir a página.

## Escopo da revisão

Veja `REVISAO.md` para alterações, resultados de validação e limitações. Esta revisão não altera automaticamente o banco de produção nem publica a aplicação.
