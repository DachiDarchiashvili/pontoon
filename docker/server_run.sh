#!/bin/bash

# Prepares then runs the server

echo ">>> Collects the static files into STATIC_ROOT for Django"
python manage.py collectstatic

echo ">>> Setting up the db for Django"
python manage.py migrate

echo ">>> Starting local server"
#exec python manage.py runserver 0.0.0.0:8000
uwsgi --chdir=/app \
  --master \
  --die-on-term \
  -b 100000 \
  --http-socket 0.0.0.0:8000 \
  --wsgi-file pontoon/wsgi.py \
  --thunder-lock \
  --log-master \
  --module pontoon.wsgi:application
