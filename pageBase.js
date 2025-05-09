const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const PDFDocument = require('pdfkit'); // Biblioteca para criar PDFs


/**
 * Salva um valor de storage em um arquivo JSON.
 * @param {string} caminhoPasta - Caminho da pasta onde o arquivo JSON será salvo.
 * @param {string} nomeArquivo - Nome do arquivo JSON.
 * @param {object} valorStorage - Objeto com os valores a serem armazenados.
 */

    // Marca o tempo
    function calcularTempoExecucao() {
        const inicio = Date.now(); 
        return {       
            fim: () => {
            const fim = Date.now(); 
            const duracao = fim - inicio; 
            console.log(`A automação levou ${duracao / 1000} segundos para ser executada.`);
            },
        };
    }


    function aplicarMascara_ESAJ(numeroProcesso) { 
        numeroProcesso = numeroProcesso.replace(/\D/g, '');
        return numeroProcesso.replace(
            /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
            '$1-$2.$3.$4.$5.$6'
        );
    }


    // Salva a evidencia
    const salvarCapturaDeTela = async (pagina, numeroProcesso, texto_do_Doc, estado) => {
        // Define o caminho da pasta e dos arquivos
        const pastaProcesso = `./Evidencias/${estado}/${numeroProcesso}`; 
        const nomeArquivoPNG = `Processo_${obterDataHora()}.png`;
        const nomeArquivoPDF = `${obterDataHora()}.pdf`;
    
        // Cria a pasta caso ela não exista
        if (!fs.existsSync(pastaProcesso)) {
            fs.mkdirSync(pastaProcesso, { recursive: true });
        }
    
        // Caminhos completos dos arquivos
        const caminhoArquivoPNG = path.join(pastaProcesso, nomeArquivoPNG);
        const caminhoArquivoPDF = path.join(pastaProcesso, nomeArquivoPDF);
        const { width } = await pagina.viewportSize();
    
        //Limpa a pasta do Processo
        fs.readdirSync(`./Evidencias/${estado}/${numeroProcesso}`)
        .forEach(file => fs.unlinkSync(path.join(`./Evidencias/${estado}/${numeroProcesso}`, file)));
    
       
        // Salva a captura de tela como PNG
        await pagina.screenshot({ 
            path: caminhoArquivoPNG, 
            clip: {
                x: 0, // Posição horizontal inicial
                y: 100, // Posição vertical inicial
                width: width, // Largura da captura
                height: 1000 // Altura da captura
            }
        });
    
       // console.log(`Captura de tela salva em: ${caminhoArquivoPNG}`);
    
        // Gera um PDF com o PNG embutido
        const doc = new PDFDocument({
            size: 'A4', // Tamanho do PDF (A4)
            margin: 0, // Sem margens extras
        });
    
        const stream = fs.createWriteStream(caminhoArquivoPDF);
        doc.pipe(stream);
    
        // Adiciona o PNG ao PDF, ajustando o tamanho para caber na página A4
        doc.image(caminhoArquivoPNG, 0, 0, { fit: [595.28, 841.89] });
    
        // Defina o texto que você deseja adicionar abaixo da captura de tela
        const texto_Do_PDF = texto_do_Doc;
    
        // Adiciona o texto abaixo da captura de tela, ajustando a posição
        doc.text(texto_Do_PDF, 50, 500); 
    
    
        // Finaliza o documento PDF
        doc.end();
    
        // Aguardar o fluxo de gravação terminar
        await new Promise((resolve, reject) => {
            stream.on('finish', () => {
              //  console.log(`PDF salvo em: ${caminhoArquivoPDF}`);
    
    
                // Remove a imagem após salvar o PDF
                fs.unlink(caminhoArquivoPNG, (err) => {
                    if (err) {
                        console.error('Erro ao remover a imagem:', err);
                    } else {
                        console.log(`Imagem removida: ${caminhoArquivoPNG}`);
                    }
                });
                resolve();
            });
            stream.on('error', (err) => {
                console.error('Erro ao salvar o PDF:', err);
                reject(err);
            });
        });

        // Exemplo de uso
           // const storage = { key: 'value', andamento: 'Processosdsd em estou testando o valor análise' };
            //const caminhoPasta = pastaProcesso;
            
            
           // salvarStorageEmJson(pastaProcesso, storage);
    };


    // Obtém a data e hora atual para o nome do arquivo
    function obterDataHora() {
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        
        return `${dia}-${mes}-${ano}_${hora}-${minuto}`;
    }



    function removeEspacos(text) {
        // Substitui espaços consecutivos maiores que 3 por um único espaço
        return text.replace(/\s{3,}/g, ' ').trim();
    }
    


    const salvarStorageEmJson = (caminhoPasta, valorStorage) => {
       
        const caminhoJson = path.join(caminhoPasta, 'Andamento.json');  
        fs.writeFileSync(caminhoJson, JSON.stringify(valorStorage, null, 2), 'utf-8');
   
       // console.log(`Storage salvo em: ${caminhoJson}`);
    };

    // const salvarStorageEmHistorico = (caminhoPasta, valorStorage) => {
       
    //     const caminhoJson = path.join(caminhoPasta, 'Historico.json');  
    //     fs.writeFileSync(caminhoJson, JSON.stringify(valorStorage, null, 2), 'utf-8');
   
    //    // console.log(`Storage salvo em: ${caminhoJson}`);
    // };

     // Função para salvar o histórico em JSON
    const salvarStorageEmHistorico = (caminhoPasta, valorStorage) => {
        const caminhoJson = path.join(caminhoPasta, 'Historico.json');
        
        // Formata os dados em JSON com indentação
        const historicoFormatado = valorStorage.map(item => ({
            titulo: item.titulo,
            descricao: item.descricao
        }));
    
        // Salva os dados no arquivo JSON
        fs.writeFileSync(caminhoJson, JSON.stringify(historicoFormatado, null, 2), 'utf-8');
    };
    


    

    function verifica_Conteudo(local) {

        var caminho = local.replace(/\/Andamento\.json$/, '');
        const caminhoJson = path.join(caminho, 'Andamento.json');

        if (!fs.existsSync(caminhoJson)) {
        
            fs.mkdirSync(caminho, { recursive: true });
            fs.writeFileSync(caminhoJson, JSON.stringify([], null, 2), 'utf-8');
            console.log(`1º Consulta Gerada:`);
        } 
        
        try {

            const conteudo = fs.readFileSync(local, 'utf-8');
           // console.log(`Conteúdo bruto do arquivo JSON:\n${conteudo}`); // Adicionado para depuração
            return JSON.parse(conteudo);
        } catch (error) {
            console.error(`Erro ao analisar o JSON: ${error.message}`);
            return null;
        }
    }

    function verifica_Conteudo_historico(local) {

        var caminho = local.replace(/\/Historico\.json$/, '');
        const caminhoJson = path.join(caminho, 'Historico.json');

        if (!fs.existsSync(caminhoJson)) {
        
            fs.mkdirSync(caminho, { recursive: true });
            fs.writeFileSync(caminhoJson, JSON.stringify([], null, 2), 'utf-8');
            console.log(`1º Consulta Gerada:`);
        } 
        
        try {

            const conteudo = fs.readFileSync(local, 'utf-8');
           // console.log(`Conteúdo bruto do arquivo JSON:\n${conteudo}`); // Adicionado para depuração
            return JSON.parse(conteudo);
        } catch (error) {
            console.error(`Erro ao analisar o JSON: ${error.message}`);
            return null;
        }
    }
    


    
    function embaralha_Ordem(valor){
      let new_list = _.shuffle(valor);
    
      return new_list;
    }
    


    module.exports = { 
        calcularTempoExecucao, salvarCapturaDeTela, aplicarMascara_ESAJ,  removeEspacos, salvarStorageEmJson, 
        verifica_Conteudo, embaralha_Ordem, salvarStorageEmHistorico, verifica_Conteudo_historico
    };