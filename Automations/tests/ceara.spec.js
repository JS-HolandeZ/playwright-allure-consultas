require('dotenv').config(); 
const { allure } = require('allure-playwright');
const { test } = require('@playwright/test');
const autoCeara = require('../../Automations/Auto_Ceara');
const lista_Processos = require('../../lista_Processos');

// Lê do .env
const lista = lista_Processos;
const historico = process.env.HISTORICO


test.describe('Processos Ceará com histórico', () => {
  for (const numeroProcesso of lista) {
    test(`Executar autoCeara - ${numeroProcesso}`, async ({}, testInfo) => {
      testInfo.setTimeout(120 * 1000);

      try {
        await autoCeara([numeroProcesso], historico);
      } catch (error) {
        try {
          await allure.attachment('Erro na execução', error.stack || error.message, 'text/plain');
        } catch (attachmentError) {
          console.error('Allure attachment não pôde ser registrado porque o teste já não está ativo:', attachmentError.message);
        }
        throw error;
      }
    });
  }
});
