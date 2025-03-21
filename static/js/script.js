document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const logoLink = document.getElementById('logoLink');

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(this.getAttribute('data-target')).classList.add('active');
      
      // Cargar historial si se va a la pestaña "History"
      if (this.getAttribute('data-target') === 'history-section') {
        loadHistory();
      } 
      // Cargar configs si se va a la pestaña "Configs"
      else if (this.getAttribute('data-target') === 'configs-section') {
        loadSavedItems();
        updateSelectors();
      }
    });
  });

  // Click en el logo -> volver a TTS
  logoLink.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('.tab[data-target="tts-section"]').click();
  });

  // Elementos TTS
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const countBtn = document.getElementById('countBtn');
  const charCount = document.getElementById('charCount');
  const generateAudioBtn = document.getElementById('generateAudioBtn');
  const audioPlayer = document.getElementById('audioPlayer');
  const downloadLink = document.getElementById('downloadLink');
  const statusMessage = document.getElementById('statusMessage');
  const outputFilename = document.getElementById('outputFilename');
  
  // Elementos de Config
  const savePromptBtn = document.getElementById('savePromptBtn');
  const saveModelBtn = document.getElementById('saveModelBtn');
  const backupBtn = document.getElementById('backupBtn');
  const backupUploadInput = document.getElementById('backupUploadInput');
  const uploadBackupBtn = document.getElementById('uploadBackupBtn');
  const savedItemsDiv = document.getElementById('savedItems');
  const promptSelect = document.getElementById('promptSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const modelSelect = document.getElementById('modelSelect');

  // Voces en orden alfabético
  const voiceOptions = [
    "alloy", "ash", "ballad", "coral", "echo", 
    "fable", "nova", "onyx", "sage", "shimmer"
  ].sort();

  // Modelos por defecto (ya en orden alfabético)
  const defaultModels = [
    { name: "gpt-4o-mini-tts", content: "gpt-4o-mini-tts" },
    { name: "tts-1", content: "tts-1" },
    { name: "tts-1-hd", content: "tts-1-hd" }
  ];

  // Función para actualizar los selects
  function updateSelectors() {
    fetch('/get_saved_items')
      .then(response => response.json())
      .then(data => {
        // Limpiamos promptSelect
        promptSelect.innerHTML = '';
        // Añadimos opción "Select a prompt"
        const defaultPromptOption = document.createElement('option');
        defaultPromptOption.value = '';
        defaultPromptOption.disabled = true;
        defaultPromptOption.selected = true;
        defaultPromptOption.textContent = 'Select a prompt';
        promptSelect.appendChild(defaultPromptOption);

        // Ordenamos prompts alfabéticamente
        data.prompts.sort((a, b) => a.name.localeCompare(b.name));
        data.prompts.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.content;
          opt.textContent = item.name;
          promptSelect.appendChild(opt);
        });

        // Limpiamos voiceSelect y lo reconstruimos
        voiceSelect.innerHTML = '';
        const defaultVoiceOption = document.createElement('option');
        defaultVoiceOption.value = '';
        defaultVoiceOption.disabled = true;
        defaultVoiceOption.selected = true;
        defaultVoiceOption.textContent = 'Select a voice';
        voiceSelect.appendChild(defaultVoiceOption);
        voiceOptions.forEach(voice => {
          const opt = document.createElement('option');
          opt.value = voice;
          opt.textContent = voice;
          voiceSelect.appendChild(opt);
        });

        // Limpiamos modelSelect
        modelSelect.innerHTML = '';
        const defaultModelOption = document.createElement('option');
        defaultModelOption.value = '';
        defaultModelOption.disabled = true;
        defaultModelOption.selected = true;
        defaultModelOption.textContent = 'Select a model';
        modelSelect.appendChild(defaultModelOption);

        // Mezclamos modelos por defecto con los guardados
        data.models.sort((a, b) => a.name.localeCompare(b.name));
        const combinedModels = [...defaultModels, ...data.models];
        combinedModels.sort((a, b) => a.name.localeCompare(b.name));

        combinedModels.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.content;
          opt.textContent = item.name;
          modelSelect.appendChild(opt);
        });
      });
  }

  // Historial
  function loadHistory() {
    fetch('/get_history')
      .then(response => response.json())
      .then(data => {
        let html = '<ul>';
        data.forEach(item => {
          const dateString = new Date(item.created_time * 1000).toLocaleString();
          html += `
            <li>
              <strong>${item.filename}</strong><br>
              <em>Generated on:</em> ${dateString}<br>
              <audio controls src="${item.url}"></audio>
              <button class="download-text-btn" 
                onclick="downloadText('${item.filename}', '${encodeURIComponent(item.text)}')">
                📄 Download TXT
              </button>
              <!-- Botón para descargar el audio -->
              <button class="download-audio-btn" 
                onclick="downloadAudio('${item.url}', '${item.filename}')">
                ⬇️ Download Audio
              </button>
              <button class="item-delete-btn" onclick="deleteHistory('${item.filename}')">
                🗑️ Delete
              </button>
            </li>
          `;
        });
        html += '</ul>';
        document.getElementById('historyContainer').innerHTML = html;
      });
  }

  // Descargar el texto leído
  window.downloadText = function(filename, encodedText) {
    const text = decodeURIComponent(encodedText);
    const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    // Reemplazamos .mp3 por .txt
    const txtFilename = filename.replace('.mp3', '.txt');
    link.download = txtFilename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar el audio
  window.downloadAudio = function(audioUrl, filename) {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Eliminar del historial
  window.deleteHistory = function(filename) {
    fetch('/delete_history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message || data.error);
      loadHistory();
    })
    .catch(err => {
      alert("Error deleting history item: " + err);
    });
  };

  // Manejo de drag & drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
  });
  dropArea.addEventListener('drop', handleDrop, false);
  function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
  }
  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });
  function handleFiles(files) {
    const file = files[0];
    if (file) {
      uploadFile(file);
    }
  }
  function uploadFile(file) {
    let formData = new FormData();
    formData.append('file', file);
    
    fetch('/upload', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if(data.text) {
        textInput.value = data.text;
      } else {
        alert("Error processing the file");
      }
    })
    .catch(() => alert("Error uploading the file"));
  }

  // Contar caracteres
  countBtn.addEventListener('click', function() {
    const text = textInput.value;
    charCount.textContent = `Character count (including spaces and punctuation): ${text.length}`;
  });

  // Generar audio
  generateAudioBtn.addEventListener('click', function() {
    const text = textInput.value.trim();
    const model = modelSelect.value;
    const voice = voiceSelect.value;
    const instructions = promptSelect.value;
    const outName = outputFilename.value.trim();

    if (!text) {
      alert("Please enter or upload some text.");
      return;
    }
    if (!model) {
      alert("Please select a model.");
      return;
    }
    if (!voice) {
      alert("Please select a voice.");
      return;
    }
    
    statusMessage.style.display = "block";
    statusMessage.textContent = "Generating audio, please wait...";

    const payload = { text, model, voice, instructions, filename: outName };
    fetch('/generate_audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
      statusMessage.style.display = "none";
      if(data.audio_url) {
        audioPlayer.src = data.audio_url;
        downloadLink.href = data.audio_url;
        document.getElementById("audio-section").style.display = "block";
        loadHistory();
      } else {
        alert("Error generating audio: " + data.error);
      }
    })
    .catch(err => {
      statusMessage.style.display = "none";
      alert("Request error: " + err);
    });
  });

  // Guardar Prompt
  savePromptBtn.addEventListener('click', function() {
    const newPromptName = document.getElementById('newPromptName').value.trim();
    const newPromptContent = document.getElementById('newPromptContent').value.trim();
    if(!newPromptName || !newPromptContent) {
      alert("Enter a name and content for the prompt.");
      return;
    }
    fetch('/save_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'prompt', name: newPromptName, content: newPromptContent })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message);
      loadSavedItems();
      updateSelectors();
    });
  });

  // Guardar Modelo
  saveModelBtn.addEventListener('click', function() {
    const newModelName = document.getElementById('newModelName').value.trim();
    const newModelContent = document.getElementById('newModelContent').value.trim();
    if(!newModelName || !newModelContent) {
      alert("Enter a name and content for the model.");
      return;
    }
    fetch('/save_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'model', name: newModelName, content: newModelContent })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message);
      loadSavedItems();
      updateSelectors();
    });
  });

  // Descargar backup
  backupBtn.addEventListener('click', function() {
    window.location.href = '/backup';
  });

  // Subir backup
  uploadBackupBtn.addEventListener('click', function() {
    const file = backupUploadInput.files[0];
    if (!file) {
      alert("Select a backup file to upload.");
      return;
    }
    const formData = new FormData();
    formData.append('backup_file', file);
    
    fetch('/upload_backup', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message || data.error);
      loadSavedItems();
      updateSelectors();
    })
    .catch(err => {
      alert("Error uploading backup: " + err);
    });
  });

  // Eliminar Prompt/Model
  window.deleteItem = function(itemType, itemId) {
    fetch('/delete_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: itemType, id: itemId })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message || data.error);
      loadSavedItems();
      updateSelectors();
    })
    .catch(err => {
      alert("Error deleting item: " + err);
    });
  };

  // Cargar items guardados (prompts y modelos)
  function loadSavedItems() {
    fetch('/get_saved_items')
    .then(response => response.json())
    .then(data => {
      let promptsHtml = `
        <div class="saved-items-container">
          <h3>Prompts:</h3>
          <ul>
      `;
      data.prompts.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
        promptsHtml += `
          <li>
            <div class="item-left">
              <strong>${item.name}</strong>: ${item.content}
            </div>
            <div class="item-right">
              <button class="item-delete-btn" onclick="deleteItem('prompt','${item.id}')">🗑️</button>
            </div>
          </li>`;
      });
      promptsHtml += `</ul></div>`;

      let modelsHtml = `
        <div class="saved-items-container">
          <h3>Models:</h3>
          <ul>
      `;
      data.models.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
        modelsHtml += `
          <li>
            <div class="item-left">
              <strong>${item.name}</strong>: ${item.content}
            </div>
            <div class="item-right">
              <button class="item-delete-btn" onclick="deleteItem('model','${item.id}')">🗑️</button>
            </div>
          </li>`;
      });
      modelsHtml += `</ul></div>`;

      savedItemsDiv.innerHTML = promptsHtml + modelsHtml;
    });
  }
  
  // Inicial
  loadSavedItems();
  updateSelectors();
  loadHistory();
});
