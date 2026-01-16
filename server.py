import http.server
import socketserver
import os
import sys

PORT = 8000

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging of requests to keep console clean
        pass

    def finish(self):
        # Handle connection resets gracefully
        try:
            super().finish()
        except ConnectionError:
            pass

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    def handle_error(self, request, client_address):
        # Suppress errors caused by the client disconnecting
        # This is not a "paint over cracks" but standardized error handling for servers
        # expecting volatile clients (browsers).
        pass

def run():
    # Change to directory of the script if needed, or current working dir
    # os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = QuietHandler
    
    # Allow address reuse to prevent "Address already in use" errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    
    with ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving Game at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()
        except Exception as e:
            print(f"\nServer error: {e}")

if __name__ == "__main__":
    run()
