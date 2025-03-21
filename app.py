import os
import uuid
import json
import time  # Para manejar timestamp
from flask import Flask, request, render_template, jsonify, send_from_directory
import openai
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configure folders
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['AUDIO_FOLDER'] = os.path.join('static', 'audio')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['AUDIO_FOLDER'], exist_ok=True)

# Set your OpenAI API key
openai.api_key = os.environ.get('OPENAI_API_KEY')

# File for storing prompts and models
SAVED_ITEMS_FILE = 'saved_items.json'
if not os.path.exists(SAVED_ITEMS_FILE) or os.stat(SAVED_ITEMS_FILE).st_size == 0:
    with open(SAVED_ITEMS_FILE, 'w', encoding='utf-8') as f:
        json.dump({"prompts": [], "models": []}, f)

# File for storing history of generated audios (filename, text, created_time)
HISTORY_FILE = 'audio_history.json'
if not os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

@app.route('/')
def index():
    return render_template('index.html')

def extract_text_from_pdf(file_path):
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception:
        return ""

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file found"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    filename = file.filename
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    ext = filename.rsplit('.', 1)[-1].lower()
    if ext == 'pdf':
        text = extract_text_from_pdf(file_path)
    elif ext == 'txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        return jsonify({"error": "Unsupported file type"}), 400
    
    return jsonify({"text": text})

@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    data = request.json
    text = data.get('text')
    model = data.get('model')
    voice = data.get('voice')
    instructions = data.get('instructions', '')
    filename_param = data.get('filename', '').strip()
    
    if not text or not model or not voice:
        return jsonify({"error": "Missing parameters"}), 400
    
    try:
        # --- LLAMADA REAL A LA API DE OPENAI (restaurada) ---
        response = openai.audio.speech.create(
            model=model,
            input=text,
            voice=voice,
            instructions=instructions,
            response_format="mp3"
        )
        # ----------------------------------------------------
        
        # Si el usuario ingresó un nombre, se utiliza; de lo contrario, se usa un uuid
        if filename_param:
            safe_name = secure_filename(filename_param)
            if not safe_name.lower().endswith('.mp3'):
                safe_name += '.mp3'
            candidate = safe_name
            counter = 1
            full_path = os.path.join(app.config['AUDIO_FOLDER'], candidate)
            while os.path.exists(full_path):
                base = safe_name.rsplit('.', 1)[0]
                candidate = f"{base} ({counter}).mp3"
                counter += 1
                full_path = os.path.join(app.config['AUDIO_FOLDER'], candidate)
            final_filename = candidate
        else:
            final_filename = f"{uuid.uuid4()}.mp3"
        
        audio_path = os.path.join(app.config['AUDIO_FOLDER'], final_filename)
        response.stream_to_file(audio_path)

        # Guardar en el historial el texto y la fecha/hora
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            history_data = json.load(f)
        entry = {
            "filename": final_filename,
            "text": text,
            "created_time": time.time()  # timestamp
        }
        history_data.append(entry)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history_data, f)
        
        audio_url = f"/static/audio/{final_filename}"
        return jsonify({"audio_url": audio_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_history', methods=['GET'])
def get_history():
    audio_folder = app.config['AUDIO_FOLDER']
    files = os.listdir(audio_folder)
    
    # Leemos el historial
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        history_data = json.load(f)
    # Convertimos a dict para fácil acceso por filename
    history_dict = {item["filename"]: item for item in history_data}
    
    history = []
    for f_name in files:
        if f_name.endswith('.mp3'):
            path = os.path.join(audio_folder, f_name)
            mtime = os.path.getmtime(path)
            text = ""
            created_time = mtime
            if f_name in history_dict:
                text = history_dict[f_name].get("text", "")
                created_time = history_dict[f_name].get("created_time", mtime)
            history.append({
                "filename": f_name,
                "url": f"/static/audio/{f_name}",
                "mtime": mtime,
                "text": text,
                "created_time": created_time
            })
    # Ordenamos por fecha de modificación (desc)
    history.sort(key=lambda x: x['mtime'], reverse=True)
    return jsonify(history)

@app.route('/delete_history', methods=['POST'])
def delete_history():
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({"error": "Missing filename"}), 400
    path = os.path.join(app.config['AUDIO_FOLDER'], filename)
    if os.path.exists(path):
        os.remove(path)
    # Quitamos del JSON de historial
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        history_data = json.load(f)
    new_history = [item for item in history_data if item["filename"] != filename]
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_history, f)
    return jsonify({"message": "History item deleted successfully"})

@app.route('/save_item', methods=['POST'])
def save_item():
    data = request.json
    item_type = data.get('type')  # "prompt" o "model"
    name = data.get('name')
    content = data.get('content')
    if item_type not in ['prompt', 'model'] or not name or not content:
        return jsonify({"error": "Invalid data. 'type', 'name' and 'content' are required."}), 400
    try:
        with open(SAVED_ITEMS_FILE, 'r', encoding='utf-8') as f:
            saved = json.load(f)
    except json.JSONDecodeError:
        saved = {"prompts": [], "models": []}
    
    new_item = {"id": str(uuid.uuid4()), "name": name, "content": content}
    key = "prompts" if item_type == "prompt" else "models"
    saved[key].append(new_item)
    
    with open(SAVED_ITEMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(saved, f)
    
    return jsonify({"message": "Item saved successfully"})

@app.route('/delete_item', methods=['POST'])
def delete_item():
    data = request.json
    item_type = data.get('type')  # "prompt" o "model"
    item_id = data.get('id')
    if item_type not in ['prompt', 'model'] or not item_id:
        return jsonify({"error": "Invalid data. 'type' and 'id' are required."}), 400
    try:
        with open(SAVED_ITEMS_FILE, 'r', encoding='utf-8') as f:
            saved = json.load(f)
    except json.JSONDecodeError:
        saved = {"prompts": [], "models": []}
    
    key = "prompts" if item_type == "prompt" else "models"
    new_list = [item for item in saved[key] if item.get('id') != item_id]
    saved[key] = new_list
    
    with open(SAVED_ITEMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(saved, f)
    
    return jsonify({"message": "Item deleted successfully"})

@app.route('/get_saved_items', methods=['GET'])
def get_saved_items():
    try:
        with open(SAVED_ITEMS_FILE, 'r', encoding='utf-8') as f:
            saved = json.load(f)
    except json.JSONDecodeError:
        saved = {"prompts": [], "models": []}
    return jsonify(saved)

@app.route('/backup', methods=['GET'])
def backup():
    return send_from_directory(directory='.', path=SAVED_ITEMS_FILE, as_attachment=True)

@app.route('/upload_backup', methods=['POST'])
def upload_backup():
    if 'backup_file' not in request.files:
        return jsonify({"error": "No backup file found"}), 400
    file = request.files['backup_file']
    try:
        backup_data = json.load(file)
        with open(SAVED_ITEMS_FILE, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f)
        return jsonify({"message": "Backup uploaded successfully"})
    except Exception as e:
        return jsonify({"error": "Error uploading backup: " + str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5029)

