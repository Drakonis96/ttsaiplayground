FROM python:3.9-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copiar el resto de la aplicación
COPY . .

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5029", "app:app"]

