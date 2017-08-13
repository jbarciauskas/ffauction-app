from logging import StreamHandler
from sys import stdout

from app import app

if __name__ == '__main__':
    handler = StreamHandler(stdout)
    app.logger.addHandler(handler)
    app.run()
