<div align="center">
  <img src="static/images/logo.png" alt="TTS AI Playground Logo" width="250">
</div>

# TTS AI Playground

TTS AI Playground is a web application that converts text to speech using the OpenAI API. It allows you to upload documents (PDF/TXT), generate audio from text, manage the history of generated audios, and save custom configurations (prompts and models). Additionally, you can upload a configuration document containing some of the voice instructions provided by OpenAI.

## Features

- **Text to Audio Conversion:** Generates MP3 files from text.
- **Audio History:** View, download, and delete generated audios along with their associated text.
- **Customizable Configurations:** Save and manage prompts and models.
- **Configuration Upload/Download:** Upload a configuration document with OpenAI's voice instructions.
- **Intuitive Interface:** Direct links to OpenAI documentation and a demo.

## Requirements

- [Docker](https://www.docker.com/) (for containerized installation)
- *(Optional)* Python 3.9+ and a virtual environment for local development

## Installation and Execution

### 1. Using Docker

#### a) With Docker

1. **Create a `.env` file** in the project root with the following content:
   ```env
   OPENAI_API_KEY=your_api_key_here
Build the Docker image:

bash
Copy
docker build -t tts-ai-playground .
Run the container:

bash
Copy
docker run -d -p 5029:5029 --env-file .env tts-ai-playground
The application will be available at http://localhost:5029.

b) With Docker Compose
Create a docker-compose.yml file in the project root with the following content:

yaml
Copy
version: "3.8"
services:
  app:
    build: .
    ports:
      - "5029:5029"
    env_file:
      - .env
Run Docker Compose:

bash
Copy
docker-compose up -d
The application will be available at http://localhost:5029.

2. Using a Virtual Environment (Local Development)
a) Create and Activate the Virtual Environment
Create the virtual environment:

bash
Copy
python3 -m venv venv
Activate the virtual environment:

On Linux/macOS:
bash
Copy
source venv/bin/activate
On Windows:
bash
Copy
venv\Scripts\activate
b) Install Dependencies
bash
Copy
pip install -r requirements.txt
c) Configure the OpenAI API
Create a .env file in the project root with the following content:
env
Copy
OPENAI_API_KEY=your_api_key_here
(Optional) You can use python-dotenv to load environment variables during development.
d) Run the Application
bash
Copy
python app.py
The application will be available at http://localhost:5029.

How to Use the Application
Text to Speech:
In the "Text to Speech" tab, you can upload a PDF or TXT file or manually paste text. Configure the voice, prompt, and model, then click "Generate Audio". The message "Generating audio..." (in orange) will appear during the process.

History:
In the "History" tab, you'll see a list of generated audios. From there you can:

Download the audio file.
Download the read text in TXT format.
Delete the record.
Configurations:
In the "Configs" tab, you can save new prompts and models, download the current configuration, or upload a configuration document containing voice instructions provided by OpenAI.

Documentation and Demo:
Just below the "Text to Speech" title, there are two links:

OpenAI docs: https://platform.openai.com/docs/guides/text-to-speech
Demo: https://www.openai.fm/
Contributions
If you would like to contribute to this project, please open an issue or submit a pull request.