#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Collecting static files for Django Admin..."
python manage.py collectstatic --no-input

echo "Applying database migrations..."
python manage.py migrate

echo "Seeding initial hotel data (property, room types, rooms, staff)..."
python manage.py seed_hotel_data || true
