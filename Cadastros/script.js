// Importa as funções do Firestore
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc, 
    doc,
    query
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==============================================
// LÓGICA DO FIREBASE
// (Todo o código das abas foi removido)
// ==============================================
document.addEventListener('firebase-ready', () => {
    
    // Pega as variáveis globais do Firebase
    const db = window.firebaseDB;
    const appId = window.firebaseAppId;
    
    if (!db || !appId) {
        console.error("Firebase DB ou App ID não encontrados.");
        alert("Erro fatal: Firebase não carregou. Verifique o HTML.");
        return;
    }

    // ==============================================
    // LÓGICA DE CADASTRO DE SALAS
    // ==============================================
    
    // Define o caminho da coleção de "salas"
    const salasCollectionPath = `/artifacts/${appId}/public/data/salas`;
    const salasCollection = collection(db, salasCollectionPath);

    const formSala = document.getElementById('form-cadastro-sala');
    const listaSalasContainer = document.getElementById('lista-salas-container');

    // --- 1. OUVINTE EM TEMPO REAL (Salas) ---
    const qSalas = query(salasCollection); 
    
    onSnapshot(qSalas, (snapshot) => {
        listaSalasContainer.innerHTML = ''; 
        if (snapshot.empty) {
            listaSalasContainer.innerHTML = "<p>Nenhuma sala cadastrada ainda.</p>";
            return;
        }
        
        const salas = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        salas.sort((a, b) => a.id.localeCompare(b.id)); // Ordena por ID

        salas.forEach((sala) => {
            const salaElement = document.createElement('div');
            salaElement.className = 'alocacao alocacao-sucesso'; 
            salaElement.innerHTML = `
                <div>
                    <strong>[${sala.id}] ${sala.bloco} - ${sala.tipo}</strong>
                    (Cap: ${sala.capacidade})
                    <span>Ativa: ${sala.usarParaAlocacao ? 'Sim' : 'Não'}</span>
                </div>
                <button class="delete-btn" data-id="${sala.docId}" data-collection="salas">Excluir</button>
            `;
            listaSalasContainer.appendChild(salaElement);
        });
    }, (error) => {
        console.error("Erro ao 'assistir' a coleção de salas: ", error);
        listaSalasContainer.innerHTML = "<p>Erro ao carregar salas.</p>";
    });

    // --- 2. CADASTRAR NOVA SALA (addDoc) ---
    formSala.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const novaSala = {
            id: document.getElementById('sala-id').value.trim().toUpperCase(),
            bloco: document.getElementById('sala-bloco').value.trim().toUpperCase(),
            capacidade: parseInt(document.getElementById('sala-capacidade').value),
            tipo: document.getElementById('sala-tipo').value,
            usarParaAlocacao: document.getElementById('sala-usar').checked
        };

        try {
            await addDoc(salasCollection, novaSala);
            formSala.reset(); 
        } catch (e) {
            console.error("Erro ao adicionar sala: ", e);
        }
    });

    // ==============================================
    // LÓGICA DE CADASTRO DE TURMAS
    // ==============================================

    // Define o caminho da coleção de "turmas"
    const turmasCollectionPath = `/artifacts/${appId}/public/data/turmas`;
    const turmasCollection = collection(db, turmasCollectionPath);

    const formTurma = document.getElementById('form-cadastro-turma');
    const listaTurmasContainer = document.getElementById('lista-turmas-container');

    // --- 1. OUVINTE EM TEMPO REAL (Turmas) ---
    const qTurmas = query(turmasCollection); 
    
    onSnapshot(qTurmas, (snapshot) => {
        listaTurmasContainer.innerHTML = ''; 
        if (snapshot.empty) {
            listaTurmasContainer.innerHTML = "<p>Nenhuma turma manual cadastrada.</p>";
            return;
        }

        const turmas = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
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
                <button class="delete-btn" data-id="${turma.docId}" data-collection="turmas">Excluir</button>
            `;
            listaTurmasContainer.appendChild(turmaElement);
        });
    }, (error) => {
        console.error("Erro ao 'assistir' a coleção de turmas: ", error);
        listaTurmasContainer.innerHTML = "<p>Erro ao carregar turmas.</p>";
    });

    // --- 2. CADASTRAR NOVA TURMA (addDoc) ---
    formTurma.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const novaTurma = {
            disciplina: document.getElementById('turma-disciplina').value,
            codDisciplina: document.getElementById('turma-cod-disciplina').value,
            alunos: parseInt(document.getElementById('turma-alunos').value),
            tipo: document.getElementById('turma-tipo').value,
            blocoDesejado: document.getElementById('turma-bloco').value.trim().toUpperCase() || null,
            dia: document.getElementById('turma-dia').value,
            turno: document.getElementById('turma-turno').value
        };

        try {
            await addDoc(turmasCollection, novaTurma);
            formTurma.reset(); 
        } catch (e) {
            console.error("Erro ao adicionar turma: ", e);
        }
    });

    // ==============================================
    // LÓGICA DE DELETAR (Unificada)
    // ==============================================
    
    // Adiciona um único "ouvinte" ao 'main' para pegar cliques nos botões de deletar
    const mainContainer = document.querySelector('main');
    
    mainContainer.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('delete-btn')) {
            return; // Sai se não for um botão de deletar
        }

        const docId = e.target.dataset.id;
        const collectionType = e.target.dataset.collection; // "salas" ou "turmas"
        
        let collectionPath = '';
        let confirmMessage = '';

        if (collectionType === 'salas') {
            collectionPath = salasCollectionPath;
            confirmMessage = "Tem certeza que quer excluir esta sala?";
        } else if (collectionType === 'turmas') {
            collectionPath = turmasCollectionPath;
            confirmMessage = "Tem certeza que quer excluir esta turma?";
        } else {
            return; // Tipo de coleção desconhecido
        }

        // Pede confirmação
        if (window.confirm(confirmMessage)) {
            try {
                const docRef = doc(db, collectionPath, docId);
                await deleteDoc(docRef);
            } catch (e) {
                console.error(`Erro ao deletar item da coleção ${collectionType}: `, e);
            }
        }
    });

});