import logging
import os
import sys

from app import app

app.logger.addHandler(logging.StreamHandler(sys.stdout))
app.logger.setLevel(logging.ERROR)

if(os.environ.get('DEBUG')):
    app.config['DEBUG'] = True

if __name__ == '__main__':
    app.run()
