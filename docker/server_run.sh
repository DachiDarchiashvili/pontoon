#!/bin/bash

# Prepares then runs the server

echo ">>> Collects the static files into STATIC_ROOT for Django"
python manage.py collectstatic

echo ">>> Setting up the db for Django"
python manage.py migrate

echo ">>> Starting local server"
exec python manage.py runserver 0.0.0.0:8000
