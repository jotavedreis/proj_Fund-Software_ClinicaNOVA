// Script para o painel do dentista - com suporte LocalStorage
import { saveData, loadData, onDataChange, pushToArray, removeFromArray, unshiftToArray } from './backend-helper.js';
import { initializeNotifications, sendLocalNotification } from './notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
    const raw = localStorage.getItem('dentist');
    if (!raw) {
        // não autenticado: volta ao login
        window.location.href = 'login-dentista.html';
        return;
    }

    let dentist;
    try {
        dentist = JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem('dentist');
        window.location.href = 'login-dentista.html';
        return;
    }

    // Preenche dados do dentista
    document.getElementById('dentist-name-header').textContent = `${dentist.name} ❘ Consultório ${dentist.consultorio}`;
    document.getElementById('dentist-consultorio').style.display = 'none';

    // Detecta se é mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.matchMedia('(max-width: 768px)').matches;
    console.log('📱 Tipo de dispositivo:', isMobileDevice ? 'Mobile' : 'Desktop/Tablet');

    const notificationsToggle = document.getElementById('notifications-toggle');
    let notificationsEnabled = false;

    // Verifica se o navegador suporta notificações
    const notificationsSupported = 'Notification' in window;
    console.log('🔔 Notificações suportadas:', notificationsSupported);

    if (!notificationsSupported) {
        // Desabilita o toggle se notificações não são suportadas
        if (notificationsToggle) {
            notificationsToggle.disabled = true;
            notificationsToggle.parentElement.style.opacity = '0.5';
        }
        console.log('⚠️ Notificações não suportadas neste navegador');
    } else {
        // Verifica se as notificações já foram ativadas anteriormente
        const savedNotificationState = localStorage.getItem(`notifications-${dentist.name}`);
        
        // Se já está permitido e estava ativado antes, marca o toggle
        if (Notification.permission === 'granted' && savedNotificationState === 'enabled') {
            notificationsToggle.checked = true;
            notificationsEnabled = true;
            console.log('✓ Notificações já estavam ativadas');
        }

        // Handler do toggle
        notificationsToggle.addEventListener('change', async () => {
            if (notificationsToggle.checked) {
                // Usuário quer ativar notificações
                console.log('🔔 Ativando notificações...');
                const granted = await initializeNotifications({ userInitiated: true });
                
                if (granted && Notification.permission === 'granted') {
                    notificationsEnabled = true;
                    localStorage.setItem(`notifications-${dentist.name}`, 'enabled');
                    console.log('✓ Notificações ativadas com sucesso');
                } else {
                    // Se não conseguiu ativar, desmarca o toggle
                    notificationsToggle.checked = false;
                    notificationsEnabled = false;
                    console.log('⚠️ Não foi possível ativar as notificações');
                }
            } else {
                // Usuário desativou notificações
                notificationsEnabled = false;
                localStorage.setItem(`notifications-${dentist.name}`, 'disabled');
                console.log('🔕 Notificações desativadas');
            }
        });
    }

    // Botão de logout
    const logoutBtn = document.querySelector('header a');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('dentist');
        window.location.href = 'login-dentista.html';
    });

    const patientsWaitingDiv = document.getElementById('patients-waiting');
    const patientsHistoryDiv = document.getElementById('patients-history');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Variável para rastrear pacientes já notificados
    let notifiedPatients = new Set();

    // Elementos da modal
    const callModal = document.getElementById('call-modal');
    const modalPatientName = document.getElementById('modal-patient-name');
    const modalPatientInfo = document.getElementById('modal-patient-info');
    const modalYesBtn = document.getElementById('modal-yes-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalRecallBtn = document.getElementById('modal-recall-btn');

    // Elementos do modal de confirmação de exclusão
    const deleteHistoryModal = document.getElementById('delete-history-modal');
    const confirmDeleteHistoryBtn = document.getElementById('confirm-delete-history-btn');
    const cancelDeleteHistoryBtn = document.getElementById('cancel-delete-history-btn');

    let currentPatientForModal = null;
    let isModalFromWaitingPatients = false; // Flag para saber se a modal foi aberta de pacientes aguardando

    // Botão para limpar histórico (apenas oculta para o dentista)
    clearHistoryBtn.addEventListener('click', () => {
        deleteHistoryModal.style.display = 'flex';
    });

    // Confirmar exclusão do histórico
    confirmDeleteHistoryBtn.addEventListener('click', async () => {
        const history = await loadData('call-history') || [];

        // Pega IDs das entradas deste dentista para ocultar
        const myHistoryIds = history
            .filter(p => p.doctorName === dentist.name)
            .map(p => p.id);

        // Armazena IDs ocultos para este dentista
        const hiddenKey = `hidden-history-${dentist.name}`;
        const hidden = await loadData(hiddenKey) || [];
        const updatedHidden = [...new Set([...hidden, ...myHistoryIds])];
        await saveData(hiddenKey, updatedHidden);
        
        await loadPatientHistory();

        // Mostrar mensagem de sucesso no próprio modal
        const modalContent = document.getElementById('delete-modal-content');
        const modalTitle = document.getElementById('delete-modal-title');
        const modalMessage = document.getElementById('delete-modal-message');
        const modalSubmessage = document.getElementById('delete-modal-submessage');
        const modalButtons = document.getElementById('delete-modal-buttons');

        modalTitle.textContent = '✓ Histórico Ocultado';
        modalTitle.style.color = '#4CAF50';
        modalMessage.textContent = 'Seu histórico foi ocultado com sucesso!';
        modalSubmessage.style.display = 'none';
        modalButtons.style.display = 'none';

        // Fecha o modal após 1.5 segundos
        setTimeout(() => {
            deleteHistoryModal.style.display = 'none';
            // Restaura o modal para o estado original
            modalTitle.textContent = '⚠️ Confirmar Exclusão';
            modalTitle.style.color = '#8B0000';
            modalMessage.textContent = 'Deseja ocultar seu histórico de chamadas?';
            modalSubmessage.textContent = '(O histórico continuará visível na recepção)';
            modalSubmessage.style.display = 'block';
            modalButtons.style.display = 'flex';
        }, 1500);
    });

    // Cancelar exclusão do histórico
    cancelDeleteHistoryBtn.addEventListener('click', () => {
        deleteHistoryModal.style.display = 'none';
    });

    // Handlers para botões da modal
    modalYesBtn.addEventListener('click', () => {
        callModal.style.display = 'none';
        if (currentPatientForModal) {
            confirmPatientDone(currentPatientForModal);
        }
    });

    modalCloseBtn.addEventListener('click', () => {
        callModal.style.display = 'none';
        currentPatientForModal = null;
        isModalFromWaitingPatients = false;
    });

    modalRecallBtn.addEventListener('click', async () => {
        console.log('🔄 Botão Chamar Novamente clicado');
        console.log('currentPatientForModal:', currentPatientForModal);
        
        if (currentPatientForModal) {
            try {
                // Usa os dados normalizados do paciente
                const patientName = currentPatientForModal.name || currentPatientForModal.patientName;
                
                // Registra nova chamada no painel de chamadas
                const callNotification = {
                    id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    patientName: patientName,
                    doctorName: dentist.name,
                    consultorio: dentist.consultorio,
                    service: currentPatientForModal.service || '',
                    otherServiceDetail: currentPatientForModal.otherServiceDetail || '',
                    timestamp: new Date().toISOString()
                };
                
                console.log('📢 Chamando novamente:', callNotification);
                await unshiftToArray('call-notifications', callNotification);
                console.log('✓ Chamada registrada com sucesso');
                
                // Não fecha a modal - mantém aberta para chamar novamente se necessário
            } catch (error) {
                console.error('❌ Erro ao chamar novamente:', error);
            }
        } else {
            console.warn('⚠️ Nenhum paciente selecionado para recall');
        }
    });

    // Função para formatar data e hora
    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Função para carregar pacientes aguardando para este dentista
    async function loadWaitingPatients(patients) {
        if (!patients) {
            patients = await loadData('pending-patients') || [];
        }

        // Filtra pacientes para este dentista
        const myPatients = patients.filter(p => p.doctor === dentist.name);

        // Ordena por urgência (urgentes primeiro)
        myPatients.sort((a, b) => {
            if (a.urgente === b.urgente) return 0;
            return a.urgente ? -1 : 1;
        });

        patientsWaitingDiv.innerHTML = '';
        
        if (myPatients.length === 0) {
            patientsWaitingDiv.innerHTML = '<p>Nenhum paciente aguardando</p>';
            return;
        }

        myPatients.forEach((patient, index) => {
            const div = document.createElement('div');
            div.className = 'patient-item';

            const serviceName = patient.service === 'Outro' 
                ? patient.otherServiceDetail 
                : patient.service;

            div.innerHTML = `
                <div class="patient-info">
                    <p class="patient-name">${patient.name}${patient.urgente ? '<span class="urgent-badge">PRIORITÁRIO</span>' : ''}</p>
                    <p class="patient-service">Serviço: ${serviceName}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button" type="button">Chamar</button>
                </div>
            `;

            const callBtn = div.querySelector('.patient-button');
            callBtn.addEventListener('click', () => {
                callPatient(patient);
            });

            // Clique na linha para abrir modal sem chamar
            div.querySelector('.patient-info').addEventListener('click', (e) => {
                e.stopPropagation();
                showCallModalWithoutCalling(patient);
            });

            patientsWaitingDiv.appendChild(div);

            // Envia notificação apenas para pacientes novos (que não foram notificados ainda) e se as notificações estiverem ativadas
            const patientKey = `${patient.name}-${patient.service}`;
            if (!notifiedPatients.has(patientKey) && notificationsEnabled) {
                notifiedPatients.add(patientKey);
                sendLocalNotification(
                    `Novo paciente: ${patient.name}`,
                    {
                        body: `Serviço: ${serviceName}${patient.urgente ? ' (URGENTE)' : ''}`,
                        tag: `patient-${patientKey}`
                    }
                );
            }
        });
    }

    // Função para carregar histórico de pacientes chamados
    async function loadPatientHistory(history) {
        if (!history) {
            history = await loadData('call-history') || [];
        }

        // Carrega IDs ocultos para este dentista
        const hiddenKey = `hidden-history-${dentist.name}`;
        const hidden = await loadData(hiddenKey) || [];

        // Filtra histórico deste dentista e remove entradas ocultas
        const myHistory = history
            .filter(p => p.doctorName === dentist.name)
            .filter(p => !hidden.includes(p.id));

        // Ordena por data mais recente primeiro
        myHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        patientsHistoryDiv.innerHTML = '';
        
        if (myHistory.length === 0) {
            patientsHistoryDiv.innerHTML = '<p>Nenhum paciente chamado ainda</p>';
            return;
        }

        myHistory.forEach((patient) => {
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.style.padding = '8px';
            div.style.backgroundColor = '#f0f0f0';
            div.style.borderRadius = '4px';

            div.innerHTML = `
                <strong>${patient.patientName}</strong><br>
                Consultório: ${patient.consultorio}<br>
                <small>Chamado em: ${formatDateTime(patient.timestamp)}</small>
            `;

            // Adiciona event listener para abrir a modal quando clica no histórico
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                // Abre modal com o paciente do histórico
                showCallModal(patient);
            });

            patientsHistoryDiv.appendChild(div);
        });
    }

    // Função para chamar paciente
    async function callPatient(patient) {
        console.log('📋 Paciente chamado:', patient);
        
        // Normaliza os dados para ter tanto 'name' quanto 'patientName'
        const normalizedPatient = {
            ...patient,
            name: patient.name || patient.patientName,
            patientName: patient.patientName || patient.name,
            doctor: patient.doctor || dentist.name,
            consultorio: patient.consultorio || dentist.consultorio
        };
        
        currentPatientForModal = normalizedPatient; // Armazena os dados completos e normalizados
        
        // Preenche a modal com informações do paciente
        modalPatientName.textContent = normalizedPatient.name || normalizedPatient.patientName;
        const serviceName = normalizedPatient.service === 'Outro' 
            ? normalizedPatient.otherServiceDetail 
            : normalizedPatient.service;
        modalPatientInfo.textContent = `Serviço: ${serviceName}`;
        
        // Registra chamada no painel de chamadas (call-notifications)
        const callNotification = {
            id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientName: normalizedPatient.name || normalizedPatient.patientName,
            doctorName: dentist.name,
            consultorio: dentist.consultorio,
            service: normalizedPatient.service || '',
            otherServiceDetail: normalizedPatient.otherServiceDetail || '',
            timestamp: new Date().toISOString()
        };

        console.log('📢 Enviando chamada:', callNotification);
        await unshiftToArray('call-notifications', callNotification);

        // Exibe a modal
        callModal.style.display = 'flex';
    }

    // Função para exibir modal com paciente do histórico
    function showCallModal(patient) {
        console.log('📜 Paciente do histórico selecionado:', patient);
        isModalFromWaitingPatients = false;
        currentPatientForModal = patient; // Armazena para possível recall
        modalPatientName.textContent = patient.patientName;
        modalPatientInfo.textContent = `Consultório: ${patient.consultorio}`;
        callModal.style.display = 'flex';
    }

    // Função para abrir modal sem chamar o paciente (apenas visualizar/recall)
    function showCallModalWithoutCalling(patient) {
        console.log('👁️ Abrindo modal para visualização:', patient);
        isModalFromWaitingPatients = true;
        const normalizedPatient = {
            ...patient,
            name: patient.name || patient.patientName,
            patientName: patient.patientName || patient.name,
            doctor: patient.doctor || dentist.name,
            consultorio: patient.consultorio || dentist.consultorio
        };
        currentPatientForModal = normalizedPatient;
        modalPatientName.textContent = normalizedPatient.name || normalizedPatient.patientName;
        const serviceName = normalizedPatient.service === 'Outro' 
            ? normalizedPatient.otherServiceDetail 
            : normalizedPatient.service;
        modalPatientInfo.textContent = `Serviço: ${serviceName}`;
        callModal.style.display = 'flex';
    }

    // Função para confirmar que o paciente saiu
    async function confirmPatientDone(patient) {
        const patientName = patient.name || patient.patientName;
        const patientService = patient.service;
        const patientDoctor = patient.doctor || dentist.name;
        
        // Remove paciente da lista de espera
        await removeFromArray('pending-patients', (p) => 
            !(p.name === patientName && p.doctor === patientDoctor && p.service === patientService)
        );

        // Adiciona ao histórico com data e hora
        const historyEntry = {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientName: patientName,
            doctorName: dentist.name,
            consultorio: dentist.consultorio,
            service: patientService || '',
            otherServiceDetail: patient.otherServiceDetail || '',
            timestamp: new Date().toISOString()
        };
        await unshiftToArray('call-history', historyEntry);

        // Recarrega as listas
        await loadWaitingPatients();
        await loadPatientHistory();
        
        currentPatientForModal = null;
    }

    // Configura listeners em tempo real
    await onDataChange('pending-patients', (patients) => {
        loadWaitingPatients(patients);
    });

    await onDataChange('call-history', (history) => {
        loadPatientHistory(history);
    });

    // Carrega dados iniciais
    await loadWaitingPatients();
    await loadPatientHistory();
});
