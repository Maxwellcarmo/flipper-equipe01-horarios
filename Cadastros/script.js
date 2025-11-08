/* ========================================================================
 * VERSÃO LOCALSTORAGE (OFFLINE)
 *
 * Este script foi modificado para salvar os dados no "Armazenamento Local"
 * do seu navegador, em vez de no Firebase.
 *
 * O que mudou:
 * 1. REMOVIDO: Todos os `import` e códigos do Firebase.
 * 2. ADICIONADO: Funções `localStorage.getItem` (para ler) e
 * `localStorage.setItem` (para salvar).
 * 3. MUDANÇA: O script agora roda dentro de 'DOMContentLoaded',
 * que é mais rápido e não depende de 'firebase-ready'.
 * 4. MUDANÇA: A função de deletar foi ajustada para remover itens
 * de uma lista local, em vez de do Firebase.
 * ========================================================================
 */

// Adiciona o ouvinte principal. Tudo roda assim que o HTML estiver pronto.
document.addEventListener('DOMContentLoaded', () => {

    // --- Chaves do LocalStorage (Nomes das "gavetas") ---
    const SALAS_KEY = 'minhasSalas';
    const TURMAS_KEY = 'minhasTurmas';

    // --- Pega os Elementos do DOM ---
    const formSala = document.getElementById('form-cadastro-sala');
    const listaSalasContainer = document.getElementById('lista-salas-container');
    const formTurma = document.getElementById('form-cadastro-turma');
    const listaTurmasContainer = document.getElementById('lista-turmas-container');
    const mainContainer = document.querySelector('main');

    // ==============================================
    // LÓGICA DE SALAS (LocalStorage)
    // ==============================================

    /**
     * 1. Renderizar Salas
     * (Recebe a lista de salas e desenha na tela)
     */
    function renderizarSalas(salas) {
        listaSalasContainer.innerHTML = '';
        if (!salas || salas.length === 0) {
            listaSalasContainer.innerHTML = "<p>Nenhuma sala cadastrada ainda.</p>";
            return;
        }

        // Ordena por ID
        salas.sort((a, b) => a.id.localeCompare(b.id));

        salas.forEach((sala) => {
            const salaElement = document.createElement('div');
            salaElement.className = 'alocacao alocacao-sucesso';
            salaElement.innerHTML = `
                <div>
                    <strong>[${sala.id}] ${sala.bloco} - ${sala.tipo}</strong>
                    (Cap: ${sala.capacidade})
                    <span>Ativa: ${sala.usarParaAlocacao ? 'Sim' : 'Não'}</span>
                </div>
                <button class="delete-btn" data-id="${sala.id}" data-collection="salas">Excluir</button>
            `;
            listaSalasContainer.appendChild(salaElement);
        });
    }

    /**
     * 2. Carregar Salas
     * (Pega os dados do LocalStorage e manda renderizar)
     */
    function carregarSalas() {
        const salasJSON = localStorage.getItem(SALAS_KEY);
        const salas = JSON.parse(salasJSON) || [];
        renderizarSalas(salas);
    }

    /**
     * 3. Salvar Nova Sala
     * (Ouvinte do formulário de salas)
     */
    formSala.addEventListener('submit', (e) => {
        e.preventDefault();

        // Pega os dados do form
        const novaSala = {
            id: document.getElementById('sala-id').value.trim().toUpperCase(), // Este é o ID único
            bloco: document.getElementById('sala-bloco').value.trim().toUpperCase(),
            capacidade: parseInt(document.getElementById('sala-capacidade').value),
            tipo: document.getElementById('sala-tipo').value,
            usarParaAlocacao: document.getElementById('sala-usar').checked
        };

        if (!novaSala.id) {
            alert('O ID da Sala é obrigatório.');
            return;
        }

        // Pega a lista antiga do LocalStorage
        const salasJSON = localStorage.getItem(SALAS_KEY);
        let salas = JSON.parse(salasJSON) || [];

        // Verifica se o ID já existe
        if (salas.some(s => s.id === novaSala.id)) {
            alert('Erro: Já existe uma sala com este ID. Use outro ID.');
            return;
        }

        // Adiciona a nova sala na lista
        salas.push(novaSala);

        // Salva a lista ATUALIZADA de volta no LocalStorage
        localStorage.setItem(SALAS_KEY, JSON.stringify(salas));

        formSala.reset();
        renderizarSalas(salas); // Re-desenha a lista na tela
    });

    // ==============================================
    // LÓGICA DE TURMAS (LocalStorage)
    // ==============================================

    /**
     * 1. Renderizar Turmas
     */
    function renderizarTurmas(turmas) {
        listaTurmasContainer.innerHTML = '';
        if (!turmas || turmas.length === 0) {
            listaTurmasContainer.innerHTML = "<p>Nenhuma turma manual cadastrada.</p>";
            return;
        }

        turmas.sort((a, b) =>
            a.dia.localeCompare(b.dia) ||
            a.turno.localeCompare(b.turno) ||
            a.disciplina.localeCompare(b.disciplina)
        );

        turmas.forEach((turma) => {
            const turmaElement = document.createElement('div');
            turmaElement.className = 'alocacao alocacao-sucesso';
            turmaElement.innerHTML = `
                <div>
                    <strong>[${turma.dia} - ${turma.turno}] ${turma.disciplina}</strong>
                    (Cód: ${turma.codDisciplina}) (Alunos: ${turma.alunos})
                    <span>Tipo: ${turma.tipo} / Bloco: ${turma.blocoDesejado || 'Nenhum'}</span>
                </div>
                <button class="delete-btn" data-id="${turma.id}" data-collection="turmas">Excluir</button>
            `;
            listaTurmasContainer.appendChild(turmaElement);
        });
    }

    /**
     * 2. Carregar Turmas
     */
    function carregarTurmas() {
        const turmasJSON = localStorage.getItem(TURMAS_KEY);
        const turmas = JSON.parse(turmasJSON) || [];
        renderizarTurmas(turmas);
    }

    /**
     * 3. Salvar Nova Turma
     */
    formTurma.addEventListener('submit', (e) => {
        e.preventDefault();

        const novaTurma = {
            // MUDANÇA: Geramos um ID único (timestamp) para a turma
            id: Date.now(),
            disciplina: document.getElementById('turma-disciplina').value,
            codDisciplina: document.getElementById('turma-cod-disciplina').value,
            alunos: parseInt(document.getElementById('turma-alunos').value),
            tipo: document.getElementById('turma-tipo').value,
            blocoDesejado: document.getElementById('turma-bloco').value.trim().toUpperCase() || null,
            dia: document.getElementById('turma-dia').value,
            turno: document.getElementById('turma-turno').value
        };

        // Pega a lista antiga
        const turmasJSON = localStorage.getItem(TURMAS_KEY);
        let turmas = JSON.parse(turmasJSON) || [];

        // Adiciona a nova
        turmas.push(novaTurma);

        // Salva a lista atualizada
        localStorage.setItem(TURMAS_KEY, JSON.stringify(turmas));

        formTurma.reset();
        renderizarTurmas(turmas); // Re-desenha a lista
    });

    // ==============================================
    // LÓGICA DE DELETAR (Unificada)
    // ==============================================
    mainContainer.addEventListener('click', (e) => {
        // Sai se não for um botão de deletar
        if (!e.target.classList.contains('delete-btn')) {
            return;
        }

        const id = e.target.dataset.id; // Este é o ID (string da sala ou timestamp da turma)
        const collectionType = e.target.dataset.collection;

        if (collectionType === 'salas') {
            if (window.confirm("Tem certeza que quer excluir esta sala?")) {
                let salas = JSON.parse(localStorage.getItem(SALAS_KEY)) || [];
                // Filtra, mantendo todas as salas que NÃO têm este ID
                salas = salas.filter(s => s.id !== id);
                // Salva a lista filtrada
                localStorage.setItem(SALAS_KEY, JSON.stringify(salas));
                renderizarSalas(salas); // Re-desenha
            }
        } else if (collectionType === 'turmas') {
            if (window.confirm("Tem certeza que quer excluir esta turma?")) {
                let turmas = JSON.parse(localStorage.getItem(TURMAS_KEY)) || [];
                // O ID da turma é um número (timestamp), mas o data-id é uma string
                // Usamos '!=' para comparar valor, ou 'parseInt'
                turmas = turmas.filter(t => t.id != id);
                // Salva a lista filtrada
                localStorage.setItem(TURMAS_KEY, JSON.stringify(turmas));
                renderizarTurmas(turmas); // Re-desenha
            }
        }
    });

    // ==============================================
    // CARGA INICIAL
    // (Carrega tudo assim que a página abre)
    // ==============================================
    carregarSalas();
    carregarTurmas();

});