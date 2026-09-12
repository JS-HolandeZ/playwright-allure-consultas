require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { reading_Env } = require('./pageBase');

const view_Allure = reading_Env(process.env.VIEW_ALLURE);

function limparAllureResults() {
  const caminho = path.resolve(__dirname, 'allure-results');

  try {
    fs.rmSync(caminho, {
      recursive: true,
      force: true
    });

    fs.mkdirSync(caminho, {
      recursive: true
    });

    console.log('📁 Diretório allure-results limpo.');
  } catch (error) {
    console.error('❌ Erro ao limpar o diretório allure-results:', error);
    throw error;
  }
}

let testesFalharam = false;

try {
  // Limpa resultados anteriores
  limparAllureResults();

  // Executa os testes | npm run test
  execSync('npx playwright test', { stdio: 'inherit' });

} catch (error) {
  console.error('\n❌ Erro durante os testes:', error.message);
  testesFalharam = true;
}

// Abre o Allure Report mesmo que os testes falhem
if (view_Allure) {
  try {
    console.log('\n🧪 Abrindo Allure Report...');
    execSync('npx allure serve allure-results', { stdio: 'inherit' });
  } catch (error) {
    console.error('\n❌ Erro ao abrir o Allure Report:', error.message);
  }
} else {
  console.log('\nℹ️ Visualização do Allure Report Desabilitada! ');
}

// Finaliza com erro se os testes falharam (importante para CI)
if (testesFalharam) {
  process.exit(1);
}
