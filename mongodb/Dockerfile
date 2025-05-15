FROM mongo:7

# Create a data directory (Fly will mount volume here)
VOLUME /data/db

CMD ["mongod", "--bind_ip_all"]

# Add healthcheck to verify MongoDB is running
HEALTHCHECK --interval=5s --timeout=3s --retries=3 CMD mongosh --quiet --eval "db.runCommand({ ping: 1 })"