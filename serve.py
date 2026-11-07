#!/usr/bin/env python3
"""Serve the game on http://localhost:8000 without browser caching,
so a new version of the files is always picked up. Tries 8001-8010 if 8000 is busy."""
import http.server, os, socketserver, sys, webbrowser, threading

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.glb': 'model/gltf-binary'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass

for port in range(8000, 8011):
    try:
        httpd = socketserver.TCPServer(('127.0.0.1', port), NoCache)
        break
    except OSError:
        continue
else:
    sys.exit('Ports 8000-8010 are all busy. Close the other game windows and try again.')

url = f'http://localhost:{port}'
print(f'Vampire Garlic Heist is running on {url}  (close this window to stop it)')
threading.Timer(1.0, lambda: webbrowser.open(url)).start()
httpd.serve_forever()
