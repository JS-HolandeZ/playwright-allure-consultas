require('dotenv').config();
const { chromium } = require('playwright'); 
const { calcularTempoExecucao } = require('../pageBase');
const { salvarCapturaDeTela } = require('../pageBase');
const { aplicarMascara_ESAJ } = require('../pageBase');
const { removeEspacos } = require('../pageBase');
const { salvarStorageEmJson } = require('../pageBase');
const { verifica_Conteudo } = require('../pageBase');
const { embaralha_Ordem } = require('../pageBase');  
const { salvarStorageEmHistorico } = require('../pageBase');  
const { verifica_Conteudo_historico } = require('../pageBase');
const { reading_Env } = require('../pageBase');





// Sites e variaveis iniciais.
const Estado_CE = 'CE'
const URL_STJ = "https://www.stj.jus.br/sites/portalp/Processos/Consulta-Processual";
const URL_ESAJ = "https://consultaprocesso.tjce.jus.br/";
var URL = "";
var N_Processo; 


// Fluxo do Site ESAJ | inicio -> 0
var footer_inicial = "//*[contains(@class, 'titulo_footer text-right')]";

var processo_Nao_Encontrado = '#procNaoEncontrado';
var local_Documento_Page = '(//*[contains(@class, "ui-icon ui-icon-minusthick")])[3]';
var ultima_data = '(//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[1]//*[contains(@class, "textoTipoParte")]';
var ultima_titulo = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[1])//div[2]//span';
// var ultima_descricao = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[1])//div[4]';
var segunda_Data = '(//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[2]//*[contains(@class, "textoTipoParte")]';
var segunda_titulo = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[2])//div[2]//span';
// var segunda_descricao = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[2])//div[4]'
var terceira_Data = '(//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[3]//*[contains(@class, "textoTipoParte")]';
var terceira_titulo = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[3])//div[2]//span';
// var terceira_descricao = '((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[3])//div[4]';
var document_Processo = "";
const document_Processo_1 = "[id='tabelaProcessos:0:numProcessoFormatado']";
const document_Processo_2 = "[id='tabelaProcessos:1:numProcessoFormatado']";



// Fluxo do Site STJ
var processo_remetido = "//*[text()='Situação']/following::div[contains(text(), 'Remetido')]"
var btn_Busca_STJ = "//button[contains(@class, 'input-group-text icofont-ui-search btn')]";
var btn_aba_fases =    "[id='idSpanAbaFases']" 
var primeira_data = "(//*[contains(@class, 'clsFaseDataHora')])[1]"
var primeira_conteudo = "(//*[contains(@class, 'classSpanFaseTexto')])[1]"


module.exports = async (lista_, historico_, headless_) => {

    const tempoExecucao = calcularTempoExecucao();
    var historico = historico_;
   const  HEADLESS_ = reading_Env(process.env.HEADLESS);


    
    var lista =  embaralha_Ordem(lista_);
   // var lista = lista_
   
    for (let i = 0; i < lista.length; i++) {

        const N_Processo = lista[i];
        console.log("\nNúmero do Processo:", N_Processo, "\n");

        let browser;
        let context;
        let page;

        try {

            browser = await chromium.launch({ headless:  HEADLESS_ }); // visualização
            context = await browser.newContext({
                ignoreHTTPSErrors: true,
                bypassCSP: true,
            });

            page = await context.newPage();
            let texto_Do_PDF = "";



            await page.goto(URL_ESAJ);

            await page.fill("#numeroProcesso", "");
            await page.type("#numeroProcesso", N_Processo, { delay: 150 });

            const botaoConsulta = page.getByRole('button', { name: 'Pesquisar Processos' });
            const resultadoConsulta = page.getByText('As informações abaixo são');

            await botaoConsulta.waitFor({ state: 'visible', timeout: 15000 });
            await botaoConsulta.click();

            try {
                await resultadoConsulta.waitFor({
                    state: 'visible',
                    timeout: 15000
                });
                console.log("✅ O texto foi encontrado na página!");
            } catch (error) {
                if (page.isClosed()) {
                    throw new Error(`Página fechada antes da confirmação da consulta do processo ${N_Processo}.`);
                }

                console.warn("⚠️ Resultado não apareceu após o primeiro clique. Realizando 2ª tentativa...");
                await botaoConsulta.waitFor({ state: 'visible', timeout: 15000 });
                await botaoConsulta.click();

                try {
                    await resultadoConsulta.waitFor({
                        state: 'visible',
                        timeout: 15000
                    });
                    console.log("✅ O texto foi encontrado na página!");
                } catch (retryError) {
                    if (page.isClosed()) {
                        throw new Error(`Página fechada antes da confirmação da consulta do processo ${N_Processo}.`);
                    }
                    throw new Error(`Não foi possível confirmar a consulta do processo ${N_Processo} após 2 tentativas de clique.`);
                }
            }

            await page.waitForSelector(footer_inicial, { timeout: 15000 });

            // Verifica se o elemento existe
            const processoExiste = await page.locator(processo_Nao_Encontrado).count() > 0;

            if (processoExiste) {
                throw new Error(`❌ Processo não encontrado: ${N_Processo}`);
            } else {
                console.log(`Processo encontrado`);
            }


            await page.locator(footer_inicial).scrollIntoViewIfNeeded();

            // Verifica a existência dos elementos na página
            const processoRemetido = await page.locator(processo_remetido, { timeout: 10000 }).count() > 0;
             

            if(processoRemetido){

                console.log("Processo Remetido!");
                await page.goto(URL_STJ);
                await page.waitForLoadState();

                const campoDeTexto = page.locator('role=textbox[name="Digite o número do processo"]');
                await campoDeTexto.fill(N_Processo);

                
                // page.locator(btn_Busca_STJ).click();
                await page.waitForLoadState();
                await page.locator(btn_Busca_STJ).click()  
               
                const [novaAba_STJ] = await Promise.all([
                    page.waitForEvent('popup', { timeout: 60000 }),
                ]);

                if (!novaAba_STJ || novaAba_STJ.isClosed()) {
                    throw new Error(`Popup da STJ para o processo ${N_Processo} foi fechada antes da leitura.`);
                }

                await novaAba_STJ.waitForLoadState('domcontentloaded', { timeout: 15000 });
                await novaAba_STJ.locator(btn_aba_fases).waitFor({ state: 'visible', timeout: 15000 });
                await novaAba_STJ.locator(btn_aba_fases).click();
             

                let valor_Historico_Storage = [];  // Inicializa como array

                const elementos = await novaAba_STJ.$$('(//*[contains(@class, "classDivFaseLinha")])');

                
                for (let i = 0; i < elementos.length; i++) {
                    let seletorXPath = `(//*[contains(@class, 'classDivFaseLinha')])[${i + 1}]/span[1]`;
                    let titulo = `(//*[contains(@class, 'classDivFaseLinha')])[${i + 1}]/span[2]`

                    let elemento = await novaAba_STJ.$(seletorXPath); // Localiza o elemento
                    let elemento2 = await novaAba_STJ.$(titulo);

                    if (elemento && elemento2) {
                        let titulo = (await elemento.textContent()).trim();  // Obtém o título e remove espaços extras
                        let descricao = (await elemento2.textContent()).trim();  // Obtém a descrição e remove espaços extras               
                        let historico = { 
                            titulo: titulo, 
                            descricao: descricao 
                        };
                        valor_Historico_Storage.push(historico);
                    }
                }
                
               // console.log("Ultima atualização: \n"+texto_final);
                const textoCapturado = await novaAba_STJ.locator(primeira_data).textContent();
                const textoTitulo = await novaAba_STJ.locator(primeira_conteudo).textContent();
                var my_storage = textoCapturado +" - "+ removeEspacos(textoTitulo)

                const conteudo_Atual = verifica_Conteudo(`./Evidencias/${Estado_CE}/${N_Processo}/Andamento.json`);
                const conteudo_Historico = verifica_Conteudo_historico(`./Evidencias/${Estado_CE}/${N_Processo}/Historico.json`);
              

                if (my_storage !== conteudo_Atual) {
                    salvarStorageEmJson(`./Evidencias/${Estado_CE}/${N_Processo}` , my_storage);
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Nova movimentação: "+JSON.stringify(my_storage, null, 2)+" <<");
                } else if (my_storage === conteudo_Atual && conteudo_Historico === undefined) {
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Criado um historico: "+JSON.stringify(my_storage, null, 2)+" <<");
                } else {
                    console.log(">> Não houve movimentação <<");
                }
            
               
            }
            else{
             
                console.log("> Processo não remetido!")           
                const processo2Existe = await page.locator(document_Processo_2).count() > 0;

                if (processo2Existe) {
                    console.log('> Processo de 2º instância');
                    document_Processo = document_Processo_2;
                } else {
                    console.log('> Processo de 1º instância');
                    document_Processo = document_Processo_1;
                }

                await page.waitForSelector(document_Processo, { timeout: 30000 });               
                page.locator(document_Processo).click();

            
                const [novaAba] = await Promise.all([
                    page.waitForEvent('popup', { timeout: 60000 }),
                ]);

                if (!novaAba || novaAba.isClosed()) {
                    throw new Error(`Popup do processo ${N_Processo} foi fechada antes da leitura da movimentação.`);
                }

                await novaAba.waitForLoadState('domcontentloaded', { timeout: 15000 });

                const elementoDocumento = novaAba.locator(local_Documento_Page);
                if (novaAba.isClosed()) {
                    throw new Error(`A página do processo ${N_Processo} foi fechada antes do scroll do documento.`);
                }

                await elementoDocumento.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
                    throw new Error(`Elemento obrigatório não encontrado: ${local_Documento_Page}`);
                });

                await elementoDocumento.scrollIntoViewIfNeeded({ timeout: 10000 });

                const textoCapturado = await novaAba.locator(ultima_data).textContent();
                const textoTitulo = await novaAba.locator(ultima_titulo).textContent();

                const textoCapturado2 = await novaAba.locator(segunda_Data).textContent();
                const textoTitulo2 = await novaAba.locator(segunda_titulo).textContent();

                const textoCapturado3 = await novaAba.locator(terceira_Data).textContent();
                const textoTitulo3 = await novaAba.locator(terceira_titulo).textContent();
                
                
                //   texto_Do_PDF = `Ultima atualização: ${textoCapturado} - Titulo: ${textoTitulo}
                //  \nDescrição: ${textoDescricao.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim()}`;
                //   console.log(texto_Do_PDF);

                var my_storage = textoCapturado +" - "+ removeEspacos(textoTitulo)
                const conteudo_Atual = verifica_Conteudo(`./Evidencias/${Estado_CE}/${N_Processo}/Andamento.json`);
                const conteudo_Historico = verifica_Conteudo_historico(`./Evidencias/${Estado_CE}/${N_Processo}/Historico.json`);

               // var valor_Historico_Storage = 'TY'
                let valor_Historico_Storage = [];  // Inicializa como array
                const elementos = await novaAba.$$('//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")]');
                for (let i = 0; i < elementos.length; i++) {
                    let seletorXPath = `(//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[${i + 1}]//*[contains(@class, "textoTipoParte")]`;
                    let titulo = `((//*[contains(@id, "groupMovimentacoes")]//*[contains(@class, "row-fluid")])[${i + 1}])//div[2]//span`

                    let elemento = await novaAba.$(seletorXPath); // Localiza o elemento
                    let elemento2 = await novaAba.$(titulo);

                    if (elemento && elemento2) {
                        let titulo = (await elemento.textContent()).trim();  // Obtém o título e remove espaços extras
                        let descricao = (await elemento2.textContent()).trim();  // Obtém a descrição e remove espaços extras               
                        let historico = { 
                            titulo: titulo, 
                            descricao: descricao 
                        };
                        valor_Historico_Storage.push(historico);
                    }
                }
                
       
                if (my_storage !== conteudo_Atual) {
                    salvarStorageEmJson(`./Evidencias/${Estado_CE}/${N_Processo}` , my_storage);
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Nova movimentação: "+JSON.stringify(my_storage, null, 2)+" <<");
                } else if (my_storage === conteudo_Atual && conteudo_Historico === undefined) {
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Criado um historico: "+JSON.stringify(my_storage, null, 2)+" <<");
                } else {
                    console.log(">> Não houve movimentação <<");
                }
            }
        } catch (error) {
            console.error("Erro ao processar o número do processo:", N_Processo, error);
            throw error;
        } finally {
            try {
                if (context && typeof context.close === 'function') {
                    await context.close();
                }
            } catch (contextError) {
                console.error(`Erro ao fechar context do processo ${N_Processo}:`, contextError);
            }

            try {
                if (browser && typeof browser.close === 'function') {
                    await browser.close();
                }
            } catch (browserError) {
                console.error(`Erro ao fechar browser do processo ${N_Processo}:`, browserError);
            }
        }
        
        tempoExecucao.fim();
    }
};