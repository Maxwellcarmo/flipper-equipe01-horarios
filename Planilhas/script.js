/* ========================================================================
 * BANCO DE DADOS DE SALAS (OFERTA)
 * Este é o "Inventário" de salas físicas.
 * O sistema irá automaticamente transformar isso em "slots" de tempo.
 * (ex: A101 -> A101-Seg-Manha, A101-Seg-Tarde, A101-Seg-Noite, ...)
 *
 * Propriedade importante:
 * - usarParaAlocacao: (true/false)
 * - `false` bloqueia a sala (ex: Auditórios, salas de coordenação, em reforma)
 * ========================================================================
 */
const DATABASE_SALAS = [
    // --- Bloco A (Ex: Humanas) ---
    { id: "A101", bloco: "A", capacidade: 50, tipo: "Normal", usarParaAlocacao: true },
    { id: "A102", bloco: "A", capacidade: 50, tipo: "Normal", usarParaAlocacao: true },
    { id: "A103", bloco: "A", capacidade: 80, tipo: "Normal", usarParaAlocacao: true },
    { id: "A104 (Lab)", bloco: "A", capacidade: 30, tipo: "Laboratorio", usarParaAlocacao: true },
    { id: "A105 (Coord)", bloco: "A", capacidade: 20, tipo: "Normal", usarParaAlocacao: false }, // BLOQUEADA

    // --- Bloco B ---
    { id: "B201", bloco: "B", capacidade: 60, tipo: "Normal", usarParaAlocacao: true },
    { id: "B202", bloco: "B", capacidade: 60, tipo: "Normal", usarParaAlocacao: true },

    // --- Bloco C (Ex: Exatas) ---
    { id: "C301", bloco: "C", capacidade: 70, tipo: "Normal", usarParaAlocacao: true },
    { id: "C302", bloco: "C", capacidade: 70, tipo: "Normal", usarParaAlocacao: true },
    { id: "C303 (Lab)", bloco: "C", capacidade: 40, tipo: "Laboratorio", usarParaAlocacao: true },
    { id: "C304 (Lab)", bloco: "C", capacidade: 40, tipo: "Laboratorio", usarParaAlocacao: true },

    // --- Bloco D / E ---
    { id: "D101 (Auditório)", bloco: "D", capacidade: 300, tipo: "Normal", usarParaAlocacao: false }, // BLOQUEADO
    { id: "E101", bloco: "E", capacidade: 50, tipo: "Normal", usarParaAlocacao: true },

    // --- Bloco G (Ex: Odonto) ---
    { id: "G101 (Lab)", bloco: "G", capacidade: 30, tipo: "Laboratorio", usarParaAlocacao: true },
    { id: "G102 (Lab)", bloco: "G", capacidade: 30, tipo: "Laboratorio", usarParaAlocacao: true },
    { id: "G103", bloco: "G", capacidade: 60, tipo: "Normal", usarParaAlocacao: true },
];

// --- Constantes do Sistema de Horário ---
// Mapeia os dias da planilha para os nossos dias
const DIAS_SEMANA = {
    'Seg': 'Segunda',
    'Ter': 'Terça',
    'Qua': 'Quarta',
    'Qui': 'Quinta',
    'Sex': 'Sexta',
    'Sab': 'Sábado',
    'Dom': 'Domingo' // Incluído para caso haja dados, embora incomum
};
// Mapeia os turnos da planilha para os nossos turnos
const TURNOS = {
    'M': 'Manhã',
    'T': 'Tarde',
    'N': 'Noite'
};
// ========================================================================


// --- Pega os elementos do HTML ---
const inputArquivo = document.getElementById('arquivoCSV');
const fileNameSpan = document.getElementById('fileName');
const logStatus = document.getElementById('logStatus');
const sucessoContainer = document.getElementById('sucessoContainer');
const falhaContainer = document.getElementById('falhaContainer');

// --- Adiciona os "Ouvintes" de Eventos ---
document.addEventListener('DOMContentLoaded', () => {
    log("Sistema pronto. Aguardando arquivo CSV...");
});

inputArquivo.addEventListener('change', handleFileSelect);

/**
 * Função principal, disparada quando um arquivo é selecionado
 */
function handleFileSelect(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    fileNameSpan.textContent = arquivo.name;
    limparResultados();
    log(`Arquivo "${arquivo.name}" selecionado.`);
    log("Lendo arquivo...");

    const leitor = new FileReader();
    leitor.readAsText(arquivo, 'UTF-8');
    
    leitor.onload = (e) => {
        const textoDoArquivo = e.target.result;
        log("Arquivo lido com sucesso. Convertendo CSV para JSON...");
        
        try {
            const turmasCSV = csvParaJSON(textoDoArquivo);
            log(`Conversão concluída. ${turmasCSV.length} linhas (turmas) encontradas.`);
            log("Iniciando processo de distribuição...");
            
            // A MÁGICA COMEÇA AQUI
            iniciarDistribuicao(turmasCSV);

        } catch (erro) {
            log(`ERRO na conversão: ${erro.message}`, 'erro');
            console.error(erro);
        }
    };
    
    leitor.onerror = () => {
        log("ERRO ao ler o arquivo.", 'erro');
    };
}

/**
 * Converte um texto CSV (separado por vírgula) em um array de objetos JSON
 */
function csvParaJSON(csvText) {
    const linhas = csvText.trim().split('\n');
    if (linhas.length <= 1) throw new Error("Arquivo CSV vazio ou sem cabeçalho.");
    
    // Remove (CR) da string do cabeçalho, se houver
    const cabecalhos = linhas.shift().trim().replace(/\r/g, "").split(',');
    
    const resultado = [];
    
    for (const linha of linhas) {
        if (!linha.trim()) continue; // Pula linhas em branco

        // Remove (CR) da linha inteira
        const valores = linha.trim().replace(/\r/g, "").split(',');
        const objeto = {};

        for (let i = 0; i < cabecalhos.length; i++) {
            if (i < valores.length) {
                // Remove aspas extras do início e fim, se existirem
                const chave = cabecalhos[i].trim().replace(/^"|"$/g, '');
                const valor = valores[i] ? valores[i].trim().replace(/^"|"$/g, '') : "";
                objeto[chave] = valor;
            }
        }
        resultado.push(objeto);
    }
    return resultado;
}


/**
 * Orquestra todo o processo de distribuição
 */
function iniciarDistribuicao(turmasCSV) {
    // 1. Processar e Limpar os dados ("Demanda")
    const turmasProcessadas = processarTurmas(turmasCSV);
    log(`Total de ${turmasProcessadas.length} turmas válidas para alocação.`);

    // 2. Agrupar turmas para junção (regra de negócio)
    const gruposDeTurmas = agruparTurmas(turmasProcessadas);
    log(`Turmas agrupadas para junção. Total de ${gruposDeTurmas.length} alocações necessárias.`);

    // 3. Preparar as salas ("Oferta")
    // Gera "Slots" (Sala-Dia-Turno)
    let slotsDisponiveis = gerarSlotsDisponiveis(DATABASE_SALAS);
    const salasBloqueadas = DATABASE_SALAS.filter(s => s.usarParaAlocacao === false).length;
    log(`${slotsDisponiveis.length} SLOTS disponíveis para alocação (de ${DATABASE_SALAS.length} salas físicas, ${salasBloqueadas} bloqueadas).`);

    // 4. Executar o algoritmo de alocação
    const { alocacoes, falhas } = alocarGrupos(gruposDeTurmas, slotsDisponiveis);

    // 5. Exibir os resultados
    exibirResultados(alocacoes, falhas);
}

/**
 * Gera o "inventário" de slots (Sala-Dia-Turno)
 */
function gerarSlotsDisponiveis(salasFisicas) {
    const slots = [];
    const dias = Object.keys(DIAS_SEMANA); // ['Seg', 'Ter', ...]
    const turnos = Object.keys(TURNOS); // ['M', 'T', 'N']

    // Filtra apenas salas usáveis
    const salasUsaveis = salasFisicas.filter(s => s.usarParaAlocacao !== false);

    for (const sala of salasUsaveis) {
        for (const dia of dias) {
            for (const turno of turnos) {
                slots.push({
                    // ID único do slot (ex: "A101-Seg-N")
                    id: `${sala.id}-${dia}-${turno}`,
                    salaId: sala.id, // ID da sala física
                    // Copia todas as propriedades da sala
                    bloco: sala.bloco,
                    capacidade: sala.capacidade,
                    tipo: sala.tipo,
                    // Adiciona as propriedades de tempo
                    dia: dia,
                    turno: turno
                });
            }
        }
    }
    return slots;
}


/**
 * Etapa 1: Limpa e padroniza os dados da planilha
 * Extrai Dia e Turno
 */
function processarTurmas(turmasCSV) {
    return turmasCSV.map(turma => {
        const alunos = parseInt(turma.Alunos) || 0;
        const chPratica = parseInt(turma['CH Prática']) || 0;
        
        const precisaLab = chPratica > 0;
        const tipoNecessario = precisaLab ? 'Laboratorio' : 'Normal';
        
        const blocoDesejado = turma['Cód.Bloco'] || null;
        
        // Extrai Dia e Turno
        const dia = turma['Desc.Dia'];
        const turno = turma.Turno;

        return {
            id: turma.Classe,
            disciplina: turma.Disciplina,
            codDisciplina: turma['Cód.Disciplina'],
            alunos: alunos,
            tipoNecessario: tipoNecessario,
            blocoDesejado: blocoDesejado,
            dia: dia,   // ex: 'Sex'
            turno: turno  // ex: 'N'
        };
    }).filter(turma => {
        // Filtra turmas sem alunos ou sem horário definido
        const diaValido = turma.dia && DIAS_SEMANA[turma.dia];
        const turnoValido = turma.turno && TURNOS[turma.turno];
        if (turma.alunos > 0 && (!diaValido || !turnoValido)) {
            log(`Turma "${turma.disciplina}" (ID: ${turma.id}) ignorada: Dia ('${turma.dia}') ou Turno ('${turma.turno}') inválido.`, 'aviso');
        }
        return turma.alunos > 0 && diaValido && turnoValido;
    });
}

/**
 * Etapa 2: Agrupa turmas com mesmo Cód.Disciplina, Dia e Turno para junção
 */
function agruparTurmas(turmasProcessadas) {
    const mapaDeGrupos = new Map();

    for (const turma of turmasProcessadas) {
        // Chave de junção: Mesmo Cód.Disciplina, no Mesmo Dia, no Mesmo Turno
        const chaveGrupo = `${turma.codDisciplina}-${turma.dia}-${turma.turno}`;

        if (!mapaDeGrupos.has(chaveGrupo)) {
            mapaDeGrupos.set(chaveGrupo, {
                // Info do Grupo
                codDisciplina: turma.codDisciplina,
                disciplina: turma.disciplina,
                totalAlunos: 0,
                // Requisitos do Grupo
                tipoNecessario: 'Normal',
                blocoDesejado: null,
                dia: turma.dia,
                turno: turma.turno,
                // Rastreamento
                turmasOriginais: [],
                sufixo: '',
                idOriginal: `grupo_${chaveGrupo}`
            });
        }

        const grupo = mapaDeGrupos.get(chaveGrupo);
        
        grupo.totalAlunos += turma.alunos;
        grupo.turmasOriginais.push(turma.id);
        
        // Se UMA das turmas precisar de Lab, o GRUPO todo precisa
        if (turma.tipoNecessario === 'Laboratorio') {
            grupo.tipoNecessario = 'Laboratorio';
        }
        // Se UMA das turmas especificar um Bloco, o GRUPO todo herda
        if (turma.blocoDesejado) {
            grupo.blocoDesejado = turma.blocoDesejado;
        }
    }

    return Array.from(mapaDeGrupos.values());
}


/**
 * Etapa 3: O Algoritmo de Alocação (com Divisão de Turma)
 * Aloca "Slots" em vez de "Salas"
 */
function alocarGrupos(gruposDeTurmas, slotsDisponiveis) {
    let alocacoes = [];
    let falhas = [];

    // Fila de grupos para alocar (MAIOR para o MENOR)
    // Isso é crucial para que as turmas grandes peguem as salas grandes primeiro
    let gruposParaAlocar = gruposDeTurmas.sort((a, b) => b.totalAlunos - a.totalAlunos);

    let iteracao = 0;
    const MAX_ITERACOES = gruposParaAlocar.length * 10; // Trava de segurança

    while (gruposParaAlocar.length > 0 && iteracao < MAX_ITERACOES) {
        iteracao++;
        
        const grupo = gruposParaAlocar.shift(); // Pega o maior grupo da fila

        // 1. Encontra todos os SLOTS que PODEM receber o grupo
        const candidatos = slotsDisponiveis.filter(slot => {
            // Regra 1: Capacidade
            const temCapacidade = slot.capacidade >= grupo.totalAlunos;
            // Regra 2: Tipo de Sala (Normal vs Lab)
            const tipoCorreto = slot.tipo === grupo.tipoNecessario;
            // Regra 3: Bloco (Se o grupo exigir um, a sala deve bater)
            const blocoCorreto = !grupo.blocoDesejado || (slot.bloco === grupo.blocoDesejado);
            // Regra 4: Dia (ex: 'Sex' === 'Sex')
            const diaCorreto = slot.dia === grupo.dia;
            // Regra 5: Turno (ex: 'N' === 'N')
            const turnoCorreto = slot.turno === grupo.turno;
            
            return temCapacidade && tipoCorreto && blocoCorreto && diaCorreto && turnoCorreto;
        });

        // 2. Encontra o MELHOR slot (o da menor sala que cabe o grupo)
        if (candidatos.length > 0) {
            // Ordena os candidatos da menor capacidade para a maior
            candidatos.sort((a, b) => a.capacidade - b.capacidade);
            const slotAlocado = candidatos[0]; // Pega a sala mais "apertada"

            // SUCESSO!
            alocacoes.push({ grupo, sala: slotAlocado }); // 'sala' agora é um 'slot'

            // IMPORTANTE: Remove o SLOT da lista de disponíveis
            slotsDisponiveis = slotsDisponiveis.filter(s => s.id !== slotAlocado.id);
        
        } else {
            // FALHA! Nenhuma sala encontrada.
            // Tentar dividir a turma

            // 1. Encontra a MAIOR sala disponível que bate com TIPO, BLOCO, DIA e TURNO
            const maiorSlotCompativelLista = slotsDisponiveis
                .filter(slot => {
                    const tipoCorreto = slot.tipo === grupo.tipoNecessario;
                    const blocoCorreto = !grupo.blocoDesejado || (slot.bloco === grupo.blocoDesejado);
                    const diaCorreto = slot.dia === grupo.dia;
                    const turnoCorreto = slot.turno === grupo.turno;
                    return tipoCorreto && blocoCorreto && diaCorreto && turnoCorreto; // Ignora capacidade
                })
                .sort((a, b) => b.capacidade - a.capacity); // Pega o maior
            
            if (maiorSlotCompativelLista.length > 0) {
                const slotParaDividir = maiorSlotCompativelLista[0]; // Pega o maior slot compatível

                // Verifica se a falha foi APENAS por capacidade
                if (grupo.totalAlunos > slotParaDividir.capacidade) {
                    
                    log(`TURMA GRANDE: "${grupo.disciplina}" (${grupo.totalAlunos} alunos) no [${grupo.dia}-${grupo.turno}]. Dividindo...`, 'aviso');

                    const sufixoAtual = grupo.sufixo || '';
                    const proximoSufixoLetra = String.fromCharCode((sufixoAtual.charCodeAt(0) || 64) + 1); // A -> B

                    // Grupo A (vai para a maior sala encontrada)
                    const grupoA = { ...grupo, totalAlunos: slotParaDividir.capacidade, sufixo: `${sufixoAtual || ' '} (Turma ${proximoSufixoLetra})` };
                    
                    // Grupo B (o que sobrou, volta para a fila)
                    const grupoB = { ...grupo, totalAlunos: grupo.totalAlunos - slotParaDividir.capacidade, sufixo: ` (Turma ${String.fromCharCode(proximoSufixoLetra.charCodeAt(0) + 1)})` };

                    // Adiciona os novos grupos DE VOLTA na fila, em ordem
                    inserirOrdenado(gruposParaAlocar, grupoA);
                    inserirOrdenado(gruposParaAlocar, grupoB);

                } else {
                    // Falha por outro motivo (ex: não existe Lab no Bloco G)
                    let motivo = `Capacidade OK, mas falha em TIPO/BLOCO. Req: ${grupo.totalAlunos} alunos, tipo "${grupo.tipoNecessario}", Dia: ${grupo.dia}, Turno: ${grupo.turno}`;
                    if (grupo.blocoDesejado) motivo += `, Bloco "${grupo.blocoDesejado}"`;
                    falhas.push({ grupo, motivo });
                }
            } else {
                // Falha total, não existe NENHUMA sala compatível (nem pequena)
                let motivo = `Nenhum slot (de qualquer tamanho) encontrado. Req: tipo "${grupo.tipoNecessario}", Dia: ${grupo.dia}, Turno: ${grupo.turno}`;
                if (grupo.blocoDesejado) motivo += `, Bloco "${grupo.blocoDesejado}"`;
                falhas.push({ grupo, motivo });
            }
        }
    } // Fim do while

    if (iteracao >= MAX_ITERACOES) {
        log("ERRO: Limite de iterações atingido. Verifique se há loop infinito na divisão de turmas.", 'erro');
        falhas.push(...gruposParaAlocar.map(g => ({ grupo: g, motivo: "Loop infinito detectado" })));
    }

    return { alocacoes, falhas };
}

/**
 * Função auxiliar para inserir um item em uma lista
 * mantendo a ordem decrescente (maior para menor)
 */
function inserirOrdenado(lista, item) {
    const index = lista.findIndex(g => g.totalAlunos < item.totalAlunos);
    if (index === -1) {
        lista.push(item);
    } else {
        lista.splice(index, 0, item);
    }
}

/**
 * Etapa 4: Exibe os resultados no HTML
 * Exibe o dia e turno da alocação
 */
function exibirResultados(alocacoes, falhas) {
    log(`Processo concluído. ${alocacoes.length} alocações com sucesso, ${falhas.length} falhas.`);

    // Exibe Sucessos
    sucessoContainer.innerHTML = alocacoes.map(item => {
        const nomeDisciplina = `${item.grupo.disciplina}${item.grupo.sufixo || ''}`;
        
        // Mapeia de 'N' para 'Noite'
        const diaFormatado = DIAS_SEMANA[item.sala.dia] || item.sala.dia;
        const turnoFormatado = TURNOS[item.sala.turno] || item.sala.turno;

        return `
            <div class="alocacao alocacao-sucesso">
                <strong>[${item.sala.salaId}] ${nomeDisciplina}</strong>
                <br>
                Alunos: ${item.grupo.totalAlunos} 
                (Turmas Originais: ${item.grupo.turmasOriginais.join(', ')})
                <br>
                <strong>Sala: ${item.sala.salaId} (Cap: ${item.sala.capacidade})</strong>
                <br>
                <strong>Horário: ${diaFormatado} - ${turnoFormatado}</strong>
            </div>
        `;
    }).join('');

    // Exibe Falhas
    falhaContainer.innerHTML = falhas.map(item => {
        const nomeDisciplina = `${item.grupo.disciplina}${item.grupo.sufixo || ''}`;
        
        const diaFormatado = DIAS_SEMANA[item.grupo.dia] || item.grupo.dia;
        const turnoFormatado = TURNOS[item.grupo.turno] || item.grupo.turno;

        return `
            <div class="alocacao alocacao-falha">
                <strong>${nomeDisciplina}</strong>
                <br>
                Alunos: ${item.grupo.totalAlunos} 
                (Turmas Originais: ${item.grupo.turmasOriginais.join(', ')})
                <br>
                <strong>Requisito: ${diaFormatado} - ${turnoFormatado}</strong>
                <br>
                <strong style="color: var(--cor-falha);">Motivo:</strong> ${item.motivo}
            </div>
        `;
    }).join('');
}

// --- Funções Utilitárias ---

function limparResultados() {
    logStatus.innerHTML = '';
    sucessoContainer.innerHTML = '';
    falhaContainer.innerHTML = '';
    fileNameSpan.textContent = 'Nenhum arquivo selecionado';
}

function log(mensagem, tipo = 'info') {
    // Adiciona a mensagem ao console do navegador
    console.log(mensagem);
    
    // Adiciona a mensagem ao log visível na página
    const classe = `log-${tipo}`; // info, sucesso, erro, aviso
    logStatus.innerHTML += `<span class="${classe}">[${new Date().toLocaleTimeString()}] ${mensagem}</span>\n`;
    
    // Rola o log para o final
    logStatus.scrollTop = logStatus.scrollHeight;
}