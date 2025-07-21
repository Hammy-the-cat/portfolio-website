#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"サーバーが http://localhost:{PORT} で起動しました")
        print("ブラウザが自動で開きます...")
        webbrowser.open(f'http://localhost:{PORT}')
        print("サーバーを停止するには Ctrl+C を押してください")
        httpd.serve_forever()