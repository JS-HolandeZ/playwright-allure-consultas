const autoCeara = require('./Automations/Auto_Ceara');
var Estado_do_Pais = 'CE';
//var lista  = ['02012637720228060064', '30005904820238060010', '02406182120248060001', '02089319420228060001'];
var lista = ['30005904820238060010'];
var historico = true;

(async () => {
    console.log("Iniciando o script principal...");

    if(Estado_do_Pais == 'CE'){
        await autoCeara(lista, historico); // Chama o script Auto_Ceara.js
    }
})();



