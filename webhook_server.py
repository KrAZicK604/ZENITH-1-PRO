"""Compatibility entry point: signed-only webhook service."""
from cloud_webhook import app

if __name__ == "__main__":
    import os
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
