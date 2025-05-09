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



// Sites e variaveis iniciais.
const Estado_CE = 'CE'
const URL_STJ = "https://www.stj.jus.br/sites/portalp/Processos/Consulta-Processual";
const URL_ESAJ = "https://consultaprocesso.tjce.jus.br/";
var URL = "";
var N_Processo; 


// Fluxo do Site ESAJ | inicio -> 0
var footer_inicial = "//*[contains(@class, 'titulo_footer text-right')]";
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


module.exports = async (lista_, historico_) => {

    const tempoExecucao = calcularTempoExecucao();
    var historico = historico_;

    var lista =  embaralha_Ordem(lista_);
   // var lista = lista_
   
    for (let i = 0; i < lista.length; i++) {

        const N_Processo = lista[i];
        console.log("\nNúmero do Processo:", N_Processo, "\n");

        try {

            const browser = await chromium.launch({ headless: false });
            const context = await browser.newContext({
                ignoreHTTPSErrors: true,
                bypassCSP: true,
            });

            let page = await context.newPage();
            let texto_Do_PDF = "";



            await page.goto(URL_ESAJ);
            await page.fill("#numeroProcesso", "");
            await page.type("#numeroProcesso", N_Processo, { delay: 150 });
            await page.click(".ui-button-text.ui-c");


            var tentativas = 0;
            
            while (tentativas < 3) { 
                const infoVisivel = await page.getByText('As informações abaixo são').isVisible(); // Atualiza a verificação

                if (infoVisivel) {
                    console.log("✅ O texto foi encontrado na página!");
                    break; // Sai do loop se o texto for encontrado
                }
                console.log(`❌ ${tentativas + 1}º Tentativa: O texto NÃO foi encontrado!`);
                await page.waitForTimeout(5000); // Espera 5 segundos
                await page.click(".ui-button-text.ui-c");

                tentativas++;
            }
    
            await page.waitForSelector(footer_inicial, { timeout: 60000 });
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
                                      
                    await page.waitForEvent('popup', { timeout: 60000 }),  // Aguarda no máximo 5 segundos                                                
                ]);
                
               
                await novaAba_STJ.waitForLoadState(); // Espera a página carregar               
                await novaAba_STJ.locator(btn_aba_fases).click() 

             

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
              

                if(my_storage != conteudo_Atual){

                    salvarStorageEmJson(`./Evidencias/${Estado_CE}/${N_Processo}` , my_storage);
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Nova movimentação: "+JSON.stringify(my_storage, null, 2)+" <<")
                    //await salvarCapturaDeTela(novaAba, N_Processo, texto_Do_PDF, Estado_CE);
                }
                if(my_storage == conteudo_Atual && conteudo_Historico == undefined){

                    
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Criado um historico: "+JSON.stringify(my_storage, null, 2)+" <<")
                    //await salvarCapturaDeTela(novaAba, N_Processo, texto_Do_PDF, Estado_CE);
                }else{

                    console.log(">> Não houve movimentação <<")
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

                await page.waitForSelector(document_Processo, { timeout: 60000 });               
                page.locator(document_Processo).click();

            
                const [novaAba] = await Promise.all([
                    
                    await page.waitForEvent('popup', { timeout: 60000 }),
                ]);

               

                await novaAba.waitForLoadState();
                await novaAba.locator(local_Documento_Page).scrollIntoViewIfNeeded();

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
                
       
                if(my_storage != conteudo_Atual){

                 salvarStorageEmJson(`./Evidencias/${Estado_CE}/${N_Processo}` , my_storage);
                 salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                 console.log(">> Nova movimentação: "+JSON.stringify(my_storage, null, 2)+" <<")
                 //await salvarCapturaDeTela(novaAba, N_Processo, texto_Do_PDF, Estado_CE);
                }
                if(my_storage == conteudo_Atual && conteudo_Historico == undefined){

                   
                    salvarStorageEmHistorico(`./Evidencias/${Estado_CE}/${N_Processo}` , valor_Historico_Storage);
                    console.log(">> Criado um historico: "+JSON.stringify(my_storage, null, 2)+" <<")
                    //await salvarCapturaDeTela(novaAba, N_Processo, texto_Do_PDF, Estado_CE);
                }else{

                 console.log(">> Não houve movimentação <<")
                }                 
            }

            await browser.close();
            
        } catch (error) {
            console.error("Erro ao processar o número do processo:", N_Processo, error);    
        }
        
        tempoExecucao.fim();
    }
};