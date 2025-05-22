# 📄 Buscador de Processos Jurídicos com Playwright

Este projeto tem como objetivo **automatizar a busca de processos jurídicos públicos em andamento**. Utilizamos a ferramenta [Playwright](https://playwright.dev/) 
para realizar a automação dos acessos, e o [Allure Report](https://docs.qameta.io/allure/) para geração de relatórios detalhados de execução dos testes.

---

## 🚀 Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [Playwright](https://playwright.dev/)
- [Allure Reporter](https://docs.qameta.io/allure/)
- Estrutura **Page Object Model** (POM)
- Ambiente controlado via `.env`

---

## 📦 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/JS-HolandeZ/playwright-allure-consultas.git
cd playwright-allure-consultas
```

2. Instale as dependências:

```bash
npm install
```

---

## ⚙️ Configuração

O arquivo `.env` é usado para configuração da execução. Ele **não contém dados sensíveis**, portanto está presente no repositório.


---

## 🧪 Execução dos Testes

Para executar manualmente o processo:

```bash
npm run test
```

Após a execução, o relatório será gerado automaticamente com o Allure. Caso esteja 'true' em  `.env`, caso não, seguir: 

### Para visualizar o relatório Allure:

```bash
npm run allure:serve
```

---

## 🗂️ Estrutura do Projeto

- `src/pages/` – Page Objects utilizados na automação.
- `src/tests/` – Casos de teste automatizados.
- `lista_Processos.js` – Arquivo onde se pode alterar os **números dos processos** a serem buscados.

---

## 📌 Observações

- O projeto funciona em **ambiente único**, pois depende de **plataformas de terceiros** (portais públicos de consulta).
- Todos os **processos utilizados são públicos** e **não contêm dados sigilosos**, portanto podem ser exibidos e utilizados livremente no código.
- Você pode adaptar o conteúdo de `lista_Processos.js` para modificar os processos consultados.

---

## 📃 Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

## 🙋‍♂️ Autor

Desenvolvido por **J. Samuel Holanda**.
