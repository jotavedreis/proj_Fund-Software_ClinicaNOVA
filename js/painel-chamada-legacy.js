// Fallback legacy script for TVs without module support
(function(){
  function $(id){return document.getElementById(id);}  
  var clockEl = $('call-clock');
  var patientEl = $('call-patient-name');
  var consultorioEl = $('call-consultorio');
  var doctorEl = $('call-doctor');
  var modalEl = $('call-modal-alert');
  var modalPatient = $('modal-patient-name');
  var modalCons = $('modal-consultorio-value');
  var modalDoc = $('modal-doctor-value');
  var recentList = $('recent-calls-list');
  var lastId = null;

  function updateClock(){
    if (!clockEl) return;
    var d = new Date();
    function pad(n){n = String(n); return n.length<2?('0'+n):n;}
    clockEl.textContent = pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  }
  updateClock();
  setInterval(updateClock, 1000);

  function display(call){
    if (!call){
      if (patientEl) patientEl.textContent = 'Aguardando chamada...';
      if (consultorioEl) consultorioEl.textContent = '';
      if (doctorEl) doctorEl.textContent = '';
      return;
    }
    if (patientEl) patientEl.textContent = call.patientName || call.name || 'Paciente';
    if (consultorioEl) consultorioEl.textContent = 'Consultório ' + (call.consultorio || '');
    if (doctorEl) doctorEl.textContent = call.doctorName || '';
  }

  function showModal(call){
    if (!modalEl) return;
    if (modalPatient) modalPatient.textContent = call.patientName || call.name || 'Paciente';
    if (modalCons) modalCons.textContent = call.consultorio || '';
    if (modalDoc) modalDoc.textContent = call.doctorName || '';
    modalEl.style.display = 'flex';
    setTimeout(function(){ modalEl.style.display = 'none'; }, 8000);
  }

  function loadRecents(calls){
    if (!recentList) return;
    recentList.innerHTML = '';
    if (!calls || !calls.length){
      recentList.innerHTML = '<p class="empty-message">Nenhuma chamada</p>';
      return;
    }
    for (var i=0; i<Math.min(calls.length,2); i++){
      var c = calls[i];
      var d = new Date(c.timestamp);
      var time = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
      var item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = '<strong>'+ (c.patientName||c.name||'Paciente') +'</strong>'+
                       '<span class="recent-meta">'+ (c.doctorName||'') +'</span>'+
                       '<span class="recent-time">'+ time +'</span>';
      recentList.appendChild(item);
    }
  }

  function getLocalCalls(){
    try{
      var data = localStorage.getItem('call-notifications');
      return data ? JSON.parse(data) : [];
    }catch(e){ return []; }
  }

  function check(){
    var calls = getLocalCalls();
    if (!calls || !calls.length){
      display(null);
      loadRecents([]);
      return;
    }
    calls.sort(function(a,b){ return new Date(b.timestamp) - new Date(a.timestamp); });
    var latest = calls[0];
    if (latest && latest.id !== lastId){
      lastId = latest.id;
      display(latest);
      showModal(latest);
    }
    loadRecents(calls.slice(1));
  }

  // If BackendHelper exists, use its realtime listener; else poll localStorage
  if (window.BackendHelper && typeof window.BackendHelper.onCallsChange === 'function'){
    window.BackendHelper.onCallsChange(function(calls){
      // Calls from backendHelper may be null or []
      if (!calls || !calls.length){ display(null); loadRecents([]); return; }
      calls.sort(function(a,b){ return new Date(b.timestamp) - new Date(a.timestamp); });
      var latest = calls[0];
      if (latest && latest.id !== lastId){ lastId = latest.id; display(latest); showModal(latest); }
      loadRecents(calls.slice(1));
    });
  } else {
    setInterval(check, 1000);
    check();
  }
})();
