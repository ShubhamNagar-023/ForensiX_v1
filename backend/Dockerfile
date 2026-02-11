FROM python:3.11-slim

# Install system dependencies for pytsk3 and libewf
RUN apt-get update && apt-get install -y \
    build-essential \
    autoconf \
    automake \
    autopoint \
    libtool \
    pkg-config \
    git \
    libssl-dev \
    zlib1g-dev \
    libewf-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
