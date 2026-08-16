const vSenha = document.querySelector("#senha");
let senhaNormal = localStorage.getItem("senhaNormal");
let senhaPreferencial = localStorage.getItem("senhaPreferencial");
let ultSenha = localStorage.getItem("ultSenha");

if (senhaNormal == null) {
    senhaNormal = 0;
}
if (senhaPreferencial == null) {
    senhaPreferencial = 0;
}
if (ultSenha == null) {
    ultSenha = "N";
}

const btnReset = document.querySelector("#reset");

btnReset.addEventListener("click", function () {
    senhaNormal = 0;
    senhaPreferencial = 0;
    ultSenha = "N";
    
    localStorage.setItem("senhaNormal", senhaNormal);
    localStorage.setItem("senhaPreferencial", senhaPreferencial);
    localStorage.setItem("ultSenha", ultSenha);
    
    mostrarSenha();
});

window.addEventListener("keydown", function (e) {
    if (e.key == "n" || e.key == "N") {
        senhaNormal++;
        ultSenha = "N";
    } else if (e.key == "p" || e.key == "P") {
        senhaPreferencial++;
        ultSenha = "P";
    }
    mostrarSenha();

    this.localStorage.setItem("senhaNormal", senhaNormal);
    this.localStorage.setItem("senhaPreferencial", senhaPreferencial);
    this.localStorage.setItem("ultSenha", ultSenha);
});

function mostrarSenha(){
        if (ultSenha == "N") {
            vSenha.innerHTML = `N${senhaNormal.toString().padStart(3, '0')}`;
        } else if (ultSenha == "P") {
            vSenha.innerHTML = `P${senhaPreferencial.toString().padStart(3, '0')}`;
        }
    }

console.log("senhaNormal:", senhaNormal, ", senhaPreferencial:", senhaPreferencial);