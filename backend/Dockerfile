FROM python:3.11-slim

WORKDIR /app

# Обновленный список библиотек для новых версий Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Убедись, что путь к приложению верный (app.main или main)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]