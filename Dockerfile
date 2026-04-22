FROM python:3.11-slim AS backend

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/src

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
RUN mkdir -p data/workspace

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "sentiment_app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
