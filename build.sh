#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

# If node and npm are available in environment, build frontend
if command -v npm &> /dev/null; then
  echo "Node & npm detected. Building React frontend..."
  npm install
  npm run build
fi

echo "Collecting static files for Django and Frontend..."
python manage.py collectstatic --no-input

echo "Applying database migrations..."
python manage.py migrate

echo "Seeding initial hotel data (property, room types, rooms, staff)..."
python manage.py seed_hotel_data || true
