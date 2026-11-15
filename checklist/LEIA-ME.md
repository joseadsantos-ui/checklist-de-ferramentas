# Como ligar o Firebase (Firestore) neste projeto

Sem Firebase o app já funciona (modo local, dados só no aparelho). Com Firebase, o histórico fica na nuvem, compartilhado entre aparelhos, e funciona offline com sincronização depois.

## 1. Criar o projeto
1. Acesse https://console.firebase.google.com e entre com uma conta Google.
2. **Adicionar projeto** → nome (ex.: `checklist-lab`) → pode desativar o Google Analytics → **Criar**.

## 2. Registrar o app web
1. Na tela inicial do projeto, clique no ícone **</>** (Web).
2. Dê um apelido, **não** marque Hosting por enquanto → **Registrar app**.
3. Copie o objeto `firebaseConfig` mostrado e cole em `firebase-config.js`, substituindo os valores "COLE_AQUI".

## 3. Ativar o login anônimo
**Build → Authentication → Começar → Método de login → Anônimo → Ativar → Salvar.**

## 4. Criar o banco
**Build → Firestore Database → Criar banco de dados** → escolha uma região (ex.: `southamerica-east1`, São Paulo) → **Modo de produção** → Criar.

## 5. Regras de segurança
Aba **Regras** do Firestore, cole e **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conferencias/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.keys().hasAll(['caixa','data','resp','itens'])
        && request.resource.data.resp is string
        && request.resource.data.resp.size() < 80;
      allow update, delete: if false;
    }
  }
}
```

Atenção: login anônimo impede só quem não abriu o site; **qualquer pessoa com o endereço do site consegue ler e gravar**. Para uso real no laboratório, o passo seguinte é Authentication por e-mail/senha com lista de usuários permitidos.

## 6. Abrir o projeto (importante)
O app usa módulos ES, que **não funcionam abrindo o `index.html` com duplo clique** (`file://`). Use um servidor:
- VS Code: extensão **Live Server** → "Go Live"; ou
- terminal na pasta: `npx serve .`

Se o login falhar com "domínio não autorizado": **Authentication → Configurações → Domínios autorizados** e adicione o domínio que está usando (`localhost` já vem).

## 7. Publicar (opcional)
```
npm i -g firebase-tools
firebase login
firebase init hosting     # pasta pública: . (ponto); SPA: não
firebase deploy
```

## Como os dados ficam
Coleção `conferencias`, um documento por conferência finalizada:
`caixa`, `data`, `resp`, `itens[{nome,qtd,s,f,l}]`, `falta`, `completa`, `lote`, `criadoEm`.
O rascunho em andamento fica só no aparelho (por caixa) até você tocar em **Finalizar e salvar**.
