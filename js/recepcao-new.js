// Script para o painel da recepção - com suporte LocalStorage
import { saveData, loadData, onDataChange, pushToArray, removeFromArray, unshiftToArray } from './backend-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('patient-form');
    const doctorSelect = document.getElementById('doctor');
    const serviceSelect = document.getElementById('service');
    const otherServiceGroup = document.getElementById('other-service-group');
    const patientList = document.getElementById('patient-list');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    const filterDoctorSelect = document.getElementById('filter-doctor');
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editCancelBtn = document.getElementById('edit-cancel');
    const editPatientName = document.getElementById('edit-patient-name');
    const editDoctorSelect = document.getElementById('edit-doctor');
    const editServiceSelect = document.getElementById('edit-service');
    const editOtherServiceGroup = document.getElementById('edit-other-service-group');
    const editOtherServiceDetail = document.getElementById('edit-other-service-detail');
    const editUrgente = document.getElementById('edit-urgente');

    const fixedDoctors = ['Dra. Beatriz', 'Dra. Suziane', 'Dra. Amanda'];
    const legacyDoctors = ['Dra. Jessica Reis', 'Dra. Dani', 'Dr. Patrick', 'Dra. Suzine'];
    const normalizeName = (value) => (value || '').trim().toLowerCase();
    
    let currentEditingPatientIndex = -1;

    // Modal genérico de confirmação/aviso
    function showConfirm(message) {
        return new Promise(resolve => {
            if (!confirmModal) return resolve(true);
            confirmMessage.textContent = message;
            confirmModal.classList.add('active');

            const cleanup = (result) => {
                confirmModal.classList.remove('active');
                confirmYes.onclick = null;
                confirmNo.onclick = null;
                resolve(result);
            };

            confirmYes.onclick = () => cleanup(true);
            confirmNo.onclick = () => cleanup(false);
        });
    }

    function showInfo(message) {
        return new Promise(resolve => {
            if (!confirmModal) {
                alert(message);
                return resolve(true);
            }
            confirmMessage.textContent = message;
            confirmModal.classList.add('active');
            confirmNo.style.display = 'none';

            const cleanup = () => {
                confirmModal.classList.remove('active');
                confirmYes.onclick = null;
                confirmNo.onclick = null;
                confirmNo.style.display = '';
                resolve(true);
            };

            confirmYes.onclick = cleanup;
        });
    }

    async function getCleanDynamicDoctors() {
        const storedDoctors = await loadData('doctors') || [];
        const legacySet = new Set(legacyDoctors.map(normalizeName));

        const cleaned = storedDoctors
            .filter((name) => typeof name === 'string' && name.trim().length > 0)
            .map((name) => name.trim())
            .filter((name) => !legacySet.has(normalizeName(name)));

        if (cleaned.length !== storedDoctors.length) {
            await saveData('doctors', cleaned);
        }

        return cleaned;
    }

    // Carrega lista de dentistas do localStorage
    async function loadDoctorsList() {
        // Carrega dentistas dinâmicos
        const dynamicDoctors = await getCleanDynamicDoctors();

        // Combina e remove duplicatas
        const allDoctors = [...new Set([...fixedDoctors, ...dynamicDoctors])];
        
        // Atualiza select do formulário principal
        doctorSelect.innerHTML = '<option value="">Escolha o doutor</option>';
        allDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            doctorSelect.appendChild(option);
        });

        // Atualiza select do formulário de edição
        editDoctorSelect.innerHTML = '<option value="">Escolha o doutor</option>';
        allDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            editDoctorSelect.appendChild(option);
        });

        // Atualiza lista de gerenciamento de dentistas
        updateDoctorsList(allDoctors, fixedDoctors);
        
        // Atualiza filtro de dentistas no histórico
        updateDoctorFilter(allDoctors);
    }

    // Atualiza o select de filtro de dentistas
    function updateDoctorFilter(allDoctors) {
        if (!filterDoctorSelect) return;
        
        const currentValue = filterDoctorSelect.value;
        filterDoctorSelect.innerHTML = '<option value="">Todos os Dentistas</option>';
        
        allDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            filterDoctorSelect.appendChild(option);
        });
        
        // Restaura o valor selecionado se ainda existir
        if (currentValue && allDoctors.includes(currentValue)) {
            filterDoctorSelect.value = currentValue;
        }
    }

    // Atualiza e exibe lista de dentistas para remover
    function updateDoctorsList(allDoctors, fixedDoctors) {
        const doctorsList = document.getElementById('doctors-list');
        doctorsList.innerHTML = '';
        
        allDoctors.forEach(doctor => {
            const isFixed = fixedDoctors.includes(doctor);
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            
            const label = document.createElement('span');
            label.textContent = doctor;
            label.style.marginRight = '10px';
            
            div.appendChild(label);
            
            if (!isFixed) {
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remover';
                removeBtn.type = 'button';
                removeBtn.style.padding = '5px 10px';
                removeBtn.style.backgroundColor = '#8B0000';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '4px';
                removeBtn.style.cursor = 'pointer';
                
                removeBtn.onclick = async () => {
                    const confirmed = await showConfirm(`Remover ${doctor}?`);
                    if (confirmed) {
                        const dynamicDoctors = await getCleanDynamicDoctors();
                        const updated = dynamicDoctors.filter(d => d !== doctor);
                        await saveData('doctors', updated);
                        loadDoctorsList();
                    }
                };
                
                div.appendChild(removeBtn);
            }
            
            doctorsList.appendChild(div);
        });
    }

    // Carrega pacientes do localStorage
    async function loadPatientsList(patients) {
        if (!patients) {
            patients = (await loadData('pending-patients')) || [];
        }
        
        patientList.innerHTML = '';

        if (patients.length === 0) {
            patientList.innerHTML = '<p class="empty-message">Nenhum paciente registrado</p>';
            return;
        }

        patients.forEach((patient, index) => {
            const div = document.createElement('div');
            div.className = 'patient-item';

            const badge = patient.urgente ? '<span class="urgent-badge">URGENTE</span>' : '';

            div.innerHTML = `
                <div class="patient-info">
                    <div class="patient-header">
                        <strong>${patient.name}</strong>
                        ${badge}
                    </div>
                    <p><strong>Dr(a):</strong> ${patient.doctor}</p>
                    <p><strong>Serviço:</strong> ${patient.service}${patient.otherServiceDetail ? ' - ' + patient.otherServiceDetail : ''}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button edit-btn" data-index="${index}" style="background-color: #d9534f;">Editar</button>
                    <button class="patient-button remove-btn" data-name="${patient.name}" style="background-color: #666;">Remover</button>
                </div>
            `;

            patientList.appendChild(div);
        });

        // Eventos dos botões de editar
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.dataset.index);
                openEditModal(patients[index], index);
            });
        });

        // Eventos dos botões de remover
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = e.target.dataset.name;
                const confirmed = await showConfirm(`Remover ${name}?`);
                if (confirmed) {
                    await removeFromArray('pending-patients', p => p.name !== name);
                }
            });
        });
    }

    // Chama paciente (envia para a TV)
    async function callPatient(patient) {
        const consultorioByDoctor = {
            'Dra. Beatriz': '01',
            'Dra. Suziane': '02',
            'Dra. Amanda': '03',
            // Compatibilidade com nomes antigos
            'Dra. Jessica Reis': '01',
            'Dra. Dani': '02',
            'Dr. Patrick': '03'
        };
        const consultorio = consultorioByDoctor[patient.doctor] || '03';
        
        const newCall = {
            id: crypto.randomUUID(),
            patientName: patient.name,
            consultorio: consultorio,
            doctorName: patient.doctor,
            timestamp: new Date().toISOString()
        };

        // Adiciona chamada atomicamente
        await unshiftToArray('call-notifications', newCall);

        // Remove da fila de espera atomicamente
        await removeFromArray('pending-patients', p => p.name !== patient.name);

        // Adiciona ao histórico atomicamente
        await unshiftToArray('call-history', newCall);

        await showInfo(`${patient.name} chamado para o consultório ${consultorio}`);
    }

    // Submete formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('patient-name').value;
        const doctor = doctorSelect.value;
        const service = serviceSelect.value;
        const otherServiceDetail = document.getElementById('other-service-detail').value;
        const urgente = document.getElementById('urgente').checked;

        if (!name || !doctor || !service) {
            await showInfo('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        const newPatient = {
            name,
            doctor,
            service,
            otherServiceDetail,
            urgente,
            timestamp: new Date().toISOString()
        };

        await pushToArray('pending-patients', newPatient);

        form.reset();
        await showInfo('Paciente registrado com sucesso!');
    });

    // Alternância de serviço "Outro"
    serviceSelect.addEventListener('change', () => {
        otherServiceGroup.style.display = serviceSelect.value === 'Outro' ? 'block' : 'none';
    });

    // Alternância de serviço "Outro" no formulário de edição
    editServiceSelect.addEventListener('change', () => {
        editOtherServiceGroup.style.display = editServiceSelect.value === 'Outro' ? 'block' : 'none';
    });

    // Abre modal de edição
    function openEditModal(patient, index) {
        currentEditingPatientIndex = index;
        editPatientName.value = patient.name;
        editDoctorSelect.value = patient.doctor;
        editServiceSelect.value = patient.service;
        editOtherServiceDetail.value = patient.otherServiceDetail || '';
        editUrgente.checked = patient.urgente || false;
        editOtherServiceGroup.style.display = patient.service === 'Outro' ? 'block' : 'none';
        editModal.classList.add('active');
    }

    // Fecha modal de edição
    function closeEditModal() {
        editModal.classList.remove('active');
        editForm.reset();
        currentEditingPatientIndex = -1;
    }

    // Botão cancelar edição
    editCancelBtn.addEventListener('click', closeEditModal);

    // Salva edição do paciente
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = editPatientName.value;
        const doctor = editDoctorSelect.value;
        const service = editServiceSelect.value;
        const otherServiceDetail = editOtherServiceDetail.value;
        const urgente = editUrgente.checked;

        if (!name || !doctor || !service) {
            await showInfo('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        // Carrega lista atual
        const patients = await loadData('pending-patients') || [];
        
        // Atualiza o paciente mantendo a posição na fila
        if (currentEditingPatientIndex >= 0 && currentEditingPatientIndex < patients.length) {
            patients[currentEditingPatientIndex] = {
                ...patients[currentEditingPatientIndex],
                name,
                doctor,
                service,
                otherServiceDetail,
                urgente
            };

            // Salva a lista atualizada
            await saveData('pending-patients', patients);
            
            closeEditModal();
            await showInfo('Paciente atualizado com sucesso!');
        }
    });

    // Botão limpar histórico
    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', async () => {
            const confirmed = await showConfirm('Limpar todo o histórico de chamadas?');
            if (confirmed) {
                await saveData('call-history', []);
            }
        });
    }

    // Carrega histórico
    async function loadHistoryList(history) {
        if (!history) {
            history = (await loadData('call-history')) || [];
        }
        
        const historyList = document.getElementById('history-list');
        
        if (!historyList) return;

        // Aplica filtro por dentista se selecionado
        const selectedDoctor = filterDoctorSelect ? filterDoctorSelect.value : '';
        if (selectedDoctor) {
            history = history.filter(call => call.doctorName === selectedDoctor);
        }

        historyList.innerHTML = '';

        if (history.length === 0) {
            const message = selectedDoctor 
                ? `Nenhum paciente atendido por ${selectedDoctor}` 
                : 'Nenhum paciente no histórico';
            historyList.innerHTML = `<p class="empty-message">${message}</p>`;
            return;
        }

        history.forEach(call => {
            const div = document.createElement('div');
            div.className = 'patient-item';

            const date = new Date(call.timestamp);
            const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            div.innerHTML = `
                <div class="patient-info" style="cursor: pointer;">
                    <div class="patient-header">
                        <strong>${call.patientName}</strong>
                    </div>
                    <p><strong>Consultório:</strong> ${call.consultorio}</p>
                    <p><strong>Dr(a):</strong> ${call.doctorName}</p>
                    <p style="margin-top: 5px; color: #888; font-size: 0.9em;"><strong>Data:</strong> ${day}</p>
                    <p style="color: #888; font-size: 0.9em;"><strong>Hora:</strong> ${time}</p>
                </div>
                <div class="patient-actions">
                    <button class="patient-button" data-call-id="${call.id}" style="background-color: #d9534f;">Remover</button>
                </div>
            `;

            // Adiciona clique na info para mostrar modal com detalhes
            const infoDiv = div.querySelector('.patient-info');
            infoDiv.addEventListener('click', () => {
                showHistoryModal(call, day, time);
            });

            // Adiciona clique no botão remover
            const removeBtn = div.querySelector('.patient-button');
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Evita abrir o modal
                const callId = e.target.dataset.callId;
                const confirmed = await showConfirm(`Remover ${call.patientName} do histórico?`);
                if (confirmed) {
                    await removeFromArray('call-history', c => c.id !== callId);
                }
            });

            historyList.appendChild(div);
        });
    }

    // Mostra modal com detalhes do histórico
    function showHistoryModal(call, day, time) {
        if (!confirmModal) return;
        
        const service = call.service || 'Não especificado';
        const detail = call.otherServiceDetail ? ` - ${call.otherServiceDetail}` : '';
        
        confirmMessage.innerHTML = `
            <div style="text-align: left;">
                <p><strong>Paciente:</strong> ${call.patientName}</p>
                <p><strong>Consultório:</strong> ${call.consultorio}</p>
                <p><strong>Dr(a):</strong> ${call.doctorName}</p>
                <p><strong>Serviço:</strong> ${service}${detail}</p>
                <p><strong>Data:</strong> ${day}</p>
                <p><strong>Hora da Chamada:</strong> ${time}</p>
            </div>
        `;
        
        confirmModal.classList.add('active');
        const confirmYesLocal = confirmModal.querySelector('#confirm-yes');
        const confirmNoLocal = confirmModal.querySelector('#confirm-no');
        
        if (confirmNoLocal) {
            confirmNoLocal.style.display = 'none';
        }
        
        if (confirmYesLocal) {
            confirmYesLocal.textContent = 'Fechar';
            confirmYesLocal.onclick = () => {
                confirmModal.classList.remove('active');
                if (confirmNoLocal) {
                    confirmNoLocal.style.display = '';
                }
                confirmYesLocal.textContent = 'Sim';
            };
        }
    }

    // Event listener para filtro de dentista
    if (filterDoctorSelect) {
        filterDoctorSelect.addEventListener('change', () => {
            loadHistoryList();
        });
    }

    // Configura listeners em tempo real
    onDataChange('pending-patients', (patients) => {
        loadPatientsList(patients);
    });

    onDataChange('call-history', (history) => {
        loadHistoryList(history);
    });

    // Inicializa com dados atuais
    await loadDoctorsList();
    await loadPatientsList();
    await loadHistoryList();
})();