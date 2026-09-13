# Revisão técnica — 13/09/2026

## Problemas corrigidos

| Problema encontrado | Correção aplicada |
| --- | --- |
| Calendário dos moradores ignorava reservas alheias | Disponibilidade compartilhada apenas com salão/data; detalhes pessoais continuam restritos |
| Consulta de conflito seguida de inserção permitia duplicidade simultânea | Índice único de salão/data e resposta 409 para concorrência |
| Datas inexistentes e salões arbitrários eram aceitos | Validação de calendário, campos, tamanho, salão, horário e aceite obrigatório |
| Reserva não gravava o campo usado na ordenação | Novas reservas gravam `createdAt` |
| Primeiro acesso dependia somente do modal | Contas e reservas bloqueadas no servidor até a troca de senha |
| Logout apagava apenas o cookie | Revogação do token no MongoDB |
| Troca de senha preservava sessões antigas | Verificação da senha atual, revogação e emissão de novo token |
| Login recriava contas com senha compartilhada | Provisionamento administrativo explícito e senhas temporárias aleatórias |
| CPF formatado contornava contagem; incrementos podiam se perder | Identificador normalizado e contador atômico |
| Hash malformado podia gerar erro interno | Verificação segura do formato antes da comparação |
| Falha inicial do banco ficava memorizada indefinidamente | Nova tentativa de conexão após falha |
| JSON malformado gerava 500; corpo já interpretado era ignorado | Leitura compatível com o ambiente de funções e erros 400/413 |
| Frontend tinha múltiplos logins e eventos conflitantes | Um único controlador, sem autenticação local ou reservas fictícias |
| Dados de usuários eram inseridos como HTML | Escape de conteúdo dinâmico para impedir execução de marcação armazenada |
| Campo de data e resumo divergiam; duplo clique repetia envio | Sincronização do calendário e bloqueio durante o envio |
| Portaria via opções administrativas sem autorização | Navegação conforme o perfil, com autorização mantida na API |
| Modal de senha sem cancelamento; tema escuro incompleto | Cancelamento, foco em modais, rótulos acessíveis e cores ajustadas |

## Verificação

Resultados locais: `npm run check` aprovou os 13 arquivos JavaScript; `npm test` aprovou os 19 testes; `npm audit` não apontou vulnerabilidades conhecidas nas dependências instaladas. Ambiente: Node.js 24.18.0 e MongoDB temporário 8.2.6.

A suíte contém testes de utilitários, APIs com MongoDB temporário real e fluxos da interface em DOM simulado, incluindo primeiro acesso, concorrência, permissões da portaria, migração repetível de senhas antigas e marcação maliciosa armazenada.

## Limitações e implantação

- Não houve acesso ao banco de produção nem publicação. A integração GitHub disponível concede leitura, sem permissão de escrita.
- Antes de publicar, siga a migração no README: reservas duplicadas exigem decisão administrativa e as senhas iniciais antigas exigem substituição. Nenhum dado existente foi excluído por esta revisão.
- A disponibilidade depende da última atualização; o servidor resolve conflitos que ocorram depois dela. O botão Atualizar permite nova consulta.
- Os testes DOM não substituem revisão visual em navegador real nem homologação da hospedagem e do banco de produção.
- A edição local de salões foi removida porque não era compartilhada e permitia divergência entre dispositivos. Um cadastro editável de espaços, com identificadores estáveis e migração de reservas, fica como evolução separada.
- O sistema continua registrando solicitações; não foi acrescentado um fluxo de aprovação ou cancelamento que não existia na API original.
